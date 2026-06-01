from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

cv2 = pytest.importorskip("cv2")
np = pytest.importorskip("numpy")

from vision_ml.coco_colors import load_coco_color_patch_examples


def test_load_coco_color_patch_examples_maps_color_labels(tmp_path: Path) -> None:
    coco_zip = write_coco_zip(tmp_path)

    examples = load_coco_color_patch_examples(coco_zip, split="train", patch_size=24)

    assert len(examples) == 6
    assert [example.symbol for example in examples] == ["U", "R", "F", "D", "L", "B"]
    assert examples[0].patch.shape == (3, 24, 24)
    assert examples[0].patch.dtype == np.float32
    assert 0.0 <= float(examples[0].patch.min()) <= float(examples[0].patch.max()) <= 1.0


def test_load_coco_color_patch_examples_maps_validation_split(tmp_path: Path) -> None:
    coco_zip = write_coco_zip(tmp_path, split="valid", category_names=["g"])

    examples = load_coco_color_patch_examples(coco_zip, split="validation", patch_size=16)

    assert len(examples) == 1
    assert examples[0].symbol == "F"


def write_coco_zip(
    tmp_path: Path,
    split: str = "train",
    category_names: list[str] | None = None,
) -> Path:
    category_names = category_names or ["w", "r", "g", "y", "o", "b"]
    zip_path = tmp_path / "rubiks-colors.coco.zip"
    image_name = "cube.jpg"
    image = synthetic_coco_image()
    ok, encoded = cv2.imencode(".jpg", image)
    assert ok

    categories = [{"id": 0, "name": "cube-colors"}]
    categories.extend(
        {"id": index + 1, "name": name} for index, name in enumerate(category_names)
    )
    annotations = [
        {
            "id": index + 1,
            "image_id": 1,
            "category_id": index + 1,
            "bbox": [8 + index * 4, 10 + index * 3, 20, 18],
            "area": 360,
            "iscrowd": 0,
            "segmentation": [],
        }
        for index, _name in enumerate(category_names)
    ]
    annotations.append(
        {
            "id": len(annotations) + 1,
            "image_id": 1,
            "category_id": 0,
            "bbox": [0, 0, 64, 64],
            "area": 4096,
            "iscrowd": 0,
            "segmentation": [],
        }
    )
    coco = {
        "images": [{"id": 1, "file_name": image_name, "height": 64, "width": 64}],
        "annotations": annotations,
        "categories": categories,
    }

    with zipfile.ZipFile(zip_path, "w") as archive:
        archive.writestr(f"{split}/{image_name}", encoded.tobytes())
        archive.writestr(f"{split}/_annotations.coco.json", json.dumps(coco))

    return zip_path


def synthetic_coco_image():
    image = np.zeros((64, 64, 3), dtype=np.uint8)
    image[:, :] = (24, 24, 24)
    for index, color in enumerate(
        [
            (248, 250, 252),
            (239, 68, 68),
            (34, 197, 94),
            (250, 204, 21),
            (249, 115, 22),
            (37, 99, 235),
        ]
    ):
        x0 = 8 + index * 4
        y0 = 10 + index * 3
        image[y0 : y0 + 18, x0 : x0 + 20] = color[::-1]
    return image
