from __future__ import annotations

import argparse
import json
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO


YOLO_TILE_CLASS_NAMES = ("face", "U", "R", "F", "D", "L", "B")
LABEL_TO_YOLO_CLASS = {
    "face": 0,
    "white_tile": 1,
    "white": 1,
    "w": 1,
    "red_tile": 2,
    "red": 2,
    "r": 2,
    "green_tile": 3,
    "green": 3,
    "g": 3,
    "yellow_tile": 4,
    "yellow": 4,
    "y": 4,
    "orange_tile": 5,
    "orange": 5,
    "o": 5,
    "blue_tile": 6,
    "blue": 6,
    "b": 6,
}

HF_SPLIT_DIRS = {
    "train": "train",
    "validation": "valid",
    "test": "test",
}

ROBOFLOW_SPLIT_DIRS = {
    "train": "train",
    "validation": "valid",
    "test": "test",
}


@dataclass(frozen=True)
class TileYoloBox:
    class_id: int
    x_center: float
    y_center: float
    width: float
    height: float


@dataclass(frozen=True)
class TileYoloExample:
    source: str
    split: str
    image_name: str
    boxes: list[TileYoloBox]
    file_path: Path | None = None
    archive_path: str | None = None


def prepare_tile_yolo_dataset(
    output_dir: str | Path,
    roboflow_coco_zip: str | Path | None = None,
    hf_root: str | Path | None = None,
    hf_repo: str | None = None,
    hf_local_dir: str | Path | None = None,
) -> dict[str, object]:
    output = Path(output_dir)
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    examples: list[TileYoloExample] = []
    if roboflow_coco_zip is not None:
        examples.extend(load_roboflow_coco_zip_examples(roboflow_coco_zip))
    if hf_repo is not None or hf_root is not None:
        root = resolve_hf_dataset_root(hf_root=hf_root, hf_repo=hf_repo, hf_local_dir=hf_local_dir)
        examples.extend(load_hf_tile_examples(root))

    if not examples:
        raise ValueError("no tile detection examples were loaded")

    write_yolo_dataset(output, examples, roboflow_coco_zip=roboflow_coco_zip)
    report = tile_dataset_report(examples)
    (output / "dataset-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def resolve_hf_dataset_root(
    hf_root: str | Path | None,
    hf_repo: str | None,
    hf_local_dir: str | Path | None,
) -> Path:
    if hf_root is not None:
        return Path(hf_root)
    if hf_repo is None:
        raise ValueError("hf_root or hf_repo is required")

    try:
        from huggingface_hub import snapshot_download  # type: ignore[import-not-found]
    except ImportError as error:
        raise ValueError("huggingface_hub is required for --hf-repo") from error

    local_dir = Path(hf_local_dir) if hf_local_dir is not None else Path("/tmp/opencode/rubiks-hf-tiles")
    return Path(
        snapshot_download(
            repo_id=hf_repo,
            repo_type="model",
            allow_patterns=["images/**"],
            local_dir=local_dir,
        )
    )


def load_hf_tile_examples(root: str | Path) -> list[TileYoloExample]:
    root_path = Path(root)
    examples: list[TileYoloExample] = []
    for split, split_dir in HF_SPLIT_DIRS.items():
        annotations_path = root_path / "images" / split_dir / "_annotations.coco.json"
        if annotations_path.exists():
            examples.extend(load_coco_file_examples(annotations_path, source="hf", split=split))
        else:
            examples.extend(load_labelme_split_examples(root_path / "images" / split_dir, source="hf", split=split))
    return examples


def load_roboflow_coco_zip_examples(coco_zip_path: str | Path) -> list[TileYoloExample]:
    zip_path = Path(coco_zip_path)
    examples: list[TileYoloExample] = []
    with zipfile.ZipFile(zip_path) as archive:
        for split, split_dir in ROBOFLOW_SPLIT_DIRS.items():
            annotations_name = f"{split_dir}/_annotations.coco.json"
            try:
                annotations = json.loads(archive.read(annotations_name).decode("utf-8"))
            except KeyError:
                continue
            examples.extend(coco_examples_from_data(annotations, source="roboflow", split=split, prefix=split_dir))
    return examples


