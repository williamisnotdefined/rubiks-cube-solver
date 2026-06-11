# Rubik's Cube Visualization Package

Local visualization and replay package used by `@rubiks-cube-solver/web`.

It provides custom elements and rendering helpers for the web UI. It is not the solver core and must not become the source of truth for cube validation, search, or heuristics.

The package is TypeScript source-only. Workspace consumers import `.ts` source exports directly; `build:types` runs TypeScript validation with `noEmit` instead of generating a `types/` directory.

## Exports

| Subpath | Exports |
| --- | --- |
| `@rubiks-cube-solver/rubiks-cube/view` | `RubiksCubeElement`, `AttributeNames`, `PeekActions`, `PeekStates`, `AnimationStyles` |
| `@rubiks-cube-solver/rubiks-cube/core` | Movement, rotation, face, cube-type constants and helpers |
| `@rubiks-cube-solver/rubiks-cube/state` | Headless sticker-state helpers |
| `@rubiks-cube-solver/rubiks-cube/three` | Three.js cube object and settings |
| `@rubiks-cube-solver/rubiks-cube/controller` | State/view controller |
| `@rubiks-cube-solver/rubiks-cube/player` | Playback custom element |
| `@rubiks-cube-solver/rubiks-cube/puzzle` | `TwistyPuzzleElement`, puzzle catalog helpers, and replay support flags |

## Custom Elements

`<rubiks-cube>` is the native NxN cube renderer used for current cube visualization and playback.

`<twisty-puzzle>` is a `cubing`-backed replay element for non-cube and big-cube timer events. It lazy-loads `cubing/twisty`, so the large replay dependency stays outside the default web bundle until a supported replay is rendered.

## Boundaries

- Solver behavior, cube validation, search, and heuristics stay in Rust.
- This package may render notation and playback state, but it must not decide whether a state is valid or solved for product purposes.
- Kociemba/sticker strings are adapter details for visualization only.
- Multi-puzzle replay should go through `<twisty-puzzle>` unless the native NxN renderer explicitly supports the puzzle.

## Development

- `npm run check -w @rubiks-cube-solver/rubiks-cube` runs Biome checks.
- `npm run lint -w @rubiks-cube-solver/rubiks-cube` runs Biome lint with warnings treated as errors.
- `npm run build:types -w @rubiks-cube-solver/rubiks-cube` runs TypeScript validation.
- `npm run test -w @rubiks-cube-solver/rubiks-cube` runs Vitest.
- `npm run test:coverage -w @rubiks-cube-solver/rubiks-cube` runs Vitest with V8 coverage and global 95% thresholds for statements, branches, functions, and lines.
- `npm run playground -w @rubiks-cube-solver/rubiks-cube` starts the local Vite playground.

Do not publish this package independently. It is a private workspace package owned by this repository.
