---
name: "repository-engineering-guidelines"
description: "Use for repository-wide engineering standards, workspace commands, and final verification."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/repository-engineering-guidelines.md`.

Referenced context:
- `../../../ai/rules/repository-rules.md`
- `../../../ai/rules/testing-rules.md`
- `../../../ai/rules/ai-rules.md`
- `../../../ai/architecture/project-architecture.md`
- `../../../ai/architecture/ai-knowledge-system.md`
- `../../../ai/glossary/cube-terms.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: repository-engineering-guidelines

## Canonical Skill: `ai/skills/repository-engineering-guidelines.md`

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

# Referenced Context

## Reference: `ai/rules/repository-rules.md`

# Repository Rules

Global rules for changes anywhere in this repository.

## Always

- Read `roadmap.md`, nearby code, and current tests before changing behavior.
- Prefer the smallest correct change with the lowest surface area.
- Follow existing naming, file layout, import style, error handling, and command style before introducing a new pattern.
- Keep the implementation order aligned with the roadmap: cube representation, moves, search, heuristics, pattern databases, ML, then hybrid search.
- Keep solver logic in Rust engine code, not in frontend or AI tooling.
- Use cubie representation as the primary engine model.
- Keep workspace-specific code inside the owning workspace unless there is a current cross-workspace consumer.
- Use repository-root commands such as `npm run ai:check`, `npm run api:test`, `npm run build`, and `cargo test` so paths and workspaces resolve consistently.
- Run targeted verification for the affected area and report any environment blockers.
- Before any AI-created commit or pull request, run `cargo clippy --all-targets --all-features -- -D warnings` from the repository root when the Rust toolchain is available.
- Keep AI route files generated from canonical files under `ai`.

## Never

- Do not start with machine learning, reinforcement learning, or Transformers.
- Do not use sticker/color arrays as the primary solver representation.
- Do not mix UI rendering logic with cube engine logic.
- Do not commit `.env` files, raw secrets, API tokens, model artifacts with private data, or local solver output that is not intended for source control.
- Do not edit `.opencode/skills`, `.cursor/rules`, or `.github/instructions` AI route files manually.
- Do not add compatibility layers or future abstractions without a concrete current consumer.
- Do not add a new formatter, linter, framework, or workspace-wide tool unless explicitly requested.

## Verification

- AI knowledge changes: `npm run ai:check`.
- Rust engine changes: run the narrowest relevant `cargo test` first, then `cargo test -p cube-engine` or `cargo test` when Rust is installed.
- API changes: `npm run api:test` or the relevant `cargo test -p rubiks-cube-solver-api` target.
- Web changes: `npm run build` and `npm run lint -w @rubiks-cube-solver/web` when dependencies are installed.
- Broad repository changes: run affected targeted checks first, then broader checks only when the change crosses boundaries.
- Commit and PR requests: run `cargo clippy --all-targets --all-features -- -D warnings` before committing, pushing, or opening/updating the PR, or report the environment blocker if it cannot run.

## Reference: `ai/rules/testing-rules.md`

# Testing Rules

Testing rules for this repository.

## Always

- Add Rust unit tests next to pure functions when behavior is introduced.
- Add integration tests under the owning crate when behavior crosses module boundaries.
- Add regression tests next to changed behavior when fixing bugs.
- Test observable cube behavior: solved state, inverse moves, notation parsing, scramble inversion, validation, and search output.
- Test HTTP/API behavior through request and response contracts when `crates/api` behavior changes.
- Test web API-client and UI behavior through public component or request boundaries when frontend behavior changes.
- Test ML and dataset code with deterministic fixtures or fixed seeds.
- Keep algorithm tests deterministic.
- Run the narrowest test first, then the affected crate test command.
- Use Vitest APIs such as `describe`, `it`, `expect`, `vi.fn`, and `vi.spyOn` for `apps/web` unit and component tests.
- Keep `apps/web` tests in `__tests__/` folders beside the source area they cover.
- Use Testing Library for React component behavior and public accessibility queries.
- Keep `apps/web/src/api` request and hook tests in `apps/web/src/api/__tests__`, using shared fetch and React Query helpers under `apps/web/src/test`.
- Keep `apps/web/src/core` tests under `apps/web/src/core/<category>/__tests__/<name>.test.ts`.
- Keep `apps/web` coverage thresholds at 95% or higher for statements, branches, functions, and lines when coverage is configured.

## Never

- Do not rely on random tests without a fixed seed.
- Do not assert implementation details when public cube behavior can be asserted.
- Do not leave focused-only tests such as `.only` in committed test files.
- Do not add duplicate test helpers when nearby crate, web, API, or ML helpers already cover the setup.
- Do not add tests for future surfaces that do not exist yet.
- Do not use Jest-only APIs or `jest.mock` patterns in Vitest tests.
- Do not place `apps/web` tests as loose sibling `*.test.ts(x)` files when a nearby `__tests__/` folder is available.
- Do not add duplicate web test helpers when `apps/web/src/test/render.tsx` or `apps/web/src/test/api.ts` already covers the setup.

