from __future__ import annotations

import pytest

from vision_ml.scan_dataset_export import validate_scan_dataset_export


def test_scan_dataset_export_accepts_face_sample() -> None:
    export = validate_scan_dataset_export(scan_dataset_export())

    assert export.schemaVersion == "scan-dataset-v1"
    assert export.sessions[0].cubeId == "cube_a"
    assert export.sessions[0].faces[0].label == "FFFFFFFFF"


def test_scan_dataset_export_rejects_duplicate_faces() -> None:
    data = scan_dataset_export()
    data["sessions"][0]["faces"].append(dict(data["sessions"][0]["faces"][0]))

    with pytest.raises(ValueError, match="faces must be unique"):
        validate_scan_dataset_export(data)


def test_scan_dataset_export_rejects_invalid_label_symbol() -> None:
    data = scan_dataset_export()
    data["sessions"][0]["faces"][0]["label"] = "FFFFFFFFX"

    with pytest.raises(ValueError):
        validate_scan_dataset_export(data)


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
                        "capture": {"capturedAt": 123, "height": 1280, "source": "canvas", "width": 1280},
                        "expectedTop": "U",
                        "face": "F",
                        "label": "FFFFFFFFF",
                        "manualCorrections": {"0": "F"},
                        "photoDataUrl": "data:image/jpeg;base64,scan",
                        "stickers": [
                            {"index": index, "symbol": "F", "confidence": 1.0, "source": "center" if index == 4 else "detected"}
                            for index in range(9)
                        ],
                        "visionAnalysis": {"ok": True, "status": "detected"},
                    }
                ],
                "mode": "manual_label",
                "sessionId": "session-1",
                "startedAt": "2026-01-02T03:04:05.000Z",
            }
        ],
    }
