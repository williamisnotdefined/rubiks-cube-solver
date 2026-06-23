from __future__ import annotations

import os
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np


DEFAULT_TILE_DETECTOR_INPUT_SIZE = 640
DEFAULT_TILE_DETECTOR_CONFIDENCE = 0.28
DEFAULT_TILE_DETECTOR_IOU = 0.45
DEFAULT_TILE_DETECTOR_CLASS_SYMBOLS = ("face", "U", "R", "F", "D", "L", "B")
EXPECTED_TILE_DETECTOR_CONTRACT_VERSION = "tile-yolo-onnx-v1"
MAX_SUPPORTED_ONNX_OPSET = 21
TILE_DETECTOR_CLASS_SYMBOLS = DEFAULT_TILE_DETECTOR_CLASS_SYMBOLS


@dataclass(frozen=True)
class TileDetection:
    symbol: str
    confidence: float
    bbox: tuple[float, float, float, float]


@dataclass(frozen=True)
class TileDetectorManifest:
    model_path: Path
    input_size: int
    class_symbols: tuple[str, ...]


class TileDetectorManifestError(ValueError):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class VisionTileDetector:
    def __init__(
        self,
        model_path: str | os.PathLike[str] | None = None,
        manifest_path: str | os.PathLike[str] | None = None,
        session: Any | None = None,
        input_name: str | None = None,
        input_size: int = DEFAULT_TILE_DETECTOR_INPUT_SIZE,
        confidence_threshold: float = DEFAULT_TILE_DETECTOR_CONFIDENCE,
        iou_threshold: float = DEFAULT_TILE_DETECTOR_IOU,
        class_symbols: tuple[str, ...] = DEFAULT_TILE_DETECTOR_CLASS_SYMBOLS,
    ) -> None:
        self.model_path = Path(model_path) if model_path is not None else None
        self.input_size = input_size
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.class_symbols = class_symbols
        self.unavailable_reason: str | None = None
        self._session = session
        self._input_name = input_name

        if self._session is not None:
            return

        if manifest_path is not None:
            try:
                manifest = load_tile_detector_manifest(
                    manifest_path,
                    configured_model_path=self.model_path,
                    input_size=self.input_size,
                    class_symbols=self.class_symbols,
                )
            except TileDetectorManifestError as error:
                self.unavailable_reason = error.reason
                return
            self.model_path = manifest.model_path

        if self.model_path is None:
            self.unavailable_reason = "tile_detector_model_not_configured"
            return

        try:
            import onnxruntime as ort  # type: ignore[import-not-found]
        except ImportError:
            self.unavailable_reason = "tile_detector_runtime_unavailable"
            return

        try:
            self._session = ort.InferenceSession(str(self.model_path), providers=["CPUExecutionProvider"])
        except Exception:
            self.unavailable_reason = "tile_detector_model_load_failed"

    @property
    def model_configured(self) -> bool:
        return self.model_path is not None or self._session is not None

    @property
    def available(self) -> bool:
        return self._session is not None

    def detect(self, image_bgr: np.ndarray) -> list[TileDetection]:
        if self._session is None:
            return []

        input_name = self._input_name or first_input_name(self._session)
        if input_name is None:
            self.unavailable_reason = "tile_detector_input_unavailable"
            return []

        try:
            outputs = self._session.run(None, {input_name: tile_detector_input(image_bgr, self.input_size)})
        except Exception:
            self.unavailable_reason = "tile_detector_inference_failed"
            return []

        if not outputs:
            self.unavailable_reason = "tile_detector_output_unavailable"
            return []

        return detections_from_output(
            outputs[0],
            input_size=self.input_size,
            confidence_threshold=self.confidence_threshold,
            iou_threshold=self.iou_threshold,
            class_symbols=self.class_symbols,
        )


_DEFAULT_TILE_DETECTOR: VisionTileDetector | None = None


