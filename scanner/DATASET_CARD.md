# Scanner Dataset Card

## Dataset Overview

The approved source dataset is the Roboflow Universe Rubik's Cube Colors COCO export tracked through Git LFS:

```txt
scanner/datasets/roboflow/rubiks-cube-colors-v2.coco.zip
```

Source project: <https://universe.roboflow.com/dhyan-thacker/rubiks-cube-colors>.

Generated YOLO datasets under `scanner/outputs/` are local artifacts and must not be committed.

## Intended Use

- Train and evaluate a YOLO tile detector for scanner runtime evidence.
- Validate class ordering, tile detection quality, and negative/background behavior.
- Produce an ONNX model for local runtime use after review.

## Non-Goals

- The dataset does not define cube validity.
- The dataset is not a substitute for Rust-side state validation.
- The dataset should not contain private camera captures unless there is explicit consent and retention approval.

## Splits And Reproducibility

The Roboflow COCO export usually contains `train/`, `valid/`, and `test/` split folders with `_annotations.coco.json` files. Conversion to YOLO format is performed by:

```bash
npm run scan:tile-yolo-roboflow-dataset
```

Training should use deterministic seeds where supported. The current runbook uses `seed=0`.

## Label Semantics

The detector should preserve the class order used by the scanner runtime contract. Any class-order change requires a new model manifest and runtime compatibility review.

## Required Dataset Metadata

Each promoted model should document:

| Field | Requirement |
| --- | --- |
| Source dataset | Roboflow project/export or approved replacement. |
| Dataset license | License from source dataset provider. |
| Dataset checksum | SHA-256 of the source archive used for training. |
| Split methodology | Source split names and deterministic seed when generated locally. |
| Label/class order | Exact class order consumed by runtime. |
| Training command | Full command and hyperparameters. |
| Evaluation corpus | Fixed positive, negative, and hard-case samples. |

## Privacy And Retention

Do not commit local captures, user-provided images, generated datasets, training runs, checkpoints, `.pt`, `.onnx`, or logs. Keep local artifacts under ignored paths such as `scanner/outputs/`, `scanner/runs/`, `scanner/models/`, and `scanner/references/`.
