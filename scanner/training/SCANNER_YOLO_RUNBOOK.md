# Scanner YOLO Runbook

## Current Baseline

Active live scanner model path:

```txt
scanner/models/tile-detector.onnx
```

Current runtime path:

```txt
Web scanner -> Rust API -> scanner runtime -> YOLO ONNX tile detector -> tileDetections -> temporal consensus -> reviewed stickers -> Rust validation/solve
```

The scanner runtime is YOLO-only. It does not use a sticker CNN, face detector, or color-classifier fallback.

## Quick Commands

```bash
npm run dev:local:prepare
npm run scan:tile-yolo-install-deps
npm run scan:tile-yolo-roboflow-dataset
npm run scan:tile-yolo-check
npm run scan:tile-yolo-train
npm run scan:tile-yolo-export
npm run scan:tile-yolo-install
```

The local prepare command builds the non-Docker fallback runtime artifacts and converts the dataset when needed. Scanner training stays explicit; run `npm run dev:local:prepare -- --train-scanner` to train, export, and install the ONNX model as part of preparation.

The dependency command installs CPU-only Torch by default, then Ultralytics and ONNX export helpers. Override `RUBIKS_PYTHON` if you want to install into a specific virtual environment. Use `npm run scan:tile-yolo-install-deps -- --torch cu128` for an explicit CUDA Torch install, or `--torch skip` when Torch is already managed externally.

The training wrapper above runs the same Ultralytics commands shown below. It fine-tunes the YOLO base model configured by `RUBIKS_TILE_YOLO_BASE_MODEL`, defaulting to `yolo11n.pt`:

```bash
WANDB_DISABLED=true .venv/bin/yolo detect train model=yolo11n.pt data=scanner/outputs/tile-yolo-roboflow-v2/data.yaml imgsz=640 epochs=100 patience=25 batch=8 workers=2 device=0 project=$PWD/scanner/runs name=tile-detector-roboflow-v2 exist_ok=True seed=0 mosaic=0.2 mixup=0 copy_paste=0 degrees=10 translate=0.08 scale=0.25
WANDB_DISABLED=true .venv/bin/yolo export model=scanner/runs/tile-detector-roboflow-v2/weights/best.pt format=onnx imgsz=640 opset=12 simplify=True
mkdir -p scanner/models
cp scanner/runs/tile-detector-roboflow-v2/weights/best.onnx scanner/models/tile-detector.onnx
```

Run the full local stack with the exported detector:

```bash
npm run dev
```

## Dataset Conversion

Roboflow COCO conversion:

```bash
npm run scan:tile-yolo-roboflow-dataset
```

The default source export is the Git LFS-backed `scanner/datasets/roboflow/rubiks-cube-colors-v2.coco.zip`, downloaded from the Roboflow Universe Rubik's Cube Colors project: <https://universe.roboflow.com/dhyan-thacker/rubiks-cube-colors>. Override it with `RUBIKS_ROBOFLOW_COCO_ZIP=/path/to/export.zip` when testing another Roboflow export.

Roboflow COCO exports contain `_annotations.coco.json` inside each split folder, usually `train/`, `valid/`, and `test/`. The converter reads the COCO boxes and writes YOLO labels to `scanner/outputs/tile-yolo-roboflow-v2/labels/`.

## Artifact Rules

Do not commit model files, local camera captures, generated YOLO datasets, training runs, or references. The current Roboflow source export is the explicit exception and is tracked through Git LFS under `scanner/datasets/roboflow`. Use ignored local paths under `scanner/outputs`, `scanner/runs`, `scanner/models`, and `scanner/references` for generated artifacts.

## Runtime Files

| Path | Role |
| --- | --- |
| `scanner/runtime/detectors/tile_yolo_onnx.py` | Loads ONNX YOLO output and converts detections to runtime tile boxes. |
| `scanner/runtime/face_analysis.py` | Runs `/analyze-face` and returns `tileDetections`. |
| `scanner/contracts/vision_api.py` | Stable FastAPI/Rust/Web JSON contracts. |
| `scanner/training/tile_detector/yolo_dataset.py` | Converts COCO/LabelMe tile labels to YOLO format. |
| `scanner/training/scan_sessions/evaluate.py` | Measures scanner export quality and wrong accepts. |

## Quality Bar

Bad boxes on backgrounds are model-quality issues, not cube-solving issues. Treat a detector as usable only when it reliably returns nine plausible high-confidence sticker boxes arranged as a grid across local webcam sessions, with separate validation sessions and negative/background examples.
