# Project Core

Use this skill as the always-on repository baseline for AI-assisted changes anywhere in the Rubik's Cube solver.

## Goal

Keep every change aligned with Rust engine boundaries, cube domain language, current project priorities, verification flow, and AI knowledge maintenance rules.

## Read First

- `ai/rules/repository-rules.md`
- `ai/rules/testing-rules.md`
- `ai/rules/ai-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/ai-knowledge-system.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Start from `docs/project-plan.md`, nearby code, tests, and source docs before changing behavior.
- Create or switch to a dedicated task branch before changing files; never work or commit directly on `main`.
- Apply a narrower skill when the task touches cube engine, solver search, API boundary, frontend visualization, or AI knowledge.
- Keep solver logic in Rust and keep AI routes generated.
- Run targeted verification first, then broader checks when a change crosses boundaries.

## Expected Output

- Code follows the current repository boundaries and documented priorities.
- Generated AI route files are never edited manually.
- Final reporting names verification that was run or explains why it was blocked.

## Verification

- Run `npm run ai:check` after AI knowledge changes.
- Run `cargo test -p cube-engine` after engine changes when Rust is installed.
