# Frontend Rules

Rules for the future web visualization phase.

## Always

- Keep cube logic out of React components.
- Treat the frontend as a renderer and controller that sends move notation and receives states.
- Use the Rust HTTP API as the source of truth for solver behavior.
- Keep playback and visualization state separate from solver state.
- Evaluate visualization-only libraries by whether they preserve this boundary.
- Keep the rendered 3x3 cube no larger than 350px by 350px in the web UI.

## Never

- Do not implement solver algorithms in the frontend.
- Do not make a Three.js/web-component sticker state the canonical engine state.
- Do not expose facelets, Kociemba strings, or facelet input modes in the UI.
- Do not make browser clients submit facelets to the API; client-facing solve requests use move notation only.
- Do not introduce frontend dependencies during engine-only phases.

## External Library Note

- `@houstonp/rubiks-cube` is acceptable as a future visualization or comparison tool, not as the Rust solver core.
