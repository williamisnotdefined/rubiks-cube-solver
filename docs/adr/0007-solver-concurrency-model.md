# ADR 0007: Solver Concurrency Model

Status: proposed

## Context

Solver searches are CPU-bound. Running expensive solves directly on async runtime workers can degrade health and unrelated API requests.

## Decision

Move long solve work to `spawn_blocking` or a dedicated bounded worker pool with a global solve semaphore, queue limits, request deadlines, cancellation behavior, and explicit overload responses.

## Consequences

- Health and readiness endpoints should remain responsive during expensive solve load.
- Saturation should return stable `429` or `503` errors.
- Load tests should cover concurrent solve traffic and API responsiveness.
