# Rust Module Refactor

Use this skill when splitting large Rust files, changing `mod.rs` facades, moving tests, tightening visibility, or improving Rust module boundaries without changing behavior.

## Goal

Make Rust code easier to read and maintain by extracting concrete responsibilities while preserving public API, solver behavior, artifact compatibility, and verification coverage.

## Read First

- `ai/rules/rust-module-refactor-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/rust-module-boundaries.md`
- `ai/glossary/cube-terms.md`

## Related References

- Use `cube-engine` when the refactor touches cube state, moves, notation, facelets, or validation.
- Use `solver-search` when the refactor touches search, heuristics, pruning tables, or two-phase internals.
- Use `api-boundary` when the refactor touches Axum routes, request/response structs, or frontend-facing status contracts.

## Workflow

- Identify the current public API and preserve it with facade modules and `pub use` before moving implementation details.
- Split one responsibility at a time: errors, config, result types, parsing, conversion, dispatch, table IO, search traversal, ordering, or tests.
- Prefer private modules and `pub(crate)` exports unless an existing caller needs the item.
- Keep mechanical moves separate from algorithm, heuristic, format, or contract changes.
- Move tests only when the new location makes the behavior owner clearer.
- Run targeted tests after each module family, then broader crate tests after a larger boundary is stable.

## Expected Output

- Large Rust files shrink into focused modules with stable facades.
- Public imports used by API, bins, tests, and frontend contracts keep compiling.
- No solver behavior, artifact format, strategy metadata, or API response semantics changes during mechanical extraction.

## Verification

- Run `cargo fmt --check` after Rust module changes.
- Run `cargo test -p cube-engine` after engine or solver module refactors.
- Run `cargo test -p rubiks-cube-solver-api` after API module refactors.
- Run `npm run ai:check` after AI knowledge changes.
