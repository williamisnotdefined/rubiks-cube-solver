from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .dataset_schema import validate_symbol


SCAN_DATASET_EXPORT_SCHEMA_VERSION = "scan-dataset-v1"


class ScanDatasetCaptureCondition(BaseModel):
    background: str = Field(min_length=1)
    lighting: str = Field(min_length=1)
    notes: str = ""


class ScanDatasetCapture(BaseModel):
    capturedAt: int = Field(ge=0)
    height: int = Field(ge=1)
    source: str = Field(min_length=1)
    width: int = Field(ge=1)


class ScanDatasetSticker(BaseModel):
    index: int = Field(ge=0, le=8)
    symbol: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    source: Literal["empty", "detected", "manual", "center"]
    rgb: dict[str, int] | None = None
    alternatives: list[dict[str, Any]] | None = None

    @field_validator("symbol")
    @classmethod
    def symbol_must_be_valid(cls, symbol: str | None) -> str | None:
        return None if symbol is None else validate_symbol(symbol)


class ScanDatasetFaceSample(BaseModel):
    acceptedAt: str = Field(min_length=1)
    capture: ScanDatasetCapture
    expectedTop: str
    face: str
    label: str = Field(min_length=9, max_length=9)
    manualCorrections: dict[int, str] = Field(default_factory=dict)
    photoDataUrl: str = Field(min_length=1)
    stickers: list[ScanDatasetSticker] = Field(default_factory=list)
    visionAnalysis: dict[str, Any] | None = None

    @field_validator("expectedTop", "face")
    @classmethod
    def face_symbol_must_be_valid(cls, symbol: str) -> str:
        return validate_symbol(symbol)

    @field_validator("label")
    @classmethod
    def label_must_be_valid(cls, label: str) -> str:
        for symbol in label:
            validate_symbol(symbol)
        return label

    @model_validator(mode="after")
    def manual_corrections_must_be_valid(self) -> ScanDatasetFaceSample:
        for index, symbol in self.manualCorrections.items():
            if index < 0 or index > 8:
                raise ValueError("manualCorrections indexes must be in 0..8")
            validate_symbol(symbol)
        return self


class ScanDatasetSession(BaseModel):
    captureCondition: ScanDatasetCaptureCondition
    completedAt: str | None = None
    cubeId: str = Field(min_length=1)
    faces: list[ScanDatasetFaceSample] = Field(default_factory=list, max_length=6)
    mode: Literal["manual_label", "solved_calibration"]
    sessionId: str = Field(min_length=1)
    startedAt: str = Field(min_length=1)

    @model_validator(mode="after")
    def faces_must_be_unique(self) -> ScanDatasetSession:
        symbols = [face.face for face in self.faces]
        if len(symbols) != len(set(symbols)):
            raise ValueError("dataset session faces must be unique")
        return self


class ScanDatasetExport(BaseModel):
    schemaVersion: Literal["scan-dataset-v1"]
    createdAt: str = Field(min_length=1)
    sessions: list[ScanDatasetSession] = Field(default_factory=list)
    source: Literal["web-scan-dataset-page"]


def validate_scan_dataset_export(data: object) -> ScanDatasetExport:
    return ScanDatasetExport.model_validate(data)


def load_scan_dataset_export_file(path: str | Path) -> ScanDatasetExport:
    return validate_scan_dataset_export(json.loads(Path(path).read_text(encoding="utf-8")))
