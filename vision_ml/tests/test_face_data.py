from __future__ import annotations

import zipfile
from pathlib import Path

import pytest

cv2 = pytest.importorskip("cv2")
np = pytest.importorskip("numpy")

from vision_ml.face_data import load_face_box_examples, read_yolo_bbox, split_for_stem


def test_load_face_box_examples_matches_images_and_skips_invalid_labels(tmp_path: Path) -> None:
    images_zip, labels_zip = write_face_dataset_zips(tmp_path, count=4, invalid_indexes={2})

    examples = load_face_box_examples(images_zip, labels_zip, split=None, image_size=32, seed=7)

    assert len(examples) == 3
    assert examples[0].image.shape == (3, 32, 32)
    assert examples[0].image.dtype == np.float32
    assert examples[0].bbox.tolist() == pytest.approx([0.5, 0.5, 0.4, 0.4])
    assert {example.split for example in examples} <= {"train", "validation", "test"}


def test_read_yolo_bbox_selects_largest_valid_box(tmp_path: Path) -> None:
    labels_zip = tmp_path / "labels.zip"
    with zipfile.ZipFile(labels_zip, "w") as archive:
        archive.writestr("sample.txt", "0 0.5 0.5 0.1 0.1\n0 0.4 0.6 0.3 0.2\n0 0.5 0.5 0.0 0.2\n")

    with zipfile.ZipFile(labels_zip) as archive:
        bbox = read_yolo_bbox(archive, "sample.txt")

    assert bbox == pytest.approx((0.4, 0.6, 0.3, 0.2))


def test_split_for_stem_is_stable() -> None:
    assert split_for_stem("100", seed=31) == split_for_stem("100", seed=31)


def write_face_dataset_zips(
    tmp_path: Path,
    count: int = 12,
    invalid_indexes: set[int] | None = None,
) -> tuple[Path, Path]:
    invalid_indexes = invalid_indexes or set()
    images_zip = tmp_path / "images.zip"
    labels_zip = tmp_path / "labels.zip"
    with zipfile.ZipFile(images_zip, "w") as image_archive, zipfile.ZipFile(labels_zip, "w") as label_archive:
        for index in range(count):
            image_name = f"{index}.jpg"
            ok, encoded = cv2.imencode(".jpg", synthetic_face_image(index))
            assert ok
            image_archive.writestr(image_name, encoded.tobytes())
            width = 0.0 if index in invalid_indexes else 0.4
            label_archive.writestr(f"{index}.txt", f"0 0.5 0.5 {width:.1f} 0.4\n")
    return images_zip, labels_zip


def synthetic_face_image(index: int):
    image = np.zeros((80, 80, 3), dtype=np.uint8)
    image[:, :] = (20, 20, 20)
    color = ((index * 17) % 255, 120, 220)
    image[24:56, 24:56] = color
    return image