def load_coco_file_examples(path: Path, source: str, split: str) -> list[TileYoloExample]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return coco_examples_from_data(data, source=source, split=split, prefix=str(path.parent))


def coco_examples_from_data(data: dict[str, object], source: str, split: str, prefix: str) -> list[TileYoloExample]:
    images = {image["id"]: image for image in data.get("images", [])}  # type: ignore[index]
    category_by_id = {
        category["id"]: str(category.get("name", "")).strip().lower()  # type: ignore[index]
        for category in data.get("categories", [])  # type: ignore[union-attr]
    }
    boxes_by_image_id: dict[int, list[TileYoloBox]] = {}
    for annotation in data.get("annotations", []):  # type: ignore[union-attr]
        label = category_by_id.get(annotation.get("category_id"))  # type: ignore[union-attr]
        class_id = LABEL_TO_YOLO_CLASS.get(label or "")
        image = images.get(annotation.get("image_id"))  # type: ignore[union-attr]
        if class_id is None or image is None:
            continue
        box = normalized_box_from_coco_bbox(annotation.get("bbox"), image["width"], image["height"])  # type: ignore[index, union-attr]
        if box is None:
            continue
        boxes_by_image_id.setdefault(int(image["id"]), []).append(TileYoloBox(class_id=class_id, **box))  # type: ignore[index]

    examples = []
    for image_id, boxes in boxes_by_image_id.items():
        if not boxes:
            continue
        image = images[image_id]
        image_name = str(image["file_name"])
        image_path = Path(prefix) / image_name
        examples.append(
            TileYoloExample(
                source=source,
                split=split,
                image_name=image_name,
                boxes=boxes,
                file_path=image_path if Path(prefix).is_absolute() else None,
                archive_path=f"{prefix}/{image_name}" if not Path(prefix).is_absolute() else None,
            )
        )
    return examples


def load_labelme_split_examples(split_dir: Path, source: str, split: str) -> list[TileYoloExample]:
    if not split_dir.exists():
        return []

    examples = []
    for label_path in sorted(split_dir.glob("*.json")):
        data = json.loads(label_path.read_text(encoding="utf-8"))
        width = int(data["imageWidth"])
        height = int(data["imageHeight"])
        boxes = []
        for shape in data.get("shapes", []):
            class_id = LABEL_TO_YOLO_CLASS.get(str(shape.get("label", "")).strip().lower())
            if class_id is None:
                continue
            box = normalized_box_from_labelme_points(shape.get("points"), width, height)
            if box is not None:
                boxes.append(TileYoloBox(class_id=class_id, **box))
        if boxes:
            examples.append(
                TileYoloExample(
                    source=source,
                    split=split,
                    image_name=str(data["imagePath"]),
                    boxes=boxes,
                    file_path=split_dir / str(data["imagePath"]),
                )
            )
    return examples


def normalized_box_from_coco_bbox(bbox: object, width: int, height: int) -> dict[str, float] | None:
    if not isinstance(bbox, list) or len(bbox) != 4:
        return None
    x, y, box_width, box_height = [float(value) for value in bbox]
    return normalized_box_from_xyxy(x, y, x + box_width, y + box_height, width, height)


def normalized_box_from_labelme_points(points: object, width: int, height: int) -> dict[str, float] | None:
    if not isinstance(points, list) or len(points) < 2:
        return None
    xs = [float(point[0]) for point in points]
    ys = [float(point[1]) for point in points]
    return normalized_box_from_xyxy(min(xs), min(ys), max(xs), max(ys), width, height)


def normalized_box_from_xyxy(
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    image_width: int,
    image_height: int,
) -> dict[str, float] | None:
    x0 = max(0.0, min(float(image_width), x0))
    y0 = max(0.0, min(float(image_height), y0))
    x1 = max(0.0, min(float(image_width), x1))
    y1 = max(0.0, min(float(image_height), y1))
    box_width = x1 - x0
    box_height = y1 - y0
    if box_width <= 1.0 or box_height <= 1.0:
        return None
    return {
        "x_center": ((x0 + x1) / 2.0) / image_width,
        "y_center": ((y0 + y1) / 2.0) / image_height,
        "width": box_width / image_width,
        "height": box_height / image_height,
    }


