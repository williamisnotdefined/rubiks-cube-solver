from __future__ import annotations

import pytest
import hashlib
import json
import scanner.runtime.detectors.tile_yolo_onnx as tile_detector_module

np = pytest.importorskip("numpy")

from scanner.runtime.detectors.tile_yolo_onnx import (
    TileDetection,
    VisionTileDetector,
    detections_from_output,
    get_default_tile_detector,
    load_tile_detector_manifest,
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


def test_default_tile_detector_rejects_manifest_mismatch(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    model_path = tmp_path / "tile-detector.onnx"
    model_path.write_bytes(b"model")
    manifest_path = write_manifest(tmp_path, model_path, class_order=["U", "R", "F", "D", "L", "B", "face"])
    monkeypatch.setattr(tile_detector_module, "_DEFAULT_TILE_DETECTOR", None)
    monkeypatch.setenv("RUBIKS_VISION_TILE_DETECTOR_MODEL", str(model_path))
    monkeypatch.setenv("RUBIKS_VISION_TILE_DETECTOR_MANIFEST", str(manifest_path))
    monkeypatch.setenv("RUBIKS_VISION_TILE_DETECTOR_INPUT_SIZE", "640")

    detector = get_default_tile_detector()

    assert not detector.available
    assert detector.unavailable_reason == "tile_detector_manifest_class_order_mismatch"


def test_tile_detector_manifest_validates_runtime_contract(tmp_path) -> None:
    model_path = tmp_path / "tile-detector.onnx"
    model_path.write_bytes(b"model")
    manifest_path = write_manifest(tmp_path, model_path)

    manifest = load_tile_detector_manifest(
        manifest_path,
        configured_model_path=model_path,
        input_size=640,
        class_symbols=("face", "U", "R", "F", "D", "L", "B"),
    )

    assert manifest.model_path == model_path
    assert manifest.input_size == 640
    assert manifest.class_symbols == ("face", "U", "R", "F", "D", "L", "B")


def test_tile_detector_manifest_rejects_model_checksum_mismatch(tmp_path) -> None:
    model_path = tmp_path / "tile-detector.onnx"
    model_path.write_bytes(b"model")
    manifest_path = write_manifest(tmp_path, model_path, model_sha256="0" * 64)

    with pytest.raises(tile_detector_module.TileDetectorManifestError) as error:
        load_tile_detector_manifest(
            manifest_path,
            configured_model_path=model_path,
            input_size=640,
            class_symbols=("face", "U", "R", "F", "D", "L", "B"),
        )

    assert error.value.reason == "tile_detector_manifest_model_sha256_mismatch"


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


def write_manifest(
    tmp_path,
    model_path,
    *,
    class_order: list[str] | None = None,
    model_sha256: str | None = None,
):
    manifest_path = tmp_path / "tile-detector.manifest.json"
    model_sha256 = model_sha256 or hashlib.sha256(model_path.read_bytes()).hexdigest()
    manifest_path.write_text(
        json.dumps(
            {
                "schemaVersion": "1",
                "modelId": "test-tile-detector",
                "modelPath": model_path.name,
                "modelSha256": model_sha256,
                "contractVersion": "tile-yolo-onnx-v1",
                "framework": {"training": "ultralytics", "runtime": "onnxruntime"},
                "onnxOpset": 12,
                "inputSize": 640,
                "classOrder": class_order or ["face", "U", "R", "F", "D", "L", "B"],
                "dataset": {
                    "name": "test",
                    "source": "fixture",
                    "license": "test",
                    "sha256": "1" * 64,
                    "splits": {"test": 1},
                },
                "training": {"command": "test", "seed": 0, "hyperparameters": {}},
                "metrics": {
                    "perClassPrecision": {},
                    "perClassRecall": {},
                    "falseAcceptRate": 0,
                    "falseRejectRate": 0,
                },
                "sourceCommit": "abcdef0",
            }
        ),
        encoding="utf-8",
    )
    return manifest_path
