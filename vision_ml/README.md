# Vision ML

This directory is the staging area for scanner datasets, training, evaluation, and ONNX export.

The CNN is an evidence source only. It may produce sticker probabilities and quality signals, but Rust scan inference and cube validation remain the final authority.

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
