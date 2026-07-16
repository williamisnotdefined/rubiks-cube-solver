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
