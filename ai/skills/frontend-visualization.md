# Frontend Visualization

Use this skill when adding the web UI, 3D cube visualization, playback, or frontend-to-API boundary.

## Goal

Build a visualization layer that renders cube state and controls playback without owning solver logic.

## Read First

- `ai/rules/frontend-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/rules/frontend-state-rules.md`
- `ai/rules/frontend-api-hook-rules.md`
- `ai/rules/frontend-form-rules.md`
- `ai/rules/frontend-styling-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/frontend-visualization.md`
- `ai/architecture/houstonp-rubiks-cube.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Confirm the task belongs to the frontend phase before adding frontend dependencies.
- Keep solver behavior behind the Rust HTTP API.
- Keep client-facing solve flows notation-only; do not add facelet or Kociemba UI inputs.
- Keep API request/response code and React Query hooks in `apps/web/src/api`, with React components focused on interaction and rendering.
- Keep API load state, solve result state, form input state, and visualization playback state separately owned.
- Extract React components only when reuse, naming clarity, or state boundaries justify the new file.
- Keep `App.tsx` thin and move page composition, page-specific components, hooks, helpers, and CSS under the owning page folder as UI grows.
- Use focused hooks for imperative custom-element synchronization instead of broad page effects.
- Use the current Tailwind CSS v4 stack and `classnames` conventions for visual work.
- Keep reusable context-independent helpers under `apps/web/src/core` and import them directly.
- Add one Storybook story per component when component surfaces are introduced or changed.
- Evaluate visualization libraries as adapters, not engine replacements.
- If using `@houstonp/rubiks-cube`, verify headless move-option behavior before relying on it.
- Ensure desktop and mobile rendering are considered when UI exists, with the cube no larger than 350px by 350px.

## Expected Output

- UI sends moves and receives states.
- Browser clients never submit facelets to the API.
- Solver logic remains in Rust.
- Request details stay behind the frontend API-client boundary.
- UI state has a clear nearest owner and is not copied into broad mutable stores without need.
- External visualization code does not define canonical cube state.
- Screen files read as composition instead of accumulating all form, result, validation, and visualization details.
- Components consume domain API hooks instead of raw request functions or query keys.
- Component stories and Vitest coverage protect changed frontend surfaces.

## Verification

- Run `npm run build` after TypeScript, React, or API-client changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run `npm run test -w @rubiks-cube-solver/web` and `npm run test:coverage -w @rubiks-cube-solver/web` after broad frontend changes.
- Run `npm run storybook:build -w @rubiks-cube-solver/web` after story changes.
- Run engine/API tests for any Rust solver behavior touched by UI work.