def write_yolo_dataset(
    output: Path,
    examples: list[TileYoloExample],
    roboflow_coco_zip: str | Path | None,
) -> None:
    for split in ("train", "validation", "test"):
        (output / "images" / split).mkdir(parents=True, exist_ok=True)
        (output / "labels" / split).mkdir(parents=True, exist_ok=True)

    archive: zipfile.ZipFile | None = zipfile.ZipFile(roboflow_coco_zip) if roboflow_coco_zip is not None else None
    try:
        for index, example in enumerate(examples):
            stem = safe_stem(f"{example.source}_{example.split}_{index}_{Path(example.image_name).stem}")
            suffix = Path(example.image_name).suffix or ".jpg"
            image_output = output / "images" / example.split / f"{stem}{suffix}"
            label_output = output / "labels" / example.split / f"{stem}.txt"
            copy_example_image(example, image_output, archive)
            label_output.write_text("\n".join(yolo_line(box) for box in example.boxes) + "\n", encoding="utf-8")
    finally:
        if archive is not None:
            archive.close()

    (output / "data.yaml").write_text(data_yaml(output), encoding="utf-8")


def copy_example_image(example: TileYoloExample, output_path: Path, archive: zipfile.ZipFile | None) -> None:
    if example.file_path is not None:
        shutil.copyfile(example.file_path, output_path)
        return
    if archive is None or example.archive_path is None:
        raise ValueError(f"missing image source for {example.image_name}")
    with archive.open(example.archive_path) as source, output_path.open("wb") as target:
        copy_stream(source, target)


def copy_stream(source: BinaryIO, target: BinaryIO) -> None:
    while True:
        chunk = source.read(1024 * 1024)
        if not chunk:
            return
        target.write(chunk)


def yolo_line(box: TileYoloBox) -> str:
    return f"{box.class_id} {box.x_center:.6f} {box.y_center:.6f} {box.width:.6f} {box.height:.6f}"


def safe_stem(stem: str) -> str:
    return "".join(character if character.isalnum() or character in {"-", "_"} else "_" for character in stem)


def data_yaml(output: Path) -> str:
    names = "\n".join(f"  {index}: {name}" for index, name in enumerate(YOLO_TILE_CLASS_NAMES))
    return f"path: {output}\ntrain: images/train\nval: images/validation\ntest: images/test\nnames:\n{names}\n"


def tile_dataset_report(examples: list[TileYoloExample]) -> dict[str, object]:
    images_by_split: dict[str, int] = {}
    boxes_by_class = {name: 0 for name in YOLO_TILE_CLASS_NAMES}
    boxes_by_split: dict[str, int] = {}
    for example in examples:
        images_by_split[example.split] = images_by_split.get(example.split, 0) + 1
        boxes_by_split[example.split] = boxes_by_split.get(example.split, 0) + len(example.boxes)
        for box in example.boxes:
            boxes_by_class[YOLO_TILE_CLASS_NAMES[box.class_id]] += 1
    return {
        "images": sum(images_by_split.values()),
        "boxes": sum(boxes_by_class.values()),
        "imagesBySplit": images_by_split,
        "boxesBySplit": boxes_by_split,
        "boxesByClass": boxes_by_class,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a YOLO dataset for Rubik's sticker detection.")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--roboflow-coco-zip", type=Path)
    parser.add_argument("--hf-root", type=Path)
    parser.add_argument("--hf-repo")
    parser.add_argument("--hf-local-dir", type=Path)
    args = parser.parse_args()

    report = prepare_tile_yolo_dataset(
        output_dir=args.output,
        roboflow_coco_zip=args.roboflow_coco_zip,
        hf_root=args.hf_root,
        hf_repo=args.hf_repo,
        hf_local_dir=args.hf_local_dir,
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
