from __future__ import annotations

from pathlib import Path

import pytest

pytest.importorskip("torch")

from vision_ml.evaluate_face_detector import bbox_iou_xywh, evaluate_face_detector, face_detector_report
from vision_ml.export_face_detector_onnx import export_face_detector_onnx
from vision_ml.tests.test_face_data import write_face_dataset_zips
from vision_ml.train_face_detector import train_face_detector

np = pytest.importorskip("numpy")


def test_face_detector_report_includes_iou_metrics() -> None:
    predictions = np.array([[0.5, 0.5, 0.4, 0.4], [0.1, 0.1, 0.2, 0.2]], dtype=np.float32)
    targets = np.array([[0.5, 0.5, 0.4, 0.4], [0.8, 0.8, 0.2, 0.2]], dtype=np.float32)

    report = face_detector_report(predictions, targets)

    assert bbox_iou_xywh(predictions[0], targets[0]) == pytest.approx(1.0)
    assert report["examples"] == 2
    assert report["iouAt50"] == pytest.approx(0.5)


def test_train_evaluate_and_export_face_detector_smoke(tmp_path: Path) -> None:
    pytest.importorskip("onnx")
    images_zip, labels_zip = write_face_dataset_zips(tmp_path, count=24)
    output_dir = tmp_path / "outputs"

    metrics = train_face_detector(
        images_zip=images_zip,
        labels_zip=labels_zip,
        output_dir=output_dir,
        epochs=1,
        seed=0,
        batch_size=8,
        image_size=64,
    )
    report = evaluate_face_detector(
        checkpoint_path=metrics["checkpoint"],
        images_zip=images_zip,
        labels_zip=labels_zip,
        split="train",
        image_size=64,
    )
    onnx_path = export_face_detector_onnx(metrics["checkpoint"], output_dir / "face-detector.onnx", input_size=64)

    assert metrics["examples"] > 0
    assert report["examples"] > 0
    assert (output_dir / "face-detector.pt").exists()
    assert onnx_path.exists()
    assert onnx_path.stat().st_size > 0
