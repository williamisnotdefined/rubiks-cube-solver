from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scanner.contracts.scan_session_export import CANONICAL_FACE_ORDER, load_scan_session_export_file
from scanner.training.scan_sessions.replay import replay_payload, replay_scan_session_exports


def test_replay_writes_raw_and_reviewed_results(tmp_path: Path) -> None:
    input_path = tmp_path / "scan.json"
    output_dir = tmp_path / "replay"
    input_path.write_text(json.dumps(scan_export()), encoding="utf-8")
    calls: list[tuple[str, dict[str, Any]]] = []

    def post_json(url: str, payload: dict[str, Any]) -> dict[str, Any]:
        calls.append((url, payload))
        return {"ok": True, "status": "accepted", "inference": {"candidateFacelets": "".join(symbol * 9 for symbol in CANONICAL_FACE_ORDER)}}

    summary = replay_scan_session_exports(
        input_path,
        output_dir,
        mode="both",
        api_url="http://api.test",
        post_json=post_json,
    )

    assert summary == {"inputFiles": 1, "written": 2, "skipped": 0, "errors": 0}
    assert calls[0][0] == "http://api.test/scan/solve-session"
    assert "manualOverrides" not in calls[0][1]["faces"][0]
    assert calls[1][1]["faces"][0]["manualOverrides"] == {0: "U"}
    replayed = sorted(output_dir.glob("*.json"))
    assert [path.name for path in replayed] == ["scan.raw.json", "scan.reviewed.json"]
    raw = json.loads((output_dir / "scan.raw.json").read_text(encoding="utf-8"))
    assert raw["replayResult"]["status"] == "accepted"
    assert raw["replayMetadata"]["mode"] == "raw"


def test_replay_skips_incomplete_sessions(tmp_path: Path) -> None:
    input_path = tmp_path / "scan.json"
    output_dir = tmp_path / "replay"
    data = scan_export()
    data["faces"] = data["faces"][:1]
    data["complete"] = False
    input_path.write_text(json.dumps(data), encoding="utf-8")

    summary = replay_scan_session_exports(input_path, output_dir, post_json=lambda _url, _payload: {})

    assert summary == {"inputFiles": 1, "written": 1, "skipped": 1, "errors": 0}
    replayed = json.loads((output_dir / "scan.raw.json").read_text(encoding="utf-8"))
    assert replayed["replayResult"]["status"] == "skipped"


def test_replay_payload_can_load_image_path(tmp_path: Path) -> None:
    image_path = tmp_path / "face.jpg"
    image_path.write_bytes(b"image")
    export_path = tmp_path / "scan.json"
    data = scan_export()
    data["faces"][0].pop("photoDataUrl")
    data["faces"][0]["imagePath"] = "face.jpg"
    export_path.write_text(json.dumps(data), encoding="utf-8")
    export = load_scan_session_export_file(export_path)

    payload = replay_payload(
        export,
        export_path,
        mode="raw",
        max_depth=None,
        max_nodes=None,
        strategy_id=None,
    )

    assert not isinstance(payload, str)
    assert payload["faces"][0]["image"].startswith("data:image/jpeg;base64,")


def scan_export() -> dict:
    return {
        "schemaVersion": "scan-session-export-v1",
        "createdAt": "2026-01-02T03:04:05.000Z",
        "source": "web-scan-modal",
        "complete": True,
        "faces": [scan_face(symbol) for symbol in CANONICAL_FACE_ORDER],
    }


def scan_face(symbol: str) -> dict:
    manual_overrides = {"0": symbol} if symbol == "U" else {}
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
        "manualOverrides": manual_overrides,
    }
