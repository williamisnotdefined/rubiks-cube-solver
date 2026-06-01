from __future__ import annotations

import base64

import pytest

cv2 = pytest.importorskip("cv2")
np = pytest.importorskip("numpy")

from vision.detection import analyze_face
from vision.tile_detector import TileDetection
from vision.schemas import AnalyzeScanFaceRequest


COLORS = {
    "U": (248, 250, 252),
    "R": (239, 68, 68),
    "F": (34, 197, 94),
    "D": (250, 204, 21),
    "L": (249, 115, 22),
    "B": (37, 99, 235),
}


def test_detects_synthetic_front_face() -> None:
    image = synthetic_face(["L", "U", "D", "R", "F", "F", "R", "U", "F"])
    response = analyze_face(
        AnalyzeScanFaceRequest(expectedCenter="F", image=encode_image(image)),
        tile_detector=FakeTileDetector(),
    )

    assert response.ok
    assert response.status == "detected"
    assert response.detectedCenter == "F"
    assert response.faceConfidence > 0.8
    assert response.detectionMode == "tile_detector"
    assert response.imageQuality is not None
    assert response.imageQuality.blurScore > 0
    assert [tile.symbol for tile in response.tileDetections] == [
        "L",
        "U",
        "D",
        "R",
        "F",
        "F",
        "R",
        "U",
        "F",
    ]
    assert response.stickers == []


def test_reports_mismatched_center() -> None:
    image = synthetic_face(["U", "U", "U", "R", "F", "F", "R", "U", "F"])
    response = analyze_face(
        AnalyzeScanFaceRequest(expectedCenter="U", image=encode_image(image)),
        tile_detector=FakeTileDetector(center_symbol="F"),
    )

    assert not response.ok
    assert response.status == "center_mismatch"
    assert response.centerMismatch
    assert response.detectedCenter == "F"


def test_shaded_white_center_does_not_report_blue_mismatch() -> None:
    image = synthetic_face(
        ["R", "F", "B", "D", "U", "L", "R", "F", "B"],
        color_overrides={4: (172, 181, 214)},
    )
    response = analyze_face(
        AnalyzeScanFaceRequest(expectedCenter="U", image=encode_image(image)),
        tile_detector=FakeTileDetector(center_symbol="U"),
    )

    assert response.ok
    assert not response.centerMismatch
    assert response.detectedCenter == "U"


def test_rejects_blank_frame_instead_of_classifying_center_guide() -> None:
    image = np.full((720, 720, 3), 180, dtype=np.uint8)
    response = analyze_face(AnalyzeScanFaceRequest(expectedCenter="U", image=encode_image(image)))

    assert not response.ok
    assert response.status == "face_not_found"
    assert response.detectionMode == "tile_detector"
    assert response.faceConfidence == 0
    assert response.stickers == []


def test_detects_off_center_face_with_tiles_only() -> None:
    image = synthetic_face(
        ["L", "U", "D", "R", "F", "F", "R", "U", "F"],
        target_offset=(-110, 35),
    )
    response = analyze_face(
        AnalyzeScanFaceRequest(expectedCenter="F", image=encode_image(image)),
        tile_detector=FakeTileDetector(),
    )

    assert response.ok
    assert response.detectionMode == "tile_detector"
    assert len(response.tileDetections) == 9


def test_detects_face_under_directional_shadow_and_warm_cast() -> None:
    symbols = ["L", "U", "D", "R", "F", "F", "R", "U", "F"]
    image = apply_directional_lighting(synthetic_face(symbols))
    response = analyze_face(
        AnalyzeScanFaceRequest(expectedCenter="F", image=encode_image(image)),
        tile_detector=FakeTileDetector(),
    )

    assert response.ok
    assert not response.centerMismatch
    assert response.detectedCenter == "F"
    assert response.detectionMode == "tile_detector"
    assert [tile.symbol for tile in response.tileDetections] == symbols


def test_analyze_face_exposes_raw_tile_detections() -> None:
    image = synthetic_face(["L", "U", "D", "R", "F", "F", "R", "U", "F"])

    response = analyze_face(
        AnalyzeScanFaceRequest(expectedCenter="F", image=encode_image(image)),
        tile_detector=FakeTileDetector(),
    )

    assert response.ok
    assert response.detectionMode == "tile_detector"
    assert len(response.tileDetections) == 9
    assert response.tileDetections[4].symbol == "F"


