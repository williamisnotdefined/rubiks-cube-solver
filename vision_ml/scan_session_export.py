from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .dataset_schema import SCAN_SYMBOLS, validate_symbol


SCAN_SESSION_EXPORT_SCHEMA_VERSION = "scan-session-export-v1"
CANONICAL_FACE_ORDER = ("U", "R", "F", "D", "L", "B")


class ScanExportRgb(BaseModel):
    r: int = Field(ge=0, le=255)
    g: int = Field(ge=0, le=255)
    b: int = Field(ge=0, le=255)


class ScanExportAlternative(BaseModel):
    symbol: str
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("symbol")
    @classmethod
    def symbol_must_be_valid(cls, symbol: str) -> str:
        return validate_symbol(symbol)


class ScanExportCapture(BaseModel):
    capturedAt: int = Field(ge=0)
    height: int = Field(ge=1)
    source: str = Field(min_length=1)
    width: int = Field(ge=1)


class ScanRejectedCapture(BaseModel):
    reason: Literal["empty_stickers", "guide_fallback"]
    photoDataUrl: str = Field(min_length=1)
    capture: ScanExportCapture
    analysis: dict[str, Any]


class ScanExportSticker(BaseModel):
    index: int = Field(ge=0, le=8)
    symbol: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    source: Literal["empty", "detected", "manual", "center"]
    rgb: ScanExportRgb | None = None
    alternatives: list[ScanExportAlternative] | None = None

    @field_validator("symbol")
    @classmethod
    def symbol_must_be_valid(cls, symbol: str | None) -> str | None:
        return None if symbol is None else validate_symbol(symbol)


class ScanSessionExportFace(BaseModel):
    symbol: str
    expectedTop: str
    confirmed: bool = False
    centerOverrideConfirmed: bool = False
    photoDataUrl: str | None = None
    imagePath: str | None = None
    capture: ScanExportCapture | None = None
    lastRejectedCapture: ScanRejectedCapture | None = None
    stickers: list[ScanExportSticker] = Field(min_length=9, max_length=9)
    manualOverrides: dict[int, str] = Field(default_factory=dict)
    analysis: dict[str, Any] | None = None

    @field_validator("symbol", "expectedTop")
    @classmethod
    def face_symbol_must_be_valid(cls, symbol: str) -> str:
        return validate_symbol(symbol)

    @model_validator(mode="after")
    def face_must_be_consistent(self) -> ScanSessionExportFace:
        indexes = sorted(sticker.index for sticker in self.stickers)
        if indexes != list(range(9)):
            raise ValueError("stickers must contain each index 0..8 exactly once")

        center = next(sticker for sticker in self.stickers if sticker.index == 4)
        if center.symbol is not None and center.symbol != self.symbol:
            raise ValueError("center sticker symbol must match face symbol")

        for index, symbol in self.manualOverrides.items():
            if index < 0 or index > 8:
                raise ValueError("manualOverrides indexes must be in 0..8")
            validate_symbol(symbol)

        if self.confirmed:
            if self.photoDataUrl is None and self.imagePath is None:
                raise ValueError("confirmed exported faces require photoDataUrl or imagePath")
            if any(sticker.symbol is None for sticker in self.stickers):
                raise ValueError("confirmed exported faces require all sticker symbols")

        return self


class ScanSessionExportLabel(BaseModel):
    facelets: str | None = None
    faces: dict[str, str] = Field(default_factory=dict)
    notes: str | None = None
    validatedBy: str | None = None

    @field_validator("facelets")
    @classmethod
    def facelets_must_be_valid(cls, facelets: str | None) -> str | None:
        if facelets is None:
            return None
        validate_facelet_string(facelets, expected_length=54)
        return facelets

    @model_validator(mode="after")
    def faces_must_be_valid(self) -> ScanSessionExportLabel:
        for symbol, stickers in self.faces.items():
            validate_symbol(symbol)
            validate_facelet_string(stickers, expected_length=9)
        return self


class ScanSessionExport(BaseModel):
    schemaVersion: Literal["scan-session-export-v1"]
    createdAt: str = Field(min_length=1)
    source: str = Field(min_length=1)
    complete: bool = False
    faces: list[ScanSessionExportFace] = Field(min_length=1, max_length=6)
    sessionResult: dict[str, Any] | None = None
    label: ScanSessionExportLabel | None = None

    @model_validator(mode="after")
    def session_faces_must_be_consistent(self) -> ScanSessionExport:
        symbols = [face.symbol for face in self.faces]
        if len(symbols) != len(set(symbols)):
            raise ValueError("exported session faces must have unique symbols")

        if self.complete:
            if set(symbols) != set(CANONICAL_FACE_ORDER):
                raise ValueError("complete exported sessions require U, R, F, D, L, and B faces")
            if any(not face.confirmed for face in self.faces):
                raise ValueError("complete exported sessions require every face to be confirmed")

        return self


def validate_scan_session_export(data: object) -> ScanSessionExport:
    return ScanSessionExport.model_validate(data)


def load_scan_session_export_file(path: str | Path) -> ScanSessionExport:
    return validate_scan_session_export(json.loads(Path(path).read_text(encoding="utf-8")))


def scan_session_export_files(path: str | Path) -> list[Path]:
    input_path = Path(path)
    if input_path.is_file():
        return [input_path]
    return sorted(candidate for candidate in input_path.rglob("*.json") if candidate.is_file())


def load_scan_session_exports(path: str | Path) -> list[ScanSessionExport]:
    return [load_scan_session_export_file(export_path) for export_path in scan_session_export_files(path)]


def validate_facelet_string(value: str, expected_length: int) -> None:
    if len(value) != expected_length:
        raise ValueError(f"facelet string must have length {expected_length}")
    invalid_symbols = set(value) - SCAN_SYMBOLS
    if invalid_symbols:
        raise ValueError("facelet string contains invalid symbols")
