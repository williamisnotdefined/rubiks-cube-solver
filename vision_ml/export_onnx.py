from __future__ import annotations

import argparse
from pathlib import Path

from .data import DEFAULT_PATCH_SIZE, SYMBOLS
from .model import TorchNotAvailableError, create_sticker_cnn, require_torch


def export_onnx(
    checkpoint_path: str | Path,
    output_path: str | Path,
    input_size: int = DEFAULT_PATCH_SIZE,
) -> Path:
    torch, _nn = require_torch()
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    model = create_sticker_cnn(num_classes=len(checkpoint.get("symbols", SYMBOLS)))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    dummy = torch.zeros((9, 3, input_size, input_size), dtype=torch.float32)
    torch.onnx.export(
        model,
        dummy,
        output,
        input_names=["sticker"],
        output_names=["logits"],
        dynamic_axes={"sticker": {0: "stickers"}, "logits": {0: "stickers"}},
        opset_version=17,
    )
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Export a trained sticker CNN checkpoint to ONNX.")
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--input-size", default=DEFAULT_PATCH_SIZE, type=int)
    args = parser.parse_args()

    try:
        output = export_onnx(args.checkpoint, args.output, input_size=args.input_size)
    except TorchNotAvailableError as error:
        raise SystemExit(str(error)) from error

    print(output)


if __name__ == "__main__":
    main()
