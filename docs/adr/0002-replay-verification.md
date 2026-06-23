# ADR 0002: Replay Verification Gate

Status: accepted

## Context

Search strategies may fail, hit limits, or return candidate move sequences from generated artifacts.

## Decision

No successful solution is exposed unless replaying the returned moves from the requested state reaches solved state.

## Consequences

- Replay failure is an error, not a successful response.
- Tests must cover replay success and replay rejection paths.
- API and UI copy must not imply correctness without `replayVerified=true`.
