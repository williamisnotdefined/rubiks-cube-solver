from __future__ import annotations

import argparse
import json
from pathlib import Path

from vision_ml.label_scan_session import label_scan_session_export_file, run


def test_labels_export_from_face_assignments(tmp_path: Path) -> None:
    input_path = tmp_path / "scan.json"
    output_path = tmp_path / "labeled.json"
    input_path.write_text(json.dumps(scan_export()), encoding="utf-8")

    label_scan_session_export_file(
        input_path,
        output_path,
        face_assignments=["F=FFFFFFFFF"],
        validated_by="reviewer",
        notes="fixture",
    )

    labeled = json.loads(output_path.read_text(encoding="utf-8"))
    assert labeled["label"] == {
        "faces": {"F": "FFFFFFFFF"},
        "notes": "fixture",
        "validatedBy": "reviewer",
    }


def test_labels_export_from_confirmed_requires_reviewer(tmp_path: Path) -> None:
    input_path = tmp_path / "scan.json"
    output_path = tmp_path / "labeled.json"
    input_path.write_text(json.dumps(scan_export()), encoding="utf-8")

    exit_code = run(
        argparse.Namespace(
            face=[],
            facelets=None,
            from_confirmed=True,
            in_place=False,
            input=input_path,
            notes=None,
            output=output_path,
            overwrite_label=False,
            validated_by=None,
        )
    )

    assert exit_code == 2
    assert not output_path.exists()


def test_labels_export_from_confirmed_faces(tmp_path: Path) -> None:
    input_path = tmp_path / "scan.json"
    output_path = tmp_path / "labeled.json"
    input_path.write_text(json.dumps(scan_export()), encoding="utf-8")

    exit_code = run(
        argparse.Namespace(
            face=[],
            facelets=None,
            from_confirmed=True,
            in_place=False,
            input=input_path,
            notes=None,
            output=output_path,
            overwrite_label=False,
            validated_by="reviewer",
        )
    )

    assert exit_code == 0
    assert json.loads(output_path.read_text(encoding="utf-8"))["label"]["faces"] == {"F": "FFFFFFFFF"}


def test_label_cli_refuses_existing_label_without_overwrite(tmp_path: Path) -> None:
    input_path = tmp_path / "scan.json"
    output_path = tmp_path / "labeled.json"
    data = scan_export()
    data["label"] = {"faces": {"F": "FFFFFFFFF"}}
    input_path.write_text(json.dumps(data), encoding="utf-8")

    exit_code = run(
        argparse.Namespace(
            face=["F=FFFFFFFFF"],
            facelets=None,
            from_confirmed=False,
            in_place=False,
            input=input_path,
            notes=None,
            output=output_path,
            overwrite_label=False,
            validated_by="reviewer",
        )
    )

    assert exit_code == 2
    assert not output_path.exists()


def scan_export() -> dict:
    return {
        "schemaVersion": "scan-session-export-v1",
        "createdAt": "2026-01-02T03:04:05.000Z",
        "source": "web-scan-modal",
        "complete": False,
        "faces": [scan_face("F")],
    }


def scan_face(symbol: str) -> dict:
    return {
        "symbol": symbol,
        "expectedTop": "U",
        "confirmed": True,
        "photoDataUrl": f"data:image/jpeg;base64,{symbol}",
        "capture": {"capturedAt": 123, "height": 1280, "source": "canvas", "width": 1280},
        "stickers": [
            {"index": index, "symbol": symbol, "confidence": 1.0, "source": "center" if index == 4 else "detected"}
            for index in range(9)
        ],
        "manualOverrides": {},
    }
