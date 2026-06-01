from __future__ import annotations

import hashlib
import zipfile
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


DEFAULT_FACE_INPUT_SIZE = 224
DEFAULT_VALIDATION_FRACTION = 0.15
DEFAULT_TEST_FRACTION = 0.10


@dataclass(frozen=True)
class FaceBoxExample:
    image: np.ndarray
    bbox: np.ndarray
    image_name: str
    split: str


def load_face_box_examples(
    images_zip_path: str | Path,
    labels_zip_path: str | Path,
    split: str | None = "train",
    image_size: int = DEFAULT_FACE_INPUT_SIZE,
    seed: int = 0,
    validation_fraction: float = DEFAULT_VALIDATION_FRACTION,
    test_fraction: float = DEFAULT_TEST_FRACTION,
) -> list[FaceBoxExample]:
    examples: list[FaceBoxExample] = []
    with zipfile.ZipFile(images_zip_path) as image_archive, zipfile.ZipFile(labels_zip_path) as label_archive:
        image_names_by_stem = image_names_by_stem_from_archive(image_archive)
        for label_name in sorted(name for name in label_archive.namelist() if not name.endswith("/")):
            label_stem = Path(label_name).stem
            image_name = image_names_by_stem.get(label_stem)
            if image_name is None:
                continue
            bbox = read_yolo_bbox(label_archive, label_name)
            if bbox is None:
                continue
            example_split = split_for_stem(label_stem, seed, validation_fraction, test_fraction)
            if split is not None and example_split != split:
                continue
            image = decode_and_resize_image(image_archive, image_name, image_size)
            examples.append(
                FaceBoxExample(
                    image=image,
                    bbox=np.array(bbox, dtype=np.float32),
                    image_name=image_name,
                    split=example_split,
                )
            )
    return examples


def image_names_by_stem_from_archive(archive: zipfile.ZipFile) -> dict[str, str]:
    return {
        Path(name).stem: name
        for name in archive.namelist()
        if not name.endswith("/") and Path(name).suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    }


def read_yolo_bbox(archive: zipfile.ZipFile, label_name: str) -> tuple[float, float, float, float] | None:
    lines = [
        line.strip()
        for line in archive.read(label_name).decode("utf-8", errors="replace").splitlines()
        if line.strip()
    ]
    if not lines:
        return None

    best_bbox: tuple[float, float, float, float] | None = None
    best_area = 0.0
    for line in lines:
        parts = line.split()
        if len(parts) != 5:
            continue
        _class_id, x, y, width, height = parts
        bbox = (float(x), float(y), float(width), float(height))
        if not valid_normalized_bbox(bbox):
            continue
        area = bbox[2] * bbox[3]
        if area > best_area:
            best_bbox = bbox
            best_area = area
    return best_bbox


def valid_normalized_bbox(bbox: tuple[float, float, float, float]) -> bool:
    x, y, width, height = bbox
    return (
        0.0 <= x <= 1.0
        and 0.0 <= y <= 1.0
        and 0.0 < width <= 1.0
        and 0.0 < height <= 1.0
    )


def split_for_stem(
    stem: str,
    seed: int,
    validation_fraction: float = DEFAULT_VALIDATION_FRACTION,
    test_fraction: float = DEFAULT_TEST_FRACTION,
) -> str:
    digest = hashlib.sha256(f"{seed}:{stem}".encode("utf-8")).digest()
    bucket = int.from_bytes(digest[:8], "big") / float(2**64 - 1)
    if bucket < test_fraction:
        return "test"
    if bucket < test_fraction + validation_fraction:
        return "validation"
    return "train"


def decode_and_resize_image(archive: zipfile.ZipFile, image_name: str, image_size: int) -> np.ndarray:
    encoded = np.frombuffer(archive.read(image_name), dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"could not decode face dataset image: {image_name}")
    resized = cv2.resize(image, (image_size, image_size), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return np.transpose(rgb, (2, 0, 1)).astype(np.float32)
