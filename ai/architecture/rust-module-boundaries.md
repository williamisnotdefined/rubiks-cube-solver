# Rust Module Boundaries

Rust module structure should make the cube domain and solver flow easier to read without adding speculative abstraction.

## Crate Boundaries

- `crates/cube-engine` owns cube state, moves, validation, search, heuristics, pruning tables, solver orchestration, and reports.
- `crates/api` owns HTTP routing, request and response types, CORS, API safety caps, generated solver loading, and HTTP error mapping.
- `web` renders UI and calls the API; it should not receive solver internals.
- `scanner` owns Python scanner runtime and offline scanner model tooling; it should not receive solver internals.

## Module Shape

Use a facade module when preserving public paths matters:

```txt
solver/
  mod.rs          # public facade and reexports
  config.rs
  dispatch.rs
  errors.rs
  input.rs
  playback.rs
  result.rs
  strategy.rs
```

Prefer narrow files named after concrete responsibilities. Good seams in this repository include:

- `errors`: typed error enums and `Display` implementations.
- `metadata`: stable artifact, report, or solver metadata structs.
- `table` / `artifact`: pruning-table representation and binary IO.
- `coordinates`: phase or cubie coordinate structs and checked conversions.
- `ordering`: deterministic move ordering and pruning predicates.
- `dispatch`: public solver strategy selection.
- `responses`: API response mapping.

## DDD Mapping For This Project

- Domain: cubies, moves, coordinates, facelets, invariants, and pure transformations.
- Application/use case: solver entry points, strategy dispatch, replay verification, and reports.
- Infrastructure/adapters: Axum handlers, local artifact loading, CLI binaries, and filesystem writes.

## Visibility

- Public crate exports should be intentional and stable once used by API, frontend, tests, or binaries.
- Internal helpers should stay `pub(crate)` or private to their parent module.
- Traits are useful for real boundaries such as swappable artifacts or external inference, not for ordinary helper extraction.
