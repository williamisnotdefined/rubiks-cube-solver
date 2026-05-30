---
name: "frontend-visualization"
description: "Use when adding the web UI, 3D cube visualization, playback, or frontend-to-API boundary."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/frontend-visualization.md`.

Referenced context:
- `../../../ai/rules/frontend-rules.md`
- `../../../ai/rules/frontend-component-rules.md`
- `../../../ai/rules/frontend-state-rules.md`
- `../../../ai/rules/frontend-api-hook-rules.md`
- `../../../ai/rules/frontend-form-rules.md`
- `../../../ai/rules/frontend-styling-rules.md`
- `../../../ai/architecture/project-architecture.md`
- `../../../ai/architecture/frontend-visualization.md`
- `../../../ai/architecture/houstonp-rubiks-cube.md`
- `../../../ai/glossary/cube-terms.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-visualization

## Canonical Skill: `ai/skills/frontend-visualization.md`

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
- Keep `App.tsx` thin and move page composition, page-specific components, hooks, and helpers under the owning page folder as UI grows.
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

# Referenced Context

## Reference: `ai/rules/frontend-rules.md`

# Frontend Rules

Rules for the web visualization and frontend-to-API boundary.

## Always

- Keep cube logic out of React components.
- Treat the frontend as a renderer and controller that sends move notation and receives states.
- Use the Rust HTTP API as the source of truth for solver behavior.
- Keep playback and visualization state separate from solver state.
- Evaluate visualization-only libraries by whether they preserve this boundary.
- Keep the rendered 3x3 cube no larger than 350px by 350px in the web UI.
- Keep API request and response normalization in `apps/web/src/api`, not inline in React components.
- Keep request functions free of React imports; React Query hooks are the UI-facing API boundary.
- Use React Query for API health, strategy metadata, solve mutations, and future server-state operations.
- Keep server/API load state, solve result state, form input state, and visualization playback state separately owned.
- Lift local UI state only to the nearest component that consumes it.
- Extract React components only when UI repeats or a named component makes ownership and composition clearer.
- Keep one-off UI inline when extraction would add indirection without reuse or state-boundary value.
- Keep route or screen files readable as composition; `App.tsx` should stay thin as the UI grows.
- Keep page-specific components, hooks, and helpers under the owning page folder until reused elsewhere.
- Keep shared reusable components under `apps/web/src/components` only after there is a real shared consumer.
- Prefer explicit props and children for reusable layout wrappers.
- Use lightweight local validation for simple solve controls; add a form library only when current form complexity requires it.
- Use Tailwind utility classes for styling; do not create component, page, feature, or global CSS files.

## Never

- Do not implement solver algorithms in the frontend.
- Do not make a Three.js/web-component sticker state the canonical engine state.
- Do not expose facelets, Kociemba strings, or facelet input modes in the UI.
- Do not add or import `.css` files outside the single Tailwind entrypoint `apps/web/src/index.css`.
- Do not make browser clients submit facelets to the API; client-facing solve requests use move notation only.
- Do not copy API data into broad mutable stores just to pass it through the UI.
- Do not introduce Zustand, React Hook Form, Zod, React Router, Tailwind, or Storybook conventions unless the dependency exists and current UI complexity justifies it.
- Do not turn a large component into a hidden god hook or god provider.
- Do not import raw request functions into UI once a project-level hook/client boundary exists for that operation.
- Do not import query keys or raw request functions into React components.
- Do not add styling or state-management dependencies to solve organization problems that focused components, hooks, and files can solve.

## External Library Note

- `@houstonp/rubiks-cube` is acceptable as a visualization or comparison tool, not as the Rust solver core.

## Verification

- Run `npm run build` after TypeScript, React, or API-client changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run API or engine tests too when UI changes require Rust contract changes.

## Reference: `ai/rules/frontend-component-rules.md`

# Frontend Component Rules

Rules for React component boundaries in `apps/web`.

## Always

- Keep route or screen files readable as composition.
- Extract components when UI repeats or a named component clarifies ownership, state boundaries, or screen structure.
- Keep one-off UI inline when extraction only adds indirection.
- Keep page-level screens under `apps/web/src/pages`.
- Keep page-specific components, hooks, and helpers under the owning page folder until reused elsewhere.
- Keep shared reusable components under `apps/web/src/components` only after there is a real shared consumer.
- Keep visualization-specific components and hooks near the owning visualization feature unless reused.
- Keep context-independent helpers in focused `apps/web/src/core/<category>/<name>.ts` files, not inside React components.
- Import core helpers from direct file paths; do not add `src/core` barrels.
- Keep React component props explicit and small.
- Prefer `children` for layout wrappers such as panels, shells, and result regions.
- Extract focused hooks for repeated or stateful UI behavior, but do not hide an oversized component in a single oversized hook.
- Keep new or substantially changed React component files at or below 400 lines where practical.
- Keep Storybook stories in a `stories/` child folder beside the source area they cover.
- Use one primary story export per component and expose prop variation through controls instead of one story per prop.

