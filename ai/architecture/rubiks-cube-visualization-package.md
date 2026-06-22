# Rubik's Cube Visualization Package

`@rubiks-cube-solver/rubiks-cube` is a private local workspace package under `packages/rubiks-cube`. It provides Three.js/web-component visualization code with subpath exports for cube view, cube 3D object, cube controller, cube notation constants, cube headless sticker state, and puzzle-specific visualization modules.

## Useful Later

- `@rubiks-cube-solver/rubiks-cube/view` can render a custom element.
- `@rubiks-cube-solver/rubiks-cube/three` can provide a Three.js object.
- `@rubiks-cube-solver/rubiks-cube/state` can provide headless sticker-state experiments and Kociemba string helpers.
- `@rubiks-cube-solver/rubiks-cube/core` can provide notation constants and parsing helpers.
- `@rubiks-cube-solver/rubiks-cube/puzzles/cube` can provide the cube visualization module barrel.
- `@rubiks-cube-solver/rubiks-cube/puzzles/pyraminx` can provide the Pyraminx visualization module barrel.

## Layout

- `src/puzzles/cube`: cube and cubic NxN visualization-specific code.
- `src/puzzles/pyraminx`: Pyraminx visualization-specific code.
- `src/shared`: visualization-only helpers such as animation styles, camera state, debouncing, and turn plans.

`src/shared` must not become a generic puzzle engine. Do not add universal puzzle state, universal move types, `BaseMove`, `BaseState`, `BasePuzzle`, or solver abstractions there.

## Not The Solver Core

- The package is JavaScript and rendering-oriented.
- The state model is sticker/Kociemba oriented, not the Rust solver engine representation.
- It depends on `three` and `gsap`, which are not appropriate for the Rust engine.
- It should not be used by `crates/cube-engine`.
- It must not define canonical puzzle semantics through a generic engine or base move abstraction.

## Integration Decision

Treat it as a visualization adapter around Rust API state, not as the canonical engine.

Each supported puzzle should own its notation helpers, visual state adapter, and renderer. Shared package utilities are limited to rendering infrastructure.
