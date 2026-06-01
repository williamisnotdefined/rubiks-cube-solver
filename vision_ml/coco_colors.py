from __future__ import annotations

import json
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from .data import DEFAULT_PATCH_SIZE, SYMBOL_TO_INDEX, VisionPatchExample


COCO_COLOR_TO_SYMBOL = {
    "w": "U",
    "r": "R",
    "g": "F",
    "y": "D",
    "o": "L",
    "b": "B",
    "white": "U",
    "red": "R",
    "green": "F",
    "yellow": "D",
    "orange": "L",
    "blue": "B",
}

SPLIT_TO_COCO_DIR = {
    "train": "train",
    "validation": "valid",
    "valid": "valid",
    "test": "test",
}


def load_coco_color_patch_examples(
    coco_zip_path: str | Path,
    split: str | None = "train",
    patch_size: int = DEFAULT_PATCH_SIZE,
) -> list[VisionPatchExample]:
    zip_path = Path(coco_zip_path)
    split_dirs = coco_split_dirs(split)
    examples: list[VisionPatchExample] = []

    with zipfile.ZipFile(zip_path) as archive:
        for split_dir in split_dirs:
            examples.extend(load_coco_split_examples(archive, zip_path, split_dir, patch_size))

    return examples


def coco_split_dirs(split: str | None) -> list[str]:
    if split is None:
        return ["train", "valid", "test"]
    split_dir = SPLIT_TO_COCO_DIR.get(split)
    if split_dir is None:
        raise ValueError("COCO color split must be one of train, validation, valid, or test")
    return [split_dir]


def load_coco_split_examples(
    archive: zipfile.ZipFile,
    zip_path: Path,
    split_dir: str,
    patch_size: int,
) -> list[VisionPatchExample]:
    annotations_path = f"{split_dir}/_annotations.coco.json"
    try:
        annotations = json.loads(archive.read(annotations_path).decode("utf-8"))
    except KeyError:
        return []

    images_by_id = {image["id"]: image for image in annotations.get("images", [])}
    symbols_by_category_id = coco_symbols_by_category_id(annotations.get("categories", []))
    annotations_by_image_id: dict[int, list[dict[str, Any]]] = defaultdict(list)

    for annotation in annotations.get("annotations", []):
        symbol = symbols_by_category_id.get(annotation.get("category_id"))
        if symbol is not None:
            annotations_by_image_id[int(annotation["image_id"])].append(annotation)

    examples: list[VisionPatchExample] = []
    for image_id, image_annotations in annotations_by_image_id.items():
        image_info = images_by_id.get(image_id)
        if image_info is None:
            continue

        image_path = f"{split_dir}/{image_info['file_name']}"
        image_bgr = decode_coco_image(archive, image_path)
        for annotation_index, annotation in enumerate(image_annotations):
            symbol = symbols_by_category_id[annotation["category_id"]]
            examples.append(
                VisionPatchExample(
                    patch=extract_bbox_patch(image_bgr, annotation["bbox"], patch_size=patch_size),
                    label=SYMBOL_TO_INDEX[symbol],
                    symbol=symbol,
                    session_id=f"coco-{split_dir}",
                    face_symbol=symbol,
                    sticker_index=annotation_index % 9,
                    image_path=Path(f"{zip_path}:{image_path}"),
                )
            )

    return examples


def coco_symbols_by_category_id(categories: list[dict[str, Any]]) -> dict[int, str]:
    symbols_by_category_id: dict[int, str] = {}
    for category in categories:
        category_name = str(category.get("name", "")).strip().lower()
        symbol = COCO_COLOR_TO_SYMBOL.get(category_name)
        if symbol is not None:
            symbols_by_category_id[int(category["id"])] = symbol
    return symbols_by_category_id


def decode_coco_image(archive: zipfile.ZipFile, image_path: str) -> np.ndarray:
    encoded = np.frombuffer(archive.read(image_path), dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"could not decode COCO image: {image_path}")
    return image


def extract_bbox_patch(
    image_bgr: np.ndarray,
    bbox: list[float],
    patch_size: int = DEFAULT_PATCH_SIZE,
) -> np.ndarray:
    height, width = image_bgr.shape[:2]
    x, y, bbox_width, bbox_height = bbox
    padding = max(2, int(min(width, height) * 0.01))
    x0 = max(0, int(np.floor(x)) - padding)
    y0 = max(0, int(np.floor(y)) - padding)
    x1 = min(width, int(np.ceil(x + bbox_width)) + padding)
    y1 = min(height, int(np.ceil(y + bbox_height)) + padding)

    if x1 <= x0 or y1 <= y0:
        patch = np.zeros((patch_size, patch_size, 3), dtype=np.uint8)
    else:
        patch = image_bgr[y0:y1, x0:x1]

    resized = cv2.resize(patch, (patch_size, patch_size), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return np.transpose(rgb, (2, 0, 1)).astype(np.float32)
