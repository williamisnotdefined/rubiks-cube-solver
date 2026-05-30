# Vision Service

Local OpenCV service for camera-based cube face analysis.

## Setup

```bash
python -m pip install -r vision/requirements.txt
```

## Run

```bash
npm run vision:dev
```

The Rust API proxies scan analysis to `http://127.0.0.1:8790` by default. Override with `RUBIKS_VISION_URL` when needed.

## Test

```bash
npm run vision:test
```