def test_analyze_face_returns_tile_symbols_without_projected_stickers() -> None:
    detector_symbols = ["L", "R", "R", "F", "B", "B", "R", "F", "D"]
    image = synthetic_face(["R"] * 9)

    response = analyze_face(
        AnalyzeScanFaceRequest(expectedCenter="B", image=encode_image(image)),
        tile_detector=FakeTileDetector(symbols=detector_symbols),
    )

    assert response.ok
    assert response.detectionMode == "tile_detector"
    assert [tile.symbol for tile in response.tileDetections] == detector_symbols
    assert response.stickers == []


def test_wrong_tile_center_reports_mismatch() -> None:
    image = synthetic_face(["L", "U", "D", "R", "F", "F", "R", "U", "F"])

    response = analyze_face(
        AnalyzeScanFaceRequest(expectedCenter="F", image=encode_image(image)),
        tile_detector=FakeTileDetector(center_symbol="R"),
    )

    assert not response.ok
    assert response.status == "center_mismatch"
    assert response.detectionMode == "tile_detector"
    assert response.detectedCenter == "R"
    assert len(response.tileDetections) == 9


def synthetic_face(
    symbols: list[str],
    color_overrides: dict[int, tuple[int, int, int]] | None = None,
    target_offset: tuple[int, int] = (0, 0),
) -> np.ndarray:
    image = np.full((720, 720, 3), 16, dtype=np.uint8)
    top_left = 120
    size = 480
    cell = size // 3
    color_overrides = color_overrides or {}

    cv2.rectangle(image, (top_left - 8, top_left - 8), (top_left + size + 8, top_left + size + 8), (0, 0, 0), -1)
    for index, symbol in enumerate(symbols):
        row = index // 3
        column = index % 3
        rgb = color_overrides.get(index, COLORS[symbol])
        bgr = (rgb[2], rgb[1], rgb[0])
        x0 = top_left + column * cell + 6
        y0 = top_left + row * cell + 6
        x1 = top_left + (column + 1) * cell - 6
        y1 = top_left + (row + 1) * cell - 6
        cv2.rectangle(image, (x0, y0), (x1, y1), bgr, -1)

    source = np.array([[120, 120], [600, 120], [600, 600], [120, 600]], dtype=np.float32)
    offset_x, offset_y = target_offset
    target = np.array(
        [[95 + offset_x, 145 + offset_y], [610 + offset_x, 95 + offset_y], [585 + offset_x, 640 + offset_y], [135 + offset_x, 595 + offset_y]],
        dtype=np.float32,
    )
    transform = cv2.getPerspectiveTransform(source, target)
    return cv2.warpPerspective(image, transform, (720, 720))


def apply_directional_lighting(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    x_gradient = np.linspace(0.56, 1.14, width, dtype=np.float32)
    y_gradient = np.linspace(0.78, 1.06, height, dtype=np.float32)
    gradient = np.outer(y_gradient, x_gradient)
    warm_cast_bgr = np.array([0.9, 0.96, 1.12], dtype=np.float32)
    lit = image.astype(np.float32) * gradient[:, :, None] * warm_cast_bgr

    return np.clip(lit, 0, 255).astype(np.uint8)


def encode_image(image: np.ndarray) -> str:
    ok, data = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    assert ok
    return "data:image/jpeg;base64," + base64.b64encode(data.tobytes()).decode("ascii")


class FakeTileDetector:
    model_configured = True
    available = True

    def __init__(self, center_symbol: str = "F", symbols: list[str] | None = None) -> None:
        self.center_symbol = center_symbol
        self.symbols = symbols

    def detect(self, _image_bgr: np.ndarray) -> list[TileDetection]:
        detections = []
        symbols = self.symbols or ["L", "U", "D", "R", self.center_symbol, "F", "R", "U", "F"]
        for index, symbol in enumerate(symbols):
            row = index // 3
            column = index % 3
            detections.append(
                TileDetection(
                    symbol=symbol,
                    confidence=0.9,
                    bbox=(
                        (155 + column * 160) / 720,
                        (155 + row * 160) / 720,
                        110 / 720,
                        110 / 720,
                    ),
                )
            )
        return detections