## Never

- Do not turn every extraction into a broad component library.
- Do not move page, cube, solver, API, or visualization-specific helpers into shared utilities before reuse exists.
- Do not let `App.tsx`, page files, or hooks become god modules.
- Do not fix a god component by moving all state and effects into a god provider or god hook.
- Do not create React Context for mutable UI state.
- Do not render short fixed control groups through artificial arrays when direct JSX is clearer.
- Do not mix cube validation, search, or solver behavior into React components.
- Do not place component stories in a shared fixtures folder; reserve shared story data for `src/stories` if it exists.

## Data-Driven Rendering

- Use arrays and `.map()` for API data, dynamic collections, long repeated groups, or lists whose members are not all known at author time.
- Render items directly when the UI is a short fixed set of product controls.

## Verification

- Ensure extracted components do not change user-visible behavior.
- Run `npm run build` after TypeScript or React component moves.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run `npm run storybook:build -w @rubiks-cube-solver/web` after adding or changing stories.

## Reference: `ai/rules/frontend-state-rules.md`

# Frontend State Rules

Rules for client-side state ownership in `apps/web`.

## Always

- Classify state as API load state, solve result state, form state, visualization state, page workflow state, or component-only UI state before moving it.
- Keep API request details and response normalization in `apps/web/src/api`.
- Use React Query as the owner for API health, strategy metadata, solve mutation state, and future server-state operations.
- Keep API load state separate from solve result state.
- Keep form input state separate from visualization playback state.
- Keep visualization sync state in focused visualization hooks or components.
- Use local component state for short-lived UI state owned by one component.
- Lift state only to the nearest common owner that explicitly consumes it.
- Keep state reset rules next to the state owner.
- Represent selection or playback state by notation strings, move indexes, IDs, or small status values instead of duplicated cube objects.
- Use stable refs for custom element synchronization details that should not trigger renders.

## Never

- Do not copy API data into broad mutable stores just to pass it through the UI.
- Do not use React Context for mutable UI state.
- Do not add Zustand unless state is truly cross-page or cross-feature and local state plus focused hooks are insufficient.
- Do not copy React Query data into local state just to pass it to children.
- Do not make a Three.js, web-component, facelet, or sticker state the canonical engine state.
- Do not let visualization sync state own solver correctness.

## Ownership Order

1. `apps/web/src/api/client.ts` for shared HTTP details.
2. React Query hooks under `apps/web/src/api/<domain>` for server/cache and mutation state.
3. Nearest page or screen component for coordinated product workflow state.
4. Focused hooks for repeated or stateful UI behavior.
5. Component-local `useState` for component-only state.
6. Stable refs for imperative custom element coordination.
7. External client-state libraries only after current ownership options are insufficient.

## Verification

- Check changed components do not mirror API data into unrelated local stores.
- Check reset behavior after editing scramble, changing limits, and solving.
- Run `npm run build` after state ownership changes.

## Reference: `ai/rules/frontend-api-hook-rules.md`

# Frontend API Hook Rules

Rules for React Query API operations in `apps/web/src/api`.

## Always

- Group frontend API code by domain under `apps/web/src/api`.
- Keep shared HTTP details in `apps/web/src/api/client.ts`, including base URL resolution, JSON headers, request helpers, and transport error mapping.
- Split every operation into a raw request function, a React Query hook, and an operation `index.ts` when the operation is consumed by UI.
- Keep request functions free of React imports.
- Use `useQuery` for cached server state such as API health and strategy metadata.
- Use `useMutation` for solve requests and other user-triggered operations.
- Keep query keys stable in a domain-level `queryKeys.ts` when hooks share a domain.
- Use `enabled` in query hooks when prerequisite API state or inputs are unavailable.
- Keep mutation cache invalidation inside mutation hooks when a mutation makes cached server state stale.
- Keep operation-specific response normalization beside the operation that needs it.
- Preserve domain-level API failures such as invalid notation or generated-table errors as typed normalized results when the API returns a stable response payload.
- Let transport errors and invalid HTTP JSON failures surface through React Query error state instead of fabricating solver metadata.
- Use explicit named exports in operation and domain barrels.

## Never

