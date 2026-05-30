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
    distances = sorted(
        (
            (symbol, perceptual_color_distance(rgb, reference_for_symbol(symbol, known_centers)))
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
        ScanColorAlternative(symbol=symbol, confidence=clamp01(1.0 - distance / 70.0))
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
    patch_size = max(8, int(min(cell_width, cell_height) * 0.12))
    offsets = (
        (0.5, 0.5),
        (0.38, 0.38),
        (0.5, 0.38),
        (0.62, 0.38),
        (0.38, 0.5),
        (0.62, 0.5),
        (0.38, 0.62),
        (0.5, 0.62),
        (0.62, 0.62),
    )
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
    low = np.percentile(luminance, 14)
    high = np.percentile(luminance, 86)
    mask = (luminance >= low) & (luminance <= high)
    trimmed = rgb[mask]
    if len(trimmed) < max(8, len(rgb) * 0.18):
        trimmed = rgb
    median = np.median(trimmed, axis=0)

    return RgbColor(r=int(round(median[0])), g=int(round(median[1])), b=int(round(median[2])))


def normalize_face_lighting(warped_bgr: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(warped_bgr, cv2.COLOR_BGR2LAB)
    luminance, a_channel, b_channel = cv2.split(lab)
    normalized_luminance = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(6, 6)).apply(luminance)
    normalized_lab = cv2.merge((normalized_luminance, a_channel, b_channel))

    return cv2.cvtColor(normalized_lab, cv2.COLOR_LAB2BGR)


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
    lab = cv2.cvtColor(pixel, cv2.COLOR_RGB2LAB).astype(np.float32)[0, 0]

    return np.array([lab[0] * 100.0 / 255.0, lab[1] - 128.0, lab[2] - 128.0], dtype=np.float32)


def rgb_to_hsv(rgb: RgbColor) -> np.ndarray:
    pixel = np.array([[[rgb.r, rgb.g, rgb.b]]], dtype=np.uint8)
    hsv = cv2.cvtColor(pixel, cv2.COLOR_RGB2HSV).astype(np.float32)[0, 0]
    return np.array([hsv[0] / 180.0, hsv[1] / 255.0, hsv[2] / 255.0], dtype=np.float32)


def lab_distance(left: np.ndarray, right: np.ndarray) -> float:
    return float(ciede2000(left, right))


def perceptual_color_distance(rgb: RgbColor, reference: RgbColor) -> float:
    distance = lab_distance(rgb_to_lab(rgb), rgb_to_lab(reference))
    rgb_hsv = rgb_to_hsv(rgb)
    reference_hsv = rgb_to_hsv(reference)

    if min(float(rgb_hsv[1]), float(reference_hsv[1])) < 0.18 or float(rgb_hsv[2]) < 0.18:
        return distance

    hue_delta = abs(float(rgb_hsv[0]) - float(reference_hsv[0]))
    hue_delta = min(hue_delta, 1.0 - hue_delta) * 360.0
    saturation_weight = min(float(rgb_hsv[1]), float(reference_hsv[1]))

    return distance + hue_delta * 0.22 * saturation_weight


def ciede2000(left: np.ndarray, right: np.ndarray) -> float:
    l1, a1, b1 = [float(value) for value in left]
    l2, a2, b2 = [float(value) for value in right]
    c1 = math.hypot(a1, b1)
    c2 = math.hypot(a2, b2)
    c_bar = (c1 + c2) / 2.0
    c_bar_7 = c_bar**7
    g = 0.5 * (1.0 - math.sqrt(c_bar_7 / (c_bar_7 + 25.0**7)))
    a1_prime = (1.0 + g) * a1
    a2_prime = (1.0 + g) * a2
    c1_prime = math.hypot(a1_prime, b1)
    c2_prime = math.hypot(a2_prime, b2)
    h1_prime = hue_degrees(a1_prime, b1)
    h2_prime = hue_degrees(a2_prime, b2)
    delta_l_prime = l2 - l1
    delta_c_prime = c2_prime - c1_prime
    delta_h_prime = hue_delta(h1_prime, h2_prime, c1_prime, c2_prime)
    delta_h_term = 2.0 * math.sqrt(c1_prime * c2_prime) * math.sin(math.radians(delta_h_prime / 2.0))
    l_bar_prime = (l1 + l2) / 2.0
    c_bar_prime = (c1_prime + c2_prime) / 2.0
    h_bar_prime = hue_average(h1_prime, h2_prime, c1_prime, c2_prime)
    t = (
        1.0
        - 0.17 * math.cos(math.radians(h_bar_prime - 30.0))
        + 0.24 * math.cos(math.radians(2.0 * h_bar_prime))
        + 0.32 * math.cos(math.radians(3.0 * h_bar_prime + 6.0))
        - 0.20 * math.cos(math.radians(4.0 * h_bar_prime - 63.0))
    )
    delta_theta = 30.0 * math.exp(-((h_bar_prime - 275.0) / 25.0) ** 2)
    c_bar_prime_7 = c_bar_prime**7
    r_c = 2.0 * math.sqrt(c_bar_prime_7 / (c_bar_prime_7 + 25.0**7))
    s_l = 1.0 + (0.015 * (l_bar_prime - 50.0) ** 2) / math.sqrt(20.0 + (l_bar_prime - 50.0) ** 2)
    s_c = 1.0 + 0.045 * c_bar_prime
    s_h = 1.0 + 0.015 * c_bar_prime * t
    r_t = -math.sin(math.radians(2.0 * delta_theta)) * r_c
    l_term = delta_l_prime / s_l
    c_term = delta_c_prime / s_c
    h_term = delta_h_term / s_h

    return math.sqrt(l_term**2 + c_term**2 + h_term**2 + r_t * c_term * h_term)


def hue_degrees(a_value: float, b_value: float) -> float:
    if a_value == 0.0 and b_value == 0.0:
        return 0.0

    hue = math.degrees(math.atan2(b_value, a_value))
    return hue + 360.0 if hue < 0.0 else hue


def hue_delta(h1: float, h2: float, c1: float, c2: float) -> float:
    if c1 * c2 == 0.0:
        return 0.0

    delta = h2 - h1
    if abs(delta) <= 180.0:
        return delta
    if delta > 180.0:
        return delta - 360.0

    return delta + 360.0


def hue_average(h1: float, h2: float, c1: float, c2: float) -> float:
    if c1 * c2 == 0.0:
        return h1 + h2

    if abs(h1 - h2) <= 180.0:
        return (h1 + h2) / 2.0
    if h1 + h2 < 360.0:
        return (h1 + h2 + 360.0) / 2.0

    return (h1 + h2 - 360.0) / 2.0


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))
