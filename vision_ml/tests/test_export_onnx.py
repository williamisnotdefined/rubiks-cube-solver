from __future__ import annotations

from pathlib import Path

import pytest

pytest.importorskip("torch")
pytest.importorskip("onnx")

from vision_ml.export_onnx import export_onnx
from vision_ml.train_cnn import train_cnn
from vision_ml.tests.test_data import write_synthetic_dataset


def test_export_onnx_smoke_writes_model(tmp_path: Path) -> None:
    dataset_path = write_synthetic_dataset(tmp_path)
    output_dir = tmp_path / "outputs"
    metrics = train_cnn(
        dataset_path=dataset_path,
        image_root=tmp_path,
        output_dir=output_dir,
        epochs=1,
        seed=0,
        batch_size=16,
        patch_size=32,
    )

    output = export_onnx(metrics["checkpoint"], output_dir / "model.onnx", input_size=32)

    assert output.exists()
    assert output.stat().st_size > 0