def get_default_tile_detector() -> VisionTileDetector:
    global _DEFAULT_TILE_DETECTOR

    if _DEFAULT_TILE_DETECTOR is None:
        input_size = int(os.environ.get("RUBIKS_VISION_TILE_DETECTOR_INPUT_SIZE", DEFAULT_TILE_DETECTOR_INPUT_SIZE))
        confidence_threshold = float(
            os.environ.get("RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE", DEFAULT_TILE_DETECTOR_CONFIDENCE)
        )
        class_symbols = tile_detector_class_symbols_from_env()
        _DEFAULT_TILE_DETECTOR = VisionTileDetector(
            os.environ.get("RUBIKS_VISION_TILE_DETECTOR_MODEL"),
            manifest_path=os.environ.get("RUBIKS_VISION_TILE_DETECTOR_MANIFEST"),
            input_size=input_size,
            confidence_threshold=confidence_threshold,
            class_symbols=class_symbols,
        )

    return _DEFAULT_TILE_DETECTOR


def tile_detector_health(detector: VisionTileDetector | None = None) -> dict[str, bool | str | None]:
    detector = detector or get_default_tile_detector()

    return {
        "tileDetectorAvailable": detector.available,
        "tileDetectorConfigured": detector.model_configured,
        "tileDetectorReason": None if detector.available else detector.unavailable_reason,
    }


def first_input_name(session: Any) -> str | None:
    inputs = getattr(session, "get_inputs", lambda: [])()
    if not inputs:
        return None
    return getattr(inputs[0], "name", None)


def tile_detector_class_symbols_from_env() -> tuple[str, ...]:
    value = os.environ.get("RUBIKS_VISION_TILE_DETECTOR_CLASS_SYMBOLS")
    if value is None:
        return DEFAULT_TILE_DETECTOR_CLASS_SYMBOLS

    symbols = tuple(symbol.strip() for symbol in value.split(",") if symbol.strip())
    return symbols or DEFAULT_TILE_DETECTOR_CLASS_SYMBOLS


def load_tile_detector_manifest(
    manifest_path: str | os.PathLike[str],
    *,
    configured_model_path: Path | None,
    input_size: int,
    class_symbols: tuple[str, ...],
) -> TileDetectorManifest:
    path = Path(manifest_path)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise TileDetectorManifestError("tile_detector_manifest_unavailable") from error
    except json.JSONDecodeError as error:
        raise TileDetectorManifestError("tile_detector_manifest_invalid") from error

    if not isinstance(payload, dict):
        raise TileDetectorManifestError("tile_detector_manifest_invalid")
    if payload.get("schemaVersion") != "1":
        raise TileDetectorManifestError("tile_detector_manifest_schema_mismatch")
    if payload.get("contractVersion") != EXPECTED_TILE_DETECTOR_CONTRACT_VERSION:
        raise TileDetectorManifestError("tile_detector_manifest_contract_mismatch")
    if payload.get("inputSize") != input_size:
        raise TileDetectorManifestError("tile_detector_manifest_input_size_mismatch")
    if tuple(payload.get("classOrder", ())) != class_symbols:
        raise TileDetectorManifestError("tile_detector_manifest_class_order_mismatch")

    onnx_opset = payload.get("onnxOpset")
    if not isinstance(onnx_opset, int) or onnx_opset < 1 or onnx_opset > MAX_SUPPORTED_ONNX_OPSET:
        raise TileDetectorManifestError("tile_detector_manifest_opset_mismatch")

    model_path_value = payload.get("modelPath")
    model_sha256 = payload.get("modelSha256")
    if not isinstance(model_path_value, str) or not isinstance(model_sha256, str):
        raise TileDetectorManifestError("tile_detector_manifest_invalid")

    model_path = resolve_manifest_model_path(path, model_path_value)
    if configured_model_path is not None and model_path.resolve(strict=False) != configured_model_path.resolve(strict=False):
        raise TileDetectorManifestError("tile_detector_manifest_model_path_mismatch")
    if sha256_file(model_path) != model_sha256:
        raise TileDetectorManifestError("tile_detector_manifest_model_sha256_mismatch")

    return TileDetectorManifest(model_path=model_path, input_size=input_size, class_symbols=class_symbols)


def resolve_manifest_model_path(manifest_path: Path, model_path: str) -> Path:
    path = Path(model_path)
    return path if path.is_absolute() else manifest_path.parent / path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    except OSError as error:
        raise TileDetectorManifestError("tile_detector_manifest_model_unavailable") from error
    return digest.hexdigest()


