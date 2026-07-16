# API Boundary

Use for Axum routes, contracts, validation, solver loading, scan sessions, or the matching web API client.

## Read First

- `ai/rules/api-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/api-boundary.md`

## Workflow

- Inspect the focused route/response/solve modules and matching client contract.
- Keep engine semantics in Rust, HTTP limits and status mapping in Axum, and normalization in the web API domain.
- Preserve typed scan stickers and the server-side 308 WCA docs redirect where affected.
- Run API tests plus web tests/build when the browser contract changes.
