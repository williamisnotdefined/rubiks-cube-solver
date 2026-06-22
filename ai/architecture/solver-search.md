# Solver Search Architecture

Search builds on top of a correct cube engine.

## Current Layers

- Bounded IDA* for depth-limited deterministic search.
- Generated two-phase search for the current classical 3x3 solver path.
- Pattern databases for fast admissible lower bounds where implemented.
- Solver portfolios for comparing deterministic strategies within explicit budgets.

## Boundaries

- Search functions should accept cube states and return move sequences plus metrics.
- Heuristics should be explicit about admissibility and input assumptions.
- Pattern database generation should be separated from runtime lookup.
