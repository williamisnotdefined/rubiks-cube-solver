from __future__ import annotations

import base64
import binascii
import math
from dataclasses import dataclass

import cv2
import numpy as np

from .color import (
    SCAN_SYMBOLS,
    classify_rgb,
    estimated_color_from_probabilities,
    estimate_color_probabilities,
    neutral_white_likelihood,
    normalize_face_lighting,
    sample_sticker_rgb,
    trimmed_patch_rgb,
)
from .cnn import VisionCnn, get_default_cnn
from .face_detector import VisionFaceDetector, get_default_face_detector
from .tile_detector import TileDetection, VisionTileDetector, get_default_tile_detector
from .schemas import (
    AnalyzeScanFaceRequest,
    AnalyzeScanFaceResponse,
    AnalyzedSticker,
    ColorProbabilities,
    DetectionBox,
    ImageSize,
    ImageQuality,
    Point,
    RgbColor,
    ScanColorAlternative,
    ScanGridDetection,
    ScanTileDetection,
    StickerQuality,
)


MAX_IMAGE_DECODE_BYTES = 1_000_000
MAX_PROCESSING_DIMENSION = 960
WARP_SIZE = 600
CENTER_MISMATCH_CONFIDENCE = 0.22
CENTER_MISMATCH_WITHOUT_REFERENCE_CONFIDENCE = 0.45
LOW_CONFIDENCE = 0.3
LOW_FACE_CONFIDENCE = 0.55
MIN_CONTOUR_FACE_CONFIDENCE = 0.34
MAX_CONTOUR_FACE_AREA_RATIO = 0.58
MIN_CONTOUR_GRID_CONFIDENCE = 0.46
MIN_STICKER_GRID_CANDIDATES = 5
MIN_STICKER_GRID_CONFIDENCE = 0.56
MIN_FACE_DETECTOR_ROI_GRID_CONFIDENCE = 0.42
MIN_TILE_DETECTOR_GRID_CONFIDENCE = 0.44
MIN_TILE_DETECTOR_GRID_CELLS = 6
MIN_FALLBACK_GRID_CONFIDENCE = 0.36
GUIDE_FALLBACK_MAX_CONFIDENCE = 0.62


TileCandidate = tuple[np.ndarray, float, float, str, float, tuple[float, float, float, float]]


@dataclass(frozen=True)
class TileGridDetection:
    index: int
    row: int
    column: int
    symbol: str
    confidence: float
    bbox: tuple[float, float, float, float]


@dataclass(frozen=True)
class TileGridAnalysis:
    detections: list[TileDetection]
    grid_detections: list[TileGridDetection]
    quad: np.ndarray | None
    confidence: float
    status: str


