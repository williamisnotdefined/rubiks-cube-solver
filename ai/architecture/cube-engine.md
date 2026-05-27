# Cube Engine Architecture

The cube engine is the first phase of the roadmap and must stay independent from UI, ML, and HTTP transport concerns.

## Modules

- `cube/cubies.rs`: cubie identifiers and primary cubie-state structure.
- `cube/moves.rs`: face move and turn definitions.
- `cube/notation.rs`: Singmaster notation parsing and formatting.
- `cube/scramble.rs`: scramble parsing and inversion utilities.
- `cube/state.rs`: high-level cube API over cubie state.
- `search/*`: search and heuristic modules that consume cube state.

## State Model

The primary representation is cubie based:

- corner permutation
- corner orientation
- edge permutation
- edge orientation

Sticker strings, Kociemba strings, and visual states can be adapters later, but they should not replace the core model.

## Bootstrap Boundary

The initial crate may expose API skeletons before move tables are complete. Any unimplemented behavior must fail explicitly instead of pretending to mutate cube state.
