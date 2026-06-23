# ADR 0005: Generated Artifact Compatibility

Status: accepted

## Context

Generated pruning tables and pattern databases affect search behavior and may be corrupt, stale, or built for incompatible puzzle profiles.

## Decision

Generated artifacts must be validated before search against metadata such as puzzle ID, state encoding, move metric, coordinate profile, format version, byte length, and checksum.

## Consequences

- Missing, corrupt, or incompatible artifacts produce typed unavailable/corrupt errors.
- Generated artifacts stay local unless explicitly approved for source control.
- CI should test corrupt and incompatible artifact rejection paths.
