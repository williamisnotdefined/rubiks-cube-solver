# Rubik's Cube Visualization Package

Local visualization package used by `@rubiks-cube-solver/web`.

It provides custom elements and rendering helpers for the web UI. It is not the solver core and must not become the source of truth for cube validation, search, or heuristics.

The package is TypeScript source-only. Workspace consumers import `.ts` source exports directly; `build:types` runs TypeScript validation with `noEmit` instead of generating a `types/` directory.

## Source Layout

Puzzle-specific code lives under `src/puzzles/<puzzle>`.

Current puzzle modules:

- `src/puzzles/cube`: Rubik's Cube and cubic NxN visualization code, including cube notation helpers, sticker-state adapters, Three.js objects, custom element, controller, and player.
- `src/puzzles/pyraminx`: Pyraminx notation helpers, sticker-state adapters, Three.js object, and custom element.
- `src/shared`: visualization-only helpers such as camera state, animation style constants, debouncing, and turn plans.

`src/shared` must stay puzzle-neutral and rendering-oriented. It must not contain a generic puzzle engine, universal puzzle state, universal move type, `BaseMove`, `BaseState`, or common solver model.

## Exports

| Subpath | Exports |
| --- | --- |
| `@rubiks-cube-solver/rubiks-cube/view` | `RubiksCubeElement`, `AttributeNames`, `PeekActions`, `PeekStates`, `AnimationStyles` |
| `@rubiks-cube-solver/rubiks-cube/core` | Movement, rotation, face, cube-type constants and helpers |
| `@rubiks-cube-solver/rubiks-cube/state` | Headless sticker-state helpers |
| `@rubiks-cube-solver/rubiks-cube/three` | Three.js cube object and settings |
| `@rubiks-cube-solver/rubiks-cube/controller` | State/view controller |
| `@rubiks-cube-solver/rubiks-cube/player` | Playback custom element |
| `@rubiks-cube-solver/rubiks-cube/puzzles/cube` | Cube puzzle module barrel |
| `@rubiks-cube-solver/rubiks-cube/puzzles/pyraminx` | Pyraminx puzzle module barrel |
| `@rubiks-cube-solver/rubiks-cube/pyraminx` | Pyraminx custom element, 3D object, notation, and sticker-state helpers |

## Custom Elements

`<rubiks-cube>` is the native NxN cube renderer used for current cube visualization and playback.

`<pyraminx-puzzle>` is the Pyraminx renderer. It uses Pyraminx-specific notation, sticker state, geometry,
and 120-degree vertex turns instead of cube `CubeType`, Kociemba, or slice moves.

## Boundaries

- Solver behavior, cube validation, search, and heuristics stay in Rust.
- This package may render notation and playback state, but it must not decide whether a state is valid or solved for product purposes.
- Kociemba/sticker strings are adapter details for visualization only.
- Each puzzle owns its own move notation, visual state adapter, and renderer. Do not introduce a generic engine, universal move abstraction, `BaseMove`, or shared puzzle state in this package.

## Development

- `npm run check -w @rubiks-cube-solver/rubiks-cube` runs Biome checks.
- `npm run lint -w @rubiks-cube-solver/rubiks-cube` runs Biome lint with warnings treated as errors.
- `npm run build:types -w @rubiks-cube-solver/rubiks-cube` runs TypeScript validation.
- `npm run test -w @rubiks-cube-solver/rubiks-cube` runs Vitest.
- `npm run test:coverage -w @rubiks-cube-solver/rubiks-cube` runs Vitest with V8 coverage and global 95% thresholds for statements, branches, functions, and lines.
- `npm run playground -w @rubiks-cube-solver/rubiks-cube` starts the local Vite playground.

Do not publish this package independently. It is a private workspace package owned by this repository.