- Do not call raw request functions from React components.
- Do not expose request functions from barrels consumed by UI components.
- Do not import query keys into components.
- Do not call `fetch` directly outside `apps/web/src/api/client.ts` unless the request is intentionally outside the app API contract.
- Do not duplicate API status parsing or solve response normalization inside React components.
- Do not create fake fallback solve metadata for transport errors.
- Do not use React Query as the canonical solver state; the Rust API and engine remain authoritative.
- Do not manually synchronize server results in components after mutations when React Query invalidation belongs in the hook.

## Layout

- Request file: `apps/web/src/api/<domain>/<operation>/<operation>.ts`.
- Hook file: `apps/web/src/api/<domain>/<operation>/use<Operation>.ts`.
- Operation barrel: `apps/web/src/api/<domain>/<operation>/index.ts`.
- Domain barrel: `apps/web/src/api/<domain>/index.ts`.
- Query keys: `apps/web/src/api/<domain>/queryKeys.ts`.
- Domain types: `apps/web/src/api/<domain>/types.ts` when multiple operations share API types.

## Verification

- Search changed components for raw request function, `fetch`, or query-key imports.
- Test request functions and React Query hooks with mocked successful responses and mocked API errors when API behavior changes.
- Run `npm run build` after API-client or hook changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.

## Reference: `ai/rules/frontend-form-rules.md`

# Frontend Form Rules

Rules for forms and local validation in `apps/web`.

## Always

- Keep the browser-facing solve flow notation-only.
- Keep simple solve controls in lightweight local state unless complexity justifies a form library.
- Keep local validation near the owning form when it only validates simple limits or required values.
- Normalize move notation with `trim()` before API submission.
- Keep field labels explicit and accessible through visible text.
- Display validation messages through the page result or field-owned message region that currently owns the UX.
- Keep API safety caps visible or discoverable in the form controls that enforce them.
- Use `aria-invalid` when a specific field is invalid and the UI exposes field-level invalidity.
- Keep the default scramble input empty so the cube starts solved; sample scrambles belong in placeholders or examples, not initial form state.

## Never

- Do not expose facelet, Kociemba, sticker-state, or raw cube-state input modes in browser UI.
- Do not submit facelet or sticker-state payloads from the browser.
- Do not rely on browser validation for app-level solver messages.
- Do not add React Hook Form, Zod, or another form library until current form complexity needs schema validation, many fields, or reusable validation.
- Do not duplicate API validation in the frontend beyond lightweight UX checks.
- Do not parse or validate cube solvability in React components.

## Boundaries

- The form owns user-entered notation and limit inputs.
- The API client owns request construction and response normalization.
- The Rust API and engine own notation semantics, cube validity, solver correctness, and safety enforcement.
- Visualization hooks may parse supported move tokens only to drive rendering, not to validate solver correctness.

## Verification

- Check invalid local limits do not send API requests.
- Check invalid notation still returns API-owned errors.
- Check the empty default scramble keeps solve disabled and the visualization solved.
- Run `npm run build` and relevant E2E tests after form behavior changes.

## Reference: `ai/rules/frontend-styling-rules.md`

# Frontend Styling Rules

Rules for styling `apps/web` with Tailwind CSS v4 utilities and class composition.

## Always

- Use Tailwind CSS v4 through `@tailwindcss/vite` and the single required `apps/web/src/index.css` entrypoint.
- Keep `apps/web/src/index.css` limited to exactly `@import "tailwindcss";`.
- Put all styling in Tailwind utility classes on elements and components.
- Preserve the existing product visual language unless the task explicitly changes design direction.
- Consider desktop and mobile layouts for every UI change.
- Keep the rendered 3x3 cube no larger than 350px by 350px.
- Keep the current web UI square: do not add `border-radius` CSS or Tailwind `rounded-*` utilities.
- Use the `classnames` package for conditional class composition.
- Import `classnames` as `cls` with `import cls from 'classnames'`.
- Use object form where possible for conditional classes: `cls('base', { active: isActive })`.
- Keep static Tailwind class sets as plain strings when there are no conditions.

## Never

- Do not add, import, or keep component, page, feature, or global `.css` files.
- Do not put custom selectors, theme tokens, document defaults, base styles, animations, or keyframes in `.css` files.
- Do not add a Tailwind config file unless Tailwind utility classes cannot express a concrete current need.
- Do not add CSS-in-JS, Sass, or a design-system dependency without a concrete current need.
- Do not add local `classNames`, `cn`, or wrapper helpers without a concrete repeated need.
- Do not use template literals only to append conditional classes.
- Do not add broad selectors or global CSS rules when component utility classes can express the behavior.
- Do not turn repeated class sets into broad design-system abstractions before reuse is real.
- Do not create generic interchangeable layouts that ignore the existing cube visualization tone.
- Do not let visual experiments break mobile usability or the 350px cube cap.

