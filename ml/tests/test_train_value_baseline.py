from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml import train_value_baseline as baseline


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "datasets/fixtures/small.jsonl"


def test_one_epoch_training_is_deterministic_and_reports_required_metrics(
    tmp_path: Path,
) -> None:
    pytest.importorskip("torch")

    first = baseline.run_baseline(
        dataset=FIXTURE,
        epochs=1,
        seed=0,
        output=tmp_path / "first",
        inference_repeats=1,
    )
    second = baseline.run_baseline(
        dataset=FIXTURE,
        epochs=1,
        seed=0,
        output=tmp_path / "second",
        inference_repeats=1,
    )

    assert first["model"]["type"] == "pytorch_mlp"
    assert first["model"]["pytorch_available"] is True
    assert first["model"]["input"] == "normalized CubieState cp/co/ep/eo serialization"
    assert first["label"]["target"] == "verified_solution_length"
    assert first["safety"]["validates_states"] is False
    assert first["safety"]["replaces_replay_verification"] is False
    assert first["safety"]["admissible_heuristic"] is False
    assert first["metrics"]["mae"] == pytest.approx(second["metrics"]["mae"])
    assert first["metrics"]["rmse"] == pytest.approx(second["metrics"]["rmse"])
    assert "bucket_accuracy" in first["metrics"]
    assert "inference_us_per_state" in first["metrics"]
    assert first["by_depth_bucket"]
    assert "reversible_scramble_depth_mae" in first["classical_baseline_comparison"]
    assert "rust_solver_quality_report" in first["classical_baseline_comparison"]
    assert (tmp_path / "first/metrics.json").is_file()


def test_dependency_fallback_reports_required_fields(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(baseline, "is_torch_available", lambda: False)

    report = baseline.run_baseline(
        dataset=FIXTURE,
        epochs=1,
        seed=0,
        output=tmp_path,
        inference_repeats=1,
    )

    assert report["model"]["type"] == "constant_train_mean_dependency_fallback"
    assert report["model"]["pytorch_available"] is False
    assert report["training"]["skipped_reason"] == "pytorch_unavailable"
    assert report["label"]["target"] == "verified_solution_length"
    assert report["safety"]["default_product_solver_dependency"] is False
    assert report["output"]["model_checkpoint"] is None
    assert Path(report["output"]["metrics_json"]).is_file()


def test_cli_writes_json_report(capsys: pytest.CaptureFixture[str], tmp_path: Path) -> None:
    exit_code = baseline.main(
        [
            "--dataset",
            str(FIXTURE),
            "--epochs",
            "1",
            "--seed",
            "0",
            "--output",
            str(tmp_path),
            "--inference-repeats",
            "1",
        ]
    )

    report = json.loads(capsys.readouterr().out)

    assert exit_code == 0
    assert report["examples"] == 12
    assert report["output"]["model_checkpoint"] is None
    assert Path(report["output"]["metrics_json"]).is_file()
