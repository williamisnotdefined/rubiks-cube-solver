from __future__ import annotations

import math
from dataclasses import dataclass

import cv2
import numpy as np

from .schemas import RgbColor, ScanColorAlternative


SCAN_SYMBOLS = ("U", "R", "F", "D", "L", "B")
NEUTRAL_WHITE_THRESHOLD = 0.62
DEFAULT_REFERENCES: dict[str, RgbColor] = {
    "U": RgbColor(r=248, g=250, b=252),
    "R": RgbColor(r=239, g=68, b=68),
    "F": RgbColor(r=34, g=197, b=94),
    "D": RgbColor(r=250, g=204, b=21),
    "L": RgbColor(r=249, g=115, b=22),
    "B": RgbColor(r=37, g=99, b=235),
}


@dataclass(frozen=True)
class ClassifiedColor:
    symbol: str
    confidence: float
    alternatives: list[ScanColorAlternative]


def classify_rgb(rgb: RgbColor, known_centers: dict[str, RgbColor]) -> ClassifiedColor:
    lab = rgb_to_lab(rgb)
    distances = sorted(
        (
            (symbol, lab_distance(lab, rgb_to_lab(reference_for_symbol(symbol, known_centers))))
            for symbol in SCAN_SYMBOLS
        ),
        key=lambda item: item[1],
    )
    best_symbol, best_distance = distances[0]
    second_distance = distances[1][1]
    confidence = 1.0 if second_distance == 0 else (second_distance - best_distance) / second_distance
    white_likelihood = neutral_white_likelihood(rgb)

    if white_likelihood >= NEUTRAL_WHITE_THRESHOLD:
        u_distance = next(distance for symbol, distance in distances if symbol == "U")
        nearest_non_u_distance = min(distance for symbol, distance in distances if symbol != "U")
        u_distance_confidence = (
            1.0
            if nearest_non_u_distance == 0
            else (nearest_non_u_distance - u_distance) / nearest_non_u_distance
        )
        distances = sorted(distances, key=lambda item: (item[0] != "U", item[1]))

        return ClassifiedColor(
            symbol="U",
            confidence=clamp01(max(white_likelihood * 0.86, u_distance_confidence)),
            alternatives=color_alternatives(distances),
        )

    return ClassifiedColor(
        symbol=best_symbol,
        confidence=clamp01(confidence),
        alternatives=color_alternatives(distances),
    )


def color_alternatives(distances: list[tuple[str, float]]) -> list[ScanColorAlternative]:
    return [
        ScanColorAlternative(symbol=symbol, confidence=clamp01(1.0 - distance / 100.0))
        for symbol, distance in distances[:3]
    ]


def neutral_white_likelihood(rgb: RgbColor) -> float:
    hsv = rgb_to_hsv(rgb)
    saturation = float(hsv[1])
    value = float(hsv[2])

    if value < 0.32 or saturation > 0.42:
        return 0.0

    neutral_score = 1.0 - saturation / 0.42
    brightness_score = clamp01((value - 0.32) / 0.45)
    return clamp01(neutral_score * 0.72 + brightness_score * 0.28)


def sample_sticker_rgb(warped_bgr: np.ndarray, row: int, column: int) -> RgbColor:
    height, width = warped_bgr.shape[:2]
    cell_width = width / 3.0
    cell_height = height / 3.0
    patch_size = max(8, int(min(cell_width, cell_height) * 0.16))
    offsets = ((0.5, 0.5), (0.38, 0.5), (0.62, 0.5), (0.5, 0.38), (0.5, 0.62))
    samples = []

    for offset_x, offset_y in offsets:
        center_x = int(column * cell_width + cell_width * offset_x)
        center_y = int(row * cell_height + cell_height * offset_y)
        x0 = min(max(0, center_x - patch_size // 2), width - patch_size)
        y0 = min(max(0, center_y - patch_size // 2), height - patch_size)
        patch = warped_bgr[y0 : y0 + patch_size, x0 : x0 + patch_size]
        samples.append(trimmed_patch_rgb(patch))

    return median_rgb(samples)


def trimmed_patch_rgb(patch_bgr: np.ndarray) -> RgbColor:
    rgb = cv2.cvtColor(patch_bgr, cv2.COLOR_BGR2RGB).reshape(-1, 3)
    luminance = rgb[:, 0] * 0.2126 + rgb[:, 1] * 0.7152 + rgb[:, 2] * 0.0722
    order = np.argsort(luminance)
    first = int(len(order) * 0.14)
    last = max(first + 1, math.ceil(len(order) * 0.86))
    trimmed = rgb[order[first:last]]
    mean = np.mean(trimmed, axis=0)

    return RgbColor(r=int(round(mean[0])), g=int(round(mean[1])), b=int(round(mean[2])))


def median_rgb(colors: list[RgbColor]) -> RgbColor:
    return RgbColor(
        r=int(round(float(np.median([color.r for color in colors])))),
        g=int(round(float(np.median([color.g for color in colors])))),
        b=int(round(float(np.median([color.b for color in colors])))),
    )


def reference_for_symbol(symbol: str, known_centers: dict[str, RgbColor]) -> RgbColor:
    reference = known_centers.get(symbol)
    if reference is None:
        return DEFAULT_REFERENCES[symbol]

    hsv = rgb_to_hsv(reference)
    if symbol == "U" and hsv[1] > 0.35:
        return DEFAULT_REFERENCES[symbol]
    if symbol != "U" and hsv[1] < 0.18:
        return DEFAULT_REFERENCES[symbol]

    return reference


def rgb_to_lab(rgb: RgbColor) -> np.ndarray:
    pixel = np.array([[[rgb.r, rgb.g, rgb.b]]], dtype=np.uint8)
    return cv2.cvtColor(pixel, cv2.COLOR_RGB2LAB).astype(np.float32)[0, 0]


def rgb_to_hsv(rgb: RgbColor) -> np.ndarray:
    pixel = np.array([[[rgb.r, rgb.g, rgb.b]]], dtype=np.uint8)
    hsv = cv2.cvtColor(pixel, cv2.COLOR_RGB2HSV).astype(np.float32)[0, 0]
    return np.array([hsv[0] / 180.0, hsv[1] / 255.0, hsv[2] / 255.0], dtype=np.float32)


def lab_distance(left: np.ndarray, right: np.ndarray) -> float:
    delta = left - right
    return float(np.sqrt(np.dot(delta, delta)))


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))
