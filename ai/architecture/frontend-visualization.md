# Frontend Visualization Architecture

The frontend is a later phase. It should not become the source of truth for cube logic.

## Future Stack

- TypeScript
- React
- React Three Fiber or a vetted Three.js abstraction
- Zustand only when shared local UI state needs it
- Vite

## Boundary

The frontend sends move notation and receives states from the Rust HTTP API. Rendering, playback, camera controls, and interaction state can live in the frontend. Cube validation, solver behavior, search, and heuristics stay in Rust.

Facelet/Kociemba strings are internal adapter details only. They must not appear as UI copy, input modes, or client-submitted API payloads. If a visualization library requires a sticker string, keep that detail hidden behind a neutral rendering-state field.

The visible cube must fit within a 350px by 350px box on desktop and mobile.

## Visualization Libraries

Visualization-only libraries can be used if they do not own the solver state. They should adapt to engine output rather than define engine behavior.
