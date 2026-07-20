---
name: "api-boundary"
description: "Use when changing Axum solver routes, HTTP contracts, limits, scan sessions, or the matching web solver client."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/api-boundary.md`.

Referenced context:
- `../../../ai/rules/api-rules.md`
- `../../../ai/rules/frontend-rules.md`
- `../../../ai/rules/testing-rules.md`
- `../../../ai/architecture/api-boundary.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: api-boundary

## Canonical Skill: `ai/skills/api-boundary.md`

# API Boundary

Use for Axum routes, contracts, validation, solver loading, scan sessions, or the matching web API client.

## Read First

- `ai/rules/api-rules.md`
- `ai/rules/frontend-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/api-boundary.md`

## Workflow

- Inspect the focused route/response/solve modules and matching client contract.
- Keep engine semantics in Rust, HTTP limits and status mapping in Axum, and normalization in the web API domain.
- Preserve typed scan stickers and the server-side 308 WCA docs redirect where affected.
- Run API tests plus web tests/build when the browser contract changes.

# Referenced Context

## Reference: `ai/rules/api-rules.md`

# API Rules

Rules for the Axum HTTP API and the frontend API contract.

## Always

- Keep route handlers thin: extract state and JSON, validate request limits, choose the solver strategy, delegate to Rust engine code, and map results to HTTP responses.
- Keep solver behavior in `cube-engine`; `crates/api` owns HTTP shape, safety limits, generated-solver loading, CORS, and error/status mapping.
- Use Serde request and response structs as the API contract.
- Keep notation solve requests on move notation and route scan solves through typed scan-session contracts, which MAY include reviewed stickers and manual overrides.
- Validate API safety limits before parsing notation or invoking search.
- Use named constants for public API caps such as maximum depth, maximum nodes, notation bytes, and JSON body bytes.
- Preserve stable response status strings, error kinds, and metadata fields because `apps/web/src/api` normalizes them.
- Verify returned solutions by replay before reporting success.
- Keep generated pruning-table availability and corruption errors explicit in API responses.
- Keep CORS origins narrow to known local web development and preview origins unless deployment requirements change.
- Update `apps/web/src/api` types and normalization when API response fields or status values change.
- Keep `/api/wca-data` as an Axum HTTP 308 redirect to `/api/wca-data/v1/docs`; WCA data endpoints belong to `apps/wca-data`.

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

## Reference: `ai/rules/frontend-rules.md`

# Frontend Rules

## Boundaries

- Keep solving, notation semantics, puzzle validity, and replay verification in Rust. React renders and coordinates typed product workflows.
- Keep HTTP mechanics and normalization in `apps/web/src/api`; UI consumes domain hooks/adapters.
- Typed scan-session contracts MAY contain reviewed stickers, confidence, and manual overrides. Notation solve UI MUST NOT expose facelet, Kociemba, or raw cube-state inputs.
- Keep API load, form, page workflow, solve result, scanner review, and visualization playback state separately owned unless a focused page owner coordinates them.
- Use the active `@rubiks-cube-solver/rubiks-cube` package as a visualization adapter, never as canonical solver state.

## Web Runtime And Locales

- Preserve static rendering for indexable routes, `hydrateRoot` for generated markup, and SPA navigation after hydration.
- Keep `en-US` canonical without a prefix. Publish/index any of the nine supported locales only when its visible and SEO content is fully translated with placeholder parity.
- Treat route slugs as stable identifiers. They need not be English and MUST NOT vary by locale; slug changes require redirects and canonical planning.
- Keep route/page code in its bounded context and shared code behind a demonstrated cross-context consumer.

## Existing Patterns

- Prefer local state first, React Query for server state, and existing scoped Zustand stores only for genuinely shared client state.
- Use existing Radix-backed primitives for complex interaction semantics. Use the shared `cn` helper in shadcn-style primitives and established `classnames` as `cls` in feature code when Tailwind conflict resolution is unnecessary.
- React Hook Form and Zod MAY be used when nearby code or form/schema complexity warrants them; they are not mandatory setup.
- New dependencies require the concrete checks in `frontend-quality-rules.md`.

## React Compiler

