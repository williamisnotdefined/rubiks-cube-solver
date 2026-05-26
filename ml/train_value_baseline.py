from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path
from statistics import mean
from typing import Iterable

from .data import (
    DEPTH_BUCKETS,
    FEATURE_DIM,
    LABEL_SOURCE,
    TrainingExample,
    depth_bucket,
    load_jsonl,
)
from .model import inference_us_per_state, is_torch_available, predict, train_value_model

DEFAULT_DATASET = Path("datasets/fixtures/small.jsonl")
DEFAULT_OUTPUT = Path("/tmp/rubiks-cube-solver-ml-value-baseline")


def run_baseline(
    *,
    dataset: str | Path,
    epochs: int,
    seed: int,
    output: str | Path,
    learning_rate: float = 0.01,
    hidden_dim: int = 64,
    inference_repeats: int = 100,
) -> dict[str, object]:
    dataset_path = Path(dataset)
    output_path = Path(output)
    examples = load_jsonl(dataset_path)
    train_examples = [example for example in examples if example.split == "train"] or examples
    if not is_torch_available():
        predictions, inference_time = dependency_unavailable_predictions(
            train_examples, examples, repeats=inference_repeats
        )
        report = build_report(
            dataset_path=dataset_path,
            examples=examples,
            train_examples=train_examples,
            predictions=predictions,
            training_loss=[],
            epochs=epochs,
            seed=seed,
            learning_rate=learning_rate,
            hidden_dim=hidden_dim,
            inference_time=inference_time,
        )
        report["model"]["type"] = "constant_train_mean_dependency_fallback"
        report["model"]["pytorch_available"] = False
        report["model"]["note"] = (
            "PyTorch is not installed; install ml/requirements.txt to train the MLP."
        )
        report["training"]["skipped_reason"] = "pytorch_unavailable"
        return write_report(report, output_path, examples, predictions)

    value_model, history = train_value_model(
        train_examples,
        epochs=epochs,
        seed=seed,
        learning_rate=learning_rate,
        hidden_dim=hidden_dim,
    )
    predictions = predict(value_model, examples)
    inference_time = inference_us_per_state(
        value_model, examples, repeats=inference_repeats
    )
    report = build_report(
        dataset_path=dataset_path,
        examples=examples,
        train_examples=train_examples,
        predictions=predictions,
        training_loss=history,
        epochs=epochs,
        seed=seed,
        learning_rate=learning_rate,
        hidden_dim=hidden_dim,
        inference_time=inference_time,
    )

    return write_report(report, output_path, examples, predictions)


def dependency_unavailable_predictions(
    train_examples: list[TrainingExample], examples: list[TrainingExample], *, repeats: int
) -> tuple[list[float], float]:
    if repeats <= 0:
        raise ValueError("repeats must be positive")

    prediction = float(mean(example.verified_solution_length for example in train_examples))
    start = time.perf_counter()
    for _repeat in range(repeats):
        predictions = [prediction for _example in examples]
    elapsed = time.perf_counter() - start

    return predictions, elapsed * 1_000_000.0 / (len(examples) * repeats)


def write_report(
    report: dict[str, object],
    output_path: Path,
    examples: list[TrainingExample],
    predictions: list[float],
) -> dict[str, object]:
    output_path.mkdir(parents=True, exist_ok=True)
    metrics_path = output_path / "metrics.json"
    value_outputs_path = output_path / "value_outputs.tsv"
    report["output"] = {
        "metrics_json": str(metrics_path),
        "value_outputs_tsv": str(value_outputs_path),
        "model_checkpoint": None,
        "note": "No model checkpoint is written by the smoke baseline; value outputs are local experiment inputs only.",
    }
    write_value_outputs(value_outputs_path, report, examples, predictions)
    metrics_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    return report


def write_value_outputs(
    path: Path,
    report: dict[str, object],
    examples: list[TrainingExample],
    predictions: list[float],
) -> None:
    if len(examples) != len(predictions):
        raise ValueError("examples and predictions must have the same length")

    model = _require_dict(report, "model")
    training = _require_dict(report, "training")
    safety = _require_dict(report, "safety")

    metadata: list[tuple[str, object]] = [
        ("format", "rubiks_cube_solver_value_outputs_v1"),
        ("model_type", model["type"]),
        ("pytorch_available", model["pytorch_available"]),
        ("dataset", report["dataset"]),
        ("examples", len(examples)),
        ("label_target", _require_dict(report, "label")["target"]),
        ("label_source", LABEL_SOURCE),
        ("prediction", "estimated_verified_solution_length"),
        ("training_epochs", training.get("epochs")),
        ("training_seed", training.get("seed")),
        ("training_skipped_reason", training.get("skipped_reason", "")),
        ("safety.validates_states", safety["validates_states"]),
        ("safety.replaces_replay_verification", safety["replaces_replay_verification"]),
        ("safety.admissible_heuristic", safety["admissible_heuristic"]),
        ("safety.default_product_solver_dependency", safety["default_product_solver_dependency"]),
    ]

    lines = [f"# {key}={metadata_value(value)}" for key, value in metadata]
    for example, prediction in zip(examples, predictions, strict=True):
        lines.append(f"{example.state}\t{_round(prediction)}")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _require_dict(report: dict[str, object], key: str) -> dict[str, object]:
    value = report[key]
    if not isinstance(value, dict):
        raise TypeError(f"report field {key!r} must be a dictionary")

    return value


