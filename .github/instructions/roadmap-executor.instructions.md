---
applyTo: "ai/roadmap/**/*,scripts/roadmap/**/*.mjs,scripts/autopilot/**/*.mjs,scripts/autopilot/prompts/*.md,ai/skills/roadmap-executor.md,package.json"
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../ai/skills/roadmap-executor.md`.

Referenced context:
- `../../ai/rules/roadmap-autopilot-rules.md`
- `../../ai/rules/repository-rules.md`
- `../../ai/rules/testing-rules.md`
- `../../ai/rules/ai-rules.md`
- `../../ai/architecture/roadmap-autopilot.md`
- `../../ai/architecture/ai-knowledge-system.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: roadmap-executor

## Canonical Skill: `ai/skills/roadmap-executor.md`

# Roadmap Executor

Use this skill when changing roadmap automation, `ai/roadmap/execution.json`, `scripts/roadmap`, `scripts/autopilot`, or unattended execution behavior.

## Goal

Keep the roadmap autopilot safe, resumable, deterministic, and aligned with the roadmap execution queue.

## Read First

- `ai/rules/roadmap-autopilot-rules.md`
- `ai/rules/repository-rules.md`
- `ai/rules/testing-rules.md`
- `ai/rules/ai-rules.md`
- `ai/architecture/roadmap-autopilot.md`
- `ai/architecture/ai-knowledge-system.md`

## Workflow

- Validate `ai/roadmap/execution.json` with `npm run roadmap:check` after any queue edit.
- Keep autopilot defaults on `openai/gpt-5.5` and variant `xhigh`.
- Treat `queue[0]` as the next and only current task.
- Keep unattended implementation scoped to one roadmap step per commit.
- Keep roadmap reconciliation as a separate pass and commit after each verified implementation step.
- Keep final git state transitions owned by `scripts/autopilot/run-roadmap.mjs`.
- Preserve `history` and `blocked` when reconciling the queue.
- Prefer stopping with logs over trying unsafe recovery.
- Regenerate AI routes with `npm run ai:sync` after skill or registry changes.

## Expected Output

- Roadmap automation can be dry-run with `npm run autopilot:roadmap -- --dry-run`.
- Roadmap reconciliation can update future queue items without touching source code.
- Generated route files are synchronized from canonical AI knowledge.
- CI continues to validate Rust, AI routes, and roadmap execution metadata.

## Verification

- `npm run roadmap:check`
- `npm run ai:check`
- `npm run lint`
- `npm run autopilot:roadmap -- --dry-run`

# Referenced Context

## Reference: `ai/rules/roadmap-autopilot-rules.md`

# Roadmap Autopilot Rules

Rules for unattended roadmap execution.

## Always

- Run roadmap automation from a clean worktree.
- Execute one roadmap step at a time and commit only after verification passes.
- Use `openai/gpt-5.5` with variant `xhigh` for autonomous implementation attempts.
- Keep `ai/roadmap/execution.json` as the operational source of truth.
- Keep generated logs under `.autopilot`, which is gitignored.
- Stop at the first persistent blocker and leave a report instead of hiding failure.
- Preserve small, reviewable commits with the step's configured commit message.
- Run the roadmap reconciler after each verified implementation step unless explicitly disabled for debugging.
- Keep `queue[0]` as the only next executable task.
- Keep completed work in `history` and unresolved failures in `blocked`.

## Never

- Do not run unattended automation on dirty worktrees.
- Do not bypass failing verification commands.
- Do not mutate `main` directly by default; use an autopilot branch unless explicitly configured otherwise.
- Do not let the implementation agent commit, push, or mark roadmap steps done.
- Do not let the reconciliation agent edit files other than `ai/roadmap/execution.json`.
- Do not rewrite or delete `history` and `blocked` records during reconciliation.
- Do not use destructive git commands to recover from failed automation.
- Do not commit large generated datasets, model checkpoints, or autopilot logs.

## Verification

- `npm run roadmap:check` validates operational roadmap shape and dependencies.
- `npm run roadmap:status` shows progress.
- `npm run roadmap:next` shows the next runnable step.
- `npm run autopilot:roadmap -- --dry-run` verifies the selected next step without implementation.

## Queue Reconciliation

- The implementation phase may change code and tests for the current `queue[0]` task.
- The reconciliation phase may only update the future `queue` in `ai/roadmap/execution.json`.
- Reconciliation may split, add, remove, or reorder queued tasks based on the current repository state.
- Reconciliation must not mark tasks complete; only the runner moves verified tasks from `queue` to `history`.

## Reference: `ai/rules/repository-rules.md`

# Repository Rules

Global rules for changes anywhere in this repository.

## Always

- Read `roadmap.md`, nearby code, and current tests before changing behavior.
- Prefer the smallest correct change with the lowest surface area.
- Keep the implementation order aligned with the roadmap: cube representation, moves, search, heuristics, pattern databases, ML, then hybrid search.
- Keep solver logic in Rust engine code, not in frontend or AI tooling.
- Use cubie representation as the primary engine model.
- Run targeted verification for the affected area and report any environment blockers.
- Keep AI route files generated from canonical files under `ai`.

