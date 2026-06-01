from __future__ import annotations

import pytest

from vision.schemas import AnalyzeScanSessionRequest, ScanSessionFaceRequest
from vision.session import analyze_session
from vision.tests.test_detection import encode_image, synthetic_face
from vision.tile_detector import TileDetection


def test_analyzes_six_face_session(monkeypatch: pytest.MonkeyPatch) -> None:
    detector = SessionFakeTileDetector(["F", "R", "B", "L", "U", "D"])
    monkeypatch.setattr("vision.detection.get_default_tile_detector", lambda: detector)

    response = analyze_session(session_request())

    assert response.ok
    assert response.status == "analyzed"
    assert [face.symbol for face in response.faces] == ["F", "R", "B", "L", "U", "D"]
    assert all(face.analysis.imageQuality is not None for face in response.faces)
    assert all(len(face.analysis.tileDetections) == 9 for face in response.faces)


def test_rejects_incomplete_session() -> None:
    response = analyze_session(AnalyzeScanSessionRequest(faces=session_faces()[:5]))

    assert not response.ok
    assert response.status == "invalid_session"


def test_rejects_duplicate_symbols() -> None:
    faces = session_faces()
    faces[-1] = ScanSessionFaceRequest(symbol="F", image=faces[-1].image)

    response = analyze_session(AnalyzeScanSessionRequest(faces=faces))

    assert not response.ok
    assert response.status == "invalid_session"


def test_applies_manual_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    detector = SessionFakeTileDetector(["F", "R", "B", "L", "U", "D"])
    monkeypatch.setattr("vision.detection.get_default_tile_detector", lambda: detector)
    faces = session_faces()
    faces[0] = ScanSessionFaceRequest(
        symbol="F",
        image=faces[0].image,
        manualOverrides={0: "R"},
    )

    response = analyze_session(AnalyzeScanSessionRequest(faces=faces))

    assert response.faces[0].analysis.tileDetections[0].symbol == "F"
    assert response.faces[0].analysis.stickers == []


def session_request() -> AnalyzeScanSessionRequest:
    return AnalyzeScanSessionRequest(faces=session_faces())


def session_faces() -> list[ScanSessionFaceRequest]:
    return [
        ScanSessionFaceRequest(
            symbol=symbol,
            expectedTop="U" if symbol in {"F", "R", "B", "L"} else "F",
            image=encode_image(synthetic_face([symbol] * 9)),
        )
        for symbol in ["F", "R", "B", "L", "U", "D"]
    ]


class SessionFakeTileDetector:
    model_configured = True
    available = True

    def __init__(self, symbols: list[str]) -> None:
        self.symbols = symbols
        self.index = 0

    def detect(self, image_bgr) -> list[TileDetection]:
        _ = image_bgr
        symbol = self.symbols[self.index]
        self.index += 1
        return [
            TileDetection(
                symbol=symbol,
                confidence=0.92,
                bbox=((155 + (index % 3) * 160) / 720, (155 + (index // 3) * 160) / 720, 110 / 720, 110 / 720),
            )
            for index in range(9)
        ]
