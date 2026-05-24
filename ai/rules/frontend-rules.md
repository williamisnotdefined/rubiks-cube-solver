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
