from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from .face_data import DEFAULT_FACE_INPUT_SIZE, load_face_box_examples
from .face_model import create_face_box_detector
from .model import TorchNotAvailableError, require_torch


def evaluate_face_detector(
    checkpoint_path: str | Path,
    images_zip: str | Path,
    labels_zip: str | Path,
    split: str = "validation",
    output_path: str | Path | None = None,
    image_size: int = DEFAULT_FACE_INPUT_SIZE,
) -> dict[str, object]:
    torch, _nn = require_torch()
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    model = create_face_box_detector()
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    examples = load_face_box_examples(
        images_zip,
        labels_zip,
        split=split,
        image_size=image_size,
        seed=int(checkpoint.get("seed", 0)),
    )
    if not examples:
        raise ValueError("face dataset did not produce any evaluation examples")

    inputs = torch.tensor(np.stack([example.image for example in examples]), dtype=torch.float32)
    targets = np.stack([example.bbox for example in examples]).astype(np.float32)
    with torch.no_grad():
        predictions = model(inputs).cpu().numpy().astype(np.float32)

    report = face_detector_report(predictions, targets)
    if output_path is not None:
        Path(output_path).write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def face_detector_report(predictions: np.ndarray, targets: np.ndarray) -> dict[str, object]:
    ious = np.array([bbox_iou_xywh(prediction, target) for prediction, target in zip(predictions, targets, strict=True)])
    abs_errors = np.abs(predictions - targets)
    return {
        "examples": int(targets.shape[0]),
        "meanIoU": float(np.mean(ious)) if ious.size > 0 else 0.0,
        "iouAt50": float(np.mean(ious >= 0.5)) if ious.size > 0 else 0.0,
        "iouAt75": float(np.mean(ious >= 0.75)) if ious.size > 0 else 0.0,
        "meanAbsoluteError": float(np.mean(abs_errors)) if abs_errors.size > 0 else 0.0,
        "maxAbsoluteError": float(np.max(abs_errors)) if abs_errors.size > 0 else 0.0,
    }


def bbox_iou_xywh(left: np.ndarray, right: np.ndarray) -> float:
    left_x0, left_y0, left_x1, left_y1 = bbox_xyxy(left)
    right_x0, right_y0, right_x1, right_y1 = bbox_xyxy(right)
    intersection_x0 = max(left_x0, right_x0)
    intersection_y0 = max(left_y0, right_y0)
    intersection_x1 = min(left_x1, right_x1)
    intersection_y1 = min(left_y1, right_y1)
    intersection = max(0.0, intersection_x1 - intersection_x0) * max(0.0, intersection_y1 - intersection_y0)
    left_area = max(0.0, left_x1 - left_x0) * max(0.0, left_y1 - left_y0)
    right_area = max(0.0, right_x1 - right_x0) * max(0.0, right_y1 - right_y0)
    union = left_area + right_area - intersection
    return 0.0 if union <= 0.0 else float(intersection / union)


def bbox_xyxy(bbox: np.ndarray) -> tuple[float, float, float, float]:
    x, y, width, height = [float(value) for value in bbox]
    return (
        max(0.0, x - width / 2.0),
        max(0.0, y - height / 2.0),
        min(1.0, x + width / 2.0),
        min(1.0, y + height / 2.0),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate a trained Rubik's cube face bbox detector.")
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--images-zip", required=True, type=Path)
    parser.add_argument("--labels-zip", required=True, type=Path)
    parser.add_argument("--split", default="validation")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--image-size", default=DEFAULT_FACE_INPUT_SIZE, type=int)
    args = parser.parse_args()

    try:
        report = evaluate_face_detector(
            checkpoint_path=args.checkpoint,
            images_zip=args.images_zip,
            labels_zip=args.labels_zip,
            split=args.split,
            output_path=args.output,
            image_size=args.image_size,
        )
    except TorchNotAvailableError as error:
        raise SystemExit(str(error)) from error

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
