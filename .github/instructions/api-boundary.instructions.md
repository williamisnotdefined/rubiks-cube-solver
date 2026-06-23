---
applyTo: "crates/api/**/*.{rs,toml},web/src/api/**/*.{ts,tsx},docs/project-plan.md"
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../ai/skills/api-boundary.md`.

Referenced context:
- `../../ai/rules/api-rules.md`
- `../../ai/rules/frontend-rules.md`
- `../../ai/rules/frontend-api-hook-rules.md`
- `../../ai/rules/testing-rules.md`
- `../../ai/architecture/project-architecture.md`
- `../../ai/architecture/api-boundary.md`
- `../../ai/glossary/cube-terms.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: api-boundary

## Canonical Skill: `ai/skills/api-boundary.md`

# API Boundary

Use this skill when adding or changing `crates/api`, Axum routes, request or response structs, API validation, CORS, generated solver loading, solve-status contracts, or `web/src/api` client behavior.

## Goal

Keep the HTTP API as a thin, typed boundary around the Rust solver engine while preserving frontend API contracts.

## Read First

- `ai/rules/api-rules.md`
- `ai/rules/frontend-rules.md`
- `ai/rules/frontend-api-hook-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/api-boundary.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Inspect nearby route, request, response, API-client, and test patterns before editing.
- Keep handlers focused on HTTP extraction, validation, solver dispatch, and response mapping.
- Keep search, cube validation, notation semantics, heuristics, and pruning logic in `cube-engine`.
- Keep notation solve requests on move notation and scan solve requests on scan-session contracts; do not add browser-facing facelet or Kociemba input modes.
- Update `web/src/api` request functions, React Query hooks, and normalization when API response fields, status strings, or error kinds change.
- Add or update API tests around observable contract behavior, especially error responses consumed by the frontend.

## Expected Output

- API routes stay thin and typed.
- Safety caps are enforced before expensive solver work.
- Response statuses and metadata remain stable or are updated with matching frontend API-client changes.
- React Query hooks continue to expose typed API state without leaking raw request functions into components.
- Browser notation clients submit move notation and limits, never facelet strings.
- Solver logic remains in Rust engine code.

## Verification

- Run `npm run api:test` or `cargo test -p rubiks-cube-solver-api` for API changes.
- Run `cargo test -p cube-engine` when API behavior depends on engine changes.
- Run `npm run build` and `npm run lint -w @rubiks-cube-solver/web` when `web/src/api` changes.
- Run `npm run ai:check` after AI knowledge changes.

# Referenced Context

## Reference: `ai/rules/api-rules.md`

# API Rules

Rules for the Axum HTTP API and the frontend API contract.

## Always

- Keep route handlers thin: extract state and JSON, validate request limits, choose the solver strategy, delegate to Rust engine code, and map results to HTTP responses.
- Keep solver behavior in `cube-engine`; `crates/api` owns HTTP shape, safety limits, generated-solver loading, CORS, and error/status mapping.
- Use Serde request and response structs as the API contract.
- Keep notation solve requests on move notation and route scan solves through scan-session contracts.
- Validate API safety limits before parsing notation or invoking search.
- Use named constants for public API caps such as maximum depth, maximum nodes, notation bytes, and JSON body bytes.
- Preserve stable response status strings, error kinds, and metadata fields because `web/src/api` normalizes them.
- Verify returned solutions by replay before reporting success.
- Keep generated pruning-table availability and corruption errors explicit in API responses.
- Keep CORS origins narrow to known local web development and preview origins unless deployment requirements change.
- Update `web/src/api` types and normalization when API response fields or status values change.

## Never

- Do not add facelet, Kociemba, or raw sticker-state request payloads to browser-facing notation solve endpoints.
- Do not implement search algorithms, heuristics, pruning table generation, or cube validation logic inside API handlers.
- Do not let handlers panic or leak internal errors when a stable error response can represent the failure.
- Do not accept unbounded request depth, node count, notation length, or JSON body size.
- Do not add broad authentication, tenants, tokens, rate-limit frameworks, or OpenAPI layers without a current product requirement.
- Do not make the frontend duplicate API status parsing or solver response normalization outside `web/src/api`.

## Verification

- API tests: `npm run api:test` or `cargo test -p rubiks-cube-solver-api`.
- Engine tests: `cargo test -p cube-engine` when API behavior depends on changed solver behavior.
- Web API-client changes: `npm run build` and `npm run lint -w @rubiks-cube-solver/web`.
- Cross-boundary product flow changes: `npm run test:e2e` when API, web, and generated pruning-table prerequisites are available.

## Reference: `ai/rules/frontend-rules.md`

# Frontend Rules

Rules for the web visualization and frontend-to-API boundary.

## Always

- Keep cube logic out of React components.
- Treat the frontend as a renderer and controller that sends move notation and receives states.
- Use the Rust HTTP API as the source of truth for solver behavior.
- Keep playback and visualization state separate from solver state.
- Evaluate visualization-only libraries by whether they preserve this boundary.
- Keep visualization package sharing limited to rendering infrastructure such as camera, animation, and web-component helpers; puzzle notation, visual state adapters, and renderers remain puzzle-specific.
- Keep the rendered 3x3 cube no larger than 350px by 350px in the web UI.
- Keep API request and response normalization in `web/src/api`, not inline in React components.
- Keep request functions free of React imports; React Query hooks are the UI-facing API boundary.
- Use React Query for API health, strategy metadata, solve mutations, and future server-state operations.
- Keep server/API load state, solve result state, form input state, and visualization playback state separately owned.
- Lift local UI state only to the nearest component that consumes it.
- Extract React components only when UI repeats or a named component makes ownership and composition clearer.
- Keep one-off UI inline when extraction would add indirection without reuse or state-boundary value.
- Keep route or screen files readable as composition; `App.tsx` should stay thin as the UI grows.
- Use React Router through the current `BrowserRouter` route setup; keep server/static hosting configured to fall back to `index.html` for frontend routes.
- Keep frontend route paths and URL segments in English stable slugs; translate visible menu labels, headings, and copy through `react-i18next` locale files under `web/src/i18n/locales`.
- Keep supported locale resources in key and interpolation-placeholder parity across `en`, `es`, `pt-BR`, `it`, `de`, `fr`, `ru`, `zh` for Simplified Chinese, and `ja`.
- Keep page-level route code-splitting in `App.tsx` with React `lazy`/`Suspense` when route bundles grow.
- Keep page-specific components, hooks, and helpers under the owning page folder until reused elsewhere.
- Keep shared reusable components under `web/src/components` only after there is a real shared consumer.
- Use existing shared Radix-backed primitives for dialogs, selects, switches, checkboxes, toasts, popovers, and tooltips instead of importing Radix directly in feature code.
- Prefer explicit props and children for reusable layout wrappers.
- Use the existing React Hook Form and Zod setup for solve-form schema validation and submission shaping; keep cube semantics and notation validity in Rust/API code.
- Use existing Zustand stores only for scoped client state that is shared beyond one component, such as timer sessions/settings, solve settings, theme, and toasts.
- Use Tailwind utility classes for styling; keep Tailwind import, resets, and semantic theme/color variables in the single `web/src/index.css` entrypoint.

## Never

- Do not implement solver algorithms in the frontend.
- Do not make a Three.js/web-component sticker state the canonical engine state.
- Do not add a frontend or visualization-package generic puzzle engine, universal move type, `BaseMove`, `BaseState`, or shared puzzle-state abstraction.
- Do not expose facelets, Kociemba strings, or facelet input modes in the UI.
- Do not add or import `.css` files outside the single Tailwind/theme entrypoint `web/src/index.css`.
- Do not make browser notation clients submit facelets to the API; notation solve requests use move notation.
- Do not copy API data into broad mutable stores just to pass it through the UI.
- Do not add new frontend state, form, routing, animation, styling, or component dependencies while the existing stack can satisfy the current need.
- Do not add localized route paths; URLs stay English while labels are localized.
- Do not use native-select assumptions such as Playwright `selectOption()` for Radix Select controls.
- Do not turn a large component into a hidden god hook or god provider.
- Do not import raw request functions into UI once a project-level hook/client boundary exists for that operation.
- Do not import query keys or raw request functions into React components.
- Do not add styling or state-management dependencies to solve organization problems that focused components, hooks, and files can solve.

## External Library Note

- `@rubiks-cube-solver/rubiks-cube` is acceptable as a visualization or comparison tool, not as the Rust solver core.

## Verification

- Run `npm run build` after TypeScript, React, or API-client changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run API or engine tests too when UI changes require Rust contract changes.

## Reference: `ai/rules/frontend-api-hook-rules.md`

# Frontend API Hook Rules

Rules for React Query API operations in `web/src/api`.

## Always

- Group frontend API code by domain under `web/src/api`.
- Keep shared HTTP details in `web/src/api/client.ts`, including base URL resolution, JSON headers, request helpers, and transport error mapping.
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
- Do not call `fetch` directly outside `web/src/api/client.ts` unless the request is intentionally outside the app API contract.
- Do not duplicate API status parsing or solve response normalization inside React components.
- Do not create fake fallback solve metadata for transport errors.
- Do not use React Query as the canonical solver state; the Rust API and engine remain authoritative.
- Do not manually synchronize server results in components after mutations when React Query invalidation belongs in the hook.

## Layout

- Request file: `web/src/api/<domain>/<operation>/<operation>.ts`.
- Hook file: `web/src/api/<domain>/<operation>/use<Operation>.ts`.
- Operation barrel: `web/src/api/<domain>/<operation>/index.ts`.
- Domain barrel: `web/src/api/<domain>/index.ts`.
- Query keys: `web/src/api/<domain>/queryKeys.ts`.
- Domain types: `web/src/api/<domain>/types.ts` when multiple operations share API types.

## Verification

- Search changed components for raw request function, `fetch`, or query-key imports.
- Test request functions and React Query hooks with mocked successful responses and mocked API errors when API behavior changes.
- Run `npm run build` after API-client or hook changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.

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
- Test scanner training code with deterministic fixtures or fixed seeds.
- Keep algorithm tests deterministic.
- Run the narrowest test first, then the affected crate test command.
- Use Vitest APIs such as `describe`, `it`, `expect`, `vi.fn`, and `vi.spyOn` for `web` unit and component tests.
- Keep `web` tests in `__tests__/` folders beside the source area they cover.
- Use Testing Library for React component behavior and public accessibility queries.
- Use Playwright accessibility queries for E2E flows and shared E2E helpers for non-native controls such as Radix Select.
- Keep `web/src/api` request and hook tests in `web/src/api/__tests__`, using shared fetch and React Query helpers under `web/src/test`.
- Keep `web/src/core` tests under `web/src/core/<category>/__tests__/<name>.test.ts`.
- Keep `web` coverage thresholds at 95% or higher for statements, branches, functions, and lines when coverage is configured.

## Never

- Do not rely on random tests without a fixed seed.
- Do not assert implementation details when public cube behavior can be asserted.
- Do not leave focused-only tests such as `.only` in committed test files.
- Do not add duplicate test helpers when nearby crate, web, API, or scanner helpers already cover the setup.
- Do not add tests for future surfaces that do not exist yet.
- Do not use Jest-only APIs or `jest.mock` patterns in Vitest tests.
- Do not place `web` tests as loose sibling `*.test.ts(x)` files when a nearby `__tests__/` folder is available.
- Do not add duplicate web test helpers when `web/src/test/render.tsx` or `web/src/test/api.ts` already covers the setup.
- Do not use Playwright `selectOption()` or `locator('option')` for Radix Select controls; use helpers under `tests/e2e/select-helpers.ts`.

## Verification

- Cube engine tests: `cargo test -p cube-engine`.
- API tests: `npm run api:test` or `cargo test -p rubiks-cube-solver-api`.
- Workspace tests: `cargo test`.
- Web build/lint: `npm run build` and `npm run lint -w @rubiks-cube-solver/web`.
- Web unit tests: `npm run test -w @rubiks-cube-solver/web`.
- Web coverage: `npm run test:coverage -w @rubiks-cube-solver/web`.
- Web Storybook: `npm run storybook:build -w @rubiks-cube-solver/web`.
- End-to-end tests: `npm run test:e2e` after the API, web app, and pruning-table prerequisites are available.
- E2E split commands: `npm run test:e2e:smoke` for product/responsive/timer smoke, `npm run test:e2e:scan` for serial manual scan coverage, and `npm run test:e2e:full` for the complete non-heavy suite.
- Product gate: `npm run product:gate` for release-level or cross-boundary validation.
- AI routes: `npm run ai:check`.

## Reference: `ai/architecture/project-architecture.md`

# Project Architecture

The target is a Rubik's Cube solver with a Rust engine, search algorithms, heuristics, pattern databases, a native HTTP API, optional scanner support, and a modern web visualization.

## Current Structure

- `crates/cube-engine`: Rust crate for cube representation, moves, notation, scramble handling, search, and heuristics.
- `crates/api`: Axum HTTP API around the Rust engine and generated pruning-table artifacts.
- `web`: Vite React app for puzzle-aware solve flows, scan flows, visualization, playback, algorithms pages, notation pages, and timer flows.
- `scanner`: Python scanner contracts, FastAPI runtime, and offline scanner training/evaluation tooling.
- `ai`: canonical AI knowledge base and route generation system.
- `docs/project-plan.md`: current technical direction, implementation rules, and puzzle boundaries.

## Generated Artifacts

- Native pruning tables are generated by `cube-engine` binaries and loaded by `crates/api`.
- Solver quality reports and real-scramble gates are executable verification artifacts, not frontend behavior.

## Runtime And Deployment

- Docker dev is the default development runtime. Use `npm run dev` to build/recreate the `rubiks-dev` Compose project, wait for health, and serve web/API/vision on ports `5173`, `8788`, and `8791`.
- Local non-Docker fallback uses `dev:local:prepare` and `dev:local` for development/debugging when Docker is not desired.
- Docker production uses the `rubiks-prod` Compose project. Use `live:deploy` after merges to pull `origin/main`, rebuild/recreate containers, wait for app health, and print status.
- Use `live:restart` only when the checkout is already current and containers need to be rebuilt/recreated.
- `live:start` runs production deploy first and then starts the Cloudflare tunnel. `live:tunnel` runs only `cloudflared tunnel run wilho`.
- Docker dev, Docker production, and scanner training use separate Compose projects/commands so they do not collide.

## Multi-Puzzle Direction

- Additional puzzles must own puzzle-specific state, move models, notation parsers, validators, solvers, heuristics, coordinates, and artifact rules.
- Shared multi-puzzle code is limited to metadata, registries, budgets, results, compatibility checks, API contracts, and visualization adapter selection.
- Do not introduce a generic puzzle engine, universal move type, universal state type, `BaseMove`, `BaseState`, `BasePuzzle`, or inheritance-style puzzle hierarchy.

## Future Or Optional Boundaries

- `crates/wasm`: optional future wasm-bindgen bridge around the Rust engine if browser-local solving becomes a concrete product requirement.
- Additional frontend routing, shared component libraries, or state managers should wait for current UI complexity to require them.

## Ownership

- Cube state, moves, validation, search, and heuristics belong in Rust.
- The API validates HTTP contracts, applies safety limits, calls Rust solver code, and returns typed solver results.
- Frontend code should only render, collect notation/limits, send solve requests, receive states, and play animations.
- Scanner runtime code may produce visual evidence, but reviewed stickers, cube validation, and solving remain Rust/product boundaries.

## Reference: `ai/architecture/api-boundary.md`

# API Boundary Architecture

`crates/api` is a native Axum HTTP API around the Rust solver engine.

## Request Flow

- `crates/api/src/main.rs` reads `RUBIKS_API_ADDR` and `RUBIKS_PRUNING_TABLE_DIR`, loads the generated two-phase solver, builds the router, and starts Axum.
- `crates/api/src/lib.rs` owns the public router, CORS, request/response structs, endpoint handlers, request validation, solver dispatch, and engine-error mapping.
- `ApiState` stores loaded generated solver artifacts behind shared state.
- `/health` reports API availability and whether generated two-phase tables are loaded.
- `/strategies` exposes solver strategy metadata from `cube-engine`.
- `/solve-notation` accepts move notation plus limits, applies the scramble from solved state, invokes the selected solver, verifies replay, and returns a typed solve response.

## Contract Shape

- Requests use move notation, `maxDepth`, optional `maxNodes`, and optional `strategyId`.
- Responses include `ok`, `status`, strategy metadata, generated-table status, effective limits, solution moves, explored nodes, replay verification, optional visualization state, and optional error metadata.
- Status strings and error kinds are part of the frontend contract and should change only with matching updates in `web/src/api`.
- The API may return visualization adapter state, but browser clients should not submit facelet or Kociemba payloads.

## Validation And Safety

- API caps protect search cost and request size before the engine is called.
- Unsupported strategies, invalid notation, excessive limits, missing generated tables, corrupt tables, no-solution-within-limits, and unverified solutions map to explicit statuses.
- Search success is accepted only when replay verifies that returned moves solve the requested cube state.
- Generated pruning tables are loaded at API startup for the generated two-phase strategy; unavailable or incompatible artifacts remain visible as API errors.

## Frontend Boundary

- `web/src/api` owns base URL handling, health/strategy probing, solve request construction, response normalization, and API error fallback.
- React components should consume normalized API-client results instead of parsing raw HTTP responses.
- UI copy should describe scrambles, moves, limits, strategies, and solver statuses, not internal facelet/Kociemba representations.

## Test Shape

- Pure request behavior can be tested through `solve_notation_request` without starting a server.
- Router behavior such as exposed routes and CORS should be tested through Axum service requests.
- Contract changes should include tests for both success and error responses that the web client depends on.

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
