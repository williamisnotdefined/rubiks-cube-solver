from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

from scanner.contracts.scan_session_export import CANONICAL_FACE_ORDER, ScanSessionExport, load_scan_session_exports


CONFUSION_COLUMNS = (*CANONICAL_FACE_ORDER, "missing")
LOW_CONFIDENCE_HARD_CASE = 0.45
COLOR_SYMBOLS = ("W", "R", "G", "Y", "O", "B")
FACE_TO_COLOR_SYMBOL = {
    "B": "B",
    "D": "Y",
    "F": "G",
    "L": "O",
    "R": "R",
    "U": "W",
}


def evaluate_scan_session_exports(exports: list[ScanSessionExport]) -> dict[str, Any]:
    status_counts: Counter[str] = Counter()
    quality_reasons: Counter[str] = Counter()
    detection_modes: Counter[str] = Counter()
    face_totals: Counter[str] = Counter()
    face_correct: Counter[str] = Counter()
    sticker_totals: Counter[str] = Counter()
    sticker_correct: Counter[str] = Counter()
    index_totals: Counter[str] = Counter()
    index_correct: Counter[str] = Counter()
    confusion = {
        expected: {predicted: 0 for predicted in CONFUSION_COLUMNS}
        for expected in CANONICAL_FACE_ORDER
    }
    hard_cases: list[dict[str, Any]] = []
    complete_sessions = 0
    labeled_sessions = 0
    accepted_sessions = 0
    rejected_sessions = 0
    labeled_faces = 0
    correct_faces = 0
    labeled_stickers = 0
    correct_stickers = 0
    wrong_accepts = 0
    candidate_wrong_accepts = 0
    manual_override_sessions = 0
    manual_override_faces = 0
    manual_override_stickers = 0
    auto_captured_faces = 0
    manual_captured_faces = 0
    temporal_sessions = 0
    temporal_faces = 0
    temporal_ready_faces = 0
    temporal_ready_accepted = 0
    temporal_ready_rejected = 0
    temporal_wrong_accepts = 0
    auto_capture_wrong_accepts = 0
    temporal_frames_used_total = 0
    temporal_frames_rejected_total = 0
    temporal_agreement_total = 0.0
    temporal_agreement_count = 0
    bbox_stability_total = 0.0
    bbox_stability_count = 0
    face_confidence_total = 0.0
    face_confidence_count = 0
    center_mismatch_count = 0
    rescan_face_count = 0
    manual_target_sticker_count = 0

    for export in exports:
        result = effective_session_result(export)
        if export.complete:
            complete_sessions += 1

        status = session_status_from_result(result)
        status_counts[status] += 1
        if status == "accepted":
            accepted_sessions += 1
        elif status != "not_run":
            rejected_sessions += 1
        quality_reasons.update(session_quality_reasons_from_result(result))
        rescan_face_count += len(result_list(result, "rescanFaces"))
        manual_target_sticker_count += manual_target_stickers(result_list(result, "manualTargets"))

        label_faces = label_faces_from_export(export)
        if label_faces:
            labeled_sessions += 1

        predicted_faces = predicted_faces_for_export(export, result)
        session_labeled_stickers = 0
        session_correct_stickers = 0

        session_manual_override_stickers = 0
        session_auto_captured = False
        session_has_temporal = False
        session_has_temporal_ready = False
        for face in export.faces:
            override_count = len(face.manualOverrides)
            if override_count > 0:
                manual_override_faces += 1
                manual_override_stickers += override_count
                session_manual_override_stickers += override_count
            if face.captureMode == "auto" or face.autoCapture is not None:
                auto_captured_faces += 1
                session_auto_captured = True
            elif face.captureMode == "manual":
                manual_captured_faces += 1

            temporal = face.temporalConsensus
            if temporal is not None:
                session_has_temporal = True
                temporal_faces += 1
                status_value = value_at(temporal, "status")
                temporal_frames_used_total += int(value_at(temporal, "framesUsed", 0) or 0)
                temporal_frames_rejected_total += int(value_at(temporal, "framesRejected", 0) or 0)
                agreement = number_at(temporal, "temporalAgreement")
                if agreement is not None:
                    temporal_agreement_total += agreement
                    temporal_agreement_count += 1
                bbox_stability = number_at(temporal, "bboxStability")
                if bbox_stability is not None:
                    bbox_stability_total += bbox_stability
                    bbox_stability_count += 1
                if status_value == "ready":
                    temporal_ready_faces += 1
                    session_has_temporal_ready = True
                    if status == "accepted":
                        temporal_ready_accepted += 1
                    elif status != "not_run":
                        temporal_ready_rejected += 1

        if session_manual_override_stickers > 0:
            manual_override_sessions += 1
        if session_has_temporal:
            temporal_sessions += 1

        for telemetry in analysis_telemetry(export, result):
            mode = value_at(telemetry, "detectionMode") or "unknown"
            detection_modes[str(mode)] += 1
            face_confidence = number_at(telemetry, "faceConfidence")
            if face_confidence is not None:
                face_confidence_total += face_confidence
                face_confidence_count += 1
            if bool(value_at(telemetry, "centerMismatch", False)):
                center_mismatch_count += 1

        for face_symbol, expected_face in label_faces.items():
            predicted_stickers = predicted_faces.get(face_symbol)
            predicted_face = predicted_face_symbols(predicted_stickers)
            if predicted_face == expected_face:
                correct_faces += 1
                face_correct[face_symbol] += 1
            face_totals[face_symbol] += 1
            labeled_faces += 1

            for index, expected_symbol in enumerate(expected_face):
                predicted_sticker = sticker_by_index(predicted_stickers, index)
                predicted_symbol = sticker_symbol(predicted_sticker) if predicted_sticker is not None else None
                confidence = sticker_confidence(predicted_sticker)
                session_labeled_stickers += 1
                labeled_stickers += 1
                sticker_totals[expected_symbol] += 1
                index_totals[str(index)] += 1
                if predicted_symbol == expected_symbol:
                    session_correct_stickers += 1
                    correct_stickers += 1
                    sticker_correct[expected_symbol] += 1
                    index_correct[str(index)] += 1
                    if confidence is not None and confidence < LOW_CONFIDENCE_HARD_CASE:
                        hard_cases.append(
                            hard_case(
                                export,
                                "low_confidence_correct",
                                face=face_symbol,
                                sticker=index,
                                expected=expected_symbol,
                                predicted=predicted_symbol,
                                confidence=confidence,
                            )
                        )
                else:
                    hard_cases.append(
                        hard_case(
                            export,
                            "wrong_sticker",
                            face=face_symbol,
                            sticker=index,
                            expected=expected_symbol,
                            predicted=predicted_symbol,
                            confidence=confidence,
                        )
                    )
                confusion[expected_symbol][predicted_symbol or "missing"] += 1

        accepted_wrong = accepted_session_disagrees_with_label(
            status,
            export,
            result,
            session_labeled_stickers,
            session_correct_stickers,
        )
        if accepted_wrong:
            wrong_accepts += 1
            if session_auto_captured:
                auto_capture_wrong_accepts += 1
            if session_has_temporal_ready:
                temporal_wrong_accepts += 1
                hard_cases.insert(0, hard_case(export, "temporal_ready_wrong", status=status))
            if candidate_facelets_from_result(result) is not None:
                candidate_wrong_accepts += 1
            hard_cases.insert(0, hard_case(export, "wrong_accept", status=status))

    incomplete_sessions = len(exports) - complete_sessions
    manual_correction_rate = ratio(manual_override_stickers, labeled_stickers)
    report = {
        "sessions": len(exports),
        "completeSessions": complete_sessions,
        "incompleteSessions": incomplete_sessions,
        "labeledSessions": labeled_sessions,
        "acceptedSessions": accepted_sessions,
        "rejectedSessions": rejected_sessions,
        "statusCounts": dict(sorted(status_counts.items())),
        "labeledFaces": labeled_faces,
        "correctFaces": correct_faces,
        "faceAccuracy": ratio(correct_faces, labeled_faces),
        "faceAccuracyBySymbol": accuracy_by_key(face_correct, face_totals),
        "labeledStickers": labeled_stickers,
        "correctStickers": correct_stickers,
        "stickerAccuracy": ratio(correct_stickers, labeled_stickers),
        "stickerAccuracyBySymbol": accuracy_by_key(sticker_correct, sticker_totals),
        "stickerAccuracyByIndex": accuracy_by_key(index_correct, index_totals),
        "wrongAccepts": wrong_accepts,
        "candidateWrongAccepts": candidate_wrong_accepts,
        "manualOverrideSessions": manual_override_sessions,
        "manualOverrideFaces": manual_override_faces,
        "manualOverrideStickers": manual_override_stickers,
        "manualCorrectionRate": manual_correction_rate,
        "autoCapturedFaces": auto_captured_faces,
        "manualCapturedFaces": manual_captured_faces,
        "temporalSessions": temporal_sessions,
        "temporalFaces": temporal_faces,
        "temporalReadyFaces": temporal_ready_faces,
        "temporalReadyAccepted": temporal_ready_accepted,
        "temporalReadyRejected": temporal_ready_rejected,
        "temporalWrongAccepts": temporal_wrong_accepts,
        "autoCaptureWrongAccepts": auto_capture_wrong_accepts,
        "averageTemporalFramesUsed": ratio_float(float(temporal_frames_used_total), temporal_faces),
        "averageTemporalFramesRejected": ratio_float(float(temporal_frames_rejected_total), temporal_faces),
        "averageTemporalAgreement": ratio_float(temporal_agreement_total, temporal_agreement_count),
        "averageBboxStability": ratio_float(bbox_stability_total, bbox_stability_count),
        "detectionModeCounts": dict(sorted(detection_modes.items())),
        "averageFaceConfidence": ratio_float(face_confidence_total, face_confidence_count),
        "centerMismatchCount": center_mismatch_count,
        "rescanFaceCount": rescan_face_count,
        "manualTargetStickerCount": manual_target_sticker_count,
        "qualityReasons": dict(sorted(quality_reasons.items())),
        "confusionMatrix": confusion,
        "colorConfusionMatrix": color_confusion_matrix(confusion),
        "hardCases": sorted_hard_cases(hard_cases),
    }
    return report


