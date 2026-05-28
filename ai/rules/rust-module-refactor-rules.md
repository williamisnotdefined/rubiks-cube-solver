# Rust Module Refactor Rules

Rules for splitting Rust files, tightening module boundaries, and reducing refactor risk.

## Always

- Preserve observable behavior and public exports during structural refactors.
- Keep `mod.rs` or the original file as a facade when moving code into submodules.
- Use `pub use` only for the existing public crate API or a current cross-module consumer.
- Prefer `pub(crate)` for internal solver, table, helper, and adapter seams.
- Split by responsibility: types, errors, parsing, conversion, search traversal, table IO, report formatting, and tests.
- Move tests with the code only when it improves locality; otherwise keep behavior tests at the owning public boundary.
- Run `cargo fmt` after module moves and the narrowest relevant `cargo test` before broad tests.

## Never

- Do not change algorithms, heuristics, budgets, status strings, artifact formats, or API contracts as part of a file split.
- Do not introduce generic repositories, base services, traits, or compatibility layers without a concrete current boundary.
- Do not make private search or cube helpers public only to avoid arranging modules correctly.
- Do not move solver logic into `crates/api`, `apps/web`, `ml`, or AI tooling.
- Do not combine large search-performance changes with mechanical module extraction.

## Verification

- Run `cargo fmt --check` for every Rust module refactor.
- Run the crate-level test for the affected boundary: `cargo test -p cube-engine` or `cargo test -p rubiks-cube-solver-api`.
- Run targeted integration tests for facelets, generated two-phase, pruning, or solver quality when those files move.
