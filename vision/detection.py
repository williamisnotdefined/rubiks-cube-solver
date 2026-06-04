from __future__ import annotations

import base64
import binascii

import cv2
import numpy as np

from .color import SCAN_SYMBOLS
from .schemas import (
    AnalyzeScanFaceRequest,
    AnalyzeScanFaceResponse,
    DetectionBox,
    ImageQuality,
    ImageSize,
    ScanTileDetection,
)
from .tile_detector import TileDetection, VisionTileDetector, get_default_tile_detector


MAX_IMAGE_DECODE_BYTES = 1_000_000
MAX_PROCESSING_DIMENSION = 960


def analyze_face(
    request: AnalyzeScanFaceRequest,
    tile_detector: VisionTileDetector | None = None,
) -> AnalyzeScanFaceResponse:
    if request.expectedCenter not in SCAN_SYMBOLS:
        return failure("invalid_image", "expectedCenter must be one of U, R, F, D, L, B")
    grid_size = request.gridSize
    target_tile_count = grid_size * grid_size

    image = decode_image(request.image)
    if image is None:
        return failure("invalid_image", "Could not decode the scan image.")

    image = resize_for_processing(image)
    height, width = image.shape[:2]
    image_quality, quality_warnings = image_quality_metrics(image)
    tile_detector = tile_detector or get_default_tile_detector()
    raw_detections = tile_detector.detect(image)
    face_detection = best_face_detection(raw_detections)
    tile_detections = grounded_tile_detections(
        [detection for detection in raw_detections if detection.symbol != "face"],
        face_detection,
    )
    average_tile_confidence = float(np.mean([detection.confidence for detection in tile_detections])) if tile_detections else 0.0

    if len(tile_detections) < target_tile_count:
        warnings = quality_warnings.copy()
        if tile_detector.model_configured and not tile_detector.available:
            warnings.append("tile_detector_unavailable")
        elif tile_detector.model_configured:
            warnings.append("tile_detector_partial")
        return AnalyzeScanFaceResponse(
            ok=False,
            status="face_not_found",
            message=f"Could not find {target_tile_count} sticker tiles. Keep one cube face visible and steady.",
            expectedCenter=request.expectedCenter,
            faceConfidence=average_tile_confidence,
            detectionMode="tile_detector",
            imageSize=ImageSize(width=width, height=height),
            imageQuality=image_quality,
            tileDetections=tile_detection_responses(tile_detections),
            qualityWarnings=warnings,
            warnings=warnings,
        )

    ordered_tiles = ordered_tile_detections(tile_detections, grid_size=grid_size)
    center_index = scan_center_index(grid_size)
    center_symbol = ordered_tiles[center_index].symbol if ordered_tiles is not None and center_index is not None else None
    center_confidence = ordered_tiles[center_index].confidence if ordered_tiles is not None and center_index is not None else 0.0
    center_mismatch = center_symbol is not None and center_symbol != request.expectedCenter

    return AnalyzeScanFaceResponse(
        ok=not center_mismatch,
        status="center_mismatch" if center_mismatch else "detected",
        message="Detected center does not match the expected face." if center_mismatch else None,
        centerMismatch=center_mismatch,
        detectedCenter=center_symbol,
        expectedCenter=request.expectedCenter,
        confidence=center_confidence or average_tile_confidence,
        detectedCenterConfidence=center_confidence,
        faceConfidence=average_tile_confidence,
        detectionMode="tile_detector",
        imageSize=ImageSize(width=width, height=height),
        imageQuality=image_quality,
        tileDetections=tile_detection_responses(tile_detections),
        qualityWarnings=quality_warnings,
        warnings=quality_warnings,
    )


def ordered_tile_detections(detections: list[TileDetection], grid_size: int = 3) -> list[TileDetection] | None:
    target_tile_count = grid_size * grid_size
    candidates = sorted(detections, key=lambda detection: detection.confidence, reverse=True)[:target_tile_count]
    if len(candidates) != target_tile_count:
        return None

    rows = []
    for row_start in range(0, target_tile_count, grid_size):
        row = sorted(candidates, key=lambda detection: detection.bbox[1])[row_start : row_start + grid_size]
        rows.append(sorted(row, key=lambda detection: detection.bbox[0]))

    return [detection for row in rows for detection in row]


def scan_center_index(grid_size: int) -> int | None:
    return 4 if grid_size == 3 else None


def best_face_detection(detections: list[TileDetection]) -> TileDetection | None:
    faces = [detection for detection in detections if detection.symbol == "face"]
    return max(faces, key=lambda detection: detection.confidence, default=None)


def grounded_tile_detections(
    detections: list[TileDetection],
    face_detection: TileDetection | None,
) -> list[TileDetection]:
    if face_detection is None:
        return detections

    return [detection for detection in detections if bbox_center_inside(detection.bbox, face_detection.bbox)]


def bbox_center_inside(
    bbox: tuple[float, float, float, float],
    container: tuple[float, float, float, float],
    margin: float = 0.02,
) -> bool:
    x, y, _width, _height = bbox
    x0, y0, x1, y1 = bbox_xyxy(container)
    return x0 - margin <= x <= x1 + margin and y0 - margin <= y <= y1 + margin


def bbox_xyxy(bbox: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    x, y, width, height = bbox
    return (
        max(0.0, x - width / 2.0),
        max(0.0, y - height / 2.0),
        min(1.0, x + width / 2.0),
        min(1.0, y + height / 2.0),
    )


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
    return cv2.imdecode(image_array, cv2.IMREAD_COLOR)


def resize_for_processing(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    max_dimension = max(width, height)
    if max_dimension <= MAX_PROCESSING_DIMENSION:
        return image

    scale = MAX_PROCESSING_DIMENSION / max_dimension
    return cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)


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
    if glare_ratio > 0.08:
        warnings.append("image_glare")

    return (
        ImageQuality(
            blurScore=blur_score,
            meanLuminance=mean_luminance,
            glareRatio=glare_ratio,
            shadowRatio=shadow_ratio,
        ),
        warnings,
    )


def tile_detection_responses(detections: list[TileDetection]) -> list[ScanTileDetection]:
    return [
        ScanTileDetection(
            symbol=detection.symbol,
            confidence=detection.confidence,
            bbox=detection_box_response(detection.bbox),
        )
        for detection in detections
    ]


def detection_box_response(bbox: tuple[float, float, float, float]) -> DetectionBox:
    x, y, width, height = bbox
    return DetectionBox(x=x, y=y, width=width, height=height)


def failure(status: str, message: str) -> AnalyzeScanFaceResponse:
    return AnalyzeScanFaceResponse(ok=False, status=status, message=message, warnings=[])
