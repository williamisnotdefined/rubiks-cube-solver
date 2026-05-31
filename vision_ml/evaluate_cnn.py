from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from .data import DEFAULT_PATCH_SIZE, SYMBOLS, load_patch_examples
from .model import TorchNotAvailableError, create_sticker_cnn, require_torch


def evaluate_cnn(
    checkpoint_path: str | Path,
    dataset_path: str | Path,
    image_root: str | Path,
    split: str | None = "validation",
    output_path: str | Path | None = None,
    patch_size: int = DEFAULT_PATCH_SIZE,
) -> dict[str, object]:
    torch, _nn = require_torch()
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    model = create_sticker_cnn(num_classes=len(checkpoint.get("symbols", SYMBOLS)))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    examples = load_patch_examples(dataset_path, image_root=image_root, split=split, patch_size=patch_size)
    if not examples and split is not None:
        examples = load_patch_examples(dataset_path, image_root=image_root, split=None, patch_size=patch_size)
    if not examples:
        raise ValueError("vision dataset did not produce any evaluation examples")

    inputs = torch.tensor(np.stack([example.patch for example in examples]), dtype=torch.float32)
    labels = np.array([example.label for example in examples], dtype=np.int64)
    with torch.no_grad():
        probabilities = torch.softmax(model(inputs), dim=1).cpu().numpy()

    report = evaluation_report_from_probabilities(probabilities, labels)
    if output_path is not None:
        Path(output_path).write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def evaluation_report_from_probabilities(
    probabilities: np.ndarray,
    labels: np.ndarray,
) -> dict[str, object]:
    predictions = np.argmax(probabilities, axis=1)
    correct = predictions == labels
    confusion = np.zeros((len(SYMBOLS), len(SYMBOLS)), dtype=int)
    per_symbol: dict[str, dict[str, float | int]] = {}

    for label, prediction in zip(labels, predictions, strict=True):
        confusion[int(label), int(prediction)] += 1

    for symbol_index, symbol in enumerate(SYMBOLS):
        mask = labels == symbol_index
        total = int(np.sum(mask))
        per_symbol[symbol] = {
            "accuracy": float(np.mean(correct[mask])) if total > 0 else 0.0,
            "total": total,
        }

    sorted_probabilities = np.sort(probabilities, axis=1)
    margins = sorted_probabilities[:, -1] - sorted_probabilities[:, -2]

    return {
        "accuracy": float(np.mean(correct)) if labels.size > 0 else 0.0,
        "averageTop2Margin": float(np.mean(margins)) if labels.size > 0 else 0.0,
        "confusionMatrix": confusion.tolist(),
        "examples": int(labels.size),
        "perSymbol": per_symbol,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate a trained sticker CNN checkpoint.")
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--dataset", required=True, type=Path)
    parser.add_argument("--image-root", required=True, type=Path)
    parser.add_argument("--split", default="validation")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    try:
        report = evaluate_cnn(
            checkpoint_path=args.checkpoint,
            dataset_path=args.dataset,
            image_root=args.image_root,
            split=args.split,
            output_path=args.output,
        )
    except TorchNotAvailableError as error:
        raise SystemExit(str(error)) from error

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
