# Vision ML

This directory is the staging area for scanner datasets, training, evaluation, and ONNX export.

The CNN is an evidence source only. It may produce sticker probabilities and quality signals, but Rust scan inference and cube validation remain the final authority.

For the complete YOLO scanner runbook, including the Roboflow baseline, cloud setup, artifact transfer, links, metrics, and troubleshooting, see `vision_ml/SCANNER_YOLO_RUNBOOK.md`.

## Dataset Rules

- Keep private raw photos out of git.
- Store committed fixtures as small synthetic or redacted JSON only.
- Put local real images under ignored local paths, not under `vision_ml/fixtures`.
- Keep one session record per physical scan attempt.
- Keep corrected cube state only after human review or solver-validated acceptance.

## Schema

Dataset files use `schemaVersion: "vision-scan-dataset-v1"` and contain scan sessions with:

- `sessionId`
- `split`: `train`, `validation`, or `test`
- `consent`
- `correctedCubeState`
- per-face `faceSymbol`, `expectedTop`, `imagePath`, `imageSize`, `faceQuad`, `stickers`, and `qualityLabels`

Validate a dataset with:

```bash
python -m vision_ml.validate_dataset vision_ml/fixtures/sample_session.json
```

## Training Smoke Flow

Install training dependencies separately from the Vision runtime:

```bash
python -m pip install -r vision_ml/requirements.txt
```

Train a local checkpoint:

```bash
python -m vision_ml.train_cnn --dataset path/to/dataset.json --image-root path/to/images --epochs 5 --seed 0 --output vision_ml/outputs/sticker-cnn
```

Export ONNX for the optional Vision runtime loader:

```bash
python -m vision_ml.export_onnx --checkpoint vision_ml/outputs/sticker-cnn/sticker-cnn.pt --output vision_ml/outputs/sticker-cnn/model.onnx
```

Evaluate a checkpoint:

```bash
python -m vision_ml.evaluate_cnn --checkpoint vision_ml/outputs/sticker-cnn/sticker-cnn.pt --dataset path/to/dataset.json --image-root path/to/images --split validation
```

Run smoke tests:

```bash
python -m pytest vision_ml
```

## Local Tile Detector Flow

The live scanner uses an optional YOLO ONNX detector at `vision_ml/local-models/tile-detector.onnx`.
Model files, local scan sessions, generated YOLO datasets, and training runs stay out of git.

## What Needs Training

The scanner has one required model for the current live path and two optional historical/experimental models.

| Model | Required now | Runtime path | Purpose | Current status |
| --- | --- | --- | --- | --- |
| Tile detector | Yes | `vision_ml/local-models/tile-detector.onnx` | Find the 9 visible stickers and classify each sticker color. | Local smoke model exists, but it is not production-quality. |
| Sticker CNN | No | `vision_ml/local-models/sticker-cnn.onnx` | Classify 9 already-cropped sticker patches from a geometric grid. | Optional and currently not configured. |
| Face detector | No | `vision_ml/local-models/face-detector.onnx` | Locate the whole cube face before grid/color analysis. | Optional and currently not used by the tile-detector path. |

Do not train solver-search or cube-state ML for the scanner. The scanner model should only produce visual evidence. Cube validity and solving remain outside the vision model.

## Required Tile Detector Dataset

The tile detector should learn visual sticker locations, not memorize one desk/camera scene. A usable dataset should include:

- At least 150-300 labeled images before trusting live scanning. More is better.
- At least 20-50 captures per visible cube face color under the real webcam setup.
- Separate physical scan sessions for `train`, `validation`, and `test`; do not duplicate the same images across splits.
- All six colors represented as sticker classes: `U`/white, `R`/red, `F`/green, `D`/yellow, `L`/orange, `B`/blue.
- Optional whole-face class `face` or `cube face` only if it improves localization; do not let it dominate sticker training.
- Different distances, rotations, face positions, partial hand occlusion, glare, shadows, backgrounds, and cube tilts.
- Negative/background frames where no cube face is centered, so the detector learns not to label chairs, faces, shelves, or hands as stickers.
- Captures where the cube is too close, too far, partly outside the frame, blurry, or under glare, labeled or reserved for rejection tests.

