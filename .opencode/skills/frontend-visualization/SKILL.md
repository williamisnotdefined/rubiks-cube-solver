---
name: "frontend-visualization"
description: "Use when adding the future web UI, 3D cube visualization, playback, or frontend-to-WASM boundary."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/frontend-visualization.md`.

Referenced context:
- `../../../ai/rules/frontend-rules.md`
- `../../../ai/architecture/project-architecture.md`
- `../../../ai/architecture/frontend-visualization.md`
- `../../../ai/architecture/houstonp-rubiks-cube.md`
- `../../../ai/glossary/cube-terms.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-visualization

## Canonical Skill: `ai/skills/frontend-visualization.md`

# Frontend Visualization

Use this skill when adding the future web UI, 3D cube visualization, playback, or frontend-to-WASM boundary.

## Goal

Build a visualization layer that renders cube state and controls playback without owning solver logic.

## Read First

- `ai/rules/frontend-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/frontend-visualization.md`
- `ai/architecture/houstonp-rubiks-cube.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Confirm the task belongs to the frontend phase before adding frontend dependencies.
- Keep solver behavior behind Rust/WASM APIs.
- Evaluate visualization libraries as adapters, not engine replacements.
- If using `@houstonp/rubiks-cube`, verify headless move-option behavior before relying on it.
- Ensure desktop and mobile rendering are considered when UI exists.

## Expected Output

- UI sends moves and receives states.
- Solver logic remains in Rust.
- External visualization code does not define canonical cube state.

## Verification

- Run frontend tests/build commands once an `apps/web` workspace exists.
- Run engine tests for any Rust/WASM behavior touched by UI work.

# Referenced Context

## Reference: `ai/rules/frontend-rules.md`

# Frontend Rules

Rules for the future web visualization phase.

## Always

- Keep cube logic out of React components.
- Treat the frontend as a renderer and controller that sends moves and receives states.
- Use the Rust/WASM boundary as the source of truth for solver behavior once available.
- Keep playback and visualization state separate from solver state.
- Evaluate visualization-only libraries by whether they preserve this boundary.

## Never

- Do not implement solver algorithms in the frontend.
- Do not make a Three.js/web-component sticker state the canonical engine state.
- Do not introduce frontend dependencies during engine-only phases.

## External Library Note

- `@houstonp/rubiks-cube` is acceptable as a future visualization or comparison tool, not as the Rust solver core.

## Reference: `ai/architecture/project-architecture.md`

# Project Architecture

The final target is a hybrid Rubik's Cube solver with a Rust engine, search algorithms, heuristics, pattern databases, optional ML heuristics, WebAssembly integration, and a modern web visualization.

## Current Bootstrap

- `crates/cube-engine`: Rust crate for cube representation, moves, notation, scramble handling, search, and heuristics.
- `ai`: canonical AI knowledge base and route generation system.
- `roadmap.md`: source roadmap and implementation order.

## Future Boundaries

- `crates/wasm`: future wasm-bindgen bridge around the Rust engine.
- `apps/web`: future TypeScript React visualization and playback UI.
- `datasets`: future generated training datasets.
- `ml`: future Python/PyTorch training code.

## Ownership

- Cube state, moves, validation, search, and heuristics belong in Rust.
- Frontend code should only render, send moves, receive states, and play animations.
- ML code should consume generated datasets and expose learned heuristics only after deterministic search is correct.

## Reference: `ai/architecture/frontend-visualization.md`

# Frontend Visualization Architecture

The frontend is a later phase. It should not become the source of truth for cube logic.

## Future Stack

- TypeScript
- React
- React Three Fiber or a vetted Three.js abstraction
- Zustand only when shared local UI state needs it
- Vite

## Boundary

The frontend sends moves and receives states from the Rust/WASM engine. Rendering, playback, camera controls, and interaction state can live in the frontend. Cube validation, solver behavior, search, and heuristics stay in Rust.

## Visualization Libraries

Visualization-only libraries can be used if they do not own the solver state. They should adapt to engine output rather than define engine behavior.

## Reference: `ai/architecture/houstonp-rubiks-cube.md`

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

## Reference: `ai/glossary/cube-terms.md`

# Cube Terms

## Cubie

A physical movable piece of the cube. The core engine tracks cubies rather than face colors as the primary model.

## Corner

A cubie with three stickers. A 3x3 cube has eight corners.

## Edge

A cubie with two stickers. A 3x3 cube has twelve edges.

## Permutation

Which cubie occupies each position.

## Orientation

How a cubie is twisted or flipped in its current position.

## Move

A face turn such as `R`, `U`, `R'`, or `U2`.

## Scramble

A sequence of moves applied from the solved state to produce a valid cube state.

## Heuristic

An estimate of distance from a cube state to the solved state.

## Admissible Heuristic

A heuristic that never overestimates the true distance to the solved state.

## Pattern Database

A precomputed lookup table mapping partial cube states to minimum solution distances.

## Kociemba String

A facelet string format commonly used by two-phase solvers. It can be an adapter format, not the primary engine model.
