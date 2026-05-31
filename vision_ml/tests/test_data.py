from __future__ import annotations

import json
from pathlib import Path

import pytest

cv2 = pytest.importorskip("cv2")
np = pytest.importorskip("numpy")

from vision_ml.data import SYMBOL_TO_INDEX, load_patch_examples


def test_loads_sticker_patch_examples(tmp_path: Path) -> None:
    dataset_path = write_synthetic_dataset(tmp_path)

    examples = load_patch_examples(dataset_path, image_root=tmp_path, patch_size=32)

    assert len(examples) == 54
    assert examples[0].patch.shape == (3, 32, 32)
    assert examples[0].patch.dtype == np.float32
    assert examples[0].label == SYMBOL_TO_INDEX[examples[0].symbol]
    assert 0.0 <= float(examples[0].patch.min()) <= float(examples[0].patch.max()) <= 1.0


def test_load_patch_examples_requires_images(tmp_path: Path) -> None:
    dataset_path = write_synthetic_dataset(tmp_path)
    for image_path in tmp_path.glob("*.png"):
        image_path.unlink()

    with pytest.raises(FileNotFoundError):
        load_patch_examples(dataset_path, image_root=tmp_path)


def write_synthetic_dataset(tmp_path: Path, split: str = "train") -> Path:
    faces = []
    for symbol in ["U", "R", "F", "D", "L", "B"]:
        image_path = tmp_path / f"{symbol}.png"
        cv2.imwrite(str(image_path), synthetic_image(symbol))
        faces.append(
            {
                "faceSymbol": symbol,
                "expectedTop": "F" if symbol in {"U", "D"} else "U",
                "imagePath": image_path.name,
                "imageSize": {"width": 96, "height": 96},
                "faceQuad": square_polygon(0.0, 0.0, 1.0, 1.0),
                "stickers": [
                    {
                        "index": index,
                        "symbol": symbol,
                        "polygon": sticker_polygon(index),
                    }
                    for index in range(9)
                ],
                "qualityLabels": {"blur": False, "glare": False, "occlusion": False, "shadow": False},
            }
        )

    dataset = {
        "schemaVersion": "vision-scan-dataset-v1",
        "sessions": [
            {
                "sessionId": "synthetic-train",
                "split": split,
                "consent": True,
                "correctedCubeState": None,
                "faces": faces,
            }
        ],
    }
    dataset_path = tmp_path / "dataset.json"
    dataset_path.write_text(json.dumps(dataset), encoding="utf-8")
    return dataset_path


def synthetic_image(symbol: str):
    colors = {
        "U": (248, 250, 252),
        "R": (239, 68, 68),
        "F": (34, 197, 94),
        "D": (250, 204, 21),
        "L": (249, 115, 22),
        "B": (37, 99, 235),
    }
    rgb = colors[symbol]
    bgr = (rgb[2], rgb[1], rgb[0])
    image = np.zeros((96, 96, 3), dtype=np.uint8)
    image[:, :] = bgr
    return image


def sticker_polygon(index: int) -> list[dict[str, float]]:
    row = index // 3
    column = index % 3
    step = 1.0 / 3.0
    return square_polygon(column * step, row * step, (column + 1) * step, (row + 1) * step)


def square_polygon(x0: float, y0: float, x1: float, y1: float) -> list[dict[str, float]]:
    return [
        {"x": x0, "y": y0},
        {"x": x1, "y": y0},
        {"x": x1, "y": y1},
        {"x": x0, "y": y1},
    ]
