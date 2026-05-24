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
