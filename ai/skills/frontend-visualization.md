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
