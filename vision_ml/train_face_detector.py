from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np

from .face_data import DEFAULT_FACE_INPUT_SIZE, FaceBoxExample, load_face_box_examples
from .face_model import create_face_box_detector
from .model import TorchNotAvailableError, require_torch


def train_face_detector(
    images_zip: str | Path,
    labels_zip: str | Path,
    output_dir: str | Path,
    epochs: int = 20,
    seed: int = 0,
    batch_size: int = 32,
    learning_rate: float = 1e-3,
    image_size: int = DEFAULT_FACE_INPUT_SIZE,
) -> dict[str, object]:
    torch, _nn = require_torch()
    set_seed(seed)
    examples = load_face_box_examples(images_zip, labels_zip, split="train", image_size=image_size, seed=seed)
    if not examples:
        raise ValueError("face dataset did not produce any training examples")

    model = create_face_box_detector()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    loss_fn = torch.nn.SmoothL1Loss(beta=0.04)
    final_loss = 0.0

    for epoch in range(epochs):
        model.train()
        for batch in example_batches(examples, batch_size=batch_size, seed=seed + epoch):
            inputs, targets = tensor_batch(torch, batch)
            optimizer.zero_grad()
            predictions = model(inputs)
            loss = loss_fn(predictions, targets)
            loss.backward()
            optimizer.step()
            final_loss = float(loss.detach().cpu().item())

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    checkpoint_path = output_path / "face-detector.pt"
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "input_size": image_size,
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
        "inputSize": image_size,
    }
    (output_path / "face-train-metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


def example_batches(
    examples: list[FaceBoxExample],
    batch_size: int,
    seed: int,
) -> list[list[FaceBoxExample]]:
    shuffled = examples[:]
    random.Random(seed).shuffle(shuffled)
    return [shuffled[index : index + batch_size] for index in range(0, len(shuffled), batch_size)]


def tensor_batch(torch, examples: list[FaceBoxExample]):
    inputs = torch.tensor(np.stack([example.image for example in examples]), dtype=torch.float32)
    targets = torch.tensor(np.stack([example.bbox for example in examples]), dtype=torch.float32)
    return inputs, targets


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    try:
        torch, _nn = require_torch()
    except TorchNotAvailableError:
        return
    torch.manual_seed(seed)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the Rubik's cube face bbox detector.")
    parser.add_argument("--images-zip", required=True, type=Path)
    parser.add_argument("--labels-zip", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--epochs", default=20, type=int)
    parser.add_argument("--seed", default=0, type=int)
    parser.add_argument("--batch-size", default=32, type=int)
    parser.add_argument("--learning-rate", default=1e-3, type=float)
    parser.add_argument("--image-size", default=DEFAULT_FACE_INPUT_SIZE, type=int)
    args = parser.parse_args()

    try:
        metrics = train_face_detector(
            images_zip=args.images_zip,
            labels_zip=args.labels_zip,
            output_dir=args.output,
            epochs=args.epochs,
            seed=args.seed,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            image_size=args.image_size,
        )
    except TorchNotAvailableError as error:
        raise SystemExit(str(error)) from error

    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
