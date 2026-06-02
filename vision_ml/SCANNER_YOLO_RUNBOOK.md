# Scanner YOLO Runbook

This runbook documents the Rubik's Cube scanner YOLO workflow used to train, export, install, and validate the live sticker detector. It is intended for moving the project to another PC, a cloud VM, or a production-like runtime without losing the operational context.

## Goal

The live scanner should accept a scanned cube only when the visual evidence is reliable. The YOLO detector is not the source of cube truth. It only finds visible stickers and classifies sticker colors. Cube validity, final state acceptance, solving, and replay verification remain outside the vision model.

Primary product rule: prefer rescan or manual correction over accepting a wrong cube state.

## Current Detector Path

The current scanner runtime uses an ONNX YOLO detector at:

```text
vision_ml/local-models/tile-detector.onnx
```

This file is local and ignored by git. If the model is missing on a new machine, either copy it from a trusted artifact store or rebuild it from the dataset and commands below.

## What We Built

During the Roboflow baseline run, we did the following:

1. Inspected `/home/wozzp/Downloads/Rubiks Cube Colors.v2i.coco.zip`.
2. Confirmed it is a Roboflow COCO export with six sticker color classes.
3. Converted it to a YOLO dataset at `vision_ml/outputs/tile-yolo-roboflow-v2`.
4. Trained `YOLO11n` with Ultralytics.
5. Exported the best checkpoint to ONNX.
6. Installed the exported ONNX model as `vision_ml/local-models/tile-detector.onnx`.
7. Verified the vision and vision ML test suites still pass.
8. Verified the ONNX detector loads and returns zero detections on a blank image.

## Dataset Used

Local source file used for this run:

```text
/home/wozzp/Downloads/Rubiks Cube Colors.v2i.coco.zip
```

Dataset metadata:

| Item | Value |
| --- | ---: |
| Source | Roboflow export |
| Format | COCO bbox detection |
| License | CC BY 4.0 |
| Images | 3604 |
| Boxes | 51737 |
| Image size | 640x640 |
| Classes | `b`, `g`, `o`, `r`, `w`, `y` |
| OBB labels | No |
| `face` class | No usable examples |

Converted split summary:

| Split | Images | Boxes |
| --- | ---: | ---: |
| `train` | 3149 | 45150 |
| `validation` | 305 | 4355 |
| `test` | 150 | 2232 |

Class mapping used by `vision_ml.tile_yolo_dataset`:

| Dataset label | Runtime symbol | Meaning |
| --- | --- | --- |
| `w` | `U` | White/up color |
| `r` | `R` | Red/right color |
| `g` | `F` | Green/front color |
| `y` | `D` | Yellow/down color |
| `o` | `L` | Orange/left color |
| `b` | `B` | Blue/back color |

The generated YOLO dataset uses this class list:

```yaml
names:
  0: face
  1: U
  2: R
  3: F
  4: D
  5: L
  6: B
```

The `face` class is kept for compatibility with the current runtime and future datasets, but the Roboflow baseline has `face: 0` boxes.

## Training Environment Used

This was the local environment used for the baseline training run:

| Item | Value |
| --- | --- |
| OS | Linux |
| Python | 3.14.5 |
| Ultralytics | 8.4.59 |
| Torch | 2.12.0+cu130 |
| CUDA | Available |
| GPU | NVIDIA GeForce RTX 3070 Ti Laptop GPU |
| GPU memory | 8 GB |
| Model | YOLO11n |
| Training time | About 1.98 hours |

Training result:

| Metric | Value |
| --- | ---: |
| Best epoch | 50 |
| Early stopping epoch | 75 |
| `mAP50` | 0.989 |
| `mAP50-95` | 0.767 |
| ONNX size | About 10.12 MB |

Per-class final validation summary:

