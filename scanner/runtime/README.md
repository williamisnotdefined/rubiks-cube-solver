# Scanner Runtime

FastAPI service for camera-based scan preview. The Rust API proxies `/scan/analyze-face` to this service; final scan solve uses reviewed stickers in Rust.

## Active Path

```txt
Web scanner -> Rust API -> scanner runtime -> optional YOLO ONNX tile detector
```

The active detector is configured with `RUBIKS_VISION_TILE_DETECTOR_MODEL`, normally `scanner/models/tile-detector.onnx`. The runtime is YOLO-only; it does not load a sticker CNN, face detector, or color-classifier fallback.

## Commands

```bash
npm run vision:install
npm run vision:dev
npm run vision:test
```

Runtime dependencies are in `scanner/runtime/requirements.txt`. Test-only dependency `pytest` is in `scanner/requirements-test.txt`.