def analyze_face(
    request: AnalyzeScanFaceRequest,
    cnn: VisionCnn | None = None,
    face_detector: VisionFaceDetector | None = None,
    tile_detector: VisionTileDetector | None = None,
) -> AnalyzeScanFaceResponse:
    if request.expectedCenter not in SCAN_SYMBOLS:
        return failure("invalid_image", "expectedCenter must be one of U, R, F, D, L, B")

    image = decode_image(request.image)
    if image is None:
        return failure("invalid_image", "Could not decode the scan image.")

    image = resize_for_processing(image)
    height, width = image.shape[:2]
    image_quality, quality_warnings = image_quality_metrics(image)
    tile_detector = tile_detector or get_default_tile_detector()
    tile_grid_analysis = analyze_tile_detector_grid(image, tile_detector, request.expectedCenter)
    quad, detection_warnings, detection_mode, face_confidence = detect_face_quad(
        image,
        face_detector,
        tile_detector,
        request.expectedCenter,
        tile_grid_analysis,
    )
    if quad is None:
        warnings = quality_warnings + detection_warnings
        return AnalyzeScanFaceResponse(
            ok=False,
            status="face_not_found",
            message="Could not find a 3x3 cube face. Retake the photo with the face flatter and centered.",
            expectedCenter=request.expectedCenter,
            faceConfidence=face_confidence,
            detectionMode=detection_mode,
            imageSize=ImageSize(width=width, height=height),
            imageQuality=image_quality,
            tileDetections=tile_detection_responses(tile_grid_analysis.detections),
            gridDetections=grid_detection_responses(tile_grid_analysis.grid_detections),
            gridConfidence=tile_grid_analysis.confidence,
            gridStatus=tile_grid_analysis.status,
            qualityWarnings=warnings,
            warnings=warnings,
        )

    ordered_quad = order_points(quad)
    warped_for_color = warp_face(image, ordered_quad)
    warped_normalized = normalize_face_lighting(warped_for_color)
    stickers = []
    warnings = quality_warnings + detection_warnings
    grid_detections_by_index = {detection.index: detection for detection in tile_grid_analysis.grid_detections}
    center_grid_detection = grid_detections_by_index.get(4)
    center_rgb = sample_sticker_rgb(warped_for_color, 1, 1)
    color_center_classified = classify_rgb(center_rgb, request.knownCenters)
    center_symbol = center_grid_detection.symbol if center_grid_detection is not None else color_center_classified.symbol
    center_confidence = center_grid_detection.confidence if center_grid_detection is not None else color_center_classified.confidence
    center_mismatch_confidence = (
        CENTER_MISMATCH_CONFIDENCE
        if request.expectedCenter in request.knownCenters
        else CENTER_MISMATCH_WITHOUT_REFERENCE_CONFIDENCE
    )
    center_mismatch = (
        center_symbol != request.expectedCenter
        and center_confidence >= center_mismatch_confidence
        and not expected_center_still_plausible(center_rgb, request.expectedCenter)
    )
    effective_known_centers = dict(request.knownCenters)
    if not center_mismatch:
        effective_known_centers[request.expectedCenter] = center_rgb

    cnn = cnn or get_default_cnn()
    cnn_probabilities = cnn.predict_sticker_probabilities(warped_for_color)
    if cnn_probabilities is not None:
        warnings.append("cnn_used")
    elif cnn.model_configured and not cnn.available:
        warnings.append("cnn_unavailable")

    for index in range(9):
        row = index // 3
        column = index % 3
        grid_detection = grid_detections_by_index.get(index)
        rgb = sample_detection_bbox_rgb(image, grid_detection.bbox) if grid_detection is not None else sample_sticker_rgb(warped_for_color, row, column)
        estimated = estimate_color_probabilities(rgb, effective_known_centers)
        if estimated.margin < 0.08:
            normalized_rgb = sample_sticker_rgb(warped_normalized, row, column)
            normalized_estimated = estimate_color_probabilities(normalized_rgb, effective_known_centers)
            if normalized_estimated.margin > estimated.margin:
                rgb = normalized_rgb
                estimated = normalized_estimated
        color_estimated = estimated
        if grid_detection is not None:
            if grid_detection.symbol != color_estimated.symbol:
                warnings.append(f"detector_color_disagreement_{index}")
            estimated = estimated_color_from_probabilities(
                weighted_combined_probabilities(
                    estimated.probabilities,
                    probabilities_from_symbol(grid_detection.symbol, grid_detection.confidence),
                    0.42,
                )
            )
        if cnn_probabilities is not None and index < len(cnn_probabilities):
            estimated = estimated_color_from_probabilities(
                combined_probabilities(estimated.probabilities, cnn_probabilities[index])
            )
        sticker_symbol = grid_detection.symbol if grid_detection is not None else estimated.symbol
        sticker_confidence = min(max(grid_detection.confidence, estimated.confidence) if grid_detection is not None else estimated.confidence, face_confidence)
        if index != 4 and sticker_confidence < LOW_CONFIDENCE:
            warnings.append(f"low_confidence_sticker_{index}")
        stickers.append(
            AnalyzedSticker(
                index=index,
                symbol=sticker_symbol,
                confidence=1.0 if index == 4 else sticker_confidence,
                rgb=rgb,
                polygon=(bbox_polygon(grid_detection.bbox) if grid_detection is not None else sticker_polygon(ordered_quad, row, column, width, height)),
                alternatives=sticker_alternatives(sticker_symbol, estimated, grid_detection),
                probabilities=ColorProbabilities(**probabilities_with_primary_symbol(estimated.probabilities, sticker_symbol, sticker_confidence)),
                quality=(sticker_bbox_quality_metrics(image, grid_detection.bbox, estimated.margin) if grid_detection is not None else sticker_quality_metrics(warped_for_color, row, column, estimated.margin)),
            )
        )

    low_confidence = (
        face_confidence < LOW_FACE_CONFIDENCE
        or quality_warnings
        or any(warning.startswith("low_confidence_sticker_") for warning in warnings)
    )
    status = "center_mismatch" if center_mismatch else "low_confidence" if low_confidence else "detected"

    return AnalyzeScanFaceResponse(
        ok=not center_mismatch,
        status=status,
        message=(
            "Captured center does not match the expected face. Retake the photo with the expected face visible."
            if center_mismatch
            else "Photo captured with low confidence. Review highlighted squares or retake the photo."
            if low_confidence
            else None
        ),
        centerMismatch=center_mismatch,
        detectedCenter=center_symbol,
        expectedCenter=request.expectedCenter,
        confidence=center_confidence,
        detectedCenterConfidence=center_confidence,
        faceConfidence=face_confidence,
        detectionMode=detection_mode,
        imageSize=ImageSize(width=width, height=height),
        imageQuality=image_quality,
        faceQuad=normalize_polygon(ordered_quad, width, height),
        stickers=stickers,
        tileDetections=tile_detection_responses(tile_grid_analysis.detections),
        gridDetections=grid_detection_responses(tile_grid_analysis.grid_detections),
        gridConfidence=tile_grid_analysis.confidence,
        gridStatus=tile_grid_analysis.status,
        qualityWarnings=warnings,
        warnings=warnings,
    )


def combined_probabilities(
    color_probabilities: dict[str, float],
    cnn_probabilities: dict[str, float],
) -> dict[str, float]:
    return weighted_combined_probabilities(color_probabilities, cnn_probabilities, 0.55)


def weighted_combined_probabilities(
    left_probabilities: dict[str, float],
    right_probabilities: dict[str, float],
    left_weight: float,
) -> dict[str, float]:
    right_weight = 1.0 - left_weight
    return {
        symbol: left_probabilities.get(symbol, 0.0) * left_weight + right_probabilities.get(symbol, 0.0) * right_weight
        for symbol in SCAN_SYMBOLS
    }


def probabilities_from_symbol(symbol: str, confidence: float) -> dict[str, float]:
    clipped_confidence = clip01(confidence)
    remaining = (1.0 - clipped_confidence) / max(1, len(SCAN_SYMBOLS) - 1)
    return {candidate: clipped_confidence if candidate == symbol else remaining for candidate in SCAN_SYMBOLS}


def decode_image(image: str) -> np.ndarray | None:
    payload = image.split(",", 1)[1] if image.startswith("data:") and "," in image else image
    if len(payload) > MAX_IMAGE_DECODE_BYTES * 2:
        return None

    try:
        data = base64.b64decode(payload, validate=True)
    except binascii.Error:
        return None

    if len(data) > MAX_IMAGE_DECODE_BYTES:
        return None

    image_array = np.frombuffer(data, dtype=np.uint8)
    decoded = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    return decoded


