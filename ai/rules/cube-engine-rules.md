# Cube Engine Rules

Rules for the Rust cube engine.

## Always

- Use cubie representation as the primary state model: corner permutation, corner orientation, edge permutation, and edge orientation.
- Keep move application pure and deterministic.
- Make every implemented move reversible and test the inverse path.
- Validate state invariants before solver algorithms depend on them.
- Keep notation parsing separate from state mutation.
- Keep serialization explicit and stable once external consumers exist.

## Never

- Do not represent the primary engine as face colors, sticker arrays, or strings.
- Do not depend on JavaScript visualization libraries in the Rust core.
- Do not let search code mutate cube state through hidden global state.
- Do not add ML heuristics before classic move tables and deterministic search are correct.

## Verification

- Test solved-state invariants.
- Test move/inverse pairs.
- Test parser rejection for invalid notation.
- Run `cargo test -p cube-engine` when Rust is installed.
