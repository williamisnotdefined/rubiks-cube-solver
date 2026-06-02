from __future__ import annotations

import argparse
import base64
import hashlib
import json
import shutil
from pathlib import Path
from typing import Any, Literal

from .scan_session_export import scan_session_export_files
from .tile_yolo_dataset import YOLO_TILE_CLASS_NAMES


ValidationMode = Literal["duplicate", "none"]
SCAN_SYMBOL_TO_YOLO_CLASS = {symbol: index for index, symbol in enumerate(YOLO_TILE_CLASS_NAMES)}


def prepare_scan_export_tile_yolo_dataset(
    input_path: str | Path,
    output_dir: str | Path,
    *,
    include_face: bool = False,
    validation_mode: ValidationMode = "duplicate",
) -> dict[str, object]:
    output = Path(output_dir)
    if output.exists():
        shutil.rmtree(output)

    for split in ("train", "validation", "test"):
        (output / "images" / split).mkdir(parents=True, exist_ok=True)
        (output / "labels" / split).mkdir(parents=True, exist_ok=True)

    examples = scan_export_yolo_examples(input_path, include_face=include_face)
    if not examples:
        raise ValueError("no scan export tile examples were loaded")

    splits = ["train"] if validation_mode == "none" else ["train", "validation"]
    for example in examples:
        for split in splits:
            (output / "images" / split / f"{example['stem']}.jpg").write_bytes(example["image_bytes"])
            (output / "labels" / split / f"{example['stem']}.txt").write_text(
                "\n".join(example["label_lines"]) + "\n",
                encoding="utf-8",
            )

    (output / "data.yaml").write_text(data_yaml(output), encoding="utf-8")
    report = dataset_report(input_path, examples, validation_mode=validation_mode)
    (output / "dataset-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def scan_export_yolo_examples(input_path: str | Path, *, include_face: bool = False) -> list[dict[str, Any]]:
    seen_images: set[str] = set()
    examples: list[dict[str, Any]] = []

    for session_path in scan_session_export_files(input_path):
        data = json.loads(session_path.read_text(encoding="utf-8"))
        for face_index, face in enumerate(data.get("faces", [])):
            photo_data_url = face.get("photoDataUrl")
            analysis = face.get("analysis") or {}
            analyzed_stickers = {sticker.get("index"): sticker for sticker in analysis.get("stickers") or []}
            reviewed_stickers = {sticker.get("index"): sticker for sticker in face.get("stickers") or []}

            if not photo_data_url or len(analyzed_stickers) < 9 or len(reviewed_stickers) < 9:
                continue

            image_bytes = decode_data_url(photo_data_url)
            image_hash = hashlib.sha256(image_bytes).hexdigest()
            if image_hash in seen_images:
                continue
            seen_images.add(image_hash)

            label_lines: list[str] = []
            if include_face:
                face_box = bbox_from_points(analysis.get("faceQuad") or [])
                if face_box is not None:
                    label_lines.append(yolo_line(SCAN_SYMBOL_TO_YOLO_CLASS["face"], face_box))

            for index in range(9):
                analyzed = analyzed_stickers.get(index) or {}
                reviewed = reviewed_stickers.get(index) or {}
                symbol = reviewed.get("symbol") or analyzed.get("symbol")
                class_id = SCAN_SYMBOL_TO_YOLO_CLASS.get(str(symbol or ""))
                box = bbox_from_points(analyzed.get("polygon") or [])
                if class_id is not None and box is not None:
                    label_lines.append(yolo_line(class_id, box))

            if len(label_lines) >= 9:
                examples.append(
                    {
                        "image_bytes": image_bytes,
                        "label_lines": label_lines,
                        "session": session_path.name,
                        "stem": safe_stem(
                            f"{session_path.stem}_face{face_index}_{face.get('symbol', 'X')}_{image_hash[:8]}"
                        ),
                    }
                )

    return examples


def decode_data_url(value: str) -> bytes:
    payload = value.split(",", 1)[1] if value.startswith("data:") and "," in value else value
    return base64.b64decode(payload)


def bbox_from_points(points: object) -> tuple[float, float, float, float] | None:
    if not isinstance(points, list) or len(points) < 2:
        return None

    xs = [float(point["x"]) for point in points]
    ys = [float(point["y"]) for point in points]
    x0 = clip01(min(xs))
    y0 = clip01(min(ys))
    x1 = clip01(max(xs))
    y1 = clip01(max(ys))
    width = x1 - x0
    height = y1 - y0
    if width <= 0.005 or height <= 0.005:
        return None
    return ((x0 + x1) / 2.0, (y0 + y1) / 2.0, width, height)


def yolo_line(class_id: int, box: tuple[float, float, float, float]) -> str:
    return f"{class_id} {box[0]:.6f} {box[1]:.6f} {box[2]:.6f} {box[3]:.6f}"


def data_yaml(output: Path) -> str:
    names = "\n".join(f"  {index}: {name}" for index, name in enumerate(YOLO_TILE_CLASS_NAMES))
    return f"path: {output.resolve()}\ntrain: images/train\nval: images/validation\ntest: images/test\nnames:\n{names}\n"


def dataset_report(input_path: str | Path, examples: list[dict[str, Any]], *, validation_mode: ValidationMode) -> dict[str, object]:
    boxes_by_class = {name: 0 for name in YOLO_TILE_CLASS_NAMES}
    for example in examples:
        for line in example["label_lines"]:
            class_id = int(line.split(" ", 1)[0])
            boxes_by_class[YOLO_TILE_CLASS_NAMES[class_id]] += 1

    split_count = len(examples) if validation_mode == "duplicate" else 0
    return {
        "input": str(input_path),
        "images": len(examples),
        "trainImages": len(examples),
        "validationImages": split_count,
        "validationMode": validation_mode,
        "boxesByClass": boxes_by_class,
        "sourceSessions": sorted({str(example["session"]) for example in examples}),
    }


def safe_stem(stem: str) -> str:
    return "".join(character if character.isalnum() or character in {"-", "_"} else "_" for character in stem)


def clip01(value: float) -> float:
    return min(1.0, max(0.0, value))


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare YOLO tile data from exported scan session JSON files.")
    parser.add_argument("--input", default="vision_ml/outputs/local-sessions", type=Path)
    parser.add_argument("--output", default="vision_ml/outputs/tile-yolo-local-stickers", type=Path)
    parser.add_argument("--include-face", action="store_true", help="Include one whole-face box per image.")
    parser.add_argument("--validation-mode", choices=["duplicate", "none"], default="duplicate")
    args = parser.parse_args()

    report = prepare_scan_export_tile_yolo_dataset(
        input_path=args.input,
        output_dir=args.output,
        include_face=args.include_face,
        validation_mode=args.validation_mode,
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
