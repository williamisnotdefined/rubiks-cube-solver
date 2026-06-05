# Repository Engineering Guidelines

Use this skill for repository-wide code changes, refactors, bug fixes, feature work, AI knowledge changes, and final verification.

## Goal

Make changes that preserve project boundaries, roadmap order, existing conventions, and the smallest-correct-change style used in this repository.

## Read First

- `ai/rules/repository-rules.md`
- `ai/rules/testing-rules.md`
- `ai/rules/ai-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/ai-knowledge-system.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Identify the narrowest affected boundary.
- Read nearby code, current tests, and roadmap context before editing.
- Check whether `cube-engine`, `solver-search`, `api-boundary`, or `frontend-visualization` applies.
- Follow existing naming, layout, imports, and error handling before adding a new pattern.
- Decide verification before editing: bug fixes need regression tests, behavior changes need targeted behavior tests, and AI knowledge changes need sync checks.
- Before an AI-created commit or pull request, run `cargo clippy --all-targets --all-features -- -D warnings` from the repository root when the Rust toolchain is available.
- Keep generated AI routes synchronized through `npm run ai:sync`.

## Expected Output

- Code follows existing workspace layout and naming.
- Shared abstractions are added only when current code needs them.
- Verification commands match the affected area and are reported clearly.
- Generated AI routes are synchronized from canonical files, not edited manually.

## Verification

- Run targeted tests or checks for the changed area first.
- Run `npm run ai:check` for AI changes.
- Run `cargo test` for Rust changes when Rust is installed.
- Run `npm run build` and `npm run lint -w @rubiks-cube-solver/web` for web changes when dependencies are installed.
- Run `cargo clippy --all-targets --all-features -- -D warnings` before committing, pushing, or opening/updating a PR when the AI is asked to do those GitHub actions.
