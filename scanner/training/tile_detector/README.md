# YOLO Tile Detector Training

The live scanner recognizes visible cube tiles with a YOLO ONNX detector. Training is local and artifact-based: datasets, `.pt` checkpoints, and exported `.onnx` files stay ignored by git.

## Inputs

The default input is the Git LFS-backed Roboflow COCO export at `scanner/datasets/roboflow/rubiks-cube-colors-v2.coco.zip`. It comes from <https://universe.roboflow.com/dhyan-thacker/rubiks-cube-colors>. Override it with `RUBIKS_ROBOFLOW_COCO_ZIP` when testing another export.

Roboflow COCO exports contain annotation files such as:

```txt
train/_annotations.coco.json
valid/_annotations.coco.json
test/_annotations.coco.json
```

Those files describe images, classes, and bounding boxes. Generated YOLO datasets still stay ignored under `scanner/outputs`.

## Pipeline

Use `scanner/training/SCANNER_YOLO_RUNBOOK.md` for the current command order and training/export/install workflow. The training command fine-tunes an Ultralytics YOLO model; the default base model is `yolo11n.pt`.

The runtime model is installed at:

```txt
scanner/models/tile-detector.onnx
```

## Outputs

The converter writes a YOLO dataset to:

```txt
scanner/outputs/tile-yolo-roboflow-v2/
```

Training writes checkpoints to:

```txt
scanner/runs/tile-detector-roboflow-v2/
```

The runtime loads only the installed ONNX file through `RUBIKS_VISION_TILE_DETECTOR_MODEL`.