def resize_for_processing(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    max_dimension = max(width, height)
    if max_dimension <= MAX_PROCESSING_DIMENSION:
        return image

    scale = MAX_PROCESSING_DIMENSION / max_dimension
    return cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)


def detect_face_quad(
    image: np.ndarray,
    face_detector: VisionFaceDetector | None = None,
    tile_detector: VisionTileDetector | None = None,
    expected_center: str | None = None,
    tile_grid_analysis: TileGridAnalysis | None = None,
) -> tuple[np.ndarray | None, list[str], str, float]:
    warnings: list[str] = []
    tile_detector = tile_detector or get_default_tile_detector()
    tile_grid_analysis = tile_grid_analysis or analyze_tile_detector_grid(image, tile_detector, expected_center)
    if tile_grid_analysis.quad is not None and tile_grid_analysis.confidence >= MIN_TILE_DETECTOR_GRID_CONFIDENCE:
        warnings.append("tile_detector_used")
        return tile_grid_analysis.quad, warnings, "tile_detector", tile_grid_analysis.confidence
    if tile_detector.model_configured and not tile_detector.available:
        warnings.append("tile_detector_unavailable")
    elif tile_detector.model_configured:
        warnings.append("tile_detector_rejected")

    sticker_quad, sticker_confidence = detect_sticker_grid_quad(image)
    if sticker_quad is not None and sticker_confidence >= MIN_STICKER_GRID_CONFIDENCE:
        return sticker_quad, warnings, "sticker_grid", sticker_confidence

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    blurred = cv2.GaussianBlur(clahe, (5, 5), 0)
    edges = cv2.Canny(blurred, 45, 135)
    kernel = np.ones((5, 5), dtype=np.uint8)
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = image.shape[:2]
    min_area = width * height * 0.08
    candidates = []

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.035 * perimeter, True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue

        quad = approx.reshape(4, 2).astype(np.float32)
        ordered_quad = order_points(quad)
        score = contour_face_confidence(image, ordered_quad, area)
        grid_confidence = grid_evidence_confidence(image, ordered_quad)
        candidates.append((score, quad, area / float(width * height), grid_confidence))

    if candidates:
        candidates.sort(key=lambda item: item[0], reverse=True)
        score, quad, area_ratio, grid_confidence = candidates[0]
        if (
            score >= MIN_CONTOUR_FACE_CONFIDENCE
            and area_ratio <= MAX_CONTOUR_FACE_AREA_RATIO
            and grid_confidence >= MIN_CONTOUR_GRID_CONFIDENCE
        ):
            return quad, warnings, "contour", score
        warnings.append("weak_face_contour")

    face_detector = face_detector or get_default_face_detector()
    detector_quad, detector_confidence = detect_face_quad_with_detector_roi(image, face_detector)
    if detector_quad is not None:
        warnings.append("face_detector_used")
        return detector_quad, warnings, "face_detector", detector_confidence
    if face_detector.model_configured and not face_detector.available:
        warnings.append("face_detector_unavailable")
    elif face_detector.model_configured:
        warnings.append("face_detector_rejected")

    fallback_quad = centered_fallback_quad(width, height)
    fallback_confidence = min(
        GUIDE_FALLBACK_MAX_CONFIDENCE,
        grid_evidence_confidence(image, fallback_quad),
    )
    if fallback_confidence >= MIN_FALLBACK_GRID_CONFIDENCE:
        warnings.append("using_center_guide_fallback")
        return fallback_quad, warnings, "guide_fallback", fallback_confidence

    warnings.append("face_detection_rejected")
    return None, warnings, "rejected", 0.0


def detect_face_quad_with_tile_detector_grid(
    image: np.ndarray,
    tile_detector: VisionTileDetector,
    expected_center: str | None = None,
) -> tuple[np.ndarray | None, float]:
    analysis = analyze_tile_detector_grid(image, tile_detector, expected_center)
    return analysis.quad, analysis.confidence


def analyze_tile_detector_grid(
    image: np.ndarray,
    tile_detector: VisionTileDetector,
    expected_center: str | None = None,
) -> TileGridAnalysis:
    detections = [detection for detection in tile_detector.detect(image) if detection.symbol != "face"]
    if len(detections) < MIN_STICKER_GRID_CANDIDATES:
        return TileGridAnalysis(detections=detections, grid_detections=[], quad=None, confidence=0.0, status="not_found")

    candidates = tile_detections_to_candidates(detections, image.shape[1], image.shape[0])
    best_quad: np.ndarray | None = None
    best_confidence = 0.0
    best_grid_detections: list[TileGridDetection] = []
    best_status = "not_found"
    for cluster in tile_detection_candidate_clusters(candidates):
        quad, confidence, grid_detections, status = tile_detection_grid_candidate_quad(image, cluster, expected_center)
        if quad is not None and confidence > best_confidence:
            best_quad = quad
            best_confidence = confidence
            best_grid_detections = grid_detections
            best_status = status

    if best_quad is None or best_confidence < MIN_TILE_DETECTOR_GRID_CONFIDENCE:
        return TileGridAnalysis(
            detections=detections,
            grid_detections=best_grid_detections,
            quad=None,
            confidence=best_confidence,
            status=best_status if best_grid_detections else "not_found",
        )

    return TileGridAnalysis(
        detections=detections,
        grid_detections=best_grid_detections,
        quad=best_quad,
        confidence=best_confidence,
        status=best_status,
    )