| Class | Precision | Recall | mAP50 | mAP50-95 |
| --- | ---: | ---: | ---: | ---: |
| `U` | 0.984 | 0.984 | 0.990 | 0.771 |
| `R` | 0.980 | 0.976 | 0.988 | 0.760 |
| `F` | 0.982 | 0.999 | 0.988 | 0.771 |
| `D` | 0.978 | 0.981 | 0.991 | 0.788 |
| `L` | 0.975 | 0.977 | 0.986 | 0.760 |
| `B` | 0.987 | 0.995 | 0.988 | 0.755 |

Treat these as dataset metrics, not product acceptance. Product acceptance depends on real scanner behavior: correct center, 9 stickers, stable temporal consensus, no background false positives, and no wrong accepted cube states.

## Git And Artifact Rules

Do not commit raw camera captures, downloaded datasets, generated datasets, training runs, model checkpoints, or ONNX exports.

Ignored artifact paths include:

```text
vision_ml/outputs/
vision_ml/runs/
vision_ml/checkpoints/
vision_ml/local-images/
vision_ml/references/
archive/
archive.zip
*.coco.zip
*.pt
*.onnx
*.onnx.data
```

The local `archive/test/images` folder is part of the downloaded/exported image material and should stay ignored through the `archive/` rule.

Commit only source code, tests, small synthetic fixtures, and documentation.

## External References

Primary references:

| Resource | URL | Usefulness |
| --- | --- | --- |
| Medium YOLO OBB article | `https://medium.com/@alabiayobamioluwamiseun/teaching-yolo-to-see-a-rubiks-cube-oriented-bounding-boxes-data-collection-and-the-white-7f1a2b98c75b` | Explains OBB data collection and the high reported YOLO result. |
| YORO / rubik-yolo repo | `https://github.com/ThatLinuxGuyYouKnow/rubik-yolo` | Reference YOLO OBB project for sticker and face detection. |
| Roboflow Rubiks Cube Colors dataset | `https://universe.roboflow.com/dhyan-thacker/rubiks-cube-colors` | Source of the COCO baseline dataset used here. |
| Roboflow | `https://roboflow.com` | Dataset export, annotation, and hosted CV tooling. |
| CC BY 4.0 | `https://creativecommons.org/licenses/by/4.0/` | License for the Roboflow dataset export. |
| Ultralytics docs | `https://docs.ultralytics.com` | YOLO training, validation, export, and prediction docs. |

Additional references inspected:

| Resource | URL | Notes |
| --- | --- | --- |
| Eyeeco Rubick-s-Cube-Dataset | `https://github.com/eyeeco/Rubick-s-Cube-Dataset` | Useful for color-block recognition context, not a direct scanner detector replacement. |
| Eyeeco paper | `https://arxiv.org/pdf/1901.03470.pdf` | Related color recognition paper. |
| SAS Rubik classification project | `https://github.com/sascommunities/iot-image-classification-rubiks-cubes` | Image classification example, not sticker detection. |
| AIcrowd orientation challenge | `https://www.aicrowd.com/challenges/kiit-ai-mini-blitz/problems/orient-rubiks-cube` | Cube orientation regression, not sticker detection. |
| Ultralytics hosted model | `https://platform.ultralytics.com/yogendra-singh-2/rubik-cube-detection/rubik-cube-detection-best` | Generic Rubik cube detection model reference. |
| Ultralytics hosted dataset | `https://platform.ultralytics.com/yogendra-singh-2/datasets/cube-dataset` | Hosted cube dataset reference. |

## Local Runtime Setup

Use this when the model already exists and you only need to run the scanner locally.

```bash
git clone <repo-url>
cd rubiks-cube-solver
npm install
npm run vision:install
mkdir -p vision_ml/local-models
cp /path/to/tile-detector.onnx vision_ml/local-models/tile-detector.onnx
npm run dev:scan-ml
```

Runtime environment variables used by `npm run dev:scan-ml`:

