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
