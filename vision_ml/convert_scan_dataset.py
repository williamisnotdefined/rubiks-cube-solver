from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path

from .dataset_schema import DATASET_SCHEMA_VERSION, validate_dataset
from .scan_dataset_export import ScanDatasetExport, load_scan_dataset_export_file


def convert_scan_dataset_export(
    input_path: str | Path,
    output_dir: str | Path,
    validation_sessions: int = 1,
) -> dict[str, Path]:
    export = load_scan_dataset_export_file(input_path)
    output = Path(output_dir)
    image_dir = output / "images"
    image_dir.mkdir(parents=True, exist_ok=True)

    dataset = {
        "schemaVersion": DATASET_SCHEMA_VERSION,
        "sessions": [
            convert_session(session, session_index, len(export.sessions), image_dir, validation_sessions)
            for session_index, session in enumerate(export.sessions)
            if session.faces
        ],
    }
    validated = validate_dataset(dataset)
    dataset_path = output / "vision-dataset.json"
    dataset_path.write_text(validated.model_dump_json(indent=2) + "\n", encoding="utf-8")
    return {"dataset": dataset_path, "imageRoot": output}


def convert_session(
    session,
    session_index: int,
    session_count: int,
    image_dir: Path,
    validation_sessions: int,
) -> dict:
    split = "validation" if session_index >= max(0, session_count - validation_sessions) else "train"
    return {
        "consent": True,
        "faces": [convert_face(session.sessionId, face, image_dir) for face in session.faces],
        "sessionId": session.sessionId,
        "split": split,
    }


def convert_face(session_id: str, face, image_dir: Path) -> dict:
    safe_session_id = safe_filename(session_id)
    image_name = f"{safe_session_id}-{face.face}.jpg"
    image_path = image_dir / image_name
    image_path.write_bytes(decode_data_url(face.photoDataUrl))
    image_size = face.visionAnalysis.get("imageSize") if face.visionAnalysis is not None else None
    width = int((image_size or {}).get("width") or face.capture.width)
    height = int((image_size or {}).get("height") or face.capture.height)

    return {
        "expectedTop": face.expectedTop,
        "faceQuad": vision_face_quad(face),
        "faceSymbol": face.face,
        "imagePath": f"images/{image_name}",
        "imageSize": {"height": height, "width": width},
        "qualityLabels": quality_labels(face),
        "stickers": [convert_sticker(face, index) for index in range(9)],
    }


def convert_sticker(face, index: int) -> dict:
    sticker = vision_sticker(face, index)
    return {
        "index": index,
        "polygon": sticker_polygon(sticker, index),
        "symbol": face.label[index],
    }


def vision_face_quad(face) -> list[dict[str, float]]:
    face_quad = (face.visionAnalysis or {}).get("faceQuad") or []
    if len(face_quad) >= 4:
        return normalized_points(face_quad[:4])
    return [
        {"x": 0.0, "y": 0.0},
        {"x": 1.0, "y": 0.0},
        {"x": 1.0, "y": 1.0},
        {"x": 0.0, "y": 1.0},
    ]


def vision_sticker(face, index: int) -> dict:
    for sticker in (face.visionAnalysis or {}).get("stickers") or []:
        if sticker.get("index") == index:
            return sticker
    return {}


def sticker_polygon(sticker: dict, index: int) -> list[dict[str, float]]:
    polygon = sticker.get("polygon") or []
    if len(polygon) >= 3:
        return normalized_points(polygon)

    row, column = divmod(index, 3)
    x0 = column / 3
    y0 = row / 3
    x1 = (column + 1) / 3
    y1 = (row + 1) / 3
    return [
        {"x": x0, "y": y0},
        {"x": x1, "y": y0},
        {"x": x1, "y": y1},
        {"x": x0, "y": y1},
    ]


def normalized_points(points: list[dict]) -> list[dict[str, float]]:
    return [{"x": clamp01(float(point["x"])), "y": clamp01(float(point["y"]))} for point in points]


def quality_labels(face) -> dict[str, bool]:
    quality = (face.visionAnalysis or {}).get("imageQuality") or {}
    warnings = set((face.visionAnalysis or {}).get("qualityWarnings") or [])
    return {
        "blur": "image_blurry" in warnings or float(quality.get("blurScore") or 100.0) < 18.0,
        "glare": "image_too_bright" in warnings or float(quality.get("glareRatio") or 0.0) > 0.18,
        "occlusion": False,
        "shadow": "image_too_dark" in warnings or float(quality.get("shadowRatio") or 0.0) > 0.45,
    }


def decode_data_url(data_url: str) -> bytes:
    if "," not in data_url:
        raise ValueError("photoDataUrl must be a data URL")
    _header, encoded = data_url.split(",", 1)
    return base64.b64decode(encoded)


def clamp01(value: float) -> float:
    return min(max(value, 0.0), 1.0)


def safe_filename(value: str) -> str:
    return "".join(character if character.isalnum() or character in "-_" else "-" for character in value)


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert web scan-dataset exports to Vision ML datasets.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--validation-sessions", default=1, type=int)
    args = parser.parse_args()
    result = convert_scan_dataset_export(args.input, args.output, validation_sessions=args.validation_sessions)
    print(json.dumps({key: str(value) for key, value in result.items()}, indent=2))


if __name__ == "__main__":
    main()
