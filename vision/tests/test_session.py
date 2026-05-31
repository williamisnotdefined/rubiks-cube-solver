from __future__ import annotations

from vision.schemas import AnalyzeScanSessionRequest, ScanSessionFaceRequest
from vision.session import analyze_session
from vision.tests.test_detection import encode_image, synthetic_face


def test_analyzes_six_face_session() -> None:
    response = analyze_session(session_request())

    assert response.ok
    assert response.status == "analyzed"
    assert [face.symbol for face in response.faces] == ["F", "R", "B", "L", "U", "D"]
    assert all(face.analysis.imageQuality is not None for face in response.faces)
    assert all(face.analysis.stickers[0].probabilities is not None for face in response.faces)


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


def test_applies_manual_overrides() -> None:
    faces = session_faces()
    faces[0] = ScanSessionFaceRequest(
        symbol="F",
        image=faces[0].image,
        manualOverrides={0: "R"},
    )

    response = analyze_session(AnalyzeScanSessionRequest(faces=faces))

    assert response.faces[0].analysis.stickers[0].symbol == "R"
    assert response.faces[0].analysis.stickers[0].confidence == 1.0


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
