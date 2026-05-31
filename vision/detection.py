from __future__ import annotations

import base64
import binascii
import math

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
)
from .cnn import VisionCnn, get_default_cnn
from .schemas import (
    AnalyzeScanFaceRequest,
    AnalyzeScanFaceResponse,
    AnalyzedSticker,
    ColorProbabilities,
    ImageSize,
    ImageQuality,
    Point,
    RgbColor,
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
MIN_STICKER_GRID_CANDIDATES = 5
MIN_STICKER_GRID_CONFIDENCE = 0.56
MIN_FALLBACK_GRID_CONFIDENCE = 0.36
GUIDE_FALLBACK_MAX_CONFIDENCE = 0.62


def analyze_face(request: AnalyzeScanFaceRequest, cnn: VisionCnn | None = None) -> AnalyzeScanFaceResponse:
    if request.expectedCenter not in SCAN_SYMBOLS:
        return failure("invalid_image", "expectedCenter must be one of U, R, F, D, L, B")

    image = decode_image(request.image)
    if image is None:
        return failure("invalid_image", "Could not decode the scan image.")

    image = resize_for_processing(image)
    height, width = image.shape[:2]
    image_quality, quality_warnings = image_quality_metrics(image)
    quad, detection_warnings, detection_mode, face_confidence = detect_face_quad(image)
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
            qualityWarnings=warnings,
            warnings=warnings,
        )

    ordered_quad = order_points(quad)
    warped_for_color = warp_face(image, ordered_quad)
    warped_normalized = normalize_face_lighting(warped_for_color)
    stickers = []
    warnings = quality_warnings + detection_warnings
    center_rgb = sample_sticker_rgb(warped_for_color, 1, 1)
    center_classified = classify_rgb(center_rgb, request.knownCenters)
    center_mismatch_confidence = (
        CENTER_MISMATCH_CONFIDENCE
        if request.expectedCenter in request.knownCenters
        else CENTER_MISMATCH_WITHOUT_REFERENCE_CONFIDENCE
    )
    center_mismatch = (
        center_classified.symbol != request.expectedCenter
        and center_classified.confidence >= center_mismatch_confidence
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
        rgb = sample_sticker_rgb(warped_for_color, row, column)
        estimated = estimate_color_probabilities(rgb, effective_known_centers)
        if estimated.margin < 0.08:
            normalized_rgb = sample_sticker_rgb(warped_normalized, row, column)
            normalized_estimated = estimate_color_probabilities(normalized_rgb, effective_known_centers)
            if normalized_estimated.margin > estimated.margin:
                rgb = normalized_rgb
                estimated = normalized_estimated
        if cnn_probabilities is not None and index < len(cnn_probabilities):
            estimated = estimated_color_from_probabilities(
                combined_probabilities(estimated.probabilities, cnn_probabilities[index])
            )
        sticker_confidence = min(estimated.confidence, face_confidence)
        if index != 4 and sticker_confidence < LOW_CONFIDENCE:
            warnings.append(f"low_confidence_sticker_{index}")
        stickers.append(
            AnalyzedSticker(
                index=index,
                symbol=request.expectedCenter if index == 4 else estimated.symbol,
                confidence=1.0 if index == 4 else sticker_confidence,
                rgb=rgb,
                polygon=sticker_polygon(ordered_quad, row, column, width, height),
                alternatives=estimated.alternatives,
                probabilities=ColorProbabilities(**estimated.probabilities),
                quality=sticker_quality_metrics(warped_for_color, row, column, estimated.margin),
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
        detectedCenter=center_classified.symbol,
        expectedCenter=request.expectedCenter,
        confidence=center_classified.confidence,
        detectedCenterConfidence=center_classified.confidence,
        faceConfidence=face_confidence,
        detectionMode=detection_mode,
        imageSize=ImageSize(width=width, height=height),
        imageQuality=image_quality,
        faceQuad=normalize_polygon(ordered_quad, width, height),
        stickers=stickers,
        qualityWarnings=warnings,
        warnings=warnings,
    )


def combined_probabilities(
    color_probabilities: dict[str, float],
    cnn_probabilities: dict[str, float],
) -> dict[str, float]:
    return {
        symbol: color_probabilities.get(symbol, 0.0) * 0.55 + cnn_probabilities.get(symbol, 0.0) * 0.45
        for symbol in SCAN_SYMBOLS
    }


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


def detect_face_quad(image: np.ndarray) -> tuple[np.ndarray | None, list[str], str, float]:
    warnings: list[str] = []
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
        score = contour_face_confidence(image, order_points(quad), area)
        candidates.append((score, quad))

    if candidates:
        candidates.sort(key=lambda item: item[0], reverse=True)
        score, quad = candidates[0]
        if score >= MIN_CONTOUR_FACE_CONFIDENCE:
            return quad, warnings, "contour", score
        warnings.append("weak_face_contour")

    sticker_quad, sticker_confidence = detect_sticker_grid_quad(image)
    if sticker_quad is not None and sticker_confidence >= MIN_STICKER_GRID_CONFIDENCE:
        return sticker_quad, warnings, "sticker_grid", sticker_confidence

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