def metadata_value(value: object) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return ""

    return str(value).replace("\t", " ").replace("\n", " ")


def build_report(
    *,
    dataset_path: Path,
    examples: list[TrainingExample],
    train_examples: list[TrainingExample],
    predictions: list[float],
    training_loss: list[float],
    epochs: int,
    seed: int,
    learning_rate: float,
    hidden_dim: int,
    inference_time: float,
) -> dict[str, object]:
    train_targets = [example.verified_solution_length for example in train_examples]
    model_evaluation = evaluate_predictions(examples, predictions)
    metrics = dict(model_evaluation["metrics"])
    metrics["inference_us_per_state"] = _round(inference_time)
    by_depth_bucket = model_evaluation["by_depth_bucket"]

    return {
        "dataset": str(dataset_path),
        "examples": len(examples),
        "train_examples": len(train_examples),
        "model": {
            "type": "pytorch_mlp",
            "pytorch_available": True,
            "input": "normalized CubieState cp/co/ep/eo serialization",
            "feature_dim": FEATURE_DIM,
            "hidden_dim": hidden_dim,
        },
        "training": {
            "epochs": epochs,
            "seed": seed,
            "learning_rate": learning_rate,
            "initial_loss": _round(training_loss[0]) if training_loss else None,
            "final_loss": _round(training_loss[-1]) if training_loss else None,
        },
        "label": {
            "target": "verified_solution_length",
            "semantics": "Replay-verified inverse scramble length from the dataset; not an optimal-distance label.",
        },
        "metrics": metrics,
        "by_depth_bucket": by_depth_bucket,
        "classical_baseline_comparison": classical_baseline_comparison(
            dataset_path=dataset_path,
            examples=examples,
            train_targets=train_targets,
            model_metrics=metrics,
            model_by_depth_bucket=by_depth_bucket,
        ),
        "safety": {
            "validates_states": False,
            "replaces_replay_verification": False,
            "admissible_heuristic": False,
            "default_product_solver_dependency": False,
            "fallback": "Rust/WASM/web solve path remains deterministic and independent from ML.",
        },
    }


def evaluate_predictions(
    examples: list[TrainingExample], predictions: list[float]
) -> dict[str, object]:
    targets = [example.verified_solution_length for example in examples]
    metrics = regression_metrics(predictions, targets)
    metrics["bucket_accuracy"] = _round(bucket_accuracy(predictions, targets))

    return {
        "metrics": metrics,
        "by_depth_bucket": metrics_by_depth_bucket(examples, predictions),
    }


def classical_baseline_comparison(
    *,
    dataset_path: Path,
    examples: list[TrainingExample],
    train_targets: list[int],
    model_metrics: dict[str, float],
    model_by_depth_bucket: object,
) -> dict[str, object]:
    train_mean = float(mean(train_targets))
    direct_baselines = {
        "reversible_scramble_depth": direct_fixture_baseline(
            examples,
            [float(example.scramble_depth) for example in examples],
            prediction_source="dataset.scramble_depth",
            description=(
                "Uses the generated reversible scramble depth recorded in the same JSONL "
                "fixture. These labels are replay verified but are not optimal-distance labels."
            ),
        ),
        "constant_train_mean": direct_fixture_baseline(
            examples,
            [train_mean for _example in examples],
            prediction_source="mean(train.verified_solution_length)",
            description="Predicts the training split mean verified_solution_length for every fixture row.",
            extra_fields={"train_mean_verified_solution_length": _round(train_mean)},
        ),
    }

    return {
        "dataset_fixture": str(dataset_path),
        "label_source": LABEL_SOURCE,
        "label_semantics": (
            "verified_solution_length is the replay-verified inverse scramble length in "
            "the dataset fixture; it is not an optimal-distance label."
        ),
        "ml_value_baseline": {
            "metrics": model_metrics,
            "by_depth_bucket": model_by_depth_bucket,
        },
        "direct_fixture_baselines": direct_baselines,
        "model_vs_baseline_delta": {
            name: metric_delta(model_metrics, baseline["metrics"])
            for name, baseline in direct_baselines.items()
        },
        "delta_interpretation": (
            "For mae and rmse, negative ML-minus-baseline deltas favor ML. "
            "For bucket_accuracy, positive ML-minus-baseline deltas favor ML."
        ),
        "rust_solver_quality_report": {
            "command": "cargo run --quiet -p cube-engine --bin solver_quality_report",
            "source": "quality_fixtures() in crates/cube-engine/src/solver/quality.rs",
            "role": (
                "Deterministic product solver-quality baseline; run separately from Python "
                "training because it uses the Rust solver fixture catalog, not the ML JSONL fixture."
            ),
            "comparable_metric_names": [
                "status_counts_by_solver_selection",
                "replay_verified_successes",
                "solution_len_range",
                "explored_nodes_total",
            ],
            "timing_note": "Elapsed timing in the Rust report is local and non-deterministic.",
        },
    }