## Never

- Do not start with machine learning, reinforcement learning, or Transformers.
- Do not use sticker/color arrays as the primary solver representation.
- Do not mix UI rendering logic with cube engine logic.
- Do not edit `.opencode/skills`, `.cursor/rules`, or `.github/instructions` AI route files manually.
- Do not add compatibility layers or future abstractions without a concrete current consumer.

## Verification

- AI knowledge changes: `npm run ai:check`.
- Rust engine changes: `cargo test` when Rust is installed.
- Broad repository changes: run all available targeted checks.

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
- Do not add ML, frontend, or WASM tests before the corresponding project phase exists.

## Verification

- Cube engine tests: `cargo test -p cube-engine`.
- Workspace tests: `cargo test`.
- AI routes: `npm run ai:check`.

## Reference: `ai/rules/ai-rules.md`

# AI Rules

Rules for maintaining the AI knowledge base itself.

## Always

- Treat `ai` as the source of truth for AI guidance.
- Keep reusable knowledge in `rules`, `architecture`, `glossary`, and `examples`.
- Keep `skills` task-oriented: each skill should orchestrate references instead of duplicating them.
- Add every routed skill to `ai/registry.json`.
- Keep each skill's `## Read First` list identical to its `registry.json` `references` list.
- Run `npm run ai:sync` after changing canonical skills, registry entries, or referenced knowledge files.
- Run `npm run ai:check` before finishing AI knowledge changes.

## Never

- Do not edit generated route files manually.
- Do not place long architecture explanations inside skills when they belong in `architecture`.
- Do not place reusable coding rules inside skills when they belong in `rules`.
- Do not teach generic programming knowledge; document how this project works.
- Do not set Cursor `alwaysApply: true` outside the explicitly global `project-core` skill.

## Route Generation

- Generated route files are compiled from the canonical skill plus its registry references.
- Manual edits to generated route files are invalid and should be replaced by `npm run ai:sync`.

## Reference: `ai/architecture/roadmap-autopilot.md`

# Roadmap Autopilot Architecture

The roadmap autopilot converts the human roadmap into an operational queue that can be executed unattended in small verified commits.

## Source Files

- `roadmap.md`: strategic project roadmap.
- `ai/roadmap/execution.json`: operational stack with `queue`, `history`, and `blocked`.
- `scripts/roadmap/*.mjs`: validation and status commands for the operational queue.
- `scripts/autopilot/run-roadmap.mjs`: unattended runner for one or more roadmap steps.
- `scripts/autopilot/prompts/*.md`: prompts passed to `opencode run`.
- `.autopilot/`: gitignored runtime logs and failure output.

## Runner Flow

The autopilot runner:

- requires a clean worktree;
- switches to `autopilot/roadmap` by default;
- selects `queue[0]` as the next executable step;
- calls `opencode run --model openai/gpt-5.5 --variant xhigh`;
- runs the step's verification commands;
- retries failures up to `--max-attempts`;
- moves the verified step from `queue` to `history`;
- commits and pushes each completed step;
- runs a roadmap reconciliation pass;
- commits and pushes reconciliation changes separately when the queue changes.

## Safety Boundaries

The implementation agent is instructed not to commit, push, change branches, or edit `ai/roadmap/execution.json`. The runner owns state transitions and git operations.

The reconciliation agent is instructed to edit only `ai/roadmap/execution.json`. It may modify the future `queue`, but it must preserve `history` and `blocked` records and must not mark tasks complete.

The runner should stop on unresolved failures instead of continuing to later phases with a broken base.

## Execution File Semantics

- `queue[0]`: next task to implement.
- `queue[1..]`: future tasks that the reconciler may refine.
- `history`: verified tasks already committed by the runner.
- `blocked`: tasks removed from the queue after persistent automation failure.

## Reference: `ai/architecture/ai-knowledge-system.md`

# AI Knowledge System Architecture

`ai` is the canonical AI knowledge base for this repository.

## Source Layers

- `rules`: reusable constraints, conventions, and anti-patterns.
- `architecture`: system boundaries and integration points.
- `glossary`: cube and solver vocabulary.
- `examples`: small real project examples that demonstrate conventions.
- `skills`: task-oriented workflows that reference the other layers.

## Registry

`ai/registry.json` defines routed skills.

`ai/registry.schema.json` documents the registry shape and the sync script enforces the same structural constraints during `npm run ai:check`.

## Generated Routes

`scripts/ai/sync-routes.mjs` compiles each canonical skill and its references into tool routes:

- OpenCode: `.opencode/skills/<skill-name>/SKILL.md`.
- Cursor: `.cursor/rules/<skill-name>.mdc`.
- GitHub Copilot: `.github/instructions/<skill-name>.instructions.md`.

Generated routes must not be edited manually.
