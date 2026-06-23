from __future__ import annotations

import argparse
import base64
import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable, Literal

from scanner.contracts.scan_session_export import ScanSessionExport, load_scan_session_export_file, scan_session_export_files


ReplayMode = Literal["raw", "reviewed"]
PostJson = Callable[[str, dict[str, Any]], dict[str, Any]]


def replay_scan_session_exports(
    input_path: str | Path,
    output_dir: str | Path,
    *,
    mode: Literal["raw", "reviewed", "both"] = "raw",
    api_url: str = "http://127.0.0.1:8787",
    max_depth: int | None = None,
    max_nodes: int | None = None,
    strategy_id: str | None = None,
    post_json: PostJson | None = None,
) -> dict[str, int]:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    post_json = post_json or post_json_http
    modes = replay_modes(mode)
    files = scan_session_export_files(input_path)
    summary = {"inputFiles": len(files), "written": 0, "skipped": 0, "errors": 0}

    for export_path in files:
        export = load_scan_session_export_file(export_path)
        for replay_mode in modes:
            result, metadata = replay_single_export(
                export,
                export_path,
                replay_mode,
                api_url=api_url,
                max_depth=max_depth,
                max_nodes=max_nodes,
                strategy_id=strategy_id,
                post_json=post_json,
            )
            if result.get("status") == "skipped":
                summary["skipped"] += 1
            if result.get("status") == "replay_error":
                summary["errors"] += 1
            write_replay_export(export, export_path, output, replay_mode, result, metadata)
            summary["written"] += 1

    return summary


def replay_single_export(
    export: ScanSessionExport,
    export_path: Path,
    mode: ReplayMode,
    *,
    api_url: str,
    max_depth: int | None,
    max_nodes: int | None,
    strategy_id: str | None,
    post_json: PostJson,
) -> tuple[dict[str, Any], dict[str, Any]]:
    endpoint = replay_endpoint(api_url=api_url)
    metadata = {
        "mode": mode,
        "endpoint": endpoint,
        "sourceFile": str(export_path),
    }
    payload_or_reason = replay_payload(
        export,
        export_path,
        mode=mode,
        max_depth=max_depth,
        max_nodes=max_nodes,
        strategy_id=strategy_id,
    )
    if isinstance(payload_or_reason, str):
        return {"ok": False, "status": "skipped", "message": payload_or_reason}, metadata

    try:
        return post_json(endpoint, payload_or_reason), metadata
    except Exception as error:  # pragma: no cover - exercised through injected fakes in tests.
        return {"ok": False, "status": "replay_error", "message": str(error)}, metadata


def replay_payload(
    export: ScanSessionExport,
    export_path: Path,
    *,
    mode: ReplayMode,
    max_depth: int | None,
    max_nodes: int | None,
    strategy_id: str | None,
) -> dict[str, Any] | str:
    if len(export.faces) != 6:
        return "scan session must contain exactly 6 faces to replay"

    faces = []
    for face in export.faces:
        image = image_payload_for_face(face, export_path)
        if image is None:
            return f"face {face.symbol} has no replayable image"
        payload_face: dict[str, Any] = {
            "symbol": face.symbol,
            "expectedTop": face.expectedTop,
            "image": image,
        }
        if mode == "reviewed" and face.manualOverrides:
            payload_face["manualOverrides"] = face.manualOverrides
        faces.append(payload_face)

    payload: dict[str, Any] = {"faces": faces}
    if max_depth is not None:
        payload["maxDepth"] = max_depth
    if max_nodes is not None:
        payload["maxNodes"] = max_nodes
    if strategy_id is not None:
        payload["strategyId"] = strategy_id
    return payload


def image_payload_for_face(face: Any, export_path: Path) -> str | None:
    if face.photoDataUrl:
        return face.photoDataUrl
    if face.imagePath is None:
        return None

    image_path = Path(face.imagePath)
    if not image_path.is_absolute():
        image_path = export_path.parent / image_path
    if not image_path.is_file():
        return None

    media_type = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{media_type};base64,{encoded}"


def write_replay_export(
    export: ScanSessionExport,
    export_path: Path,
    output_dir: Path,
    mode: ReplayMode,
    result: dict[str, Any],
    metadata: dict[str, Any],
) -> Path:
    data = export.model_dump(mode="json", exclude_none=True)
    if data.get("sessionResult") is not None:
        data.setdefault("originalSessionResult", data["sessionResult"])
    data["replayResult"] = result
    data["replayMetadata"] = metadata
    output_path = unique_output_path(output_dir, f"{export_path.stem}.{mode}.json")
    output_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return output_path


def unique_output_path(output_dir: Path, filename: str) -> Path:
    candidate = output_dir / filename
    if not candidate.exists():
        return candidate
    stem = candidate.stem
    suffix = candidate.suffix
    counter = 2
    while True:
        numbered = output_dir / f"{stem}-{counter}{suffix}"
        if not numbered.exists():
            return numbered
        counter += 1


def replay_modes(mode: Literal["raw", "reviewed", "both"]) -> list[ReplayMode]:
    return ["raw", "reviewed"] if mode == "both" else [mode]


def replay_endpoint(*, api_url: str) -> str:
    return api_url.rstrip("/") + "/scan/solve-session"


def post_json_http(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {body}") from error
    return json.loads(body)


def run(args: argparse.Namespace) -> int:
    summary = replay_scan_session_exports(
        args.input,
        args.output,
        mode=args.mode,
        api_url=args.api_url,
        max_depth=args.max_depth,
        max_nodes=args.max_nodes,
        strategy_id=args.strategy_id,
    )
    print(json.dumps(summary, indent=2))
    if summary["errors"] > 0 and not args.allow_errors:
        return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay saved Rubik's cube scan sessions against the current scanner pipeline.")
    parser.add_argument("--input", required=True, type=Path, help="Scan session export file or directory.")
    parser.add_argument("--output", required=True, type=Path, help="Directory for replayed export JSON files.")
    parser.add_argument("--mode", choices=["raw", "reviewed", "both"], default="raw", help="Replay with or without manual overrides.")
    parser.add_argument("--api-url", default="http://127.0.0.1:8787", help="Rust API base URL.")
    parser.add_argument("--max-depth", type=int, help="Optional solve-session maxDepth.")
    parser.add_argument("--max-nodes", type=int, help="Optional solve-session maxNodes.")
    parser.add_argument("--strategy-id", help="Optional solve-session strategyId.")
    parser.add_argument("--allow-errors", action="store_true", help="Return zero even when replay requests fail.")
    raise SystemExit(run(parser.parse_args()))


if __name__ == "__main__":
    main()
