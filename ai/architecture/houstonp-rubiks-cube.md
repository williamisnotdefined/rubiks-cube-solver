# `@houstonp/rubiks-cube` Evaluation

`@houstonp/rubiks-cube` version `3.0.0` is a Three.js/web-component package with subpath exports for view, 3D object, controller, core notation constants, and headless sticker state.

## Useful Later

- `@houstonp/rubiks-cube/view` can render a custom element.
- `@houstonp/rubiks-cube/three` can provide a Three.js object.
- `@houstonp/rubiks-cube/state` can provide headless sticker-state experiments and Kociemba string helpers.
- `@houstonp/rubiks-cube/core` can provide notation constants and parsing helpers.

## Not The Solver Core

- The package is JavaScript and rendering-oriented.
- The state model is sticker/Kociemba oriented, not the Rust cubie representation required by the roadmap.
- It depends on `three` and `gsap`, which are not appropriate for the Rust engine.
- It should not be used by `crates/cube-engine`.

## Integration Decision

Defer installation until the frontend phase. If used, treat it as a visualization adapter or comparison tool around Rust/WASM state, not as the canonical engine.

## Observed Risk

In `RubiksCubeState.move`, the package appears to compute an `action` with `reverse` and `translate` options but then calls `GetMovementSlice(movement, ...)` with the original move. Verify this behavior before relying on headless move options.
