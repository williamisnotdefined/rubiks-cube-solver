from __future__ import annotations

from .color import SCAN_SYMBOLS
from .detection import analyze_face
from .schemas import (
    AnalyzeScanFaceRequest,
    AnalyzeScanSessionRequest,
    AnalyzeScanSessionResponse,
    AnalyzedSessionFace,
    AnalyzedSticker,
    RgbColor,
    ScanSessionFaceRequest,
)

VALID_ROTATIONS = {0, 90, 180, 270}


def analyze_session(request: AnalyzeScanSessionRequest) -> AnalyzeScanSessionResponse:
    validation_message = validate_session_request(request)
    if validation_message is not None:
        return AnalyzeScanSessionResponse(
            ok=False,
            status="invalid_session",
            message=validation_message,
        )

    known_centers: dict[str, RgbColor] = {}
    faces: list[AnalyzedSessionFace] = []
    warnings: list[str] = []
    target_tile_count = request.gridSize * request.gridSize

    for face_request in request.faces:
        analysis = analyze_face(
            AnalyzeScanFaceRequest(
                expectedCenter=face_request.symbol,
                image=face_request.image,
                knownCenters=known_centers,
                gridSize=request.gridSize,
            )
        )
        analysis = apply_manual_overrides(analysis, face_request)
        faces.append(
            AnalyzedSessionFace(
                symbol=face_request.symbol,
                expectedTop=face_request.expectedTop,
                analysis=analysis,
            )
        )
        warnings.extend(analysis.warnings)

        if len(analysis.tileDetections) >= target_tile_count:
            known_centers.pop(face_request.symbol, None)

    partial_failure = any(not face.analysis.ok or len(face.analysis.tileDetections) < target_tile_count for face in faces)

    return AnalyzeScanSessionResponse(
        ok=not partial_failure,
        status="partial_failure" if partial_failure else "analyzed",
        message="One or more faces need to be rescanned." if partial_failure else None,
        faces=faces,
        warnings=dedupe_warnings(warnings),
    )


def validate_session_request(request: AnalyzeScanSessionRequest) -> str | None:
    if len(request.faces) != 6:
        return "scan session must contain exactly 6 faces"

    symbols = [face.symbol for face in request.faces]
    if any(symbol not in SCAN_SYMBOLS for symbol in symbols):
        return "face symbols must be one of U, R, F, D, L, B"
    if len(set(symbols)) != 6:
        return "scan session must contain each face symbol exactly once"

    target_tile_count = request.gridSize * request.gridSize

    for face in request.faces:
        if face.expectedTop is not None and face.expectedTop not in SCAN_SYMBOLS:
            return "expectedTop must be one of U, R, F, D, L, B"
        if face.clientRotation is not None and face.clientRotation not in VALID_ROTATIONS:
            return "clientRotation must be one of 0, 90, 180, 270"
        for index, symbol in face.manualOverrides.items():
            if index < 0 or index >= target_tile_count:
                return f"manualOverrides indexes must be between 0 and {target_tile_count - 1}"
            if symbol not in SCAN_SYMBOLS:
                return "manualOverrides symbols must be one of U, R, F, D, L, B"

    return None


def apply_manual_overrides(
    analysis,
    face_request: ScanSessionFaceRequest,
):
    if len(face_request.manualOverrides) == 0 or len(analysis.stickers) == 0:
        return analysis

    stickers = [override_sticker(sticker, face_request.manualOverrides) for sticker in analysis.stickers]

    return analysis.model_copy(update={"stickers": stickers})


def override_sticker(
    sticker: AnalyzedSticker,
    manual_overrides: dict[int, str],
) -> AnalyzedSticker:
    symbol = manual_overrides.get(sticker.index)
    if symbol is None:
        return sticker

    return sticker.model_copy(update={"confidence": 1.0, "symbol": symbol})


def dedupe_warnings(warnings: list[str]) -> list[str]:
    return list(dict.fromkeys(warnings))
