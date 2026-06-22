from __future__ import annotations

from fastapi import FastAPI

from scanner.contracts.vision_api import (
    AnalyzeScanFaceRequest,
    AnalyzeScanFaceResponse,
    VisionHealthResponse,
)
from scanner.runtime.detectors.tile_yolo_onnx import tile_detector_health
from scanner.runtime.face_analysis import analyze_face


app = FastAPI(title="Rubik's Cube Scanner Runtime")


@app.get("/health", response_model=VisionHealthResponse)
def health() -> VisionHealthResponse:
    return VisionHealthResponse(ok=True, **tile_detector_health())


@app.post("/analyze-face", response_model=AnalyzeScanFaceResponse)
def analyze_scan_face(request: AnalyzeScanFaceRequest) -> AnalyzeScanFaceResponse:
    return analyze_face(request)
