# Rubik's Cube Visualization Package

Local visualization package used by `@rubiks-cube-solver/web`.

It provides the custom element and rendering helpers for the web UI. It is not the solver core and must not become the source of truth for cube validation, search, or heuristics.

## Exports

| Subpath | Exports |
| --- | --- |
| `@rubiks-cube-solver/rubiks-cube/view` | `RubiksCubeElement`, `AttributeNames`, `PeekActions`, `PeekStates`, `AnimationStyles` |
| `@rubiks-cube-solver/rubiks-cube/core` | Movement, rotation, face, cube-type constants and helpers |
| `@rubiks-cube-solver/rubiks-cube/state` | Headless sticker-state helpers |
| `@rubiks-cube-solver/rubiks-cube/three` | Three.js cube object and settings |
| `@rubiks-cube-solver/rubiks-cube/controller` | State/view controller |
| `@rubiks-cube-solver/rubiks-cube/player` | Playback custom element |

## Development

- `npm run build:types -w @rubiks-cube-solver/rubiks-cube` generates declaration files into `types/`.
- `npm run test -w @rubiks-cube-solver/rubiks-cube` runs the copied package tests with Vitest.
- `npm run playground -w @rubiks-cube-solver/rubiks-cube` starts the local Vite playground.

Do not publish this package independently. It is a private workspace package owned by this repository.
