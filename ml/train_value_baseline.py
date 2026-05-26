from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path
from statistics import mean
from typing import Iterable

from .data import DEPTH_BUCKETS, TrainingExample, depth_bucket, load_jsonl
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
        return write_report(report, output_path)

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

    return write_report(report, output_path)


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


def write_report(report: dict[str, object], output_path: Path) -> dict[str, object]:
    output_path.mkdir(parents=True, exist_ok=True)
    metrics_path = output_path / "metrics.json"
    report["output"] = {
        "metrics_json": str(metrics_path),
        "model_checkpoint": None,
        "note": "No model checkpoint is written by the smoke baseline.",
    }
    metrics_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    return report


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
    targets = [example.verified_solution_length for example in examples]
    train_targets = [example.verified_solution_length for example in train_examples]
    metrics = regression_metrics(predictions, targets)
    metrics["bucket_accuracy"] = _round(bucket_accuracy(predictions, targets))
    metrics["inference_us_per_state"] = _round(inference_time)

    return {
        "dataset": str(dataset_path),
        "examples": len(examples),
        "train_examples": len(train_examples),
        "model": {
            "type": "pytorch_mlp",
            "input": "normalized CubieState cp/co/ep/eo serialization",
            "feature_dim": 40,
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
        "by_depth_bucket": metrics_by_depth_bucket(examples, predictions),
        "classical_baseline_comparison": {
            "reversible_scramble_depth_mae": _round(
                mean_absolute_error(
                    [float(example.scramble_depth) for example in examples], targets
                )
            ),
            "constant_train_mean_mae": _round(
                mean_absolute_error([mean(train_targets)] * len(targets), targets)
            ),
            "rust_solver_quality_report": {
                "command": "cargo run --quiet -p cube-engine --bin solver_quality_report",
                "role": "Canonical deterministic product solver-quality baseline; run separately from Python training.",
            },
        },
        "safety": {
            "validates_states": False,
            "replaces_replay_verification": False,
            "admissible_heuristic": False,
            "default_product_solver_dependency": False,
            "fallback": "Rust/WASM/web solve path remains deterministic and independent from ML.",
        },
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
