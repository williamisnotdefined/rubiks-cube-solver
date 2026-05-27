---
name: "cube-engine"
description: "Use when adding or changing the Rust cube representation, moves, notation, scrambles, or cube validation."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/cube-engine.md`.

Referenced context:
- `../../../ai/rules/cube-engine-rules.md`
- `../../../ai/rules/testing-rules.md`
- `../../../ai/architecture/project-architecture.md`
- `../../../ai/architecture/cube-engine.md`
- `../../../ai/glossary/cube-terms.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: cube-engine

## Canonical Skill: `ai/skills/cube-engine.md`

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

# Referenced Context

## Reference: `ai/rules/cube-engine-rules.md`

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

## Reference: `ai/rules/testing-rules.md`

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
- Do not add ML, frontend, or API tests before the corresponding project phase exists.

## Verification

- Cube engine tests: `cargo test -p cube-engine`.
- Workspace tests: `cargo test`.
- AI routes: `npm run ai:check`.

## Reference: `ai/architecture/project-architecture.md`

# Project Architecture

The final target is a hybrid Rubik's Cube solver with a Rust engine, search algorithms, heuristics, pattern databases, optional ML heuristics, a native HTTP API, and a modern web visualization.

## Current Bootstrap

- `crates/cube-engine`: Rust crate for cube representation, moves, notation, scramble handling, search, and heuristics.
- `ai`: canonical AI knowledge base and route generation system.
- `roadmap.md`: source roadmap and implementation order.

## Future Boundaries

- `crates/api`: HTTP API around the Rust engine and generated pruning-table artifacts.
- `apps/web`: future TypeScript React visualization and playback UI.
- `datasets`: future generated training datasets.
- `ml`: future Python/PyTorch training code.

## Ownership

- Cube state, moves, validation, search, and heuristics belong in Rust.
- Frontend code should only render, send moves, receive states, and play animations.
- ML code should consume generated datasets and expose learned heuristics only after deterministic search is correct.

## Reference: `ai/architecture/cube-engine.md`

# Cube Engine Architecture

The cube engine is the first phase of the roadmap and must stay independent from UI, ML, and HTTP transport concerns.

## Modules

- `cube/cubies.rs`: cubie identifiers and primary cubie-state structure.
- `cube/moves.rs`: face move and turn definitions.
- `cube/notation.rs`: Singmaster notation parsing and formatting.
- `cube/scramble.rs`: scramble parsing and inversion utilities.
- `cube/state.rs`: high-level cube API over cubie state.
- `search/*`: search and heuristic modules that consume cube state.

## State Model

The primary representation is cubie based:

- corner permutation
- corner orientation
- edge permutation
- edge orientation

Sticker strings, Kociemba strings, and visual states can be adapters later, but they should not replace the core model.

## Bootstrap Boundary

The initial crate may expose API skeletons before move tables are complete. Any unimplemented behavior must fail explicitly instead of pretending to mutate cube state.

## Reference: `ai/glossary/cube-terms.md`

# Cube Terms

## Cubie

A physical movable piece of the cube. The core engine tracks cubies rather than face colors as the primary model.

## Corner

A cubie with three stickers. A 3x3 cube has eight corners.

## Edge

A cubie with two stickers. A 3x3 cube has twelve edges.

## Permutation

Which cubie occupies each position.

## Orientation

How a cubie is twisted or flipped in its current position.

## Move

A face turn such as `R`, `U`, `R'`, or `U2`.

## Scramble

A sequence of moves applied from the solved state to produce a valid cube state.

## Heuristic

An estimate of distance from a cube state to the solved state.

## Admissible Heuristic

A heuristic that never overestimates the true distance to the solved state.

## Pattern Database

A precomputed lookup table mapping partial cube states to minimum solution distances.

## Kociemba String

A facelet string format commonly used by two-phase solvers. It can be an adapter format, not the primary engine model.
