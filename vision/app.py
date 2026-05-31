from __future__ import annotations

from fastapi import FastAPI

from .cnn import cnn_health
from .detection import analyze_face
from .schemas import (
    AnalyzeScanFaceRequest,
    AnalyzeScanFaceResponse,
    AnalyzeScanSessionRequest,
    AnalyzeScanSessionResponse,
    VisionHealthResponse,
)
from .session import analyze_session


app = FastAPI(title="Rubik's Cube Vision Service")


@app.get("/health", response_model=VisionHealthResponse)
def health() -> VisionHealthResponse:
    return VisionHealthResponse(ok=True, **cnn_health())


@app.post("/analyze-face", response_model=AnalyzeScanFaceResponse)
def analyze_scan_face(request: AnalyzeScanFaceRequest) -> AnalyzeScanFaceResponse:
    return analyze_face(request)


@app.post("/analyze-session", response_model=AnalyzeScanSessionResponse)
def analyze_scan_session(request: AnalyzeScanSessionRequest) -> AnalyzeScanSessionResponse:
    return analyze_session(request)