The current local smoke dataset is far below that bar. It has 11 unique images and duplicates those images into validation. That is enough to prove the code path works, but not enough to prove live quality.

## Current Local Images And Labels

The current generated YOLO images and labels were not deleted. They are local ignored artifacts and currently live at:

| Path | Contents |
| --- | --- |
| `vision_ml/outputs/tile-yolo-local/images/` | 11 generated images in `train` and the same 11 in `validation`. |
| `vision_ml/outputs/tile-yolo-local/labels/` | 11 YOLO labels in `train` and the same 11 in `validation`, including `face` boxes plus sticker boxes. |
| `vision_ml/outputs/tile-yolo-local-stickers/images/` | 11 generated images in `train` and the same 11 in `validation`. |
| `vision_ml/outputs/tile-yolo-local-stickers/labels/` | 11 YOLO labels in `train` and the same 11 in `validation`, sticker boxes only. |
| `vision_ml/outputs/local-sessions/` | Local scan session JSON artifacts used to regenerate the YOLO images and labels. |

These folders are ignored by git because they can contain private webcam frames. If they are missing, regenerate the sticker-only dataset with:

```bash
npm run scan:tile-yolo-dataset
```

Do not treat the duplicated `validation` split as a real validation set. It is a local smoke-test split only.

## Roboflow COCO Baseline

The Roboflow `Rubiks Cube Colors.v2i.coco.zip` export is useful as an axis-aligned YOLO baseline before collecting enough local webcam sessions. It is licensed as CC BY 4.0 and contains six sticker color classes, but no `face` anchor class and no OBB labels.

Convert it with:

```bash
RUBIKS_ROBOFLOW_COCO_ZIP=/path/to/Rubiks\ Cube\ Colors.v2i.coco.zip npm run scan:tile-yolo-roboflow-dataset
```

Expected converted dataset shape for the v2 export:

| Split | Images | Boxes |
| --- | ---: | ---: |
| `train` | 3149 | 45150 |
| `validation` | 305 | 4355 |
| `test` | 150 | 2232 |

The converter maps Roboflow labels into runtime symbols: `w -> U`, `r -> R`, `g -> F`, `y -> D`, `o -> L`, and `b -> B`.

Train a local baseline detector with:

```bash
WANDB_DISABLED=true .venv/bin/yolo detect train model=yolo11n.pt data=vision_ml/outputs/tile-yolo-roboflow-v2/data.yaml imgsz=640 epochs=100 patience=25 batch=8 workers=2 device=0 project=$PWD/vision_ml/runs name=tile-detector-roboflow-v2 exist_ok=True seed=0 mosaic=0.2 mixup=0 copy_paste=0 degrees=10 translate=0.08 scale=0.25
```

Export and install the ignored local ONNX model with:

```bash
WANDB_DISABLED=true .venv/bin/yolo export model=vision_ml/runs/tile-detector-roboflow-v2/weights/best.pt format=onnx imgsz=640 opset=12 simplify=True
cp vision_ml/runs/tile-detector-roboflow-v2/weights/best.onnx vision_ml/local-models/tile-detector.onnx
```

Treat Roboflow metrics as a training signal, not product acceptance. The model still needs scanner validation against local webcam frames, temporal consensus, center matching, and background false positives.

## Why Bad Boxes Appear

If the UI shows boxes on the chair, hair, face, or background, the problem is model quality, not cube solving. The current local model is weak because:

- It was trained from only 11 unique images.
- Its validation split duplicates training images, so high validation metrics are optimistic.
- Labels were bootstrapped from older geometric/contour scan exports rather than a hand-reviewed detection dataset.
- It uses axis-aligned boxes, while real cube stickers are often rotated/perspective-skewed.
- It has almost no negative examples, so low-confidence background false positives can pass when the threshold is too low.
- A detector confidence around 0.30-0.40 on random background is not trustworthy. The runtime scan scripts use `RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE=0.5` so false boxes are hidden instead of treated as tiles.

Correct live behavior is either 9 plausible high-confidence sticker boxes arranged as a 3x3 grid, or no accepted face. Bad partial boxes should be treated as “collect more data/retrain,” not as a usable scan.

## Reference YOLO/OBB Repo

The `ThatLinuxGuyYouKnow/rubik-yolo` repo is useful as a reference because it trains YOLO OBB on oriented sticker boxes and color classes. Keep the checkout ignored and local:

Detailed notes from the Medium article and reference repo are preserved in `vision_ml/yolo_obb_rubiks_notes.md`.

```bash
mkdir -p vision_ml/references
git clone --depth 1 https://github.com/ThatLinuxGuyYouKnow/rubik-yolo vision_ml/references/rubik-yolo
```

That reference uses class names like `Blue`, `Green`, `Orange`, `Red`, `White`, `Yellow`, `cube face`, and `side_face`. Our runtime uses internal cube symbols, so map them as:

| Reference class | Runtime symbol |
| --- | --- |
| `Blue` | `B` |
| `Green` | `F` |
| `Orange` | `L` |
| `Red` | `R` |
| `White` | `U` |
| `Yellow` | `D` |
| `cube face` | `face` |
| `side_face` | `face` |

To experiment with a reference OBB export locally:

```bash
.venv/bin/yolo export model=vision_ml/references/rubik-yolo/best.pt format=onnx imgsz=640 opset=12 simplify=True
cp vision_ml/references/rubik-yolo/best.onnx vision_ml/local-models/tile-detector-obb.onnx
RUBIKS_VISION_TILE_DETECTOR_MODEL=vision_ml/local-models/tile-detector-obb.onnx \
RUBIKS_VISION_TILE_DETECTOR_CLASS_SYMBOLS=B,F,L,R,U,D,face,face \
RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE=0.5 \
npm run dev
```

Use the reference as a guide, not as a final dependency. It may detect some local frames better than our smoke model, but it still needs validation against our webcam, cube, UI crop, and required 9-sticker consensus behavior.

Keep any archived scan-session JSON artifacts in the ignored local session folder:

```bash
mkdir -p vision_ml/outputs/local-sessions
cp path/to/rubiks-scan-session-*.json vision_ml/outputs/local-sessions/
```

Regenerate the sticker-only YOLO dataset from those exports:

```bash
npm run scan:tile-yolo-dataset
```

Train and export a local YOLO detector:

```bash
.venv/bin/yolo detect train model=yolo11n.pt data=vision_ml/outputs/tile-yolo-local-stickers/data.yaml imgsz=640 epochs=300 patience=80 batch=4 device=0 project=$PWD/vision_ml/runs name=tile-detector-stickers-local exist_ok=True workers=2 mosaic=0 mixup=0 copy_paste=0 degrees=5 translate=0.05 scale=0.2
.venv/bin/yolo export model=vision_ml/runs/tile-detector-stickers-local/weights/best.pt format=onnx imgsz=640 opset=12 simplify=True
mkdir -p vision_ml/local-models
cp vision_ml/runs/tile-detector-stickers-local/weights/best.onnx vision_ml/local-models/tile-detector.onnx
```

Start the scanner flow with the tile detector enabled:

```bash
npm run dev:scan-ml
```

For tunnel development, use:

```bash
npm run tunnel:run:dev:scan-ml
```

The current local smoke dataset duplicates training images into validation. That confirms the runtime path and local fit, not real-world generalization. Before trusting metrics, collect more scan sessions and use a validation split with sessions not present in training.
