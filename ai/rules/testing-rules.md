# Testing Rules

Testing rules for this repository.

## Always

- Add Rust unit tests next to pure functions when behavior is introduced.
- Add integration tests under the owning crate when behavior crosses module boundaries.
- Test observable cube behavior: solved state, inverse moves, notation parsing, scramble inversion, validation, and search output.
- Keep algorithm tests deterministic.
- Run the narrowest test first, then the affected crate test command.

## Never

- Do not rely on random tests without a fixed seed.
- Do not assert implementation details when public cube behavior can be asserted.
- Do not add ML, frontend, or WASM tests before the corresponding project phase exists.

## Verification

- Cube engine tests: `cargo test -p cube-engine`.
- Workspace tests: `cargo test`.
- AI routes: `npm run ai:check`.