## Verification

- Search changed files for local class-name helpers, `rounded-`, and new `.css` files before finishing.
- Run `npm run build` after Tailwind or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Check mobile breakpoints for changed grids, forms, and visualization containers when feasible.

## Reference: `ai/architecture/project-architecture.md`

# Project Architecture

The target is a hybrid Rubik's Cube solver with a Rust engine, search algorithms, heuristics, pattern databases, optional ML heuristics, a native HTTP API, and a modern web visualization.

## Current Structure

- `crates/cube-engine`: Rust crate for cube representation, moves, notation, scramble handling, search, and heuristics.
- `crates/api`: Axum HTTP API around the Rust engine and generated pruning-table artifacts.
- `apps/web`: Vite React app for notation-only solve requests, cube visualization, and playback-oriented UI.
- `datasets`: generated and fixture data for solver/ML experiments.
- `ml`: Python training and smoke-test code for learned value baselines.
- `ai`: canonical AI knowledge base and route generation system.
- `roadmap.md`: source roadmap and implementation order.

## Generated Artifacts

- Native pruning tables are generated by `cube-engine` binaries and loaded by `crates/api`.
- Solver quality reports and real-scramble gates are executable verification artifacts, not frontend behavior.
- ML datasets should be generated from deterministic Rust solver behavior before training code consumes them.

## Future Or Optional Boundaries

- `crates/wasm`: optional future wasm-bindgen bridge around the Rust engine if browser-local solving becomes a concrete roadmap item.
- Additional frontend routing, shared component libraries, or state managers should wait for current UI complexity to require them.

## Ownership

- Cube state, moves, validation, search, and heuristics belong in Rust.
- The API validates HTTP contracts, applies safety limits, calls Rust solver code, and returns typed solver results.
- Frontend code should only render, collect notation/limits, send solve requests, receive states, and play animations.
- ML code should consume generated datasets and expose learned heuristics only after deterministic search is correct.

## Reference: `ai/architecture/frontend-visualization.md`

# Frontend Visualization Architecture

The frontend renders and controls solver interaction. It must not become the source of truth for cube logic.

## Current Stack

- TypeScript
- React
- Vite
- `@tanstack/react-query` for API health, strategy metadata, and solve mutation state
- `@houstonp/rubiks-cube` as a visualization custom element
- Tailwind CSS v4 through `@tailwindcss/vite` and the single `apps/web/src/index.css` entrypoint
- `classnames` imported as `cls` for conditional class composition
- Vitest, Testing Library, and V8 coverage for unit/component/API-hook tests
- Storybook for component stories and visual inspection

## Optional Additions

- React Three Fiber or another vetted Three.js abstraction only if the current custom element cannot support the needed visualization behavior.
- Zustand only when shared local UI state is truly cross-component or cross-route and nearest-owner state is insufficient.
- React Router and form libraries only after there is a concrete implemented need.

## Boundary

The frontend sends move notation and receives states from the Rust HTTP API. Rendering, playback, camera controls, and interaction state can live in the frontend. Cube validation, solver behavior, search, and heuristics stay in Rust.

Facelet/Kociemba strings are internal adapter details only. They must not appear as UI copy, input modes, or client-submitted API payloads. If a visualization library requires a sticker string, keep that detail hidden behind a neutral rendering-state field.

The visible cube must fit within a 350px by 350px box on desktop and mobile.

The solve form defaults to an empty scramble so the visualization starts solved; sample scrambles are placeholders or examples.

## Data And State Flow

- `apps/web/src/api` owns HTTP request details, response normalization, typed results, API base URL handling, and API error mapping.
- API operations are grouped by domain under `apps/web/src/api/<domain>` with request functions, React Query hooks, operation barrels, domain barrels, and domain query keys.
- React Query owns API health, strategy metadata, solve mutation pending/error/data state, and future server-state operations.
- React components own local form inputs, loading indicators, result display, and visualization playback state.
- API load state, solve result state, form state, and visualization state should remain separate unless a single owner explicitly coordinates them.
- Selection or playback state should be represented by IDs, move indexes, or notation strings rather than duplicated cube objects when possible.
- Imperative custom-element synchronization should live in focused visualization hooks and refs, not broad page effects.
- Visualization-local parsing may drive rendering of supported move tokens, but Rust remains authoritative for notation semantics and cube validity.

## UI Composition

