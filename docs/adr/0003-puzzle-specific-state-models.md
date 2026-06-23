# ADR 0003: Puzzle-Specific State Models

Status: accepted

## Context

The repository includes stable, experimental, and catalog-only puzzles. A generic puzzle abstraction would hide puzzle-specific validation and solving rules.

## Decision

Each supported puzzle owns its state model, move representation, notation parser, validator, replay verifier, solver strategy, heuristics, and artifact compatibility rules.

## Consequences

- Do not add universal `BasePuzzle`, `BaseState`, `BaseMove`, or inheritance-style puzzle engines.
- Shared code is limited to metadata, budgets, API shapes, compatibility checks, and visualization adapter selection.
- Catalog-only puzzle metadata is not a solver commitment.
