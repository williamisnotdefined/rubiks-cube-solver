# YOLO Tile Detector Training

The live scanner recognizes visible cube tiles with a YOLO ONNX detector. Training is local and artifact-based: datasets, `.pt` checkpoints, and exported `.onnx` files stay ignored by git.

## Inputs

The supported default input is a Roboflow COCO export zip passed through `RUBIKS_ROBOFLOW_COCO_ZIP`.

Roboflow COCO exports contain annotation files such as:

```txt
train/_annotations.coco.json
valid/_annotations.coco.json
test/_annotations.coco.json
```

Those files describe images, classes, and bounding boxes. They are not committed to this repository.

## Pipeline

```bash
RUBIKS_ROBOFLOW_COCO_ZIP=/path/to/export.zip npm run scan:tile-yolo-roboflow-dataset
npm run scan:tile-yolo-check
npm run scan:tile-yolo-train
npm run scan:tile-yolo-export
npm run scan:tile-yolo-install
```

The training command fine-tunes an Ultralytics YOLO model. The default base model is `yolo11n.pt`.

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
