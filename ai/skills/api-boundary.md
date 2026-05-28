# API Boundary

Use this skill when adding or changing `crates/api`, Axum routes, request or response structs, API validation, CORS, generated solver loading, solve-status contracts, or `apps/web/src/api` client behavior.

## Goal

Keep the HTTP API as a thin, typed boundary around the Rust solver engine while preserving the notation-only frontend contract.

## Read First

- `ai/rules/api-rules.md`
- `ai/rules/frontend-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/api-boundary.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Inspect nearby route, request, response, API-client, and test patterns before editing.
- Keep handlers focused on HTTP extraction, validation, solver dispatch, and response mapping.
- Keep search, cube validation, notation semantics, heuristics, and pruning logic in `cube-engine`.
- Preserve notation-only solve requests; do not add browser-facing facelet or Kociemba input modes.
- Update `apps/web/src/api` normalization when API response fields, status strings, or error kinds change.
- Add or update API tests around observable contract behavior, especially error responses consumed by the frontend.

## Expected Output

- API routes stay thin and typed.
- Safety caps are enforced before expensive solver work.
- Response statuses and metadata remain stable or are updated with matching frontend API-client changes.
- Browser clients submit move notation and limits, never facelet strings.
- Solver logic remains in Rust engine code.

## Verification

- Run `npm run api:test` or `cargo test -p rubiks-cube-solver-api` for API changes.
- Run `cargo test -p cube-engine` when API behavior depends on engine changes.
- Run `npm run build` and `npm run lint -w @rubiks-cube-solver/web` when `apps/web/src/api` changes.
- Run `npm run ai:check` after AI knowledge changes.
