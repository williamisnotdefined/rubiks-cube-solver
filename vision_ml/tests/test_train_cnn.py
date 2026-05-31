from __future__ import annotations

from pathlib import Path

import pytest

pytest.importorskip("torch")

from vision_ml.evaluate_cnn import evaluate_cnn
from vision_ml.train_cnn import train_cnn
from vision_ml.tests.test_data import write_synthetic_dataset


def test_train_cnn_smoke_writes_checkpoint_and_metrics(tmp_path: Path) -> None:
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

    assert metrics["examples"] == 54
    assert (output_dir / "sticker-cnn.pt").exists()
    assert (output_dir / "train-metrics.json").exists()


def test_evaluate_cnn_smoke_reports_metrics(tmp_path: Path) -> None:
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

    report = evaluate_cnn(
        checkpoint_path=metrics["checkpoint"],
        dataset_path=dataset_path,
        image_root=tmp_path,
        split="validation",
        patch_size=32,
    )

    assert report["examples"] == 54
    assert 0.0 <= report["accuracy"] <= 1.0
