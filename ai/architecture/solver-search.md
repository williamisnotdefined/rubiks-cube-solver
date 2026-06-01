# Solver Search Architecture

Search builds on top of a correct cube engine.

## Planned Layers

- Bounded IDA* for depth-limited deterministic search.
- Generated two-phase search for the current classical solver path.
- Pattern databases for fast admissible lower bounds.
- Learned value heuristics only after deterministic search and datasets exist.

## Boundaries

- Search functions should accept cube states and return move sequences plus metrics.
- Heuristics should be explicit about admissibility and input assumptions.
- Pattern database generation should be separated from runtime lookup.
