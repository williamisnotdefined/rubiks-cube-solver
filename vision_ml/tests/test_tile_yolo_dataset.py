from __future__ import annotations

import json
import zipfile
from pathlib import Path

from vision_ml.tile_yolo_dataset import (
    load_hf_tile_examples,
    load_roboflow_coco_zip_examples,
    prepare_tile_yolo_dataset,
)


def test_load_roboflow_coco_zip_examples_maps_tile_classes(tmp_path: Path) -> None:
    zip_path = write_roboflow_zip(tmp_path)

    examples = load_roboflow_coco_zip_examples(zip_path)

    class_ids = sorted(box.class_id for example in examples for box in example.boxes)

    assert len(examples) == 1
    assert class_ids == [1, 3]


def test_load_hf_tile_examples_reads_coco_and_labelme(tmp_path: Path) -> None:
    hf_root = write_hf_dataset(tmp_path)

    examples = load_hf_tile_examples(hf_root)

    class_ids = sorted(box.class_id for example in examples for box in example.boxes)

    assert len(examples) == 2
    assert class_ids == [0, 2, 4, 6]


def test_prepare_tile_yolo_dataset_writes_images_labels_and_yaml(tmp_path: Path) -> None:
    zip_path = write_roboflow_zip(tmp_path)
    hf_root = write_hf_dataset(tmp_path)
    output = tmp_path / "yolo"

    report = prepare_tile_yolo_dataset(output, roboflow_coco_zip=zip_path, hf_root=hf_root)

    assert report["images"] == 3
    assert (output / "data.yaml").exists()
    assert list((output / "images" / "train").glob("*.jpg"))
    assert list((output / "labels" / "train").glob("*.txt"))
    assert "names:" in (output / "data.yaml").read_text(encoding="utf-8")


def write_roboflow_zip(tmp_path: Path) -> Path:
    zip_path = tmp_path / "roboflow.coco.zip"
    coco = {
        "images": [{"id": 1, "file_name": "cube.jpg", "width": 100, "height": 80}],
        "categories": [
            {"id": 0, "name": "cube-colors"},
            {"id": 1, "name": "w"},
            {"id": 2, "name": "g"},
        ],
        "annotations": [
            {"id": 1, "image_id": 1, "category_id": 1, "bbox": [10, 10, 20, 20]},
            {"id": 2, "image_id": 1, "category_id": 2, "bbox": [40, 20, 30, 30]},
            {"id": 3, "image_id": 1, "category_id": 0, "bbox": [0, 0, 100, 80]},
        ],
    }
    with zipfile.ZipFile(zip_path, "w") as archive:
        archive.writestr("train/cube.jpg", b"fake-jpeg")
        archive.writestr("train/_annotations.coco.json", json.dumps(coco))
    return zip_path


def write_hf_dataset(tmp_path: Path) -> Path:
    root = tmp_path / "hf"
    train = root / "images" / "train"
    valid = root / "images" / "valid"
    train.mkdir(parents=True)
    valid.mkdir(parents=True)
    (train / "cube.jpg").write_bytes(b"fake-hf-jpeg")
    (valid / "valid.jpg").write_bytes(b"fake-valid-jpeg")
    coco = {
        "images": [{"id": 1, "file_name": "cube.jpg", "width": 120, "height": 90}],
        "categories": [{"id": 1, "name": "face"}, {"id": 2, "name": "red_tile"}],
        "annotations": [
            {"id": 1, "image_id": 1, "category_id": 1, "bbox": [0, 0, 90, 90]},
            {"id": 2, "image_id": 1, "category_id": 2, "bbox": [20, 20, 20, 20]},
        ],
    }
    (train / "_annotations.coco.json").write_text(json.dumps(coco), encoding="utf-8")
    labelme = {
        "imagePath": "valid.jpg",
        "imageWidth": 100,
        "imageHeight": 100,
        "shapes": [
            {"label": "yellow_tile", "points": [[10, 10], [30, 30]]},
            {"label": "blue_tile", "points": [[40, 40], [60, 60]]},
        ],
    }
    (valid / "valid.json").write_text(json.dumps(labelme), encoding="utf-8")
    return root
