# Scanner Training

Offline tooling for scanner datasets, scan-session replay/evaluation, and YOLO tile-detector conversion. This package is not imported by the scanner runtime.

## Current Model

The live scanner uses the YOLO ONNX tile detector configured by `RUBIKS_VISION_TILE_DETECTOR_MODEL`, normally `scanner/models/tile-detector.onnx`.

The project no longer keeps scanner CNN or face-detector training code. Tile recognition is YOLO-only.

## Ownership

- Contracts live in `scanner/contracts` and stay free of FastAPI/OpenCV/Torch side effects.
- Runtime adapters live in `scanner/runtime` and must not import `scanner/training`.
- Training code may import `scanner/contracts` and write ignored local artifacts under `scanner/outputs`, `scanner/runs`, and `scanner/models`.
- Cube validity and solving remain Rust responsibilities.

## Commands

```bash
python -m pytest scanner/training
npm run scan:label
npm run scan:replay
npm run scan:evaluate
```

Use `scanner/training/SCANNER_YOLO_RUNBOOK.md` for the YOLO dataset, training, export, and install pipeline.

## Tile Training

Tile recognition is trained by fine-tuning an Ultralytics YOLO model. The current source Roboflow COCO export is tracked through Git LFS at `scanner/datasets/roboflow/rubiks-cube-colors-v2.coco.zip` and comes from <https://universe.roboflow.com/dhyan-thacker/rubiks-cube-colors>.

See `scanner/training/SCANNER_YOLO_RUNBOOK.md` for the concrete pipeline.

## Artifacts

Keep private captures, non-approved downloaded datasets, training runs, checkpoints, `.pt`, `.onnx`, and generated YOLO datasets out of git.

Ignored local paths:

- `scanner/outputs/`
- `scanner/runs/`
- `scanner/checkpoints/`
- `scanner/local-images/`
- `scanner/references/`
- `scanner/models/`

See `scanner/training/SCANNER_YOLO_RUNBOOK.md` for the YOLO workflow and artifact policy.
