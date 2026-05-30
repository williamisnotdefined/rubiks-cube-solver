from __future__ import annotations

import base64
import binascii
import math

import cv2
import numpy as np

from .color import SCAN_SYMBOLS, classify_rgb, neutral_white_likelihood, sample_sticker_rgb
from .schemas import (
    AnalyzeScanFaceRequest,
    AnalyzeScanFaceResponse,
    AnalyzedSticker,
    ImageSize,
    Point,
    RgbColor,
)


MAX_IMAGE_DECODE_BYTES = 1_000_000
MAX_PROCESSING_DIMENSION = 960
WARP_SIZE = 600
CENTER_MISMATCH_CONFIDENCE = 0.22
CENTER_MISMATCH_WITHOUT_REFERENCE_CONFIDENCE = 0.45
LOW_CONFIDENCE = 0.3
LOW_FACE_CONFIDENCE = 0.55
MIN_CONTOUR_FACE_CONFIDENCE = 0.34
MIN_FALLBACK_GRID_CONFIDENCE = 0.36
GUIDE_FALLBACK_MAX_CONFIDENCE = 0.62


def analyze_face(request: AnalyzeScanFaceRequest) -> AnalyzeScanFaceResponse:
    if request.expectedCenter not in SCAN_SYMBOLS:
        return failure("invalid_image", "expectedCenter must be one of U, R, F, D, L, B")

    image = decode_image(request.image)
    if image is None:
        return failure("invalid_image", "Could not decode the scan image.")

    image = resize_for_processing(image)
    height, width = image.shape[:2]
    quality_warnings = image_quality_warnings(image)
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
            qualityWarnings=warnings,
            warnings=warnings,
        )

    ordered_quad = order_points(quad)
    warped = warp_face(image, ordered_quad)
    stickers = []
    warnings = quality_warnings + detection_warnings

    for index in range(9):
        row = index // 3
        column = index % 3
        rgb = sample_sticker_rgb(warped, row, column)
        classified = classify_rgb(rgb, request.knownCenters)
        sticker_confidence = min(classified.confidence, face_confidence)
        if index != 4 and sticker_confidence < LOW_CONFIDENCE:
            warnings.append(f"low_confidence_sticker_{index}")
        stickers.append(
            AnalyzedSticker(
                index=index,
                symbol=request.expectedCenter if index == 4 else classified.symbol,
                confidence=1.0 if index == 4 else sticker_confidence,
                rgb=rgb,
                polygon=sticker_polygon(ordered_quad, row, column, width, height),
                alternatives=classified.alternatives,
            )
        )

    center_rgb = stickers[4].rgb
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
        faceQuad=normalize_polygon(ordered_quad, width, height),
        stickers=stickers,
        qualityWarnings=warnings,
        warnings=warnings,
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


def image_quality_warnings(image: np.ndarray) -> list[str]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mean_luminance = float(np.mean(gray))
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    warnings: list[str] = []

    if mean_luminance < 38.0:
        warnings.append("image_too_dark")
    if mean_luminance > 238.0:
        warnings.append("image_too_bright")
    if blur_score < 18.0:
        warnings.append("image_blurry")

    return warnings


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