def tile_detections_to_candidates(
    detections: list[TileDetection],
    width: int,
    height: int,
) -> list[TileCandidate]:
    candidates = []
    for detection in detections:
        x, y, bbox_width, bbox_height = detection.bbox
        center = np.array([x * width, y * height], dtype=np.float32)
        box_width = bbox_width * width
        box_height = bbox_height * height
        area = box_width * box_height
        if area <= 0:
            continue
        candidates.append((center, float(area), float((box_width + box_height) / 2.0), detection.symbol, detection.confidence, detection.bbox))
    return candidates


def tile_detection_candidate_clusters(
    candidates: list[TileCandidate],
) -> list[list[TileCandidate]]:
    base_candidates = [(center, area, side) for center, area, side, _symbol, _confidence, _bbox in candidates]
    base_clusters = sticker_candidate_clusters(base_candidates)
    clusters = []
    for base_cluster in base_clusters:
        cluster_indexes = []
        for base_center, _base_area, _base_side in base_cluster:
            for index, (center, _area, _side, _symbol, _confidence, _bbox) in enumerate(candidates):
                if np.array_equal(base_center, center):
                    cluster_indexes.append(index)
                    break
        clusters.append([candidates[index] for index in cluster_indexes])
    return clusters


def tile_detection_grid_candidate_quad(
    image: np.ndarray,
    cluster: list[TileCandidate],
    expected_center: str | None,
) -> tuple[np.ndarray | None, float, list[TileGridDetection], str]:
    base_cluster = [(center, area, side) for center, area, side, _symbol, _confidence, _bbox in cluster]
    if len(base_cluster) < MIN_STICKER_GRID_CANDIDATES:
        return None, 0.0, [], "not_found"

    centers = np.array([candidate[0] for candidate in base_cluster], dtype=np.float32)
    axes = sticker_grid_axes(centers)
    if axes is None:
        return None, 0.0, [], "not_found"

    mean, u_axis, v_axis = axes
    relative = centers - mean
    u_values = relative @ u_axis
    v_values = relative @ v_axis
    u_range = float(np.max(u_values) - np.min(u_values))
    v_range = float(np.max(v_values) - np.min(v_values))
    if u_range < 24.0 or v_range < 24.0:
        return None, 0.0, [], "not_found"

    u_norm = (u_values - np.min(u_values)) / u_range
    v_norm = (v_values - np.min(v_values)) / v_range
    regularity_score, unique_cells, row_count, column_count, u_indexes, v_indexes = sticker_grid_regularity(
        u_norm,
        v_norm,
    )
    if unique_cells < MIN_TILE_DETECTOR_GRID_CELLS or row_count < 2 or column_count < 2:
        return None, 0.0, [], "not_found"

    symbols = [candidate[3] for candidate in cluster]
    confidences = [candidate[4] for candidate in cluster]
    center_symbols = [
        symbol
        for symbol, u_index, v_index in zip(symbols, u_indexes, v_indexes, strict=False)
        if int(u_index) == 1 and int(v_index) == 1
    ]
    quad = sticker_grid_homography_quad(centers, u_indexes, v_indexes)
    if quad is None:
        return None, 0.0, [], "partial"

    ordered_quad = order_points(quad)
    grid_score = grid_evidence_confidence(image, ordered_quad)
    center_score = 1.0 if expected_center is not None and expected_center in center_symbols else 0.72
    detection_score = float(np.mean(confidences)) if confidences else 0.0
    cell_score = clip01(unique_cells / 9.0)
    confidence = clip01(
        regularity_score * 0.32
        + grid_score * 0.18
        + detection_score * 0.22
        + cell_score * 0.18
        + center_score * 0.10
    )
    status = "ready" if unique_cells >= 8 else "partial"
    return ordered_quad, confidence, grid_detections_from_cluster(cluster, u_indexes, v_indexes), status


def grid_detections_from_cluster(
    cluster: list[TileCandidate],
    u_indexes: np.ndarray,
    v_indexes: np.ndarray,
) -> list[TileGridDetection]:
    detections_by_index: dict[int, TileGridDetection] = {}

    for candidate, u_index, v_index in zip(cluster, u_indexes, v_indexes, strict=False):
        _center, _area, _side, symbol, confidence, bbox = candidate
        row = int(v_index)
        column = int(u_index)
        index = row * 3 + column
        detection = TileGridDetection(
            index=index,
            row=row,
            column=column,
            symbol=symbol,
            confidence=confidence,
            bbox=bbox,
        )
        existing = detections_by_index.get(index)
        if existing is None or detection.confidence > existing.confidence:
            detections_by_index[index] = detection

    return [detections_by_index[index] for index in sorted(detections_by_index)]


def tile_detection_responses(detections: list[TileDetection]) -> list[ScanTileDetection]:
    return [
        ScanTileDetection(
            symbol=detection.symbol,
            confidence=detection.confidence,
            bbox=detection_box_response(detection.bbox),
        )
        for detection in detections
    ]


def grid_detection_responses(detections: list[TileGridDetection]) -> list[ScanGridDetection]:
    return [
        ScanGridDetection(
            index=detection.index,
            row=detection.row,
            column=detection.column,
            symbol=detection.symbol,
            confidence=detection.confidence,
            bbox=detection_box_response(detection.bbox),
        )
        for detection in detections
    ]


def detection_box_response(bbox: tuple[float, float, float, float]) -> DetectionBox:
    x, y, width, height = bbox
    return DetectionBox(x=x, y=y, width=width, height=height)


