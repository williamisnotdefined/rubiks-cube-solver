# Solver Search Architecture

Search builds on top of a correct cube engine.

## Planned Layers

- BFS for shallow correctness checks and baseline behavior.
- IDDFS for bounded depth exploration.
- A* for heuristic search concepts and validation.
- IDA* as the main memory-efficient optimal search path.
- Pattern databases for fast admissible lower bounds.
- Learned value heuristics only after deterministic search and datasets exist.

## Boundaries

- Search functions should accept cube states and return move sequences plus metrics.
- Heuristics should be explicit about admissibility and input assumptions.
- Pattern database generation should be separated from runtime lookup.
