from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from .dataset_schema import FaceAnnotation, StickerAnnotation, VisionDataset, load_dataset_file


SYMBOLS = ("U", "R", "F", "D", "L", "B")
SYMBOL_TO_INDEX = {symbol: index for index, symbol in enumerate(SYMBOLS)}
INDEX_TO_SYMBOL = {index: symbol for symbol, index in SYMBOL_TO_INDEX.items()}
DEFAULT_PATCH_SIZE = 64


@dataclass(frozen=True)
class VisionPatchExample:
    patch: np.ndarray
    label: int
    symbol: str
    session_id: str
    face_symbol: str
    sticker_index: int
    image_path: Path


def load_patch_examples(
    dataset_path: str | Path,
    image_root: str | Path | None = None,
    split: str | None = None,
    patch_size: int = DEFAULT_PATCH_SIZE,
) -> list[VisionPatchExample]:
    dataset = load_dataset_file(dataset_path)
    root = Path(image_root) if image_root is not None else Path(dataset_path).parent

    return patch_examples_from_dataset(dataset, root, split=split, patch_size=patch_size)


def patch_examples_from_dataset(
    dataset: VisionDataset,
    image_root: Path,
    split: str | None = None,
    patch_size: int = DEFAULT_PATCH_SIZE,
) -> list[VisionPatchExample]:
    examples: list[VisionPatchExample] = []

    for session in dataset.sessions:
        if split is not None and session.split != split:
            continue
        for face in session.faces:
            image_path = image_root / face.imagePath
            image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
            if image is None:
                raise FileNotFoundError(f"could not read vision image: {image_path}")
            examples.extend(
                patch_examples_from_face(
                    image,
                    image_path,
                    session.sessionId,
                    face,
                    patch_size=patch_size,
                )
            )

    return examples


def patch_examples_from_face(
    image_bgr: np.ndarray,
    image_path: Path,
    session_id: str,
    face: FaceAnnotation,
    patch_size: int = DEFAULT_PATCH_SIZE,
) -> list[VisionPatchExample]:
    examples: list[VisionPatchExample] = []

    for sticker in sorted(face.stickers, key=lambda item: item.index):
        examples.append(
            VisionPatchExample(
                patch=extract_sticker_patch(image_bgr, sticker, patch_size=patch_size),
                label=SYMBOL_TO_INDEX[sticker.symbol],
                symbol=sticker.symbol,
                session_id=session_id,
                face_symbol=face.faceSymbol,
                sticker_index=sticker.index,
                image_path=image_path,
            )
        )

    return examples


def extract_sticker_patch(
    image_bgr: np.ndarray,
    sticker: StickerAnnotation,
    patch_size: int = DEFAULT_PATCH_SIZE,
) -> np.ndarray:
    height, width = image_bgr.shape[:2]
    points = np.array(
        [[point.x * (width - 1), point.y * (height - 1)] for point in sticker.polygon],
        dtype=np.float32,
    )
    x0, y0 = np.floor(points.min(axis=0)).astype(int)
    x1, y1 = np.ceil(points.max(axis=0)).astype(int)
    padding = max(2, int(min(width, height) * 0.01))
    x0 = max(0, x0 - padding)
    y0 = max(0, y0 - padding)
    x1 = min(width, x1 + padding)
    y1 = min(height, y1 + padding)

    if x1 <= x0 or y1 <= y0:
        patch = np.zeros((patch_size, patch_size, 3), dtype=np.uint8)
    else:
        patch = image_bgr[y0:y1, x0:x1]

    resized = cv2.resize(patch, (patch_size, patch_size), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return np.transpose(rgb, (2, 0, 1)).astype(np.float32)
