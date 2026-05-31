from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


SCAN_SYMBOLS = {"U", "R", "F", "D", "L", "B"}
DATASET_SCHEMA_VERSION = "vision-scan-dataset-v1"


class VisionPoint(BaseModel):
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)


class VisionImageSize(BaseModel):
    width: int = Field(ge=1)
    height: int = Field(ge=1)


class VisionQualityLabels(BaseModel):
    blur: bool = False
    glare: bool = False
    occlusion: bool = False
    shadow: bool = False


class StickerAnnotation(BaseModel):
    index: int = Field(ge=0, le=8)
    symbol: str
    polygon: list[VisionPoint] = Field(min_length=3)

    @field_validator("symbol")
    @classmethod
    def symbol_must_be_valid(cls, symbol: str) -> str:
        return validate_symbol(symbol)


class FaceAnnotation(BaseModel):
    faceSymbol: str
    expectedTop: str
    imagePath: str = Field(min_length=1)
    imageSize: VisionImageSize
    faceQuad: list[VisionPoint] = Field(min_length=4, max_length=4)
    stickers: list[StickerAnnotation] = Field(min_length=9, max_length=9)
    qualityLabels: VisionQualityLabels = Field(default_factory=VisionQualityLabels)

    @field_validator("faceSymbol", "expectedTop")
    @classmethod
    def face_symbols_must_be_valid(cls, symbol: str) -> str:
        return validate_symbol(symbol)

    @model_validator(mode="after")
    def sticker_indexes_must_cover_face(self) -> FaceAnnotation:
        indexes = sorted(sticker.index for sticker in self.stickers)
        if indexes != list(range(9)):
            raise ValueError("stickers must contain each index 0..8 exactly once")
        if self.stickers[4].symbol != self.faceSymbol:
            raise ValueError("center sticker symbol must match faceSymbol")
        return self


class ScanSessionAnnotation(BaseModel):
    sessionId: str = Field(min_length=1)
    split: Literal["train", "validation", "test"]
    consent: bool
    correctedCubeState: str | None = None
    faces: list[FaceAnnotation] = Field(min_length=1, max_length=6)

    @model_validator(mode="after")
    def face_symbols_must_be_unique(self) -> ScanSessionAnnotation:
        symbols = [face.faceSymbol for face in self.faces]
        if len(symbols) != len(set(symbols)):
            raise ValueError("session faces must have unique faceSymbol values")
        return self


class VisionDataset(BaseModel):
    schemaVersion: Literal["vision-scan-dataset-v1"]
    sessions: list[ScanSessionAnnotation] = Field(min_length=1)


def validate_dataset(data: object) -> VisionDataset:
    return VisionDataset.model_validate(data)


def load_dataset_file(path: str | Path) -> VisionDataset:
    return validate_dataset(json.loads(Path(path).read_text(encoding="utf-8")))


def validate_symbol(symbol: str) -> str:
    if symbol not in SCAN_SYMBOLS:
        raise ValueError("symbol must be one of U, R, F, D, L, B")
    return symbol
