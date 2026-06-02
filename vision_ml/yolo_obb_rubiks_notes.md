# YOLO OBB Rubik's Cube Scanner Notes

Source article: <https://medium.com/@alabiayobamioluwamiseun/teaching-yolo-to-see-a-rubiks-cube-oriented-bounding-boxes-data-collection-and-the-white-7f1a2b98c75b>

Reference repository: <https://github.com/ThatLinuxGuyYouKnow/rubik-yolo>

These notes preserve the article's engineering lessons in our own words so the scanner work does not depend on Medium being reachable. They are not a verbatim mirror of the article.

## Core Problem

Many camera-based Rubik's Cube scanners fail because they rely on static color thresholds, usually HSV ranges. That works only under controlled lighting. In real rooms, the same sticker can shift color because of glare, shadow, camera auto exposure, white walls, tinted lights, blur, and viewing angle.

The article's central claim is that the camera problem should be treated as object detection, not pure color thresholding. The detector should learn the visual concept of a Rubik's Cube sticker, including shape, boundaries, position on a cube face, and color, instead of classifying pixels by hue alone.

## Why YOLO

YOLO is useful for this scanner because it can detect multiple objects in one pass and is fast enough for live webcam use. The project in the article used YOLOv8 nano because it is lightweight and can run on modest hardware.

For our project, the important part is not the exact YOLO version. The important requirement is that the model must detect individual visible stickers and classify their colors while running fast enough for live preview.

## Required Labels

The article labels each visible cube sticker by color, plus a cube-face anchor class.

Classes used by the reference project:

- `Blue`
- `Green`
- `Orange`
- `Red`
- `White`
- `Yellow`
- `cube face`
- `side_face` exists in the reference `data.yaml`, but the article/repo notes indicate it is effectively redundant.

Mapping to our runtime symbols:

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

The `cube face` class should be used as an anchor. The model may still predict false stickers on backgrounds, but the runtime can reject sticker detections that do not overlap or sit inside the detected cube face.

## Data Collection Lesson

The article could not find a suitable public dataset and created a custom one. The reported training set had roughly 150 images from two cube variants, captured against diverse backgrounds.

The useful lesson is quality and diversity, not just count. The dataset should include deliberately difficult backgrounds and lighting because the model must learn that color alone is not enough.

Good examples to include:

- Cube in front of white walls.
- Cube in front of red/white cloth or other colored backgrounds.
- Cube near skin, hair, desk objects, shelves, chairs, and monitors.
- Strong glare on stickers.
- Washed-out yellow/white stickers.
- Low light.
- Tilted cube faces.
- Different cube distances.
- Different cube positions inside the frame.
- Partial hand occlusions.
- Multiple cube variants, especially cubes with black plastic, white plastic, and different sticker borders.

Bad dataset shape:

- Many near-identical frames from one camera pose.
- Validation images copied from training images.
- Only clean centered cube faces.
- No background confusion examples.
- Only one cube type.
- Labels generated automatically from old geometry without human review.

Our current local smoke dataset has only 11 unique images and duplicated validation images. It proves the code path works, but it is not enough to make live scanning reliable.

## Labeling Lesson

The article used Label Studio and manually labeled every clearly visible sticker. Some images required around 12 boxes: nine or more sticker boxes plus one or more face boxes.

The key labeling rule is: annotate visible sticker objects, not just the whole cube face.

For our tile detector, `images.zip` and `labels.zip` from the repository root are not sufficient because they contain one YOLO bbox per image with a single class. That dataset can help with a face detector, but it cannot train a sticker detector that needs per-sticker color labels.

Minimum useful tile detector label per image:

- One `cube face` label for the visible face, when possible.
- One label for each clearly visible sticker on that face.
- Additional labels for visible side stickers only if the training goal includes side-face detections.
- No labels for background regions, even if their color resembles a sticker.

## Why OBB Matters

The article's most important technical point is that regular YOLO detection boxes are axis-aligned, but cube stickers are often rotated or perspective-skewed in camera frames.

If rotated sticker labels are forced into regular axis-aligned boxes, the training boxes include extra background and neighboring stickers. That teaches a noisy target and can confuse the model.

OBB means oriented bounding boxes. OBB labels follow the actual sticker orientation. For a cube scanner, OBB is a better fit because the cube face is rarely perfectly square and aligned to the image axes.

Recommended direction for our serious tile detector:

- Use `yolov8n-obb.pt` or `yolo11n-obb.pt` as the base model.
- Store labels in YOLO OBB format, not regular detect format.
- Validate each label line has nine fields: class id plus four corner points.
- Export to ONNX after training.
- Keep runtime support for OBB-shaped ONNX outputs.

## Training Setup From The Reference

The reference repo uses an OBB model and conservative training settings suitable for limited hardware.

Representative training configuration:

```bash
yolo obb train \
  model=yolov8n-obb.pt \
  data=data.yaml \
  imgsz=640 \
  epochs=100 \
  batch=6 \
  workers=2 \
  mosaic=0 \
  mixup=0 \
  copy_paste=0 \
  degrees=15 \
  translate=0.1 \
  scale=0.3 \
  fliplr=0.5 \
  patience=15
```