## Verification

- Cube engine tests: `cargo test -p cube-engine`.
- API tests: `npm run api:test` or `cargo test -p rubiks-cube-solver-api`.
- Workspace tests: `cargo test`.
- Web build/lint: `npm run build` and `npm run lint -w @rubiks-cube-solver/web`.
- Web unit tests: `npm run test -w @rubiks-cube-solver/web`.
- Web coverage: `npm run test:coverage -w @rubiks-cube-solver/web`.
- Web Storybook: `npm run storybook:build -w @rubiks-cube-solver/web`.
- End-to-end tests: `npm run test:e2e` after the API, web app, and pruning-table prerequisites are available.
- ML tests: `python -m pytest ml`.
- Product gate: `npm run product:gate` for release-level or cross-boundary validation.
- AI routes: `npm run ai:check`.

## Reference: `ai/rules/ai-rules.md`

# AI Rules

Rules for maintaining the AI knowledge base itself.

## Always

- Treat `ai` as the source of truth for AI guidance.
- Keep reusable knowledge in `rules`, `architecture`, `glossary`, and `examples`.
- Keep `skills` task-oriented: each skill should orchestrate references instead of duplicating them.
- Add every routed skill to `ai/registry.json`.
- Use `references` in `ai/registry.json` for every rule, architecture, glossary, or example file a skill depends on.
- Keep each skill's `## Read First` list identical to its `registry.json` `references` list.
- Add `Source: ` with a SHA-256 hash and `Why this is canonical:` to every file under `ai/examples`.
- Review and update example hashes when the referenced source file changes.
- Run `npm run ai:sync` after changing canonical skills, registry entries, or referenced knowledge files.
- Run `npm run ai:check` before finishing AI knowledge changes.

## Never

- Do not edit generated route files manually.
- Do not place long architecture explanations inside skills when they belong in `architecture`.
- Do not place reusable coding rules inside skills when they belong in `rules`.
- Do not teach generic programming knowledge; document how this project works.
- Do not create a new skill when a new reference document or example would solve the context gap.
- Do not set Cursor `alwaysApply: true` outside the explicitly global `project-core` skill.

## Route Generation

- Generated route files are compiled from the canonical skill plus its registry references.
- Manual edits to generated route files are invalid and should be replaced by `npm run ai:sync`.
- Orphan generated route files should be removed by `npm run ai:sync`.

## Reference: `ai/architecture/project-architecture.md`

# Project Architecture

The target is a hybrid Rubik's Cube solver with a Rust engine, search algorithms, heuristics, pattern databases, optional ML heuristics, a native HTTP API, and a modern web visualization.

## Current Structure

- `crates/cube-engine`: Rust crate for cube representation, moves, notation, scramble handling, search, and heuristics.
- `crates/api`: Axum HTTP API around the Rust engine and generated pruning-table artifacts.
- `apps/web`: Vite React app for notation-only solve requests, cube visualization, and playback-oriented UI.
- `datasets`: generated and fixture data for solver/ML experiments.
- `ml`: Python training and smoke-test code for learned value baselines.
- `ai`: canonical AI knowledge base and route generation system.
- `roadmap.md`: source roadmap and implementation order.

## Generated Artifacts

- Native pruning tables are generated by `cube-engine` binaries and loaded by `crates/api`.
- Solver quality reports and real-scramble gates are executable verification artifacts, not frontend behavior.
- ML datasets should be generated from deterministic Rust solver behavior before training code consumes them.

## Future Or Optional Boundaries

- `crates/wasm`: optional future wasm-bindgen bridge around the Rust engine if browser-local solving becomes a concrete roadmap item.
- Additional frontend routing, shared component libraries, or state managers should wait for current UI complexity to require them.

## Ownership

- Cube state, moves, validation, search, and heuristics belong in Rust.
- The API validates HTTP contracts, applies safety limits, calls Rust solver code, and returns typed solver results.
- Frontend code should only render, collect notation/limits, send solve requests, receive states, and play animations.
- ML code should consume generated datasets and expose learned heuristics only after deterministic search is correct.

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

Each skill entry defines the canonical skill file, its reusable references, generated route paths, and tool-specific matching metadata. The `## Read First` list in the canonical skill must match the registry `references` list exactly and in the same order.

## Generated Routes

`scripts/ai/sync-routes.mjs` compiles each canonical skill and its references into tool routes:

- OpenCode: `.opencode/skills/<skill-name>/SKILL.md`.
- Cursor: `.cursor/rules/<skill-name>.mdc`.
- GitHub Copilot: `.github/instructions/<skill-name>.instructions.md`.

Generated routes must not be edited manually.

`npm run ai:sync` writes stale routes and removes orphan generated routes. `npm run ai:check` verifies registry shape, reference files, generated content, route collisions, `Read First` parity, registered canonical skill files, and example hashes.

## Examples

Files under `ai/examples` must point to real repository source with `Source: ` and a SHA-256 hash, then explain `Why this is canonical:`. When the source changes, review the example and update the hash only if the example still represents the project convention.

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
