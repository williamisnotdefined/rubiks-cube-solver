from __future__ import annotations

import base64
import json
from pathlib import Path

from vision_ml.scan_export_tile_yolo_dataset import prepare_scan_export_tile_yolo_dataset


def test_prepare_scan_export_tile_yolo_dataset_writes_sticker_labels(tmp_path: Path) -> None:
    input_dir = tmp_path / "sessions"
    output_dir = tmp_path / "yolo"
    input_dir.mkdir()
    (input_dir / "session.json").write_text(json.dumps(scan_session_export()), encoding="utf-8")

    report = prepare_scan_export_tile_yolo_dataset(input_dir, output_dir)

    train_images = list((output_dir / "images" / "train").glob("*.jpg"))
    train_labels = list((output_dir / "labels" / "train").glob("*.txt"))
    validation_images = list((output_dir / "images" / "validation").glob("*.jpg"))

    assert report["images"] == 1
    assert len(train_images) == 1
    assert len(train_labels) == 1
    assert len(validation_images) == 1
    assert (output_dir / "data.yaml").exists()
    assert train_labels[0].read_text(encoding="utf-8").splitlines() == [
        "1 0.150000 0.150000 0.100000 0.100000",
        "2 0.350000 0.150000 0.100000 0.100000",
        "3 0.550000 0.150000 0.100000 0.100000",
        "4 0.150000 0.350000 0.100000 0.100000",
        "5 0.350000 0.350000 0.100000 0.100000",
        "6 0.550000 0.350000 0.100000 0.100000",
        "1 0.150000 0.550000 0.100000 0.100000",
        "2 0.350000 0.550000 0.100000 0.100000",
        "3 0.550000 0.550000 0.100000 0.100000",
    ]


def scan_session_export() -> dict[str, object]:
    symbols = ["U", "R", "F", "D", "L", "B", "U", "R", "F"]
    return {
        "schemaVersion": "scan-session-export-v1",
        "createdAt": "2026-06-01T00:00:00.000Z",
        "source": "test",
        "complete": False,
        "faces": [
            {
                "symbol": "F",
                "expectedTop": "U",
                "confirmed": True,
                "photoDataUrl": "data:image/jpeg;base64," + base64.b64encode(b"fake-jpeg").decode("ascii"),
                "stickers": [
                    {"index": index, "symbol": symbol, "confidence": 1.0, "source": "manual"}
                    for index, symbol in enumerate(symbols)
                ],
                "manualOverrides": {},
                "analysis": {
                    "stickers": [
                        {
                            "index": index,
                            "symbol": symbol,
                            "polygon": sticker_polygon(index),
                        }
                        for index, symbol in enumerate(symbols)
                    ],
                    "faceQuad": [
                        {"x": 0.0, "y": 0.0},
                        {"x": 0.7, "y": 0.0},
                        {"x": 0.7, "y": 0.7},
                        {"x": 0.0, "y": 0.7},
                    ],
                },
            }
        ],
    }


def sticker_polygon(index: int) -> list[dict[str, float]]:
    row = index // 3
    column = index % 3
    x = 0.1 + column * 0.2
    y = 0.1 + row * 0.2
    return [
        {"x": x, "y": y},
        {"x": x + 0.1, "y": y},
        {"x": x + 0.1, "y": y + 0.1},
        {"x": x, "y": y + 0.1},
    ]