- `App.tsx` should stay thin and delegate the product screen to page-level modules.
- Keep route or screen components readable as composition as the UI grows.
- Extract named components for repeated panels, controls, result sections, or visualization shells when the extraction clarifies ownership.
- Keep page-specific pieces colocated near the owning screen until reused elsewhere.
- Shared reusable UI should live under `apps/web/src/components` only when there is a real shared consumer.
- Context-independent helpers live under `apps/web/src/core/<category>/<name>.ts` and are imported directly without core barrels.
- Keep page-specific hooks, validation helpers, message mapping, and constants under the owning page folder until reuse exists.
- Keep new or substantially changed React component files at or below 400 lines where practical.
- Storybook stories live in a `stories/` child folder beside the source area they cover.
- Use one primary story export per component and rely on controls for prop variation.

## API Hooks

- `apps/web/src/api/client.ts` owns base URL handling, JSON request helpers, and transport error mapping.
- Request functions contain no React imports.
- React Query hooks are the UI-facing API boundary and live beside their operation request function.
- Domain barrels should export hooks for UI consumption; components should not import raw request functions or query keys.
- Domain-level API failures stay as typed normalized results when the API returns a stable payload; transport errors stay in React Query error state.
- Mutation hooks own cache invalidation when mutations make cached server state stale.

## Styling

- `apps/web/src/index.css` is the only allowed CSS file and must contain only `@import "tailwindcss";`.
- Component layout, visual treatment, animations, and state styles should use Tailwind utilities.
- The current web UI is intentionally square; do not add `border-radius` or Tailwind `rounded-*` utilities.
- Conditional class composition uses `classnames` as `cls`.
- Do not add component/page CSS files, CSS-in-JS, Sass, or a design-system dependency without a concrete current need.
- Desktop and mobile layouts should be considered for every UI change.

## Tests And Stories

- Shared web test setup lives under `apps/web/src/test`.
- React Query hook tests use test `QueryClient` providers with retry disabled.
- API request tests mock fetch success and API error payloads.
- Coverage runs with `npm run test:coverage -w @rubiks-cube-solver/web` and keeps thresholds at 95% or higher.
- Storybook builds with `npm run storybook:build -w @rubiks-cube-solver/web`.

## Visualization Libraries

Visualization-only libraries can be used if they do not own the solver state. They should adapt to engine output rather than define engine behavior.

If a visualization library requires a facelet or sticker-state string, keep that value as a rendering adapter detail. The UI should still speak in scramble notation, solution moves, limits, and solver statuses.

## Reference: `ai/architecture/houstonp-rubiks-cube.md`

# `@houstonp/rubiks-cube` Evaluation

`@houstonp/rubiks-cube` version `3.0.0` is a Three.js/web-component package with subpath exports for view, 3D object, controller, core notation constants, and headless sticker state.

## Useful Later

- `@houstonp/rubiks-cube/view` can render a custom element.
- `@houstonp/rubiks-cube/three` can provide a Three.js object.
- `@houstonp/rubiks-cube/state` can provide headless sticker-state experiments and Kociemba string helpers.
- `@houstonp/rubiks-cube/core` can provide notation constants and parsing helpers.

## Not The Solver Core

- The package is JavaScript and rendering-oriented.
- The state model is sticker/Kociemba oriented, not the Rust cubie representation required by the roadmap.
- It depends on `three` and `gsap`, which are not appropriate for the Rust engine.
- It should not be used by `crates/cube-engine`.

## Integration Decision

Treat it as a visualization adapter or comparison tool around Rust API state, not as the canonical engine.

## Observed Risk

In `RubiksCubeState.move`, the package appears to compute an `action` with `reverse` and `translate` options but then calls `GetMovementSlice(movement, ...)` with the original move. Verify this behavior before relying on headless move options.

## Reference: `ai/glossary/cube-terms.md`

# Cube Terms

## Cubie

A physical movable piece of the cube. The core engine tracks cubies rather than face colors as the primary model.

## Corner

A cubie with three stickers. A 3x3 cube has eight corners.

## Edge

A cubie with two stickers. A 3x3 cube has twelve edges.

## Permutation

Which cubie occupies each position.

## Orientation

How a cubie is twisted or flipped in its current position.

## Move

A face turn such as `R`, `U`, `R'`, or `U2`.

## Scramble

A sequence of moves applied from the solved state to produce a valid cube state.

## Heuristic

An estimate of distance from a cube state to the solved state.

## Admissible Heuristic

A heuristic that never overestimates the true distance to the solved state.

## Pattern Database

A precomputed lookup table mapping partial cube states to minimum solution distances.

## Kociemba String

A facelet string format commonly used by two-phase solvers. It can be an adapter format, not the primary engine model.