def direct_fixture_baseline(
    examples: list[TrainingExample],
    predictions: list[float],
    *,
    prediction_source: str,
    description: str,
    extra_fields: dict[str, object] | None = None,
) -> dict[str, object]:
    evaluation = evaluate_predictions(examples, predictions)
    baseline = {
        "prediction_source": prediction_source,
        "description": description,
        "metrics": evaluation["metrics"],
        "by_depth_bucket": evaluation["by_depth_bucket"],
    }
    if extra_fields is not None:
        baseline.update(extra_fields)

    return baseline


def metric_delta(
    model_metrics: dict[str, float], baseline_metrics: object
) -> dict[str, float]:
    if not isinstance(baseline_metrics, dict):
        raise TypeError("baseline metrics must be a dictionary")

    return {
        "mae": _round(model_metrics["mae"] - float(baseline_metrics["mae"])),
        "rmse": _round(model_metrics["rmse"] - float(baseline_metrics["rmse"])),
        "bucket_accuracy": _round(
            model_metrics["bucket_accuracy"] - float(baseline_metrics["bucket_accuracy"])
        ),
    }


def regression_metrics(predictions: list[float], targets: list[int]) -> dict[str, float]:
    return {
        "mae": _round(mean_absolute_error(predictions, targets)),
        "rmse": _round(root_mean_square_error(predictions, targets)),
    }


def metrics_by_depth_bucket(
    examples: list[TrainingExample], predictions: list[float]
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []

    for bucket in DEPTH_BUCKETS:
        indexes = [
            index
            for index, example in enumerate(examples)
            if example.depth_bucket == bucket
        ]
        if not indexes:
            continue

        bucket_predictions = [predictions[index] for index in indexes]
        bucket_targets = [examples[index].verified_solution_length for index in indexes]
        bucket_metrics = regression_metrics(bucket_predictions, bucket_targets)
        bucket_metrics["bucket_accuracy"] = _round(
            bucket_accuracy(bucket_predictions, bucket_targets)
        )
        rows.append(
            {
                "bucket": bucket,
                "count": len(indexes),
                "target_mean": _round(mean(bucket_targets)),
                "prediction_mean": _round(mean(bucket_predictions)),
                **bucket_metrics,
            }
        )

    return rows


def mean_absolute_error(predictions: Iterable[float], targets: Iterable[int]) -> float:
    pairs = list(zip(predictions, targets, strict=True))
    if not pairs:
        raise ValueError("at least one prediction is required")
    return mean(abs(float(prediction) - float(target)) for prediction, target in pairs)


def root_mean_square_error(predictions: Iterable[float], targets: Iterable[int]) -> float:
    pairs = list(zip(predictions, targets, strict=True))
    if not pairs:
        raise ValueError("at least one prediction is required")
    return math.sqrt(
        mean((float(prediction) - float(target)) ** 2 for prediction, target in pairs)
    )


def bucket_accuracy(predictions: Iterable[float], targets: Iterable[int]) -> float:
    pairs = list(zip(predictions, targets, strict=True))
    if not pairs:
        raise ValueError("at least one prediction is required")

    correct = 0
    for prediction, target in pairs:
        predicted_depth = max(0, int(round(float(prediction))))
        if depth_bucket(predicted_depth) == depth_bucket(int(target)):
            correct += 1

    return correct / len(pairs)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train and evaluate the reproducible PyTorch value baseline."
    )
    parser.add_argument("--dataset", default=str(DEFAULT_DATASET), help="JSONL dataset path")
    parser.add_argument("--epochs", default=50, type=int, help="full-batch training epochs")
    parser.add_argument("--seed", default=0, type=int, help="deterministic PyTorch seed")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="directory for metrics output; defaults to /tmp",
    )
    parser.add_argument("--learning-rate", default=0.01, type=float)
    parser.add_argument("--hidden-dim", default=64, type=int)
    parser.add_argument("--inference-repeats", default=100, type=int)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        report = run_baseline(
            dataset=args.dataset,
            epochs=args.epochs,
            seed=args.seed,
            output=args.output,
            learning_rate=args.learning_rate,
            hidden_dim=args.hidden_dim,
            inference_repeats=args.inference_repeats,
        )
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 2

    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


def _round(value: float) -> float:
    return round(float(value), 6)


if __name__ == "__main__":
    raise SystemExit(main())
