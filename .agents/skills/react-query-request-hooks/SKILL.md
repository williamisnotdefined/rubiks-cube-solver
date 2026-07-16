---
name: "react-query-request-hooks"
description: "Use when changing web requests, response validation, React Query hooks, mutations, or query keys."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/react-query-request-hooks.md`.

Referenced context:
- `../../../ai/rules/frontend-api-hook-rules.md`
- `../../../ai/rules/api-rules.md`
- `../../../ai/architecture/api-boundary.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: react-query-request-hooks

## Canonical Skill: `ai/skills/react-query-request-hooks.md`

# React Query Request Hooks

Use for web request functions, runtime response validation, query/mutation hooks, and query keys.

## Read First

- `ai/rules/frontend-api-hook-rules.md`
- `ai/rules/api-rules.md`
- `ai/architecture/api-boundary.md`

## Workflow

- Follow the owning API domain's current layout and keep transport code under `src/api/client`.
- Preserve typed API failures, transport errors, cancellation, and cache ownership.
- Expose hooks/adapters to UI, not raw requests or query keys.
- Add tests in the nearest API-domain `__tests__`, then run targeted tests and web build.

# Referenced Context

## Reference: `ai/rules/frontend-api-hook-rules.md`

# Frontend API Hook Rules

- Group API code by domain under `apps/web/src/api`; shared HTTP mechanics live under `apps/web/src/api/client`.
- Keep request functions free of React. UI consumes React Query hooks or domain adapters rather than raw requests, query keys, or `fetch`.
- Use queries for cached server state and mutations for user-triggered operations. Keep stable query keys, invalidation, runtime response validation, and normalization inside the API domain.
- Preserve stable API failure payloads as typed results and transport/invalid-JSON failures as errors; never fabricate fallback success metadata.
- Follow the nearest established operation layout instead of imposing a new directory template. Keep tests in that API domain's nearest `__tests__` directory.
- Cancel superseded requests where inputs, scanner frames, routes, or revisions can make a response stale.

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

## Reference: `ai/architecture/api-boundary.md`

# API Boundary Architecture

`crates/api` is a native Axum HTTP and static-serving boundary around the Rust solver engine.

## Current Routes And Layout

- `crates/api/src/routes.rs` owns route composition, HTTP layers, static file serving, and handlers. Focused modules own configuration, request/response types, puzzle dispatch, scan analysis, solve preparation, and state.
- Health routes are `/health`, `/livez`, and `/readyz`.
- Solver routes include `/puzzles`, `/puzzles/{puzzle_slug}`, `/puzzles/{puzzle_slug}/strategies`, `/puzzles/{puzzle_slug}/solve`, legacy `/strategies`, `/solve-notation`, and `/solve-scan`.
- Scan routes include `/scan/analyze-face`, `/scan/solve-session`, and `/puzzles/{puzzle_slug}/scan/solve-session`.
- When serving web output, `/api/wca-data` is a server-side permanent redirect (HTTP 308) to `/api/wca-data/v1/docs`; unknown `/api/*` paths return 404 instead of static HTML.

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
