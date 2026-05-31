from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

from .scan_session_export import CANONICAL_FACE_ORDER, ScanSessionExport, load_scan_session_exports


CONFUSION_COLUMNS = (*CANONICAL_FACE_ORDER, "missing")


def evaluate_scan_session_exports(exports: list[ScanSessionExport]) -> dict[str, Any]:
    status_counts: Counter[str] = Counter()
    quality_reasons: Counter[str] = Counter()
    confusion = {
        expected: {predicted: 0 for predicted in CONFUSION_COLUMNS}
        for expected in CANONICAL_FACE_ORDER
    }
    complete_sessions = 0
    labeled_faces = 0
    correct_faces = 0
    labeled_stickers = 0
    correct_stickers = 0
    wrong_accepts = 0

    for export in exports:
        if export.complete:
            complete_sessions += 1

        status = session_status(export)
        status_counts[status] += 1
        quality_reasons.update(session_quality_reasons(export))

        label_faces = label_faces_from_export(export)
        session_labeled_stickers = 0
        session_correct_stickers = 0

        for face in export.faces:
            expected_face = label_faces.get(face.symbol)
            predicted_face = predicted_face_symbols(face)
            if expected_face is None:
                continue

            labeled_faces += 1
            if predicted_face == expected_face:
                correct_faces += 1

            for index, expected_symbol in enumerate(expected_face):
                predicted_symbol = predicted_face[index] if predicted_face is not None else None
                session_labeled_stickers += 1
                labeled_stickers += 1
                if predicted_symbol == expected_symbol:
                    session_correct_stickers += 1
                    correct_stickers += 1
                confusion[expected_symbol][predicted_symbol or "missing"] += 1

        if status == "accepted" and session_labeled_stickers > 0 and session_correct_stickers < session_labeled_stickers:
            wrong_accepts += 1

    incomplete_sessions = len(exports) - complete_sessions
    return {
        "sessions": len(exports),
        "completeSessions": complete_sessions,
        "incompleteSessions": incomplete_sessions,
        "statusCounts": dict(sorted(status_counts.items())),
        "labeledFaces": labeled_faces,
        "correctFaces": correct_faces,
        "faceAccuracy": ratio(correct_faces, labeled_faces),
        "labeledStickers": labeled_stickers,
        "correctStickers": correct_stickers,
        "stickerAccuracy": ratio(correct_stickers, labeled_stickers),
        "wrongAccepts": wrong_accepts,
        "qualityReasons": dict(sorted(quality_reasons.items())),
        "confusionMatrix": confusion,
    }


def format_report(report: dict[str, Any]) -> str:
    lines = [
        "Scan session export evaluation",
        f"sessions: {report['sessions']}",
        f"complete: {report['completeSessions']}",
        f"incomplete: {report['incompleteSessions']}",
        f"wrong_accept: {report['wrongAccepts']}",
        f"sticker_accuracy: {format_accuracy(report['stickerAccuracy'])} ({report['correctStickers']}/{report['labeledStickers']})",
        f"face_accuracy: {format_accuracy(report['faceAccuracy'])} ({report['correctFaces']}/{report['labeledFaces']})",
        "statuses:",
    ]
    lines.extend(f"  {status}: {count}" for status, count in report["statusCounts"].items())
    lines.append("quality_reasons:")
    if report["qualityReasons"]:
        lines.extend(f"  {reason}: {count}" for reason, count in report["qualityReasons"].items())
    else:
        lines.append("  none: 0")
    return "\n".join(lines)


def run(args: argparse.Namespace) -> int:
    exports = load_scan_session_exports(args.input)
    report = evaluate_scan_session_exports(exports)

    if args.output is not None:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(format_report(report))

    if args.require_complete and report["incompleteSessions"] > 0:
        return 2
    if args.fail_on_wrong_accept and report["wrongAccepts"] > 0:
        return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate exported Rubik's cube scan sessions.")
    parser.add_argument("--input", required=True, type=Path, help="Export JSON file or directory of exports.")
    parser.add_argument("--output", type=Path, help="Optional JSON report output path.")
    parser.add_argument("--require-complete", action="store_true", help="Return non-zero if any export is incomplete.")
    parser.add_argument(
        "--fail-on-wrong-accept",
        action="store_true",
        help="Return non-zero if any accepted session disagrees with labels.",
    )
    raise SystemExit(run(parser.parse_args()))


def label_faces_from_export(export: ScanSessionExport) -> dict[str, str]:
    if export.label is None:
        return {}
    if export.label.facelets is not None:
        return {
            symbol: export.label.facelets[index * 9 : (index + 1) * 9]
            for index, symbol in enumerate(CANONICAL_FACE_ORDER)
        }
    return dict(export.label.faces)


def predicted_face_symbols(face: Any) -> str | None:
    symbols = [sticker.symbol for sticker in sorted(face.stickers, key=lambda sticker: sticker.index)]
    if any(symbol is None for symbol in symbols):
        return None
    return "".join(symbols)


def session_status(export: ScanSessionExport) -> str:
    if export.sessionResult is None:
        return "not_run"
    status = export.sessionResult.get("status")
    return status if isinstance(status, str) and status else "unknown"


def session_quality_reasons(export: ScanSessionExport) -> list[str]:
    inference = (export.sessionResult or {}).get("inference")
    if not isinstance(inference, dict):
        return []
    reasons = inference.get("qualityReasons")
    if not isinstance(reasons, list):
        return []
    return [reason for reason in reasons if isinstance(reason, str)]


def ratio(numerator: int, denominator: int) -> float | None:
    return None if denominator == 0 else numerator / denominator


def format_accuracy(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.2%}"


if __name__ == "__main__":
    main()
