# ADR 0004: Scanner-To-Rust Trust Boundary

Status: accepted

## Context

The scanner uses YOLO/ONNX to infer tile evidence from camera frames. Model predictions can be wrong or ambiguous.

## Decision

Scanner output is evidence only. Rust validation and solving remain authoritative for reviewed cube states.

## Consequences

- Scanner responses should preserve confidence and ambiguity evidence.
- Invalid or impossible reviewed states must be rejected by Rust.
- Raw camera content should not be logged or committed.
