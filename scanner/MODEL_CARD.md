# Scanner Model Card

## Model Overview

The runtime scanner expects a local YOLO ONNX tile detector at:

```txt
scanner/models/tile-detector.onnx
```

The model file is a local artifact and must not be committed. It should be generated from the scanner training workflow and installed locally with the documented runbook.

## Intended Use

- Detect visible sticker tiles on a Rubik's Cube face from user-provided camera frames.
- Return tile boxes, color probabilities, confidence, and visual evidence to the product scan flow.
- Support reviewed sticker collection before Rust-side cube validation and solving.

## Non-Goals

- The model is not proof of a valid cube state.
- The model does not solve cubes.
- The model must not bypass Rust validation, typed API errors, or replay verification.
- The model is not intended for identity recognition, background surveillance, or analytics.

## Expected Runtime Contract

| Field | Current expectation |
| --- | --- |
| Framework | YOLO exported to ONNX Runtime. |
| ONNX opset | Documented in the model manifest for each installed model. |
| Input size | `640` unless explicitly overridden by manifest and environment. |
| Class order | Must match scanner contract color/tile semantics. |
| Confidence threshold | Default runtime value is `0.5`. |
| Runtime path | `scanner/runtime/detectors/tile_yolo_onnx.py`. |

## Quality Gates

Before promoting a detector, record these metrics against a fixed evaluation corpus:

| Metric | Gate |
| --- | --- |
| Per-class precision | Must be documented in the manifest. |
| Per-class recall | Must be documented in the manifest. |
| False accept rate | Must be measured on negative/background images. |
| False reject rate | Must be measured on valid cube face images. |
| Center mismatch behavior | Must request review or reject instead of silently accepting. |
| PyTorch vs ONNX parity | Must be within a documented tolerance. |

Evaluation should include low light, blur, glare, rotation, occlusion, multiple cubes, and unrelated objects.

## Privacy

Scanner inputs are processed in memory by default. Do not commit raw camera frames, local captures, generated datasets, model checkpoints, `.pt`, `.onnx`, training runs, or logs.

## Known Limitations

- Model confidence can be high for visually plausible but invalid sticker layouts.
- Lighting, glare, partial occlusion, and camera motion can degrade tile detection.
- The runtime currently relies on environment configuration plus the local model path; manifest enforcement is a follow-up implementation task.

## Required Manifest

Every promoted model should have a manifest matching `scanner/model-manifest.schema.json` and recording the model checksum, dataset checksum, class order, input size, opset, training command, dependency versions, metrics, and source commit.
