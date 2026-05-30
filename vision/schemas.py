from __future__ import annotations

from pydantic import BaseModel, Field


ScanFaceSymbol = str


class RgbColor(BaseModel):
    r: int = Field(ge=0, le=255)
    g: int = Field(ge=0, le=255)
    b: int = Field(ge=0, le=255)


class ImageSize(BaseModel):
    width: int = Field(ge=1)
    height: int = Field(ge=1)


class Point(BaseModel):
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)


class ScanColorAlternative(BaseModel):
    symbol: ScanFaceSymbol
    confidence: float = Field(ge=0.0, le=1.0)


class AnalyzedSticker(BaseModel):
    index: int = Field(ge=0, le=8)
    symbol: ScanFaceSymbol
    confidence: float = Field(ge=0.0, le=1.0)
    rgb: RgbColor
    polygon: list[Point]
    alternatives: list[ScanColorAlternative]


class AnalyzeScanFaceRequest(BaseModel):
    expectedCenter: ScanFaceSymbol
    image: str
    knownCenters: dict[ScanFaceSymbol, RgbColor] = Field(default_factory=dict)


class AnalyzeScanFaceResponse(BaseModel):
    ok: bool
    status: str
    message: str | None = None
    centerMismatch: bool = False
    detectedCenter: ScanFaceSymbol | None = None
    expectedCenter: ScanFaceSymbol | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    detectedCenterConfidence: float = Field(default=0.0, ge=0.0, le=1.0)
    faceConfidence: float = Field(default=0.0, ge=0.0, le=1.0)
    detectionMode: str | None = None
    imageSize: ImageSize | None = None
    faceQuad: list[Point] = Field(default_factory=list)
    stickers: list[AnalyzedSticker] = Field(default_factory=list)
    qualityWarnings: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
