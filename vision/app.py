from __future__ import annotations

from fastapi import FastAPI

from .detection import analyze_face
from .schemas import AnalyzeScanFaceRequest, AnalyzeScanFaceResponse


app = FastAPI(title="Rubik's Cube Vision Service")


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/analyze-face", response_model=AnalyzeScanFaceResponse)
def analyze_scan_face(request: AnalyzeScanFaceRequest) -> AnalyzeScanFaceResponse:
    return analyze_face(request)