The article reports early stopping after 87 epochs, with the best result around epoch 72 and a high mAP. The article also warns that the validation set was very small, so the metric is encouraging but not definitive.

For our project, treat small validation mAP as a smoke signal only. A model is useful only if it works in the live scanner with the real webcam, real cube, real background, and real UI framing.

## White Sticker Failure Mode

The article describes a specific issue: the model learned to detect white backgrounds as white stickers.

The likely cause was dataset bias. One cube variant had white plastic or white tile divisions, making white sticker boundaries hard to learn. The dataset had too few examples of the other cube variant where white stickers were more visually distinct. As a result, the model saw too little evidence that a white sticker must be bounded by cube/sticker structure and not just be any white region.

Lessons for our dataset:

- Include many white-sticker examples for every cube variant.
- Include white walls and white paper as backgrounds, unlabeled.
- Include white cube plastic and black cube plastic variants.
- Include glare on white and yellow stickers.
- Use the `cube face` class as grounding in the runtime.
- Reject white sticker predictions outside the detected cube face.

This directly matches our observed bad boxes: if the model is weak or the threshold is too low, it can label background, hair, chair, wall, or face regions as stickers.

## Runtime Grounding Lesson

The article notes that simply training with a `cube face` class did not automatically prevent false stickers outside the face. The model may predict a face and still predict background stickers.

The useful fix is programmatic grounding:

- Detect the cube face.
- Detect sticker/color boxes.
- Reject sticker boxes that do not overlap sufficiently with the cube face.
- Prefer exactly nine sticker boxes arranged as a plausible 3x3 grid.
- If there are fewer than nine plausible stickers, report “face not found” instead of filling the review grid with bad detections.

For our runtime, the face class is not just a UI overlay. It should become a filter before temporal consensus and before review-grid assignment.

## What Worked In The Article

- YOLO handled lighting and angle variation better than HSV thresholding.
- Diverse staging helped the model distinguish real stickers from background colors.
- OBB was necessary for angled cube/sticker geometry.
- The model was lightweight enough for live inference.

## What Did Not Fully Work

- `cube face` as a class did not automatically prevent off-face color false positives.
- White stickers were prone to background confusion when the dataset underrepresented hard white cases.
- A tiny validation set made the reported metric less trustworthy.

## What This Means For Our Next Detector

Our next serious detector should be an OBB model trained from a manually reviewed dataset.

Minimum practical plan:

1. Collect at least 150 images, preferably 300+.
2. Use Label Studio or CVAT with OBB/polygon labeling.
3. Label each visible sticker and the cube face.
4. Split by capture session, not by random near-duplicate frame.
5. Keep `train`, `validation`, and `test` physically separate.
6. Include hard negatives and confusing backgrounds.
7. Train YOLO OBB.
8. Export ONNX.
9. Map color class names to our internal symbols.
10. Filter sticker detections by `cube face` overlap in runtime.
11. Accept a scan only when temporal consensus sees nine stable stickers in a plausible 3x3 arrangement.

## Local Reference Checkout

Keep the reference repo as ignored local material:

```bash
mkdir -p vision_ml/references
git clone --depth 1 https://github.com/ThatLinuxGuyYouKnow/rubik-yolo vision_ml/references/rubik-yolo
```

The reference includes:

- `best.pt`: a trained OBB checkpoint.
- `yolov8n-obb.pt`: OBB base model.
- `data.yaml`: class layout.
- `main.py`: training/export example.
- `inference.py`: image/video/live inference example.
- `val/images` and `val/labels`: small validation examples.

This checkout should stay in `vision_ml/references/`, which is ignored by git.

## Useful Local Experiment

To test the reference checkpoint through our ONNX runtime path:

```bash
.venv/bin/yolo export \
  model=vision_ml/references/rubik-yolo/best.pt \
  format=onnx \
  imgsz=640 \
  opset=12 \
  simplify=True

cp vision_ml/references/rubik-yolo/best.onnx vision_ml/local-models/tile-detector-obb.onnx
```

Run with class mapping:

```bash
RUBIKS_VISION_TILE_DETECTOR_MODEL=vision_ml/local-models/tile-detector-obb.onnx \
RUBIKS_VISION_TILE_DETECTOR_CLASS_SYMBOLS=B,F,L,R,U,D,face,face \
RUBIKS_VISION_TILE_DETECTOR_CONFIDENCE=0.5 \
npm run dev
```

This is an experiment, not the final production path. The reference model should be validated against our webcam and scanner flow before becoming the default.

## Acceptance Criteria For A Good Tile Detector

A detector is not good enough just because it has high training mAP. For our app, it should satisfy runtime behavior:

- No boxes on hair, face, chair, wall, hands, or shelves at normal threshold.
- Nine stickers found on a centered visible cube face.
- Stable sticker boxes across consecutive frames.
- Center sticker class agrees with the requested face.
- Boxes fit inside the detected face region.
- White/yellow stickers remain robust under glare.
- Background white regions are rejected.
- The UI shows no scan rather than a bad scan when the cube is not visible.

## Immediate Conclusion

The article supports moving away from our emergency 11-image regular YOLO detector. The correct next step is a manually labeled OBB sticker dataset with face grounding, not more tuning of the current weak model.
