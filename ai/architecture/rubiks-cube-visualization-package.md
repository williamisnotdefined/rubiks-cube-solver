# Rubik's Cube Visualization Package

`@rubiks-cube-solver/rubiks-cube` is a private local workspace package under `packages/rubiks-cube`. It provides Three.js/web-component visualization code with subpath exports for view, 3D object, controller, core notation constants, and headless sticker state.

## Useful Later

- `@rubiks-cube-solver/rubiks-cube/view` can render a custom element.
- `@rubiks-cube-solver/rubiks-cube/three` can provide a Three.js object.
- `@rubiks-cube-solver/rubiks-cube/state` can provide headless sticker-state experiments and Kociemba string helpers.
- `@rubiks-cube-solver/rubiks-cube/core` can provide notation constants and parsing helpers.

## Not The Solver Core

- The package is JavaScript and rendering-oriented.
- The state model is sticker/Kociemba oriented, not the Rust cubie representation required by the roadmap.
- It depends on `three` and `gsap`, which are not appropriate for the Rust engine.
- It should not be used by `crates/cube-engine`.

## Integration Decision

Treat it as a visualization adapter around Rust API state, not as the canonical engine.

## Observed Risk

In `RubiksCubeState.move`, the package appears to compute an `action` with `reverse` and `translate` options but then calls `GetMovementSlice(movement, ...)` with the original move. Verify this behavior before relying on headless move options.