def detect_face_quad_with_detector_roi(
    image: np.ndarray,
    face_detector: VisionFaceDetector,
) -> tuple[np.ndarray | None, float]:
    face_detection = face_detector.detect(image)
    if face_detection is None:
        return None, 0.0

    roi = crop_roi_from_quad(image, face_detection.quad)
    if roi is None:
        return None, 0.0

    crop, offset = roi
    quad, grid_confidence = detect_sticker_grid_quad(crop)
    if quad is None or grid_confidence < MIN_FACE_DETECTOR_ROI_GRID_CONFIDENCE:
        return None, 0.0

    mapped_quad = quad + np.array(offset, dtype=np.float32)
    confidence = clip01(face_detection.confidence * 0.28 + grid_confidence * 0.72)
    return mapped_quad, confidence


def crop_roi_from_quad(image: np.ndarray, quad: np.ndarray) -> tuple[np.ndarray, tuple[int, int]] | None:
    height, width = image.shape[:2]
    x0 = max(0, int(np.floor(np.min(quad[:, 0]))))
    y0 = max(0, int(np.floor(np.min(quad[:, 1]))))
    x1 = min(width, int(np.ceil(np.max(quad[:, 0]))))
    y1 = min(height, int(np.ceil(np.max(quad[:, 1]))))

    if x1 - x0 < 40 or y1 - y0 < 40:
        return None

    return image[y0:y1, x0:x1], (x0, y0)


