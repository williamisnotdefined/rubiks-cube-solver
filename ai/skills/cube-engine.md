# Cube Engine

Use this skill when adding or changing the Rust cube representation, moves, notation, scrambles, or cube validation.

## Goal

Build the pure Rust engine first, using cubie representation and deterministic behavior that later search algorithms can trust.

## Read First

- `ai/rules/cube-engine-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/cube-engine.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Keep work inside `crates/cube-engine` unless a current boundary requires otherwise.
- Start with cubie state invariants before adding higher-level algorithms.
- Keep notation parsing and state mutation separate.
- Add tests for solved state, move/inverse behavior, and invalid notation as behavior appears.
- Fail explicitly for bootstrap placeholders rather than silently producing incorrect cube states.

## Expected Output

- Primary state remains corner/edge permutation and orientation.
- Move behavior is reversible and tested when implemented.
- No JavaScript visualization dependency enters the Rust engine.

## Verification

- Run `cargo test -p cube-engine` when Rust is installed.
- If Rust is unavailable, state the environment blocker clearly.
