from __future__ import annotations

import pytest

np = pytest.importorskip("numpy")

from vision_ml.evaluate_cnn import evaluation_report_from_probabilities


def test_evaluation_report_includes_accuracy_margin_and_confusion_matrix() -> None:
    probabilities = np.array(
        [
            [0.9, 0.02, 0.02, 0.02, 0.02, 0.02],
            [0.1, 0.7, 0.1, 0.04, 0.03, 0.03],
            [0.2, 0.3, 0.25, 0.1, 0.1, 0.05],
        ],
        dtype=np.float32,
    )
    labels = np.array([0, 1, 2], dtype=np.int64)

    report = evaluation_report_from_probabilities(probabilities, labels)

    assert report["examples"] == 3
    assert report["accuracy"] == pytest.approx(2 / 3)
    assert report["averageTop2Margin"] > 0
    assert report["confusionMatrix"][2][1] == 1
    assert report["perSymbol"]["U"]["accuracy"] == 1.0
