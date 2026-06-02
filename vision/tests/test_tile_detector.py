from __future__ import annotations

import pytest
import vision.tile_detector as tile_detector_module

np = pytest.importorskip("numpy")

from vision.tile_detector import (
    TileDetection,
    VisionTileDetector,
    detections_from_output,
    get_default_tile_detector,
    tile_detector_class_symbols_from_env,
    tile_detector_health,
    tile_detector_input,
)


def test_unconfigured_tile_detector_is_optional() -> None:
    detector = VisionTileDetector()
    image = np.zeros((100, 200, 3), dtype=np.uint8)

    assert not detector.available
    assert detector.unavailable_reason == "tile_detector_model_not_configured"
    assert detector.detect(image) == []


def test_tile_detector_health_reports_optional_status() -> None:
    health = tile_detector_health(VisionTileDetector())

    assert health == {
        "tileDetectorAvailable": False,
        "tileDetectorConfigured": False,
        "tileDetectorReason": "tile_detector_model_not_configured",
    }


def test_default_tile_detector_reads_confidence_threshold(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(tile_detector_module, "_DEFAULT_TILE_DETECTOR", None)
    monkeypatch.delenv("RUBIKS_VISION_TILE_DETECTOR_MODEL", raising=False)
    monkeypatch.setenv("RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE", "0.5")

    detector = get_default_tile_detector()

    assert detector.confidence_threshold == pytest.approx(0.5)


def test_tile_detector_class_symbols_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RUBIKS_VISION_TILE_DETECTOR_CLASS_SYMBOLS", "B,F,L,R,U,D,face,face")

    assert tile_detector_class_symbols_from_env() == ("B", "F", "L", "R", "U", "D", "face", "face")


def test_tile_detector_input_has_stable_shape() -> None:
    image = np.zeros((80, 120, 3), dtype=np.uint8)

    batch = tile_detector_input(image, input_size=64)

    assert batch.shape == (1, 3, 64, 64)
    assert batch.dtype == np.float32


def test_detections_from_yolo_output_supports_channel_first_shape() -> None:
    output = np.zeros((1, 11, 2), dtype=np.float32)
    output[0, 0:4, 0] = [320, 320, 160, 160]
    output[0, 4 + 3, 0] = 0.91
    output[0, 0:4, 1] = [321, 321, 158, 158]
    output[0, 4 + 3, 1] = 0.89

    detections = detections_from_output(output, input_size=640, confidence_threshold=0.5)

    assert detections == [TileDetection(symbol="F", confidence=pytest.approx(0.91), bbox=pytest.approx((0.5, 0.5, 0.25, 0.25)))]


def test_detections_from_yolo_output_supports_obb_shape_and_class_map() -> None:
    output = np.zeros((1, 13, 1), dtype=np.float32)
    output[0, 0:4, 0] = [320, 320, 160, 160]
    output[0, 4 + 4, 0] = 0.91
    output[0, 12, 0] = 0.3

    detections = detections_from_output(
        output,
        input_size=640,
        confidence_threshold=0.5,
        class_symbols=("B", "F", "L", "R", "U", "D", "face", "face"),
    )

    assert detections == [TileDetection(symbol="U", confidence=pytest.approx(0.91), bbox=pytest.approx((0.5, 0.5, 0.25, 0.25)))]


def test_tile_detector_converts_session_output_to_detections() -> None:
    detector = VisionTileDetector(session=FakeSession(), input_name="image", input_size=64)
    image = np.zeros((100, 200, 3), dtype=np.uint8)

    detections = detector.detect(image)

    assert len(detections) == 1
    assert detections[0].symbol == "U"


class FakeInput:
    name = "image"


class FakeSession:
    def get_inputs(self):
        return [FakeInput()]

    def run(self, _outputs, _inputs):
        output = np.zeros((1, 11, 1), dtype=np.float32)
        output[0, 0:4, 0] = [32, 32, 16, 16]
        output[0, 4 + 1, 0] = 0.92
        return [output]
