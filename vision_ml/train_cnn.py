from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np

from .coco_colors import load_coco_color_patch_examples
from .data import DEFAULT_PATCH_SIZE, SYMBOLS, VisionPatchExample, load_patch_examples
from .model import TorchNotAvailableError, create_sticker_cnn, require_torch


def train_cnn(
    dataset_path: str | Path | None,
    image_root: str | Path | None,
    output_dir: str | Path,
    epochs: int = 1,
    seed: int = 0,
    batch_size: int = 32,
    learning_rate: float = 1e-3,
    patch_size: int = DEFAULT_PATCH_SIZE,
    coco_zip: str | Path | None = None,
) -> dict[str, object]:
    torch, _nn = require_torch()
    set_seed(seed)

    examples = load_training_examples(dataset_path, image_root, coco_zip, patch_size)
    if not examples:
        raise ValueError("vision dataset did not produce any sticker examples")

    model = create_sticker_cnn(num_classes=len(SYMBOLS))
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    loss_fn = torch.nn.CrossEntropyLoss()

    batches = example_batches(examples, batch_size=batch_size, seed=seed)
    final_loss = 0.0
    for _epoch in range(epochs):
        model.train()
        for batch in batches:
            inputs, labels = tensor_batch(torch, batch)
            optimizer.zero_grad()
            logits = model(inputs)
            loss = loss_fn(logits, labels)
            loss.backward()
            optimizer.step()
            final_loss = float(loss.detach().cpu().item())

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    checkpoint_path = output_path / "sticker-cnn.pt"
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "symbols": list(SYMBOLS),
            "input_size": patch_size,
            "epochs": epochs,
            "seed": seed,
            "final_loss": final_loss,
        },
        checkpoint_path,
    )
    metrics = {
        "checkpoint": str(checkpoint_path),
        "examples": len(examples),
        "epochs": epochs,
        "finalLoss": final_loss,
        "source": "coco-zip" if coco_zip is not None else "vision-dataset",
    }
    (output_path / "train-metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


def load_training_examples(
    dataset_path: str | Path | None,
    image_root: str | Path | None,
    coco_zip: str | Path | None,
    patch_size: int,
) -> list[VisionPatchExample]:
    if coco_zip is not None:
        if dataset_path is not None:
            raise ValueError("provide either --dataset or --coco-zip, not both")
        return load_coco_color_patch_examples(coco_zip, split="train", patch_size=patch_size)

    if dataset_path is None or image_root is None:
        raise ValueError("vision dataset training requires dataset_path and image_root")

    examples = load_patch_examples(dataset_path, image_root=image_root, split="train", patch_size=patch_size)
    if not examples:
        examples = load_patch_examples(dataset_path, image_root=image_root, split=None, patch_size=patch_size)
    return examples


def example_batches(
    examples: list[VisionPatchExample],
    batch_size: int,
    seed: int,
) -> list[list[VisionPatchExample]]:
    shuffled = examples[:]
    random.Random(seed).shuffle(shuffled)
    return [shuffled[index : index + batch_size] for index in range(0, len(shuffled), batch_size)]


def tensor_batch(torch, examples: list[VisionPatchExample]):
    inputs = torch.tensor(np.stack([example.patch for example in examples]), dtype=torch.float32)
    labels = torch.tensor([example.label for example in examples], dtype=torch.long)
    return inputs, labels


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    try:
        torch, _nn = require_torch()
    except TorchNotAvailableError:
        return
    torch.manual_seed(seed)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the Rubik's cube sticker CNN.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--dataset", type=Path)
    source.add_argument("--coco-zip", type=Path)
    parser.add_argument("--image-root", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--epochs", default=1, type=int)
    parser.add_argument("--seed", default=0, type=int)
    parser.add_argument("--batch-size", default=32, type=int)
    parser.add_argument("--learning-rate", default=1e-3, type=float)
    parser.add_argument("--patch-size", default=DEFAULT_PATCH_SIZE, type=int)
    args = parser.parse_args()

    if args.dataset is not None and args.image_root is None:
        parser.error("--image-root is required with --dataset")

    try:
        metrics = train_cnn(
            dataset_path=args.dataset,
            image_root=args.image_root,
            output_dir=args.output,
            epochs=args.epochs,
            seed=args.seed,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            patch_size=args.patch_size,
            coco_zip=args.coco_zip,
        )
    except TorchNotAvailableError as error:
        raise SystemExit(str(error)) from error

    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
