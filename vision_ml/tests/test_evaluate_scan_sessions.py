from __future__ import annotations

import argparse
import json
from pathlib import Path

from vision_ml.evaluate_scan_sessions import evaluate_scan_session_exports, run
from vision_ml.scan_session_export import CANONICAL_FACE_ORDER, validate_scan_session_export


def test_evaluates_wrong_accepted_session_with_labels() -> None:
    export = validate_scan_session_export(scan_export(wrong_label=True))

    report = evaluate_scan_session_exports([export])

    assert report["sessions"] == 1
    assert report["completeSessions"] == 1
    assert report["statusCounts"] == {"accepted": 1}
    assert report["wrongAccepts"] == 1
    assert report["labeledStickers"] == 54
    assert report["correctStickers"] == 53
    assert report["confusionMatrix"]["R"]["F"] == 1
    assert report["qualityReasons"] == {"low_sticker_confidence": 1}


def test_cli_writes_report_and_fails_on_wrong_accept(tmp_path: Path) -> None:
    export_path = tmp_path / "scan.json"
    report_path = tmp_path / "report.json"
    export_path.write_text(json.dumps(scan_export(wrong_label=True)), encoding="utf-8")

    exit_code = run(
        argparse.Namespace(
            fail_on_wrong_accept=True,
            input=export_path,
            output=report_path,
            require_complete=False,
        )
    )

    assert exit_code == 1
    assert json.loads(report_path.read_text(encoding="utf-8"))["wrongAccepts"] == 1


def test_cli_can_require_complete_sessions(tmp_path: Path) -> None:
    export_path = tmp_path / "scan.json"
    partial = scan_export(wrong_label=False)
    partial["complete"] = False
    partial["faces"] = partial["faces"][:1]
    export_path.write_text(json.dumps(partial), encoding="utf-8")

    exit_code = run(
        argparse.Namespace(
            fail_on_wrong_accept=False,
            input=export_path,
            output=None,
            require_complete=True,
        )
    )

    assert exit_code == 2


def scan_export(wrong_label: bool) -> dict:
    faces = [scan_face(symbol) for symbol in CANONICAL_FACE_ORDER]
    labels = {symbol: symbol * 9 for symbol in CANONICAL_FACE_ORDER}
    if wrong_label:
        labels["F"] = "R" + "F" * 8

    return {
        "schemaVersion": "scan-session-export-v1",
        "createdAt": "2026-01-02T03:04:05.000Z",
        "source": "web-scan-modal",
        "complete": True,
        "faces": faces,
        "sessionResult": {
            "ok": True,
            "status": "accepted",
            "inference": {"status": "accepted", "qualityReasons": ["low_sticker_confidence"]},
        },
        "label": {"faces": labels},
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
