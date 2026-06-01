from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np


DEFAULT_FACE_DETECTOR_INPUT_SIZE = 224
MIN_FACE_DETECTOR_BOX_SIZE = 0.04


@dataclass(frozen=True)
class FaceDetection:
    quad: np.ndarray
    confidence: float


class VisionFaceDetector:
    def __init__(
        self,
        model_path: str | os.PathLike[str] | None = None,
        session: Any | None = None,
        input_name: str | None = None,
        input_size: int = DEFAULT_FACE_DETECTOR_INPUT_SIZE,
    ) -> None:
        self.model_path = Path(model_path) if model_path is not None else None
        self.input_size = input_size
        self.unavailable_reason: str | None = None
        self._session = session
        self._input_name = input_name

        if self._session is not None:
            return

        if self.model_path is None:
            self.unavailable_reason = "face_detector_model_not_configured"
            return

        try:
            import onnxruntime as ort  # type: ignore[import-not-found]
        except ImportError:
            self.unavailable_reason = "face_detector_runtime_unavailable"
            return

        try:
            self._session = ort.InferenceSession(str(self.model_path), providers=["CPUExecutionProvider"])
        except Exception:
            self.unavailable_reason = "face_detector_model_load_failed"

    @property
    def model_configured(self) -> bool:
        return self.model_path is not None or self._session is not None

    @property
    def available(self) -> bool:
        return self._session is not None

    def detect(self, image_bgr: np.ndarray) -> FaceDetection | None:
        if self._session is None:
            return None

        input_name = self._input_name or first_input_name(self._session)
        if input_name is None:
            self.unavailable_reason = "face_detector_input_unavailable"
            return None

        try:
            outputs = self._session.run(None, {input_name: face_detector_input(image_bgr, self.input_size)})
        except Exception:
            self.unavailable_reason = "face_detector_inference_failed"
            return None

        if not outputs:
            self.unavailable_reason = "face_detector_output_unavailable"
            return None

        bbox = bbox_from_output(outputs[0])
        if bbox is None:
            self.unavailable_reason = "face_detector_output_invalid"
            return None

        height, width = image_bgr.shape[:2]
        quad = bbox_to_quad(bbox, width, height)
        return FaceDetection(quad=quad, confidence=bbox_confidence(bbox))


_DEFAULT_FACE_DETECTOR: VisionFaceDetector | None = None


def get_default_face_detector() -> VisionFaceDetector:
    global _DEFAULT_FACE_DETECTOR

    if _DEFAULT_FACE_DETECTOR is None:
        input_size = int(os.environ.get("RUBIKS_VISION_FACE_DETECTOR_INPUT_SIZE", DEFAULT_FACE_DETECTOR_INPUT_SIZE))
        _DEFAULT_FACE_DETECTOR = VisionFaceDetector(
            os.environ.get("RUBIKS_VISION_FACE_DETECTOR_MODEL"),
            input_size=input_size,
        )

    return _DEFAULT_FACE_DETECTOR


def face_detector_health(detector: VisionFaceDetector | None = None) -> dict[str, bool | str | None]:
    detector = detector or get_default_face_detector()

    return {
        "faceDetectorAvailable": detector.available,
        "faceDetectorConfigured": detector.model_configured,
        "faceDetectorReason": None if detector.available else detector.unavailable_reason,
    }


def first_input_name(session: Any) -> str | None:
    inputs = getattr(session, "get_inputs", lambda: [])()
    if not inputs:
        return None

    return getattr(inputs[0], "name", None)


def face_detector_input(image_bgr: np.ndarray, input_size: int) -> np.ndarray:
    resized = cv2.resize(image_bgr, (input_size, input_size), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return np.expand_dims(np.transpose(rgb, (2, 0, 1)), axis=0).astype(np.float32)


def bbox_from_output(output: Any) -> tuple[float, float, float, float] | None:
    array = np.asarray(output, dtype=np.float32)
    if array.ndim == 2 and array.shape[0] == 1:
        array = array[0]
    if array.ndim != 1 or array.size < 4:
        return None
    bbox = tuple(float(value) for value in array[:4])
    if not valid_bbox(bbox):
        return None
    return bbox


def valid_bbox(bbox: tuple[float, float, float, float]) -> bool:
    x, y, width, height = bbox
    return (
        np.isfinite([x, y, width, height]).all()
        and 0.0 <= x <= 1.0
        and 0.0 <= y <= 1.0
        and MIN_FACE_DETECTOR_BOX_SIZE <= width <= 1.0
        and MIN_FACE_DETECTOR_BOX_SIZE <= height <= 1.0
    )


def bbox_to_quad(bbox: tuple[float, float, float, float], width: int, height: int) -> np.ndarray:
    x, y, bbox_width, bbox_height = bbox
    x0 = max(0.0, (x - bbox_width / 2.0) * width)
    y0 = max(0.0, (y - bbox_height / 2.0) * height)
    x1 = min(float(width - 1), (x + bbox_width / 2.0) * width)
    y1 = min(float(height - 1), (y + bbox_height / 2.0) * height)
    return np.array(
        [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
        dtype=np.float32,
    )


def bbox_confidence(bbox: tuple[float, float, float, float]) -> float:
    x, y, width, height = bbox
    area = width * height
    area_score = clip01((area - 0.025) / 0.18)
    center_distance = float(np.hypot(x - 0.5, y - 0.5))
    center_score = 1.0 - clip01(center_distance / 0.5)
    return clip01(0.58 + area_score * 0.24 + center_score * 0.18)


def clip01(value: float) -> float:
    return min(1.0, max(0.0, value))
