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
python -m pip install -r scanner/training/requirements.txt
python -m pytest scanner/training
npm run scan:label
npm run scan:replay
npm run scan:evaluate
npm run scan:tile-yolo-roboflow-dataset
npm run scan:tile-yolo-check
npm run scan:tile-yolo-train
npm run scan:tile-yolo-export
npm run scan:tile-yolo-install
```

## Tile Training

Tile recognition is trained by fine-tuning an Ultralytics YOLO model. The default base model is `yolo11n.pt`, which Ultralytics can download locally if it is not already present.

The source annotations are not committed. For Roboflow COCO exports, `_annotations.coco.json` lives inside the local export zip under split folders such as `train/`, `valid/`, and `test/`. The converter writes a YOLO dataset under `scanner/outputs/` with `data.yaml`, `images/`, and `labels/`.

See `scanner/training/tile_detector/README.md` for the concrete pipeline.

## Artifacts

Keep private captures, downloaded datasets, training runs, checkpoints, `.pt`, `.onnx`, and generated YOLO datasets out of git.

Ignored local paths:

- `scanner/outputs/`
- `scanner/runs/`
- `scanner/checkpoints/`
- `scanner/local-images/`
- `scanner/references/`
- `scanner/models/`

See `scanner/training/SCANNER_YOLO_RUNBOOK.md` for the YOLO workflow.
