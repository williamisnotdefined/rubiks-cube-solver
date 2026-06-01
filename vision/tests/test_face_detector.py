from __future__ import annotations

import pytest

np = pytest.importorskip("numpy")

from vision.face_detector import (
    VisionFaceDetector,
    bbox_from_output,
    face_detector_health,
    face_detector_input,
)


def test_unconfigured_face_detector_is_optional() -> None:
    detector = VisionFaceDetector()
    image = np.zeros((100, 200, 3), dtype=np.uint8)

    assert not detector.available
    assert detector.unavailable_reason == "face_detector_model_not_configured"
    assert detector.detect(image) is None


def test_face_detector_health_reports_optional_status() -> None:
    health = face_detector_health(VisionFaceDetector())

    assert health == {
        "faceDetectorAvailable": False,
        "faceDetectorConfigured": False,
        "faceDetectorReason": "face_detector_model_not_configured",
    }


def test_face_detector_input_has_stable_shape() -> None:
    image = np.zeros((80, 120, 3), dtype=np.uint8)

    batch = face_detector_input(image, input_size=32)

    assert batch.shape == (1, 3, 32, 32)
    assert batch.dtype == np.float32


def test_face_detector_converts_session_output_to_quad() -> None:
    detector = VisionFaceDetector(session=FakeSession(), input_name="image", input_size=32)
    image = np.zeros((100, 200, 3), dtype=np.uint8)

    detection = detector.detect(image)

    assert detection is not None
    assert detection.confidence > 0.0
    assert detection.quad.reshape(-1).tolist() == pytest.approx([60, 40, 140, 40, 140, 60, 60, 60])


def test_bbox_from_output_rejects_invalid_shape() -> None:
    assert bbox_from_output(np.zeros((2, 2), dtype=np.float32)) is None


class FakeInput:
    name = "image"


class FakeSession:
    def get_inputs(self):
        return [FakeInput()]

    def run(self, _outputs, _inputs):
        return [np.array([[0.5, 0.5, 0.4, 0.2]], dtype=np.float32)]