```bash
RUBIKS_VISION_TILE_DETECTOR_MODEL=vision_ml/local-models/tile-detector.onnx
RUBIKS_VISION_TILE_DETECTOR_INPUT_SIZE=640
RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE=0.5
```

If you run services manually, make sure the Vision service sees the same detector variables.

## Local Training Setup

Use this when the model does not exist or should be retrained.

Install dependencies:

```bash
npm install
npm run vision:install
.venv/bin/python -m pip install -r vision_ml/requirements.txt
.venv/bin/python -m pip install "ultralytics>=8.3"
```

Confirm GPU access if training locally:

```bash
nvidia-smi
.venv/bin/python - <<'PY'
import torch
print(torch.__version__)
print(torch.cuda.is_available())
if torch.cuda.is_available():
    print(torch.cuda.get_device_name(0))
PY
```

Convert the Roboflow COCO ZIP to YOLO:

```bash
RUBIKS_ROBOFLOW_COCO_ZIP="/path/to/Rubiks Cube Colors.v2i.coco.zip" npm run scan:tile-yolo-roboflow-dataset
```

Expected report:

```json
{
  "images": 3604,
  "boxes": 51737,
  "imagesBySplit": {
    "train": 3149,
    "validation": 305,
    "test": 150
  },
  "boxesBySplit": {
    "train": 45150,
    "validation": 4355,
    "test": 2232
  },
  "boxesByClass": {
    "face": 0,
    "U": 8632,
    "R": 8539,
    "F": 8538,
    "D": 8528,
    "L": 8869,
    "B": 8631
  }
}
```

Train the baseline detector:

```bash
WANDB_DISABLED=true .venv/bin/yolo detect train model=yolo11n.pt data=vision_ml/outputs/tile-yolo-roboflow-v2/data.yaml imgsz=640 epochs=100 patience=25 batch=8 workers=2 device=0 project=$PWD/vision_ml/runs name=tile-detector-roboflow-v2 exist_ok=True seed=0 mosaic=0.2 mixup=0 copy_paste=0 degrees=10 translate=0.08 scale=0.25
```

Export ONNX:

```bash
WANDB_DISABLED=true .venv/bin/yolo export model=vision_ml/runs/tile-detector-roboflow-v2/weights/best.pt format=onnx imgsz=640 opset=12 simplify=True
```

Install the local scanner model:

```bash
mkdir -p vision_ml/local-models
cp vision_ml/runs/tile-detector-roboflow-v2/weights/best.onnx vision_ml/local-models/tile-detector.onnx
```

Run the scanner:

```bash
npm run dev:scan-ml
```

## Cloud Runtime Setup

Use this when deploying a runtime service that should use an already trained ONNX model.

Cloud runtime requirements:

| Requirement | Purpose |
| --- | --- |
| Node.js and npm | Web build and scripts |
| Rust toolchain | Native API and pruning table generation |
| Python | Vision service |
| `vision/requirements.txt` | FastAPI, OpenCV, ONNX Runtime, runtime dependencies |
| `vision_ml/local-models/tile-detector.onnx` | Live scanner tile detector |

Recommended runtime artifact transfer:

```text
vision_ml/local-models/tile-detector.onnx
```

Do not rely on git to transfer the model. Use object storage, release artifacts, a deployment secret volume, or a private artifact registry.

Runtime commands depend on deployment style, but the Vision service must start with:

```bash
RUBIKS_VISION_TILE_DETECTOR_MODEL=vision_ml/local-models/tile-detector.onnx \
RUBIKS_VISION_TILE_DETECTOR_INPUT_SIZE=640 \
RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE=0.5 \
npm run vision:start
```

For the existing tunnel development flow:

```bash
npm run tunnel:run:dev:scan-ml
```

## Cloud Training Setup

Use this when the cloud VM will train the detector.

Cloud training requirements:

