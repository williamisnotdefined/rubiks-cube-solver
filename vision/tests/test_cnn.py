from __future__ import annotations

import pytest

np = pytest.importorskip("numpy")

from vision.cnn import VisionCnn, probability_rows_from_output, sticker_patch_batch


def test_unconfigured_cnn_is_optional() -> None:
    cnn = VisionCnn()
    image = np.zeros((300, 300, 3), dtype=np.uint8)

    assert not cnn.available
    assert cnn.unavailable_reason == "cnn_model_not_configured"
    assert cnn.predict_sticker_probabilities(image) is None


def test_probability_rows_normalize_logits() -> None:
    logits = np.zeros((1, 9, 6), dtype=np.float32)
    logits[:, :, 2] = 3.0

    rows = probability_rows_from_output(logits)

    assert rows is not None
    assert len(rows) == 9
    assert rows[0]["F"] == max(rows[0].values())
    assert sum(rows[0].values()) == pytest.approx(1.0, abs=1e-6)


def test_sticker_patch_batch_has_stable_shape() -> None:
    image = np.zeros((300, 300, 3), dtype=np.uint8)

    batch = sticker_patch_batch(image, input_size=32)

    assert batch.shape == (9, 3, 32, 32)
    assert batch.dtype == np.float32
