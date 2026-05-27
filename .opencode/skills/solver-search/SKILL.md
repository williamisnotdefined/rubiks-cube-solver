---
name: "solver-search"
description: "Use when adding or changing BFS, IDDFS, IDA*, heuristics, pruning, or pattern database code."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/solver-search.md`.

Referenced context:
- `../../../ai/rules/solver-search-rules.md`
- `../../../ai/rules/testing-rules.md`
- `../../../ai/architecture/project-architecture.md`
- `../../../ai/architecture/solver-search.md`
- `../../../ai/architecture/cube-engine.md`
- `../../../ai/glossary/cube-terms.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: solver-search

## Canonical Skill: `ai/skills/solver-search.md`

# Solver Search

Use this skill when adding or changing BFS, IDDFS, IDA*, heuristics, pruning, or pattern database code.

## Goal

Add search behavior only on top of correct cube state and move semantics.

## Read First

- `ai/rules/solver-search-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/solver-search.md`
- `ai/architecture/cube-engine.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Verify cube move behavior before trusting search results.
- Start with shallow deterministic cases.
- Keep heuristics separate from traversal logic.
- Mark whether each heuristic is admissible.
- Add node/depth metrics for non-trivial algorithms.

## Expected Output

- Search returns explicit move sequences and metrics.
- Tests cover solved state and shallow known scrambles.
- No ML heuristic is introduced before deterministic search is complete.

## Verification

- Run `cargo test -p cube-engine` when Rust is installed.
- Include targeted tests for the changed search module.

# Referenced Context

## Reference: `ai/rules/solver-search-rules.md`

# Solver Search Rules

Rules for search, heuristics, and pattern database work.

## Always

- Keep search algorithms in `crates/cube-engine/src/search` unless a later crate boundary is introduced.
- Keep heuristics explicit about admissibility.
- Prefer IDDFS and IDA* for bounded memory search after move tables are correct.
- Prune inverse moves and repeated same-axis branches where correctness allows it.
- Measure node counts and depth limits for non-trivial search changes.

## Never

- Do not depend on brute force as the final strategy.
- Do not mix pattern database generation with runtime search unless the boundary is explicit.
- Do not add learned heuristics before deterministic heuristics and validation are available.
- Do not claim optimality unless the heuristic and search mode guarantee it.

## Verification

- Test solved states return an empty solution.
- Test shallow scrambles with known inverse solutions.
- Test heuristic lower bounds on solved and simple states.

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

## Reference: `ai/architecture/solver-search.md`

# Solver Search Architecture

Search builds on top of a correct cube engine.

## Planned Layers

- BFS for shallow correctness checks and baseline behavior.
- IDDFS for bounded depth exploration.
- A* for heuristic search concepts and validation.
- IDA* as the main memory-efficient optimal search path.
- Pattern databases for fast admissible lower bounds.
- Learned value heuristics only after deterministic search and datasets exist.

## Boundaries

- Search functions should accept cube states and return move sequences plus metrics.
- Heuristics should be explicit about admissibility and input assumptions.
- Pattern database generation should be separated from runtime lookup.

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
