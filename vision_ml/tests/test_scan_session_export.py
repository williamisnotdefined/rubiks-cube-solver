from __future__ import annotations

from pathlib import Path

import pytest

from vision_ml.scan_session_export import load_scan_session_export_file, validate_scan_session_export


def test_loads_sample_scan_session_export_fixture() -> None:
    export = load_scan_session_export_file(Path("vision_ml/fixtures/sample_scan_session_export.json"))

    assert export.schemaVersion == "scan-session-export-v1"
    assert export.complete is False
    assert export.faces[0].symbol == "F"
    assert export.faces[0].centerOverrideConfirmed is True
    assert export.faces[0].manualOverrides[4] == "F"
    assert export.faces[0].lastRejectedCapture is not None
    assert export.faces[0].lastRejectedCapture.reason == "partial_tiles"
    assert export.faces[0].stickers[4].symbol == "F"


def test_complete_export_requires_all_faces() -> None:
    data = scan_export([scan_face("F")], complete=True)

    with pytest.raises(ValueError, match="complete exported sessions require"):
        validate_scan_session_export(data)


def test_confirmed_export_requires_all_sticker_symbols() -> None:
    face = scan_face("F")
    face["stickers"][0]["symbol"] = None
    data = scan_export([face])

    with pytest.raises(ValueError, match="all sticker symbols"):
        validate_scan_session_export(data)


def scan_export(faces: list[dict], complete: bool = False) -> dict:
    return {
        "schemaVersion": "scan-session-export-v1",
        "createdAt": "2026-01-02T03:04:05.000Z",
        "source": "web-scan-modal",
        "complete": complete,
        "faces": faces,
    }


def scan_face(symbol: str) -> dict:
    return {
        "symbol": symbol,
        "expectedTop": "F" if symbol in {"U", "D"} else "U",
        "confirmed": True,
        "photoDataUrl": f"data:image/jpeg;base64,{symbol}",
        "capture": {"capturedAt": 123, "height": 1280, "source": "canvas", "width": 1280},
        "stickers": [
            {"index": index, "symbol": symbol, "confidence": 1.0, "source": "center" if index == 4 else "detected"}
            for index in range(9)
        ],
        "manualOverrides": {},
    }
