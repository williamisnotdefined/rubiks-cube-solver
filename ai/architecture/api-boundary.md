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
