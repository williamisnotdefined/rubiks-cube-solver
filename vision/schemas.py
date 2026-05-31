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


class ColorProbabilities(BaseModel):
    U: float = Field(ge=0.0, le=1.0)
    R: float = Field(ge=0.0, le=1.0)
    F: float = Field(ge=0.0, le=1.0)
    D: float = Field(ge=0.0, le=1.0)
    L: float = Field(ge=0.0, le=1.0)
    B: float = Field(ge=0.0, le=1.0)


class StickerQuality(BaseModel):
    colorVariance: float = Field(ge=0.0)
    glareRatio: float = Field(ge=0.0, le=1.0)
    shadowRatio: float = Field(ge=0.0, le=1.0)
    margin: float = Field(ge=0.0, le=1.0)


class ImageQuality(BaseModel):
    blurScore: float = Field(ge=0.0)
    meanLuminance: float = Field(ge=0.0, le=255.0)
    glareRatio: float = Field(ge=0.0, le=1.0)
    shadowRatio: float = Field(ge=0.0, le=1.0)


class AnalyzedSticker(BaseModel):
    index: int = Field(ge=0, le=8)
    symbol: ScanFaceSymbol
    confidence: float = Field(ge=0.0, le=1.0)
    rgb: RgbColor
    polygon: list[Point]
    alternatives: list[ScanColorAlternative]
    probabilities: ColorProbabilities | None = None
    quality: StickerQuality | None = None


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
    imageQuality: ImageQuality | None = None
    faceQuad: list[Point] = Field(default_factory=list)
    stickers: list[AnalyzedSticker] = Field(default_factory=list)
    qualityWarnings: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ScanSessionFaceRequest(BaseModel):
    symbol: ScanFaceSymbol
    expectedTop: ScanFaceSymbol | None = None
    image: str
    manualOverrides: dict[int, ScanFaceSymbol] = Field(default_factory=dict)
    clientRotation: int | None = None


class AnalyzeScanSessionRequest(BaseModel):
    faces: list[ScanSessionFaceRequest]


class AnalyzedSessionFace(BaseModel):
    symbol: ScanFaceSymbol
    expectedTop: ScanFaceSymbol | None = None
    analysis: AnalyzeScanFaceResponse


class AnalyzeScanSessionResponse(BaseModel):
    ok: bool
    status: str
    message: str | None = None
    faces: list[AnalyzedSessionFace] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