- `apps/web` uses React 19 with React Compiler enabled through the Vite React compiler preset. Write ordinary components and hooks and let the compiler provide memoization.
- Do not add `useMemo`, `useCallback`, `React.memo`, or other manual render memoization. Do not make referential identity a correctness requirement for effects, subscriptions, or child props.
- Do not use `forwardRef`. React 19 components accept `ref` as a prop; type DOM-forwarding components with `ComponentPropsWithRef` and pass that prop to the owning element. A deliberate non-DOM imperative handle MAY use that prop with `useImperativeHandle`.
- Use `useEffectEvent` when a callback registered by an effect must read the latest props or state without re-subscribing. Keep effect dependencies focused on the values that define the subscription lifecycle.
- Keep derived values and event callbacks as ordinary render-time code. Preserve no legacy memoization solely because it existed before the compiler.
- Do not read from or write to mutable refs during render, except for one-time initialization that React explicitly permits. Put imperative ref synchronization in effects or event handlers.
- Compiler skips unsafe functions rather than changing behavior. Fix Rules of React violations instead of adding blanket opt-outs; use `"use no memo"` only as a short-lived, documented containment for a verified compiler issue.

## Verification

- Run web build, lint, and targeted tests for changed behavior. Web lint runs Biome plus the official React Hooks/Compiler diagnostics and rejects manual memoization imports.
- Treat `npm run build` as the compiler integration check because it exercises both the client bundle and the SSG build.
- Run SSG/SEO and E2E checks when routing, locales, metadata, hydration, scanner, timer, or solve flows change.

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
- Keep web API request and hook tests in the nearest API-domain `__tests__` directory, including the established root, client, and domain-level locations; use shared helpers under `apps/web/src/test`.
- Keep `apps/web/src/core` tests under `apps/web/src/core/<category>/__tests__/<name>.test.ts`.
- Keep global `web` coverage thresholds at 90% for statements, branches, functions, and lines.

## Never

- Do not rely on random tests without a fixed seed.
- Do not assert implementation details when public cube behavior can be asserted.
- Do not leave focused-only tests such as `.only` in committed test files.
- Do not add duplicate test helpers when nearby crate, web, API, or scanner helpers already cover the setup.
- Do not add tests for future surfaces that do not exist yet.
- Do not use Jest-only APIs or `jest.mock` patterns in Vitest tests.
- Do not place `web` tests as loose sibling `*.test.ts(x)` files when a nearby `__tests__/` folder is available.
- Do not add duplicate web test helpers when `apps/web/src/test/render.tsx` or `apps/web/src/test/api.ts` already covers the setup.
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

## Reference: `ai/architecture/api-boundary.md`

# API Boundary Architecture

`crates/api` is a native Axum HTTP and static-serving boundary around the Rust solver engine.

## Current Routes And Layout

- `crates/api/src/routes.rs` owns route composition, HTTP layers, static file serving, and handlers. Focused modules own configuration, request/response types, puzzle dispatch, scan analysis, solve preparation, and state.
- Health routes are `/health`, `/livez`, and `/readyz`.
- Solver routes include `/puzzles`, `/puzzles/{puzzle_slug}`, `/puzzles/{puzzle_slug}/strategies`, `/puzzles/{puzzle_slug}/solve`, legacy `/strategies`, `/solve-notation`, and `/solve-scan`.
- Scan routes include `/scan/analyze-face`, `/scan/solve-session`, and `/puzzles/{puzzle_slug}/scan/solve-session`.
- When serving web output, `/api/wca-data` is a server-side permanent redirect (HTTP 308) to `/api/wca-data/v1/docs`; unknown `/api/*` paths return 404 instead of static HTML.
- When serving web output, legacy `/algoritmos` prefixes redirect permanently to the corresponding `/algorithms` path while preserving locale prefixes, suffixes, and query strings.

## Contract And Safety

- Request and response structs, stable status strings, limits, and runtime response validation form the frontend contract.
- The API validates request size and cost before expensive work, uses bounded solver concurrency, and verifies solutions by replay.
- Generated pruning-table availability, corrupt artifacts, overload, worker failure, invalid notation/state, and exhausted limits remain explicit typed outcomes.
- Typed scan-session requests MAY include reviewed stickers and manual overrides. Browser notation endpoints MUST remain move-notation based and MUST NOT accept raw facelet/Kociemba input modes.

## Frontend Boundary

- `apps/web/src/api` owns request construction, runtime validation, response normalization, and React Query hooks. Shared transport code lives under `apps/web/src/api/client`.
- Components consume typed API-domain hooks or adapters rather than raw HTTP responses, query keys, or duplicated status parsing.
- WCA Data requests target the independent `/api/wca-data/v1` service contract; Axum does not implement those data endpoints.

## Test Shape

- Rust API behavior and router contracts are tested in `crates/api/src/tests.rs` and focused crate test modules.
- Web request and hook tests live beside their API domain in `__tests__` directories, including `apps/web/src/api/__tests__`, `apps/web/src/api/client/__tests__`, and domain-level `__tests__`.
- Contract changes require success, error, limit, and frontend normalization coverage for affected behavior.