def format_report(report: dict[str, Any]) -> str:
    lines = [
        "Scan session export evaluation",
        f"sessions: {report['sessions']}",
        f"complete: {report['completeSessions']}",
        f"incomplete: {report['incompleteSessions']}",
        f"labeled: {report['labeledSessions']}",
        f"accepted: {report['acceptedSessions']}",
        f"rejected: {report['rejectedSessions']}",
        f"wrong_accept: {report['wrongAccepts']}",
        f"candidate_wrong_accept: {report['candidateWrongAccepts']}",
        f"temporal_wrong_accept: {report['temporalWrongAccepts']}",
        f"sticker_accuracy: {format_accuracy(report['stickerAccuracy'])} ({report['correctStickers']}/{report['labeledStickers']})",
        f"face_accuracy: {format_accuracy(report['faceAccuracy'])} ({report['correctFaces']}/{report['labeledFaces']})",
        f"manual_correction_rate: {format_accuracy(report['manualCorrectionRate'])}",
        f"temporal_faces: {report['temporalFaces']}",
        f"temporal_ready_faces: {report['temporalReadyFaces']}",
        f"hard_cases: {len(report['hardCases'])}",
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
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if args.hard_cases_output is not None:
        args.hard_cases_output.parent.mkdir(parents=True, exist_ok=True)
        args.hard_cases_output.write_text(json.dumps(report["hardCases"], indent=2) + "\n", encoding="utf-8")

    print(format_report(report))

    if args.require_complete and report["incompleteSessions"] > 0:
        return 2
    if args.require_labeled_sessions is not None and report["labeledSessions"] < args.require_labeled_sessions:
        return 1
    max_wrong_accepts = 0 if args.fail_on_wrong_accept else args.max_wrong_accepts
    if max_wrong_accepts is not None and report["wrongAccepts"] > max_wrong_accepts:
        return 1
    if args.min_sticker_accuracy is not None:
        sticker_accuracy = report["stickerAccuracy"]
        if sticker_accuracy is None or sticker_accuracy < args.min_sticker_accuracy:
            return 1
    if args.max_manual_correction_rate is not None:
        manual_correction_rate = report["manualCorrectionRate"]
        if manual_correction_rate is None or manual_correction_rate > args.max_manual_correction_rate:
            return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate exported Rubik's cube scan sessions.")
    parser.add_argument("--input", required=True, type=Path, help="Export JSON file or directory of exports.")
    parser.add_argument("--output", type=Path, help="Optional JSON report output path.")
    parser.add_argument("--hard-cases-output", type=Path, help="Optional hard-case JSON output path.")
    parser.add_argument("--require-complete", action="store_true", help="Return non-zero if any export is incomplete.")
    parser.add_argument(
        "--fail-on-wrong-accept",
        action="store_true",
        help="Return non-zero if any accepted session disagrees with labels.",
    )
    parser.add_argument("--max-wrong-accepts", type=int, help="Maximum allowed wrong accepted sessions.")
    parser.add_argument("--min-sticker-accuracy", type=float, help="Minimum required labeled sticker accuracy.")
    parser.add_argument("--max-manual-correction-rate", type=float, help="Maximum allowed manual correction rate.")
    parser.add_argument("--require-labeled-sessions", type=int, help="Minimum required labeled sessions.")
    raise SystemExit(run(parser.parse_args()))


def effective_session_result(export: ScanSessionExport) -> dict[str, Any] | None:
    return export.replayResult or export.sessionResult


def label_faces_from_export(export: ScanSessionExport) -> dict[str, str]:
    if export.label is None:
        return {}
    if export.label.facelets is not None:
        return {
            symbol: export.label.facelets[index * 9 : (index + 1) * 9]
            for index, symbol in enumerate(CANONICAL_FACE_ORDER)
        }
    return dict(export.label.faces)


def label_facelets_from_export(export: ScanSessionExport) -> str | None:
    if export.label is None:
        return None
    if export.label.facelets is not None:
        return export.label.facelets
    faces = export.label.faces
    if any(symbol not in faces for symbol in CANONICAL_FACE_ORDER):
        return None
    return "".join(faces[symbol] for symbol in CANONICAL_FACE_ORDER)


def predicted_faces_for_export(export: ScanSessionExport, result: dict[str, Any] | None) -> dict[str, list[Any]]:
    scan = value_at(result, "scan")
    scan_faces = value_at(scan, "faces", [])
    if scan_faces:
        return {
            str(value_at(face, "symbol")): value_at(value_at(face, "analysis", {}), "stickers", [])
            for face in scan_faces
        }
    return {face.symbol: face.stickers for face in export.faces}


def predicted_face_symbols(stickers: list[Any] | None) -> str | None:
    if stickers is None:
        return None
    symbols = [sticker_symbol(sticker) for sticker in sorted(stickers, key=lambda sticker: int(value_at(sticker, "index", 0)))]
    if any(symbol is None for symbol in symbols):
        return None
    return "".join(symbols)  # type: ignore[arg-type]


def sticker_by_index(stickers: list[Any] | None, index: int) -> Any | None:
    if stickers is None:
        return None
    return next((sticker for sticker in stickers if int(value_at(sticker, "index", -1)) == index), None)


def sticker_symbol(sticker: Any | None) -> str | None:
    symbol = value_at(sticker, "symbol")
    return symbol if isinstance(symbol, str) else None


def sticker_confidence(sticker: Any | None) -> float | None:
    return number_at(sticker, "confidence")


def session_status_from_result(result: dict[str, Any] | None) -> str:
    if result is None:
        return "not_run"
    status = result.get("status")
    return status if isinstance(status, str) and status else "unknown"


def session_quality_reasons_from_result(result: dict[str, Any] | None) -> list[str]:
    inference = value_at(result, "inference")
    reasons = value_at(inference, "qualityReasons")
    if not isinstance(reasons, list):
        return []
    return [reason for reason in reasons if isinstance(reason, str)]


def candidate_facelets_from_result(result: dict[str, Any] | None) -> str | None:
    candidate = value_at(value_at(result, "inference"), "candidateFacelets")
    return candidate if isinstance(candidate, str) and len(candidate) == 54 else None


def accepted_session_disagrees_with_label(
    status: str,
    export: ScanSessionExport,
    result: dict[str, Any] | None,
    session_labeled_stickers: int,
    session_correct_stickers: int,
) -> bool:
    if status != "accepted":
        return False
    expected_facelets = label_facelets_from_export(export)
    candidate_facelets = candidate_facelets_from_result(result)
    if expected_facelets is not None and candidate_facelets is not None:
        return candidate_facelets != expected_facelets
    return session_labeled_stickers > 0 and session_correct_stickers < session_labeled_stickers


def analysis_telemetry(export: ScanSessionExport, result: dict[str, Any] | None) -> list[Any]:
    scan_faces = value_at(value_at(result, "scan"), "faces", [])
    if scan_faces:
        return [value_at(face, "analysis", {}) for face in scan_faces]
    return [face.analysis for face in export.faces if face.analysis is not None]


def manual_target_stickers(manual_targets: list[Any]) -> int:
    total = 0
    for target in manual_targets:
        stickers = value_at(target, "stickers", [])
        if isinstance(stickers, list):
            total += len(stickers)
    return total


def result_list(result: dict[str, Any] | None, key: str) -> list[Any]:
    value = value_at(result, key, [])
    return value if isinstance(value, list) else []


def hard_case(
    export: ScanSessionExport,
    reason: str,
    *,
    face: str | None = None,
    sticker: int | None = None,
    expected: str | None = None,
    predicted: str | None = None,
    confidence: float | None = None,
    status: str | None = None,
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "severity": hard_case_severity(reason),
        "session": export.createdAt,
        "reason": reason,
    }
    if export.replayMetadata and isinstance(export.replayMetadata.get("sourceFile"), str):
        data["sourceFile"] = export.replayMetadata["sourceFile"]
    optional = {
        "face": face,
        "sticker": sticker,
        "expected": expected,
        "predicted": predicted,
        "confidence": confidence,
        "status": status,
    }
    data.update({key: value for key, value in optional.items() if value is not None})
    return data


def hard_case_severity(reason: str) -> str:
    if reason in {"wrong_accept", "temporal_ready_wrong"}:
        return "critical"
    if reason == "wrong_sticker":
        return "high"
    return "medium"


def sorted_hard_cases(hard_cases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    return sorted(
        hard_cases,
        key=lambda item: (
            severity_rank.get(str(item.get("severity")), 9),
            str(item.get("session", "")),
            str(item.get("face", "")),
            int(item.get("sticker", -1)),
        ),
    )


def accuracy_by_key(correct: Counter[str], totals: Counter[str]) -> dict[str, dict[str, Any]]:
    return {
        key: {
            "correct": correct[key],
            "total": total,
            "accuracy": ratio(correct[key], total),
        }
        for key, total in sorted(totals.items())
    }


def color_confusion_matrix(confusion: dict[str, dict[str, int]]) -> dict[str, dict[str, int]]:
    color_confusion = {
        expected: {predicted: 0 for predicted in (*COLOR_SYMBOLS, "missing")}
        for expected in COLOR_SYMBOLS
    }
    for expected_face, predicted_faces in confusion.items():
        expected_color = FACE_TO_COLOR_SYMBOL.get(expected_face)
        if expected_color is None:
            continue
        for predicted_face, count in predicted_faces.items():
            predicted_color = "missing" if predicted_face == "missing" else FACE_TO_COLOR_SYMBOL.get(predicted_face)
            if predicted_color is not None:
                color_confusion[expected_color][predicted_color] += count
    return color_confusion


def value_at(value: Any, key: str, default: Any = None) -> Any:
    if value is None:
        return default
    if isinstance(value, dict):
        return value.get(key, default)
    return getattr(value, key, default)


def number_at(value: Any, key: str) -> float | None:
    number = value_at(value, key)
    return float(number) if isinstance(number, (int, float)) else None


def ratio(numerator: int, denominator: int) -> float | None:
    return None if denominator == 0 else numerator / denominator


def ratio_float(numerator: float, denominator: int) -> float | None:
    return None if denominator == 0 else numerator / denominator


def format_accuracy(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.2%}"


if __name__ == "__main__":
    main()
