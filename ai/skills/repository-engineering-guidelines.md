# Repository Engineering Guidelines

Use this skill for repository-wide code changes, refactors, bootstrap work, and final verification.

## Goal

Make changes that preserve project boundaries, roadmap order, and the smallest-correct-change style used in this repository.

## Read First

- `ai/rules/repository-rules.md`
- `ai/rules/testing-rules.md`
- `ai/rules/ai-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/ai-knowledge-system.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Identify the narrowest affected boundary.
- Read nearby code and roadmap context before editing.
- Check whether `cube-engine`, `solver-search`, or `frontend-visualization` applies.
- Decide verification before editing.
- Keep generated AI routes synchronized through `npm run ai:sync`.

## Expected Output

- Code follows existing workspace layout and naming.
- Shared abstractions are added only when current code needs them.
- Verification commands match the affected area and are reported clearly.

## Verification

- Run targeted tests or checks for the changed area first.
- Run `npm run ai:check` for AI changes.
- Run `cargo test` for Rust changes when Rust is installed.