def tile_detector_input(image_bgr: np.ndarray, input_size: int) -> np.ndarray:
    resized = cv2.resize(image_bgr, (input_size, input_size), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return np.expand_dims(np.transpose(rgb, (2, 0, 1)), axis=0).astype(np.float32)


def detections_from_output(
    output: Any,
    input_size: int = DEFAULT_TILE_DETECTOR_INPUT_SIZE,
    confidence_threshold: float = DEFAULT_TILE_DETECTOR_CONFIDENCE,
    iou_threshold: float = DEFAULT_TILE_DETECTOR_IOU,
    class_symbols: tuple[str, ...] = DEFAULT_TILE_DETECTOR_CLASS_SYMBOLS,
) -> list[TileDetection]:
    rows = yolo_rows_from_output(output, class_symbol_count=len(class_symbols))
    if rows is None or rows.shape[1] < 5:
        return []

    detections: list[TileDetection] = []
    class_scores = rows[:, 4 : 4 + len(class_symbols)]
    if class_scores.shape[1] != len(class_symbols):
        return []

    class_indexes = np.argmax(class_scores, axis=1)
    confidences = class_scores[np.arange(class_scores.shape[0]), class_indexes]
    for row, class_index, confidence in zip(rows, class_indexes, confidences, strict=False):
        confidence = float(confidence)
        if confidence < confidence_threshold:
            continue
        bbox = normalized_xywh_from_yolo_row(row[:4], input_size)
        if bbox is None:
            continue
        detections.append(
            TileDetection(
                symbol=class_symbols[int(class_index)],
                confidence=confidence,
                bbox=bbox,
            )
        )

    return non_max_suppression(detections, iou_threshold=iou_threshold)


def yolo_rows_from_output(output: Any, class_symbol_count: int = len(DEFAULT_TILE_DETECTOR_CLASS_SYMBOLS)) -> np.ndarray | None:
    array = np.asarray(output, dtype=np.float32)
    if array.ndim == 3 and array.shape[0] == 1:
        array = array[0]
    if array.ndim != 2:
        return None

    supported_widths = {class_symbol_count + 4, class_symbol_count + 5}
    if array.shape[0] in supported_widths:
        array = array.T
    if array.shape[1] not in supported_widths:
        return None
    return array


def normalized_xywh_from_yolo_row(row: np.ndarray, input_size: int) -> tuple[float, float, float, float] | None:
    x, y, width, height = [float(value) for value in row]
    if width <= 0.0 or height <= 0.0:
        return None
    if max(x, y, width, height) > 2.0:
        x /= input_size
        y /= input_size
        width /= input_size
        height /= input_size
    bbox = (
        clip01(x),
        clip01(y),
        min(1.0, max(0.0, width)),
        min(1.0, max(0.0, height)),
    )
    return bbox if bbox[2] > 0.005 and bbox[3] > 0.005 else None


def non_max_suppression(detections: list[TileDetection], iou_threshold: float) -> list[TileDetection]:
    selected: list[TileDetection] = []
    for detection in sorted(detections, key=lambda item: item.confidence, reverse=True):
        if all(bbox_iou(detection.bbox, existing.bbox) < iou_threshold for existing in selected):
            selected.append(detection)
    return selected


def bbox_iou(
    left: tuple[float, float, float, float],
    right: tuple[float, float, float, float],
) -> float:
    left_x0, left_y0, left_x1, left_y1 = bbox_xyxy(left)
    right_x0, right_y0, right_x1, right_y1 = bbox_xyxy(right)
    intersection_x0 = max(left_x0, right_x0)
    intersection_y0 = max(left_y0, right_y0)
    intersection_x1 = min(left_x1, right_x1)
    intersection_y1 = min(left_y1, right_y1)
    intersection = max(0.0, intersection_x1 - intersection_x0) * max(0.0, intersection_y1 - intersection_y0)
    union = left[2] * left[3] + right[2] * right[3] - intersection
    return 0.0 if union <= 0.0 else intersection / union


def bbox_xyxy(bbox: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    x, y, width, height = bbox
    return (
        max(0.0, x - width / 2.0),
        max(0.0, y - height / 2.0),
        min(1.0, x + width / 2.0),
        min(1.0, y + height / 2.0),
    )


def clip01(value: float) -> float:
    return min(1.0, max(0.0, value))
