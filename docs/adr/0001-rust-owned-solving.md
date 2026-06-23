# ADR 0001: Rust-Owned Solving

Status: accepted

## Context

Solver correctness depends on consistent puzzle state, notation, validation, search, heuristics, pruning artifacts, and replay verification.

## Decision

Rust owns solving and validation. Frontend and scanner code are adapters and must not implement production solver logic.

## Consequences

- Rust tests are the authority for solver behavior.
- API and web changes must preserve Rust-owned validation.
- Browser-local solving requires a future explicit product decision.
