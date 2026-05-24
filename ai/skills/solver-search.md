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
