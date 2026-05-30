---
applyTo: "apps/web/**/*.{ts,tsx,css},apps/web/.storybook/**/*,roadmap.md"
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../ai/skills/frontend-testing.md`.

Referenced context:
- `../../ai/rules/testing-rules.md`
- `../../ai/rules/frontend-component-rules.md`
- `../../ai/rules/frontend-api-hook-rules.md`
- `../../ai/architecture/frontend-visualization.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-testing

## Canonical Skill: `ai/skills/frontend-testing.md`

# Frontend Testing

Use this skill when adding or changing `apps/web` Vitest tests, Testing Library tests, React Query hook tests, coverage configuration, or Storybook stories.

## Goal

Protect observable frontend behavior with Vitest, Testing Library, Storybook, and 95% coverage thresholds without coupling tests to implementation details.

## Read First

- `ai/rules/testing-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/rules/frontend-api-hook-rules.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Identify the behavior and the narrowest owning test folder before adding tests.
- Add regression tests before fixing bugs when feasible.
- Use Testing Library accessibility queries for React components.
- Use shared web test helpers under `apps/web/src/test` for React Query providers and fetch mocks.
- Test API request functions and hooks with mocked success and API-error responses.
- Keep core helper tests under `apps/web/src/core/<category>/__tests__`.
- Add or update one Storybook story per component, using controls for prop variation.
- Keep coverage thresholds at 95% or higher when changing coverage configuration.

## Expected Output

- Tests cover user-visible behavior, API hook boundaries, core helpers, and regression paths.
- Tests live in `__tests__/` folders beside the source area they cover.
- Storybook stories live in nearby `stories/` folders and avoid one story per prop.
- Coverage remains at or above 95% for configured web coverage targets.

## Verification

- Run targeted Vitest files first when practical.
- Run `npm run test -w @rubiks-cube-solver/web` after web test changes.
- Run `npm run test:coverage -w @rubiks-cube-solver/web` after coverage or broad frontend changes.
- Run `npm run storybook:build -w @rubiks-cube-solver/web` after story changes.

# Referenced Context

## Reference: `ai/rules/testing-rules.md`

# Testing Rules

Testing rules for this repository.

## Always

- Add Rust unit tests next to pure functions when behavior is introduced.
- Add integration tests under the owning crate when behavior crosses module boundaries.
- Add regression tests next to changed behavior when fixing bugs.
- Test observable cube behavior: solved state, inverse moves, notation parsing, scramble inversion, validation, and search output.
- Test HTTP/API behavior through request and response contracts when `crates/api` behavior changes.
- Test web API-client and UI behavior through public component or request boundaries when frontend behavior changes.
- Test ML and dataset code with deterministic fixtures or fixed seeds.
- Keep algorithm tests deterministic.
- Run the narrowest test first, then the affected crate test command.
- Use Vitest APIs such as `describe`, `it`, `expect`, `vi.fn`, and `vi.spyOn` for `apps/web` unit and component tests.
- Keep `apps/web` tests in `__tests__/` folders beside the source area they cover.
- Use Testing Library for React component behavior and public accessibility queries.
- Keep `apps/web/src/api` request and hook tests in `apps/web/src/api/__tests__`, using shared fetch and React Query helpers under `apps/web/src/test`.
- Keep `apps/web/src/core` tests under `apps/web/src/core/<category>/__tests__/<name>.test.ts`.
- Keep `apps/web` coverage thresholds at 95% or higher for statements, branches, functions, and lines when coverage is configured.

## Never

- Do not rely on random tests without a fixed seed.
- Do not assert implementation details when public cube behavior can be asserted.
- Do not leave focused-only tests such as `.only` in committed test files.
- Do not add duplicate test helpers when nearby crate, web, API, or ML helpers already cover the setup.
- Do not add tests for future surfaces that do not exist yet.
- Do not use Jest-only APIs or `jest.mock` patterns in Vitest tests.
- Do not place `apps/web` tests as loose sibling `*.test.ts(x)` files when a nearby `__tests__/` folder is available.
- Do not add duplicate web test helpers when `apps/web/src/test/render.tsx` or `apps/web/src/test/api.ts` already covers the setup.

## Verification

- Cube engine tests: `cargo test -p cube-engine`.
- API tests: `npm run api:test` or `cargo test -p rubiks-cube-solver-api`.
- Workspace tests: `cargo test`.
- Web build/lint: `npm run build` and `npm run lint -w @rubiks-cube-solver/web`.
- Web unit tests: `npm run test -w @rubiks-cube-solver/web`.
- Web coverage: `npm run test:coverage -w @rubiks-cube-solver/web`.
- Web Storybook: `npm run storybook:build -w @rubiks-cube-solver/web`.
- End-to-end tests: `npm run test:e2e` after the API, web app, and pruning-table prerequisites are available.
- ML tests: `python -m pytest ml`.
- Product gate: `npm run product:gate` for release-level or cross-boundary validation.
- AI routes: `npm run ai:check`.

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
