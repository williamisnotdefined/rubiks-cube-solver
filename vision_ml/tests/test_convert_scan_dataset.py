from __future__ import annotations

import base64
import json
from pathlib import Path

from vision_ml.convert_scan_dataset import convert_scan_dataset_export
from vision_ml.dataset_schema import load_dataset_file


def test_convert_scan_dataset_export_writes_vision_dataset(tmp_path: Path) -> None:
    input_path = tmp_path / "scan-dataset.json"
    input_path.write_text(json.dumps(scan_dataset_export()), encoding="utf-8")

    result = convert_scan_dataset_export(input_path, tmp_path / "converted", validation_sessions=0)

    dataset = load_dataset_file(result["dataset"])
    assert dataset.schemaVersion == "vision-scan-dataset-v1"
    assert dataset.sessions[0].split == "train"
    assert dataset.sessions[0].faces[0].faceSymbol == "F"
    assert dataset.sessions[0].faces[0].stickers[0].symbol == "F"
    assert (result["imageRoot"] / dataset.sessions[0].faces[0].imagePath).exists()


def scan_dataset_export() -> dict:
    return {
        "schemaVersion": "scan-dataset-v1",
        "createdAt": "2026-01-02T03:04:05.000Z",
        "source": "web-scan-dataset-page",
        "sessions": [
            {
                "captureCondition": {"background": "dark", "lighting": "good", "notes": ""},
                "cubeId": "cube_a",
                "faces": [
                    {
                        "acceptedAt": "2026-01-02T03:04:05.000Z",
                        "capture": {"capturedAt": 123, "height": 16, "source": "canvas", "width": 16},
                        "expectedTop": "U",
                        "face": "F",
                        "label": "FFFFFFFFF",
                        "manualCorrections": {},
                        "photoDataUrl": "data:image/jpeg;base64," + base64.b64encode(b"image").decode("ascii"),
                        "stickers": [],
                        "visionAnalysis": {
                            "faceQuad": square_polygon(),
                            "imageSize": {"height": 16, "width": 16},
                            "imageQuality": {"blurScore": 100, "glareRatio": 0, "shadowRatio": 0},
                            "qualityWarnings": [],
                            "stickers": [
                                {"index": index, "polygon": square_polygon()}
                                for index in range(9)
                            ],
                        },
                    }
                ],
                "mode": "manual_label",
                "sessionId": "session-1",
                "startedAt": "2026-01-02T03:04:05.000Z",
            }
        ],
    }


def square_polygon() -> list[dict[str, float]]:
    return [
        {"x": 0.0, "y": 0.0},
        {"x": 1.0, "y": 0.0},
        {"x": 1.0, "y": 1.0},
        {"x": 0.0, "y": 1.0},
    ]
