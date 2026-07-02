---
applyTo: "apps/web/src/api/**/*.{ts,tsx},apps/web/src/pages/**/*.{ts,tsx},crates/api/**/*.{rs,toml},docs/project-plan.md"
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../ai/skills/react-query-request-hooks.md`.

Referenced context:
- `../../ai/rules/frontend-api-hook-rules.md`
- `../../ai/rules/frontend-state-rules.md`
- `../../ai/rules/api-rules.md`
- `../../ai/architecture/api-boundary.md`
- `../../ai/architecture/frontend-visualization.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: react-query-request-hooks

## Canonical Skill: `ai/skills/react-query-request-hooks.md`

# React Query Request Hooks

Use this skill when adding or changing `apps/web` API query hooks, mutation hooks, request functions, query keys, or response normalization.

## Goal

Keep React Query as the frontend server-state boundary while keeping raw HTTP details and API normalization out of React components.

## Read First

- `ai/rules/frontend-api-hook-rules.md`
- `ai/rules/frontend-state-rules.md`
- `ai/rules/api-rules.md`
- `ai/architecture/api-boundary.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Identify the API domain and operation name from nearby operations.
- Add or update the request function, hook, operation barrel, domain barrel, and domain query keys as needed.
- Keep request functions private to the API layer and free of React imports.
- Keep domain-specific response normalization beside the operation that needs it.
- Use query hooks for API state that should be cached and mutation hooks for user-triggered solve requests.
- Put cache invalidation in mutation hooks when mutations make cached API state stale.
- Keep transport errors in React Query error state and stable API failure statuses in typed normalized results.
- Update components to consume domain hooks only.

## Expected Output

- UI-facing barrels export hooks, not raw request functions.
- Components do not import `fetch`, raw requests, or query keys.
- Request details stay behind `apps/web/src/api/client.ts`.
- Solve response status parsing stays in `apps/web/src/api`, not page components.
- Browser notation clients submit move notation and limits, while scan flows use scan-session contracts instead of raw facelets or sticker state.
- Request functions and hooks have Vitest coverage for success, API failure payloads, disabled queries, and mutation behavior when changed.

## Verification

- Search changed components for direct `fetch`, raw request function, or query-key usage.
- Run `npm run build` after API-client or hook changes.
- Run `npm run test -w @rubiks-cube-solver/web` after changing request functions or hooks.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run relevant E2E tests for solve flow behavior.

# Referenced Context

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
- Use existing Zustand stores only for scoped client state that is genuinely shared, including timer sessions/settings, solve settings, theme, and toasts.

## Never

- Do not copy API data into broad mutable stores just to pass it through the UI.
- Do not use React Context for mutable UI state.
- Do not add broad Zustand stores for API data, single-component UI state, or state that nearest-owner React state already represents clearly.
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
7. Existing scoped Zustand stores only when local state and focused hooks are insufficient.

## Verification

- Check changed components do not mirror API data into unrelated local stores.
- Check reset behavior after editing scramble, changing limits, and solving.
- Run `npm run build` after state ownership changes.

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
- Preserve stable response status strings, error kinds, and metadata fields because `apps/web/src/api` normalizes them.
- Verify returned solutions by replay before reporting success.
- Keep generated pruning-table availability and corruption errors explicit in API responses.
- Keep CORS origins narrow to known local web development and preview origins unless deployment requirements change.
- Update `apps/web/src/api` types and normalization when API response fields or status values change.

## Never

- Do not add facelet, Kociemba, or raw sticker-state request payloads to browser-facing notation solve endpoints.
- Do not implement search algorithms, heuristics, pruning table generation, or cube validation logic inside API handlers.
- Do not let handlers panic or leak internal errors when a stable error response can represent the failure.
- Do not accept unbounded request depth, node count, notation length, or JSON body size.
- Do not add broad authentication, tenants, tokens, rate-limit frameworks, or OpenAPI layers without a current product requirement.
- Do not make the frontend duplicate API status parsing or solver response normalization outside `apps/web/src/api`.

## Verification

- API tests: `npm run api:test` or `cargo test -p rubiks-cube-solver-api`.
- Engine tests: `cargo test -p cube-engine` when API behavior depends on changed solver behavior.
- Web API-client changes: `npm run build` and `npm run lint -w @rubiks-cube-solver/web`.
- Cross-boundary product flow changes: `npm run test:e2e` when API, web, and generated pruning-table prerequisites are available.

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
- Status strings and error kinds are part of the frontend contract and should change only with matching updates in `apps/web/src/api`.
- The API may return visualization adapter state, but browser clients should not submit facelet or Kociemba payloads.

## Validation And Safety

- API caps protect search cost and request size before the engine is called.
- Unsupported strategies, invalid notation, excessive limits, missing generated tables, corrupt tables, no-solution-within-limits, and unverified solutions map to explicit statuses.
- Search success is accepted only when replay verifies that returned moves solve the requested cube state.
- Generated pruning tables are loaded at API startup for the generated two-phase strategy; unavailable or incompatible artifacts remain visible as API errors.

## Frontend Boundary

- `apps/web/src/api` owns base URL handling, health/strategy probing, solve request construction, response normalization, and API error fallback.
- React components should consume normalized API-client results instead of parsing raw HTTP responses.
- UI copy should describe scrambles, moves, limits, strategies, and solver statuses, not internal facelet/Kociemba representations.

## Test Shape

- Pure request behavior can be tested through `solve_notation_request` without starting a server.
- Router behavior such as exposed routes and CORS should be tested through Axum service requests.
- Contract changes should include tests for both success and error responses that the web client depends on.

## Reference: `ai/architecture/frontend-visualization.md`

# Frontend Visualization Architecture

The frontend renders solver interaction, scan workflows, notation pages, algorithms pages, timer flows, and visualization playback. It must not become the source of truth for puzzle logic.

## Boundary

- The Rust HTTP API and `cube-engine` own solver behavior, puzzle validation, search, heuristics, and replay verification.
- `apps/web/src/api` owns HTTP request details, response normalization, typed results, API base URL handling, and API error mapping.
- React components own user interaction, form controls, loading indicators, result display, visualization playback, and local UI state.
- `@rubiks-cube-solver/rubiks-cube` is a private visualization package and adapter surface, not the solver core.
- Facelet, Kociemba, sticker-state, and visual-state strings are adapter details. UI copy should speak in puzzles, moves, limits, strategies, scanner review, and solver statuses.

## Data Flow

```txt
React page/component
        -> apps/web/src/api request or React Query hook
        -> Rust HTTP API
        -> cube-engine solve or scan contract
        -> normalized API result
        -> visualization adapter / playback UI
```

API load state, solve result state, form state, scan workflow state, and visualization playback state should remain separately owned unless a focused page-level owner explicitly coordinates them.

## Visualization State

- Supported visual-state kinds come from API and puzzle contracts, such as `cube3-facelets-v1`, `cube2-facelets-v1`, or `none`.
- Visualization hooks may parse supported move tokens to animate or set renderer state, but Rust remains authoritative for notation semantics and puzzle validity.
- Imperative custom-element synchronization belongs in focused visualization hooks and refs, not broad page effects.
- Selection and playback state should be represented by IDs, move indexes, notation strings, or small status values instead of duplicated puzzle objects when possible.
- The visible cube should remain within the established 350px by 350px UI constraint unless the design is intentionally changed.

## Current Frontend Stack

- Vite, React, TypeScript, React Router, React Query, React Hook Form, Zod, Zustand, Tailwind CSS v4, Radix-backed shared primitives, `classnames` as `cls`, `react-i18next`, Motion, Vitest, Storybook, and Playwright are the current frontend stack.
- Additional global state, routing, form, animation, styling, or component dependencies should wait until the existing stack cannot satisfy a concrete current need.
