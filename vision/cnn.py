from __future__ import annotations

import math
import os
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from .color import SCAN_SYMBOLS, normalize_symbol_probabilities


DEFAULT_INPUT_SIZE = 64


class VisionCnn:
    def __init__(
        self,
        model_path: str | os.PathLike[str] | None = None,
        session: Any | None = None,
        input_name: str | None = None,
        input_size: int = DEFAULT_INPUT_SIZE,
    ) -> None:
        self.model_path = Path(model_path) if model_path is not None else None
        self.input_size = input_size
        self.unavailable_reason: str | None = None
        self._session = session
        self._input_name = input_name

        if self._session is not None:
            return

        if self.model_path is None:
            self.unavailable_reason = "cnn_model_not_configured"
            return

        try:
            import onnxruntime as ort  # type: ignore[import-not-found]
        except ImportError:
            self.unavailable_reason = "cnn_runtime_unavailable"
            return

        try:
            self._session = ort.InferenceSession(str(self.model_path), providers=["CPUExecutionProvider"])
        except Exception:
            self.unavailable_reason = "cnn_model_load_failed"

    @property
    def model_configured(self) -> bool:
        return self.model_path is not None or self._session is not None

    @property
    def available(self) -> bool:
        return self._session is not None

    def predict_sticker_probabilities(self, warped_bgr: np.ndarray) -> list[dict[str, float]] | None:
        if self._session is None:
            return None

        input_name = self._input_name or first_input_name(self._session)
        if input_name is None:
            self.unavailable_reason = "cnn_input_unavailable"
            return None

        try:
            outputs = self._session.run(None, {input_name: sticker_patch_batch(warped_bgr, self.input_size)})
        except Exception:
            self.unavailable_reason = "cnn_inference_failed"
            return None

        if not outputs:
            self.unavailable_reason = "cnn_output_unavailable"
            return None

        return probability_rows_from_output(outputs[0])


_DEFAULT_CNN: VisionCnn | None = None


def get_default_cnn() -> VisionCnn:
    global _DEFAULT_CNN

    if _DEFAULT_CNN is None:
        _DEFAULT_CNN = VisionCnn(os.environ.get("RUBIKS_VISION_CNN_MODEL"))

    return _DEFAULT_CNN


def cnn_health(cnn: VisionCnn | None = None) -> dict[str, bool | str | None]:
    cnn = cnn or get_default_cnn()

    return {
        "cnnAvailable": cnn.available,
        "cnnConfigured": cnn.model_configured,
        "cnnReason": None if cnn.available else cnn.unavailable_reason,
    }


def first_input_name(session: Any) -> str | None:
    inputs = getattr(session, "get_inputs", lambda: [])()
    if not inputs:
        return None

    return getattr(inputs[0], "name", None)


def sticker_patch_batch(warped_bgr: np.ndarray, input_size: int = DEFAULT_INPUT_SIZE) -> np.ndarray:
    height, width = warped_bgr.shape[:2]
    cell_width = width / 3.0
    cell_height = height / 3.0
    patches = []

    for index in range(9):
        row = index // 3
        column = index % 3
        x0 = int(column * cell_width + cell_width * 0.12)
        y0 = int(row * cell_height + cell_height * 0.12)
        x1 = int((column + 1) * cell_width - cell_width * 0.12)
        y1 = int((row + 1) * cell_height - cell_height * 0.12)
        patch = warped_bgr[max(0, y0) : min(height, y1), max(0, x0) : min(width, x1)]
        if patch.size == 0:
            patch = np.zeros((input_size, input_size, 3), dtype=np.uint8)
        resized = cv2.resize(patch, (input_size, input_size), interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        patches.append(np.transpose(rgb, (2, 0, 1)))

    return np.stack(patches, axis=0).astype(np.float32)


def probability_rows_from_output(output: Any) -> list[dict[str, float]] | None:
    array = np.asarray(output, dtype=np.float32)
    if array.ndim == 3 and array.shape[0] == 1:
        array = array[0]
    if array.ndim == 1 and array.size == 54:
        array = array.reshape(9, len(SCAN_SYMBOLS))
    if array.shape != (9, len(SCAN_SYMBOLS)):
        return None

    return [probabilities_from_row(row) for row in array]


def probabilities_from_row(row: np.ndarray) -> dict[str, float]:
    values = [float(value) for value in row]
    if any(not math.isfinite(value) for value in values):
        return {symbol: 1.0 / len(SCAN_SYMBOLS) for symbol in SCAN_SYMBOLS}
    if any(value < 0.0 for value in values) or not math.isclose(sum(values), 1.0, abs_tol=1e-3):
        values = softmax(values)

    return normalize_symbol_probabilities(dict(zip(SCAN_SYMBOLS, values, strict=True)))


def softmax(values: list[float]) -> list[float]:
    maximum = max(values)
    exp_values = [math.exp(value - maximum) for value in values]
    total = sum(exp_values)
    if total <= 0.0:
        return [1.0 / len(values) for _ in values]

    return [value / total for value in exp_values]
