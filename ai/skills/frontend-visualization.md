# Frontend Visualization

Use this skill when adding the web UI, 3D cube visualization, playback, or frontend-to-API boundary.

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
- Keep solver behavior behind the Rust HTTP API.
- Keep client-facing solve flows notation-only; do not add facelet or Kociemba UI inputs.
- Evaluate visualization libraries as adapters, not engine replacements.
- If using `@houstonp/rubiks-cube`, verify headless move-option behavior before relying on it.
- Ensure desktop and mobile rendering are considered when UI exists, with the cube no larger than 350px by 350px.

## Expected Output

- UI sends moves and receives states.
- Browser clients never submit facelets to the API.
- Solver logic remains in Rust.
- External visualization code does not define canonical cube state.

## Verification

- Run frontend tests/build commands once an `apps/web` workspace exists.
- Run engine/API tests for any Rust solver behavior touched by UI work.
