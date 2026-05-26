from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml.data import DEPTH_BUCKETS, FEATURE_DIM
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
    assert first["model"]["feature_dim"] == FEATURE_DIM
    assert first["label"]["target"] == "verified_solution_length"
    assert first["safety"]["validates_states"] is False
    assert first["safety"]["replaces_replay_verification"] is False
    assert first["safety"]["admissible_heuristic"] is False
    assert first["safety"]["default_product_solver_dependency"] is False
    assert first["metrics"]["mae"] == pytest.approx(second["metrics"]["mae"])
    assert first["metrics"]["rmse"] == pytest.approx(second["metrics"]["rmse"])
    assert first["metrics"]["bucket_accuracy"] == pytest.approx(
        second["metrics"]["bucket_accuracy"]
    )
    assert first["by_depth_bucket"] == second["by_depth_bucket"]
    assert_required_report_fields(first)
    assert (tmp_path / "first/metrics.json").is_file()
    value_outputs = tmp_path / "first/value_outputs.tsv"
    assert value_outputs.is_file()
    assert Path(first["output"]["value_outputs_tsv"]) == value_outputs
    value_metadata, value_rows = read_value_outputs(value_outputs)
    assert value_metadata["format"] == "rubiks_cube_solver_value_outputs_v1"
    assert value_metadata["model_type"] == "pytorch_mlp"
    assert value_metadata["pytorch_available"] == "true"
    assert value_metadata["label_source"] == "reversible_scramble_inverse_replay_verified"
    assert value_metadata["safety.validates_states"] == "false"
    assert value_metadata["safety.replaces_replay_verification"] == "false"
    assert value_metadata["safety.admissible_heuristic"] == "false"
    assert value_metadata["safety.default_product_solver_dependency"] == "false"
    assert len(value_rows) == first["examples"]
    assert sorted(path.name for path in (tmp_path / "first").iterdir()) == [
        "metrics.json",
        "value_outputs.tsv",
    ]


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
    assert report["model"]["input"] == "normalized CubieState cp/co/ep/eo serialization"
    assert report["model"]["feature_dim"] == FEATURE_DIM
    assert report["training"]["skipped_reason"] == "pytorch_unavailable"
    assert report["label"]["target"] == "verified_solution_length"
    assert report["safety"]["validates_states"] is False
    assert report["safety"]["replaces_replay_verification"] is False
    assert report["safety"]["admissible_heuristic"] is False
    assert report["safety"]["default_product_solver_dependency"] is False
    assert report["output"]["model_checkpoint"] is None
    assert_required_report_fields(report)
    assert Path(report["output"]["metrics_json"]).is_file()
    value_outputs = Path(report["output"]["value_outputs_tsv"])
    assert value_outputs.is_file()
    value_metadata, value_rows = read_value_outputs(value_outputs)
    assert value_metadata["model_type"] == "constant_train_mean_dependency_fallback"
    assert value_metadata["pytorch_available"] == "false"
    assert value_metadata["training_skipped_reason"] == "pytorch_unavailable"
    assert len(value_rows) == report["examples"]
    assert sorted(path.name for path in tmp_path.iterdir()) == [
        "metrics.json",
        "value_outputs.tsv",
    ]


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
    assert Path(report["output"]["value_outputs_tsv"]).is_file()
    assert "direct_fixture_baselines" in report["classical_baseline_comparison"]
    assert Path(report["output"]["metrics_json"]).is_file()


def read_value_outputs(path: Path) -> tuple[dict[str, str], list[tuple[str, float]]]:
    metadata: dict[str, str] = {}
    rows: list[tuple[str, float]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            key, value = line[2:].split("=", 1)
            metadata[key] = value
            continue

        state, prediction = line.split("\t", 1)
        rows.append((state, float(prediction)))

    return metadata, rows


def assert_required_report_fields(report: dict[str, object]) -> None:
    assert_regression_metrics(report["metrics"])
    metrics = report["metrics"]
    assert isinstance(metrics, dict)
    assert isinstance(metrics["inference_us_per_state"], float | int)
    assert metrics["inference_us_per_state"] >= 0.0
    assert_depth_bucket_rows(report["by_depth_bucket"])

    comparison = report["classical_baseline_comparison"]
    assert isinstance(comparison, dict)
    assert comparison["dataset_fixture"] == str(FIXTURE)
    assert comparison["label_source"] == "reversible_scramble_inverse_replay_verified"
    assert "not an optimal-distance label" in comparison["label_semantics"]

    ml_value_baseline = comparison["ml_value_baseline"]
    assert isinstance(ml_value_baseline, dict)
    assert ml_value_baseline["metrics"] == report["metrics"]
    assert ml_value_baseline["by_depth_bucket"] == report["by_depth_bucket"]

    direct_baselines = comparison["direct_fixture_baselines"]
    assert isinstance(direct_baselines, dict)
    assert set(direct_baselines) == {
        "reversible_scramble_depth",
        "constant_train_mean",
    }

    reversible = direct_baselines["reversible_scramble_depth"]
    assert isinstance(reversible, dict)
    assert reversible["prediction_source"] == "dataset.scramble_depth"
    assert "not optimal-distance" in reversible["description"]
    assert reversible["metrics"] == {
        "mae": 0.0,
        "rmse": 0.0,
        "bucket_accuracy": 1.0,
    }
    assert_depth_bucket_rows(reversible["by_depth_bucket"])

    constant = direct_baselines["constant_train_mean"]
    assert isinstance(constant, dict)
    assert constant["prediction_source"] == "mean(train.verified_solution_length)"
    assert constant["train_mean_verified_solution_length"] == 6.0
    assert_regression_metrics(constant["metrics"])
    assert_depth_bucket_rows(constant["by_depth_bucket"])

    deltas = comparison["model_vs_baseline_delta"]
    assert isinstance(deltas, dict)
    assert set(deltas) == set(direct_baselines)
    for value in deltas.values():
        assert isinstance(value, dict)
        assert set(value) == {"mae", "rmse", "bucket_accuracy"}

    rust_report = comparison["rust_solver_quality_report"]
    assert isinstance(rust_report, dict)
    assert rust_report["command"] == "cargo run --quiet -p cube-engine --bin solver_quality_report"
    assert rust_report["source"] == "quality_fixtures() in crates/cube-engine/src/solver/quality.rs"
    assert rust_report["comparable_metric_names"] == [
        "status_counts_by_solver_selection",
        "replay_verified_successes",
        "solution_len_range",
        "explored_nodes_total",
    ]
    assert "non-deterministic" in rust_report["timing_note"]


def assert_regression_metrics(metrics: object) -> None:
    assert isinstance(metrics, dict)
    assert set(metrics) >= {"mae", "rmse", "bucket_accuracy"}
    assert isinstance(metrics["mae"], float | int)
    assert isinstance(metrics["rmse"], float | int)
    assert isinstance(metrics["bucket_accuracy"], float | int)
    assert metrics["mae"] >= 0.0
    assert metrics["rmse"] >= 0.0
    assert 0.0 <= metrics["bucket_accuracy"] <= 1.0


def assert_depth_bucket_rows(rows: object) -> None:
    assert isinstance(rows, list)
    assert rows
    for row in rows:
        assert isinstance(row, dict)
        assert row["bucket"] in DEPTH_BUCKETS
        assert row["count"] > 0
        assert_regression_metrics(row)
        assert isinstance(row["target_mean"], float | int)
        assert isinstance(row["prediction_mean"], float | int)
