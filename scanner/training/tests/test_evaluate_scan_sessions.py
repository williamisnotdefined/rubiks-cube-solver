from __future__ import annotations

import argparse
import json
from pathlib import Path

from scanner.contracts.scan_session_export import CANONICAL_FACE_ORDER, validate_scan_session_export
from scanner.training.scan_sessions.evaluate import evaluate_scan_session_exports, run


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
    assert report["hardCases"][0]["reason"] == "wrong_accept"
    assert report["hardCases"][1]["reason"] == "wrong_sticker"


def test_evaluator_prefers_replay_result_candidate_facelets() -> None:
    data = scan_export(wrong_label=False)
    data["sessionResult"] = {"ok": False, "status": "needs_rescan_face"}
    data["replayResult"] = {
        "ok": True,
        "status": "accepted",
        "inference": {"candidateFacelets": "R" + canonical_label_facelets()[1:]},
    }
    export = validate_scan_session_export(data)

    report = evaluate_scan_session_exports([export])

    assert report["statusCounts"] == {"accepted": 1}
    assert report["wrongAccepts"] == 1
    assert report["candidateWrongAccepts"] == 1


def test_evaluator_reports_temporal_consensus_metrics_and_wrong_accepts() -> None:
    data = scan_export(wrong_label=True)
    data["faces"][0]["captureMode"] = "auto"
    data["faces"][0]["autoCapture"] = {"stableFrameCount": 6, "tileDetections": 9, "triggeredAt": "2026-01-02T03:04:05.000Z"}
    data["faces"][0]["temporalConsensus"] = {
        "bboxStability": 0.91,
        "faceConfidence": 0.8,
        "framesRejected": 1,
        "framesSeen": 7,
        "framesUsed": 6,
        "tileConfidence": 0.78,
        "rejectReasons": [],
        "status": "ready",
        "stickers": [],
        "temporalAgreement": 0.94,
    }
    export = validate_scan_session_export(data)

    report = evaluate_scan_session_exports([export])

    assert report["autoCapturedFaces"] == 1
    assert report["temporalSessions"] == 1
    assert report["temporalFaces"] == 1
    assert report["temporalReadyFaces"] == 1
    assert report["temporalWrongAccepts"] == 1
    assert report["autoCaptureWrongAccepts"] == 1
    assert report["averageTemporalFramesUsed"] == 6
    assert report["averageTemporalFramesRejected"] == 1
    assert report["averageTemporalAgreement"] == 0.94
    assert report["averageBboxStability"] == 0.91
    assert [case["reason"] for case in report["hardCases"][:2]] == ["wrong_accept", "temporal_ready_wrong"]


def test_cli_writes_report_and_fails_on_wrong_accept(tmp_path: Path) -> None:
    export_path = tmp_path / "scan.json"
    report_path = tmp_path / "report.json"
    hard_cases_path = tmp_path / "hard-cases.json"
    export_path.write_text(json.dumps(scan_export(wrong_label=True)), encoding="utf-8")

    exit_code = run(
        argparse.Namespace(
            fail_on_wrong_accept=True,
            hard_cases_output=hard_cases_path,
            input=export_path,
            max_manual_correction_rate=None,
            max_wrong_accepts=None,
            min_sticker_accuracy=None,
            output=report_path,
            require_complete=False,
            require_labeled_sessions=None,
        )
    )

    assert exit_code == 1
    assert json.loads(report_path.read_text(encoding="utf-8"))["wrongAccepts"] == 1
    assert json.loads(hard_cases_path.read_text(encoding="utf-8"))[0]["reason"] == "wrong_accept"


def test_cli_can_require_complete_sessions(tmp_path: Path) -> None:
    export_path = tmp_path / "scan.json"
    partial = scan_export(wrong_label=False)
    partial["complete"] = False
    partial["faces"] = partial["faces"][:1]
    export_path.write_text(json.dumps(partial), encoding="utf-8")

    exit_code = run(
        argparse.Namespace(
            fail_on_wrong_accept=False,
            hard_cases_output=None,
            input=export_path,
            max_manual_correction_rate=None,
            max_wrong_accepts=None,
            min_sticker_accuracy=None,
            output=None,
            require_complete=True,
            require_labeled_sessions=None,
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


def canonical_label_facelets() -> str:
    return "".join(symbol * 9 for symbol in CANONICAL_FACE_ORDER)


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