| Requirement | Purpose |
| --- | --- |
| NVIDIA GPU | Practical YOLO training |
| CUDA-compatible Torch | GPU acceleration |
| Ultralytics | YOLO train/export CLI |
| Dataset ZIP | Roboflow COCO source or local labeled dataset |
| Persistent disk | `vision_ml/outputs` and `vision_ml/runs` |

Training on CPU is possible but not recommended for this dataset. If no GPU is available, prefer copying a trained ONNX model instead.

## ONNX Smoke Test

Run this after copying or exporting a model:

```bash
RUBIKS_VISION_TILE_DETECTOR_MODEL=vision_ml/local-models/tile-detector.onnx \
RUBIKS_VISION_TILE_DETECTOR_INPUT_SIZE=640 \
RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE=0.5 \
.venv/bin/python - <<'PY'
from pathlib import Path
import numpy as np
from vision.tile_detector import VisionTileDetector, tile_detector_health

model = Path('vision_ml/local-models/tile-detector.onnx')
detector = VisionTileDetector(model, input_size=640, confidence_threshold=0.5)
print(f'model_size_mb={model.stat().st_size / 1024 / 1024:.2f}')
print(tile_detector_health(detector))
print(f'blank_detections={len(detector.detect(np.zeros((640, 640, 3), dtype=np.uint8)))}')
PY
```

Expected result for this trained baseline:

```text
model_size_mb=10.12
{'tileDetectorAvailable': True, 'tileDetectorConfigured': True, 'tileDetectorReason': None}
blank_detections=0
```

## Verification Commands

Run these after documentation or detector pipeline changes:

```bash
npm run vision:test
npm run vision-ml:test
```

Useful git checks:

```bash
git status --short
git check-ignore -v archive/test/images
git check-ignore -v archive.zip
git check-ignore -v vision_ml/local-models/tile-detector.onnx
```

Expected result: local image archives and model artifacts are ignored and do not appear as files to commit.

## Manual Scanner Acceptance Checklist

Run:

```bash
npm run dev:scan-ml
```

For each face in the scan flow, check:

| Check | Expected behavior |
| --- | --- |
| Sticker count | Finds 9 plausible stickers when the cube face is visible and centered. |
| Center | Center color matches the face requested by the UI. |
| Consensus | Temporal consensus reaches `6/6` when the cube is held steady. |
| Background | No boxes on hair, face, chair, wall, shelf, or hands. |
| Ambiguous colors | Red/orange and white/yellow are improved versus the smoke model. |
| Rejection | Bad frames should reject or request rescan, not accept a wrong state. |

If the UI says `Face green`, the center sticker facing the camera must actually be green. A white/logo center during a green-face step should not auto-accept.

## Threshold Tuning

Default detector threshold:

```bash
RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE=0.5
```

Use this guidance:

| Symptom | Action |
| --- | --- |
| Boxes appear on background objects | Try `0.6` or collect negative examples and retrain. |
| Only 1-3 stickers appear on a good centered face | Try `0.45`, improve lighting, or fine-tune on local webcam images. |
| Correct boxes flicker frame to frame | Improve lighting, hold cube steadier, or add local training data. |
| Consensus stays `0/6` | Check center color, sticker count, temporal stability, and face requested by UI. |
| mAP is high but live scanning is bad | Dataset does not match the real webcam scene; collect local data. |

## Local Scan Exports And Fine-Tuning

The Roboflow baseline is a starting point. The strongest next step is collecting local webcam examples from the real scanner UI.

If you already have archived scan-session JSON files, place them in the local session folder:

```bash
mkdir -p vision_ml/outputs/local-sessions
cp path/to/rubiks-scan-session-*.json vision_ml/outputs/local-sessions/
```

Generate a local sticker-only YOLO dataset:

```bash
npm run scan:tile-yolo-dataset
```

Train or fine-tune a local detector:

```bash
.venv/bin/yolo detect train model=vision_ml/runs/tile-detector-roboflow-v2/weights/best.pt data=vision_ml/outputs/tile-yolo-local-stickers/data.yaml imgsz=640 epochs=300 patience=80 batch=4 device=0 project=$PWD/vision_ml/runs name=tile-detector-stickers-local exist_ok=True workers=2 mosaic=0 mixup=0 copy_paste=0 degrees=5 translate=0.05 scale=0.2
```

Export and install:

```bash
.venv/bin/yolo export model=vision_ml/runs/tile-detector-stickers-local/weights/best.pt format=onnx imgsz=640 opset=12 simplify=True
cp vision_ml/runs/tile-detector-stickers-local/weights/best.onnx vision_ml/local-models/tile-detector.onnx
```

Do not trust duplicated validation images. For real evaluation, keep physical scan sessions separated across train, validation, and test.

## OBB Direction

The Medium article and YORO reference use oriented bounding boxes. OBB can help when stickers are tilted or perspective-skewed, but it is a larger runtime change.

Do not switch to OBB just because the metric looks better. Switch only if the axis-aligned baseline still fails real scanner behavior after local data collection.

OBB migration requires:

| Requirement | Why |
| --- | --- |
| OBB or polygon labels | Axis-aligned COCO boxes are not enough. |
| Runtime OBB output parsing | Current scanner consumes normalized `x`, `y`, `width`, `height`. |
| Updated assignment logic | Sticker indexing and 3x3 ordering may need oriented geometry. |
| Product validation | OBB still must pass center, consensus, and no-wrong-accept gates. |

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `tileDetectorAvailable: false` | ONNX path missing or ONNX Runtime cannot load model. | Check `RUBIKS_VISION_TILE_DETECTOR_MODEL` and run the ONNX smoke test. |
| `tile_detector_model_not_configured` | Env var not set for the Vision process. | Use `npm run dev:scan-ml` or set detector env vars manually. |
| Boxes on background | Threshold too low or no negative examples. | Try threshold `0.6`, collect local negatives, retrain. |
| `1/9 stickers found` | Model does not generalize, threshold too high, poor lighting, or cube is not centered. | Improve capture conditions, try `0.45`, collect local examples. |
| `consensus 0/6` | Not enough stable high-confidence frames or wrong requested center. | Hold cube steady and ensure the face center matches the UI step. |
| White/yellow confusion | Lighting and glare. | Improve light, avoid glare, collect more local examples. |
| Red/orange confusion | Similar hues under webcam lighting. | Add local examples under real lighting and fine-tune. |
| Good mAP but poor UI results | Validation set differs from real webcam/product flow. | Evaluate through the scanner, not only YOLO metrics. |

## Related Repository Files

| File | Purpose |
| --- | --- |
| `vision/tile_detector.py` | Loads ONNX YOLO output and converts detections to runtime tile boxes. |
| `vision/detection.py` | Runs face analysis and integrates tile detections. |
| `vision/schemas.py` | Vision API response schema for detections and scan analysis. |
| `vision_ml/tile_yolo_dataset.py` | Converts COCO/LabelMe tile labels to YOLO format. |
| `vision_ml/scan_export_tile_yolo_dataset.py` | Converts reviewed scanner exports into YOLO sticker labels. |
| `vision_ml/evaluate_scan_sessions.py` | Measures scanner export quality and wrong accepts. |
| `apps/web/src/pages/SolvePage/ScanCameraFrame.tsx` | Draws live detection boxes in the scanner UI. |
| `apps/web/src/pages/SolvePage/scanTileDetections.ts` | Filters and assigns tile detections into a 3x3 face. |
| `apps/web/src/pages/SolvePage/scanTemporalConsensus.ts` | Applies temporal consensus gates before auto-capture. |
| `package.json` | Contains scanner, dataset, test, and tunnel scripts. |

## Final Rule

A better detector is useful only if it lowers wrong accepted cube states. If the model is uncertain, the scanner should ask for rescan or manual correction.
