from __future__ import annotations

import argparse
from pathlib import Path

from .face_data import DEFAULT_FACE_INPUT_SIZE
from .face_model import create_face_box_detector
from .model import TorchNotAvailableError, require_torch


def export_face_detector_onnx(
    checkpoint_path: str | Path,
    output_path: str | Path,
    input_size: int = DEFAULT_FACE_INPUT_SIZE,
) -> Path:
    torch, _nn = require_torch()
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    model = create_face_box_detector()
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    dummy_input = torch.zeros(1, 3, input_size, input_size, dtype=torch.float32)
    torch.onnx.export(
        model,
        dummy_input,
        output,
        input_names=["image"],
        output_names=["bbox"],
        dynamic_axes={"image": {0: "batch"}, "bbox": {0: "batch"}},
        opset_version=17,
    )
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Export the face bbox detector to ONNX.")
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--input-size", default=DEFAULT_FACE_INPUT_SIZE, type=int)
    args = parser.parse_args()

    try:
        output = export_face_detector_onnx(args.checkpoint, args.output, input_size=args.input_size)
    except TorchNotAvailableError as error:
        raise SystemExit(str(error)) from error

    print(output)


if __name__ == "__main__":
    main()
