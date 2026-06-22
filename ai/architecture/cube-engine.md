# Cube Engine Architecture

The cube engine is the source of truth for puzzle state, moves, validation, search, and replay verification. It must stay independent from UI, scanner, and HTTP transport concerns.

## Modules

- `cube/*`: current 3x3 state, moves, notation, facelets, scrambles, and high-level cube API.
- `puzzles/cube2/*`: 2x2-specific state, moves, notation, solver, visual state, and quality reporting.
- `puzzle/*`: puzzle identities, metadata, input kinds, visualization kinds, and strategy registry.
- `search/*`: search, generated two-phase, pruning, and heuristic modules that consume puzzle state.

## State Model

The primary representation is cubie based:

- corner permutation
- corner orientation
- edge permutation
- edge orientation

Sticker strings, Kociemba strings, and visual states are adapter formats; they should not replace the core model.

## Multi-Puzzle Boundary

Additional puzzles should live in puzzle-specific modules with their own state, move model, notation parser, validation, search, heuristics, coordinates, and artifacts.

Do not add a generic puzzle engine, universal move type, universal state type, `BaseMove`, `BaseState`, `BasePuzzle`, or inheritance-style hierarchy. Shared Rust code should be limited to puzzle-neutral metadata, budgets, results, registries, compatibility checks, and artifact plumbing.

## Unsupported Behavior

Any unimplemented puzzle behavior must fail explicitly instead of pretending to mutate, validate, or solve a state.