def image_quality_metrics(image: np.ndarray) -> tuple[ImageQuality, list[str]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mean_luminance = float(np.mean(gray))
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    glare_ratio = float(np.mean(gray > 245))
    shadow_ratio = float(np.mean(gray < 32))
    warnings: list[str] = []

    if mean_luminance < 38.0:
        warnings.append("image_too_dark")
    if mean_luminance > 238.0:
        warnings.append("image_too_bright")
    if blur_score < 18.0:
        warnings.append("image_blurry")

    return (
        ImageQuality(
            blurScore=blur_score,
            meanLuminance=mean_luminance,
            glareRatio=glare_ratio,
            shadowRatio=shadow_ratio,
        ),
        warnings,
    )


def sticker_quality_metrics(warped_bgr: np.ndarray, row: int, column: int, margin: float) -> StickerQuality:
    height, width = warped_bgr.shape[:2]
    cell_width = width / 3.0
    cell_height = height / 3.0
    patch_size = max(10, int(min(cell_width, cell_height) * 0.22))
    center_x = int(column * cell_width + cell_width * 0.5)
    center_y = int(row * cell_height + cell_height * 0.5)
    x0 = min(max(0, center_x - patch_size // 2), width - patch_size)
    y0 = min(max(0, center_y - patch_size // 2), height - patch_size)
    patch = warped_bgr[y0 : y0 + patch_size, x0 : x0 + patch_size]
    rgb = cv2.cvtColor(patch, cv2.COLOR_BGR2RGB)
    hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    return StickerQuality(
        colorVariance=float(np.mean(np.std(rgb.reshape(-1, 3), axis=0)) / 255.0),
        glareRatio=float(np.mean((value > 245) & (saturation < 60))),
        shadowRatio=float(np.mean(value < 35)),
        margin=clip01(margin),
    )


def sticker_bbox_quality_metrics(image: np.ndarray, bbox: tuple[float, float, float, float], margin: float) -> StickerQuality:
    patch = crop_bbox_patch(image, bbox, padding=0.54)
    if patch is None:
        return StickerQuality(colorVariance=0.0, glareRatio=0.0, shadowRatio=0.0, margin=clip01(margin))

    rgb = cv2.cvtColor(patch, cv2.COLOR_BGR2RGB)
    hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    return StickerQuality(
        colorVariance=float(np.mean(np.std(rgb.reshape(-1, 3), axis=0)) / 255.0),
        glareRatio=float(np.mean((value > 245) & (saturation < 60))),
        shadowRatio=float(np.mean(value < 35)),
        margin=clip01(margin),
    )


def sample_detection_bbox_rgb(image: np.ndarray, bbox: tuple[float, float, float, float]) -> RgbColor:
    patch = crop_bbox_patch(image, bbox, padding=0.36)
    if patch is None:
        return RgbColor(r=0, g=0, b=0)
    return trimmed_patch_rgb(patch)


def crop_bbox_patch(image: np.ndarray, bbox: tuple[float, float, float, float], padding: float) -> np.ndarray | None:
    height, width = image.shape[:2]
    x, y, bbox_width, bbox_height = bbox
    half_width = bbox_width * width * padding
    half_height = bbox_height * height * padding
    center_x = x * width
    center_y = y * height
    x0 = max(0, int(round(center_x - half_width)))
    y0 = max(0, int(round(center_y - half_height)))
    x1 = min(width, int(round(center_x + half_width)))
    y1 = min(height, int(round(center_y + half_height)))
    if x1 <= x0 or y1 <= y0:
        return None
    return image[y0:y1, x0:x1]


def bbox_polygon(bbox: tuple[float, float, float, float]) -> list[Point]:
    x, y, width, height = bbox
    half_width = width / 2.0
    half_height = height / 2.0
    return [
        Point(x=clip01(x - half_width), y=clip01(y - half_height)),
        Point(x=clip01(x + half_width), y=clip01(y - half_height)),
        Point(x=clip01(x + half_width), y=clip01(y + half_height)),
        Point(x=clip01(x - half_width), y=clip01(y + half_height)),
    ]


def sticker_alternatives(
    primary_symbol: str,
    estimated: object,
    grid_detection: TileGridDetection | None,
) -> list[ScanColorAlternative]:
    alternatives: dict[str, float] = {}
    if grid_detection is not None:
        alternatives[grid_detection.symbol] = grid_detection.confidence
    if hasattr(estimated, "symbol") and hasattr(estimated, "confidence"):
        alternatives[str(estimated.symbol)] = max(alternatives.get(str(estimated.symbol), 0.0), float(estimated.confidence))
    for alternative in getattr(estimated, "alternatives", []):
        alternatives[alternative.symbol] = max(alternatives.get(alternative.symbol, 0.0), alternative.confidence)
    alternatives[primary_symbol] = max(alternatives.get(primary_symbol, 0.0), 1.0 if grid_detection is None else grid_detection.confidence)
    return [
        ScanColorAlternative(symbol=symbol, confidence=clip01(confidence))
        for symbol, confidence in sorted(alternatives.items(), key=lambda item: item[1], reverse=True)[:3]
    ]


def probabilities_with_primary_symbol(
    probabilities: dict[str, float],
    primary_symbol: str,
    confidence: float,
) -> dict[str, float]:
    current = dict(probabilities)
    current[primary_symbol] = max(current.get(primary_symbol, 0.0), clip01(confidence))
    return current


def contour_face_confidence(image: np.ndarray, quad: np.ndarray, area: float) -> float:
    height, width = image.shape[:2]
    area_ratio = area / float(width * height)
    area_score = clip01((area_ratio - 0.08) / 0.42)

    center = np.mean(quad, axis=0)
    distance = math.dist((float(center[0]), float(center[1])), (width / 2.0, height / 2.0))
    center_score = 1.0 - clip01(distance / (min(width, height) * 0.38))

    lengths = [
        math.dist(tuple(quad[index]), tuple(quad[(index + 1) % 4]))
        for index in range(4)
    ]
    shortest = max(1.0, min(lengths))
    longest = max(lengths)
    square_score = 1.0 - clip01((longest / shortest - 1.0) / 0.85)
    grid_score = grid_evidence_confidence(image, quad)

    return clip01(area_score * 0.32 + center_score * 0.24 + square_score * 0.2 + grid_score * 0.24)


def detect_sticker_grid_quad(image: np.ndarray) -> tuple[np.ndarray | None, float]:
    candidates = find_sticker_candidates(image)
    if len(candidates) < MIN_STICKER_GRID_CANDIDATES:
        return None, 0.0

    best_quad: np.ndarray | None = None
    best_confidence = 0.0
    candidate_clusters = sticker_candidate_clusters(candidates)

    for cluster in candidate_clusters:
        quad, confidence = sticker_grid_candidate_quad(image, cluster)
        if quad is not None and confidence > best_confidence:
            best_quad = quad
            best_confidence = confidence

    return best_quad, best_confidence


def find_sticker_candidates(image: np.ndarray) -> list[tuple[np.ndarray, float, float]]:
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    color_mask = (saturation > 45) & (value > 45)
    white_mask = (saturation < 70) & (value > 145)
    mask = np.where(color_mask | white_mask, 255, 0).astype(np.uint8)
    kernel = np.ones((5, 5), dtype=np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = image.shape[:2]
    image_area = float(width * height)
    candidates: list[tuple[np.ndarray, float, float]] = []

    for contour in contours:
        candidates.extend(sticker_candidates_from_contour(contour, image_area))

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    edges = cv2.Canny(cv2.GaussianBlur(clahe, (3, 3), 0), 35, 110)
    edge_contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    for contour in edge_contours:
        candidates.extend(sticker_candidates_from_contour(contour, image_area))

    return dedupe_sticker_candidates(candidates)


def sticker_candidates_from_contour(
    contour: np.ndarray,
    image_area: float,
) -> list[tuple[np.ndarray, float, float]]:
    area = cv2.contourArea(contour)
    min_area = image_area * 0.0010
    max_area = image_area * 0.16
    if area < min_area or area > max_area:
        return []

    center, size, _angle = cv2.minAreaRect(contour)
    rect_width, rect_height = size
    shortest = min(rect_width, rect_height)
    longest = max(rect_width, rect_height)
    if shortest < 10:
        return []

    aspect = longest / max(1.0, shortest)
    extent = area / max(1.0, rect_width * rect_height)
    if extent < 0.34 or aspect > 3.6:
        return []

    side = (rect_width + rect_height) / 2.0
    if aspect >= 1.55:
        split_count = max(2, min(3, round(aspect)))
        if area / split_count >= min_area:
            return [
                (split_center, float(area / split_count), shortest)
                for split_center in split_contour_centers(contour, split_count)
            ]

    if area > image_area * 0.08 and aspect < 1.35:
        return []

    return [(np.array(center, dtype=np.float32), float(area), side)]


def split_contour_centers(contour: np.ndarray, split_count: int) -> list[np.ndarray]:
    points = contour.reshape(-1, 2).astype(np.float32)
    mean = np.mean(points, axis=0)
    covariance = np.cov((points - mean).T)
    if covariance.shape != (2, 2) or not np.all(np.isfinite(covariance)):
        return [mean]

    eigenvalues, eigenvectors = np.linalg.eigh(covariance)
    axis = eigenvectors[:, int(np.argmax(eigenvalues))].astype(np.float32)
    axis = axis / max(1e-6, float(np.linalg.norm(axis)))
    projections = (points - mean) @ axis
    minimum = float(np.min(projections))
    maximum = float(np.max(projections))
    step = (maximum - minimum) / split_count

    return [
        mean + axis * (minimum + step * (index + 0.5))
        for index in range(split_count)
    ]


def dedupe_sticker_candidates(
    candidates: list[tuple[np.ndarray, float, float]],
) -> list[tuple[np.ndarray, float, float]]:
    deduped: list[tuple[np.ndarray, float, float]] = []

    for candidate in sorted(candidates, key=lambda item: item[1], reverse=True):
        center, _area, side = candidate
        duplicate_index = next(
            (
                index
                for index, (existing_center, _existing_area, existing_side) in enumerate(deduped)
                if np.linalg.norm(center - existing_center) < max(8.0, min(side, existing_side) * 0.35)
            ),
            None,
        )
        if duplicate_index is None:
            deduped.append(candidate)

    return deduped


def sticker_candidate_clusters(
    candidates: list[tuple[np.ndarray, float, float]],
) -> list[list[tuple[np.ndarray, float, float]]]:
    clusters: list[list[tuple[np.ndarray, float, float]]] = []
    seen_signatures: set[tuple[int, ...]] = set()

    for anchor_index, (anchor_center, _area, anchor_side) in enumerate(candidates):
        radius = max(60.0, anchor_side * 5.2)
        distances = [
            (index, float(np.linalg.norm(center - anchor_center)))
            for index, (center, _area, _side) in enumerate(candidates)
        ]
        nearby_indexes = [index for index, distance in sorted(distances, key=lambda item: item[1]) if distance <= radius]
        if anchor_index not in nearby_indexes:
            nearby_indexes.append(anchor_index)
        nearby_indexes = nearby_indexes[:12]
        if len(nearby_indexes) < MIN_STICKER_GRID_CANDIDATES:
            continue

        signature = tuple(sorted(nearby_indexes))
        if signature in seen_signatures:
            continue

        seen_signatures.add(signature)
        clusters.append([candidates[index] for index in signature])

    if len(candidates) <= 12:
        signature = tuple(range(len(candidates)))
        if signature not in seen_signatures:
            clusters.append(candidates)

    return clusters


def sticker_grid_candidate_quad(
    image: np.ndarray,
    cluster: list[tuple[np.ndarray, float, float]],
) -> tuple[np.ndarray | None, float]:
    if len(cluster) < MIN_STICKER_GRID_CANDIDATES:
        return None, 0.0

    centers = np.array([candidate[0] for candidate in cluster], dtype=np.float32)
    axes = sticker_grid_axes(centers)
    if axes is None:
        return None, 0.0

    mean, u_axis, v_axis = axes
    relative = centers - mean
    u_values = relative @ u_axis
    v_values = relative @ v_axis
    u_range = float(np.max(u_values) - np.min(u_values))
    v_range = float(np.max(v_values) - np.min(v_values))
    if u_range < 24.0 or v_range < 24.0:
        return None, 0.0

    u_norm = (u_values - np.min(u_values)) / u_range
    v_norm = (v_values - np.min(v_values)) / v_range
    regularity_score, unique_cells, row_count, column_count, u_indexes, v_indexes = sticker_grid_regularity(
        u_norm,
        v_norm,
    )
    if unique_cells < MIN_STICKER_GRID_CANDIDATES or row_count < 2 or column_count < 2:
        return None, 0.0

    quad = sticker_grid_homography_quad(centers, u_indexes, v_indexes)
    if quad is None:
        center_point = mean + u_axis * float((np.min(u_values) + np.max(u_values)) / 2.0) + v_axis * float(
            (np.min(v_values) + np.max(v_values)) / 2.0
        )
        half_u = u_axis * (u_range * 0.75)
        half_v = v_axis * (v_range * 0.75)
        quad = np.array(
            [
                center_point - half_u - half_v,
                center_point + half_u - half_v,
                center_point + half_u + half_v,
                center_point - half_u + half_v,
            ],
            dtype=np.float32,
        )
    ordered_quad = order_points(quad)
    height, width = image.shape[:2]
    face_area_ratio = cv2.contourArea(ordered_quad) / float(width * height)
    area_score = clip01((face_area_ratio - 0.035) / 0.34)
    aspect_score = 1.0 - clip01((max(u_range, v_range) / max(1.0, min(u_range, v_range)) - 1.0) / 0.9)
    count_score = clip01(unique_cells / 9.0)
    side_lengths = [candidate[2] for candidate in cluster]
    side_similarity = 1.0 - clip01(float(np.std(side_lengths) / max(1.0, np.mean(side_lengths))) / 0.75)
    grid_score = grid_evidence_confidence(image, ordered_quad)
    confidence = clip01(
        count_score * 0.28
        + regularity_score * 0.26
        + area_score * 0.16
        + aspect_score * 0.12
        + side_similarity * 0.08
        + grid_score * 0.10
    )

    return ordered_quad, confidence


def sticker_grid_axes(centers: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray] | None:
    if len(centers) < MIN_STICKER_GRID_CANDIDATES:
        return None

    mean = np.mean(centers, axis=0)
    covariance = np.cov((centers - mean).T)
    if covariance.shape != (2, 2) or not np.all(np.isfinite(covariance)):
        return None

    eigenvalues, eigenvectors = np.linalg.eigh(covariance)
    order = np.argsort(eigenvalues)[::-1]
    u_axis = eigenvectors[:, order[0]].astype(np.float32)
    v_axis = eigenvectors[:, order[1]].astype(np.float32)
    if np.linalg.norm(u_axis) == 0 or np.linalg.norm(v_axis) == 0:
        return None

    u_axis = u_axis / np.linalg.norm(u_axis)
    v_axis = v_axis / np.linalg.norm(v_axis)
    return mean.astype(np.float32), u_axis, v_axis


def sticker_grid_homography_quad(
    centers: np.ndarray,
    u_indexes: np.ndarray,
    v_indexes: np.ndarray,
) -> np.ndarray | None:
    cell_points: dict[tuple[int, int], np.ndarray] = {}
    for center, u_index, v_index in zip(centers, u_indexes, v_indexes, strict=False):
        cell = (int(u_index), int(v_index))
        if cell not in cell_points:
            cell_points[cell] = center

    if len(cell_points) < 4:
        return None

    source_points = np.array(
        [[u_index + 0.5, v_index + 0.5] for u_index, v_index in cell_points.keys()],
        dtype=np.float32,
    )
    target_points = np.array(list(cell_points.values()), dtype=np.float32)
    homography, _mask = cv2.findHomography(source_points, target_points, 0)
    if homography is None:
        return None

    corners = np.array([[[0.0, 0.0], [3.0, 0.0], [3.0, 3.0], [0.0, 3.0]]], dtype=np.float32)
    return cv2.perspectiveTransform(corners, homography)[0].astype(np.float32)


def sticker_grid_regularity(
    u_norm: np.ndarray,
    v_norm: np.ndarray,
) -> tuple[float, int, int, int, np.ndarray, np.ndarray]:
    grid_positions = np.array([0.0, 0.5, 1.0], dtype=np.float32)
    u_indexes = np.argmin(np.abs(u_norm[:, None] - grid_positions[None, :]), axis=1)
    v_indexes = np.argmin(np.abs(v_norm[:, None] - grid_positions[None, :]), axis=1)
    u_distances = np.min(np.abs(u_norm[:, None] - grid_positions[None, :]), axis=1)
    v_distances = np.min(np.abs(v_norm[:, None] - grid_positions[None, :]), axis=1)
    mean_distance = float(np.mean(np.hypot(u_distances, v_distances)))
    regularity = clip01(1.0 - mean_distance / 0.18)
    unique_cells = len({(int(u_index), int(v_index)) for u_index, v_index in zip(u_indexes, v_indexes, strict=False)})
    row_count = len(set(int(index) for index in v_indexes))
    column_count = len(set(int(index) for index in u_indexes))
    return regularity, unique_cells, row_count, column_count, u_indexes, v_indexes


def grid_evidence_score(image: np.ndarray, quad: np.ndarray) -> float:
    warped = warp_face(image, quad)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    score = 0.0
    for fraction in (1 / 3, 2 / 3):
        x = int(WARP_SIZE * fraction)
        y = int(WARP_SIZE * fraction)
        score += float(np.std(gray[:, max(0, x - 2) : min(WARP_SIZE, x + 2)]))
        score += float(np.std(gray[max(0, y - 2) : min(WARP_SIZE, y + 2), :]))
    return score * 1000.0


def grid_evidence_confidence(image: np.ndarray, quad: np.ndarray) -> float:
    return clip01(grid_evidence_score(image, quad) / 70_000.0)


def expected_center_still_plausible(rgb: RgbColor, expected_center: str) -> bool:
    return expected_center == "U" and neutral_white_likelihood(rgb) >= 0.48


def centered_fallback_quad(width: int, height: int) -> np.ndarray:
    size = min(width, height) * 0.72
    start_x = (width - size) / 2
    start_y = (height - size) / 2
    return np.array(
        [
            [start_x, start_y],
            [start_x + size, start_y],
            [start_x + size, start_y + size],
            [start_x, start_y + size],
        ],
        dtype=np.float32,
    )


def order_points(points: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype=np.float32)
    sums = points.sum(axis=1)
    diffs = np.diff(points, axis=1).reshape(4)
    rect[0] = points[np.argmin(sums)]
    rect[2] = points[np.argmax(sums)]
    rect[1] = points[np.argmin(diffs)]
    rect[3] = points[np.argmax(diffs)]
    return rect


def warp_face(image: np.ndarray, quad: np.ndarray) -> np.ndarray:
    target = np.array(
        [[0, 0], [WARP_SIZE - 1, 0], [WARP_SIZE - 1, WARP_SIZE - 1], [0, WARP_SIZE - 1]],
        dtype=np.float32,
    )
    transform = cv2.getPerspectiveTransform(quad.astype(np.float32), target)
    return cv2.warpPerspective(image, transform, (WARP_SIZE, WARP_SIZE))


def sticker_polygon(quad: np.ndarray, row: int, column: int, width: int, height: int) -> list[Point]:
    points = []
    for x_fraction, y_fraction in (
        (column / 3, row / 3),
        ((column + 1) / 3, row / 3),
        ((column + 1) / 3, (row + 1) / 3),
        (column / 3, (row + 1) / 3),
    ):
        point = interpolate_quad(quad, x_fraction, y_fraction)
        points.append(Point(x=clip01(point[0] / width), y=clip01(point[1] / height)))
    return points


def interpolate_quad(quad: np.ndarray, x_fraction: float, y_fraction: float) -> np.ndarray:
    top = quad[0] * (1 - x_fraction) + quad[1] * x_fraction
    bottom = quad[3] * (1 - x_fraction) + quad[2] * x_fraction
    return top * (1 - y_fraction) + bottom * y_fraction


def normalize_polygon(points: np.ndarray, width: int, height: int) -> list[Point]:
    return [Point(x=clip01(float(point[0] / width)), y=clip01(float(point[1] / height))) for point in points]


def clip01(value: float) -> float:
    return min(1.0, max(0.0, value))


def failure(status: str, message: str) -> AnalyzeScanFaceResponse:
    return AnalyzeScanFaceResponse(ok=False, status=status, message=message, warnings=[])
