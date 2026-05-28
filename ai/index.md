# AI Knowledge Base

This directory is the source of truth for AI guidance used in this repository.

The goal is a project-specific AI knowledge base for the Rubik's Cube solver, not a folder of generic prompts. Reusable knowledge lives in `rules`, `architecture`, `glossary`, and `examples`. Task workflows live in `skills` and reference that reusable context through `ai/registry.json`.

## Structure

```txt
ai/
  rules/
  architecture/
  glossary/
  examples/
  skills/
  registry.schema.json
  registry.json
  index.md
```

## Folder Responsibilities

- `rules`: global and domain-specific constraints, conventions, and anti-patterns.
- `architecture`: system explanations, ownership boundaries, and integration points.
- `glossary`: cube and solver vocabulary.
- `examples`: small real project examples that demonstrate conventions.
- `skills`: task-oriented workflows that orchestrate reusable context.

## Supported Tools

- OpenCode routes: `.opencode/skills/<skill-name>/SKILL.md`.
- Cursor routes: `.cursor/rules/<skill-name>.mdc`.
- GitHub Copilot routes: `.github/instructions/<skill-name>.instructions.md`.

Tool-specific folders are generated. Do not edit `.opencode`, `.cursor`, or `.github` AI route files manually.

## How Routing Works

`ai/registry.json` defines each routed skill and its references.

Each skill entry should include:

- `name`: tool route name.
- `description`: when the skill should be used.
- `canonicalPath`: workflow file under `ai/skills`.
- `references`: `rules`, `architecture`, `glossary`, and `examples` files the skill needs.
- `routes`: generated destination files.
- `toolConfig`: Cursor and GitHub route metadata.

`project-core` is the only global skill. Cursor may use `alwaysApply: true` only for skills marked with `"global": true`; task-specific skills should stay opt-in.

## Current Skills

- `project-core`: always-on repository baseline for roadmap alignment, boundaries, verification, and AI knowledge maintenance.
- `repository-engineering-guidelines`: repository-wide engineering standards, workspace commands, AI knowledge maintenance, and final verification.
- `rust-module-refactor`: Rust file splitting, module facades, visibility, and behavior-preserving refactor workflow.
- `cube-engine`: Rust cube representation, moves, notation, scrambles, and cube validation.
- `solver-search`: BFS, IDDFS, IDA*, heuristics, pruning, and pattern database work.
- `api-boundary`: Axum HTTP API, API validation, generated solver loading, solve-status contracts, and web API-client behavior.
- `frontend-visualization`: web UI, 3D visualization, playback, and frontend-to-API boundary.
- `frontend-componentization`: React component extraction, page composition, and frontend file ownership in `apps/web`.
- `frontend-state-management`: frontend state ownership, custom hooks, API load/result flow, and visualization synchronization.
- `frontend-form-validation`: solve controls, scramble inputs, frontend limit validation, and notation-only form behavior.
- `frontend-styling`: CSS, responsive layout, visual treatment, and cube visualization sizing in `apps/web`.
- `react-query-request-hooks`: React Query API hooks, request functions, query keys, and response normalization in `apps/web`.

## Adding Knowledge

Choose the narrowest reusable location first:

- Add a `rules/*` file for durable constraints and anti-patterns.
- Add an `architecture/*` file for flows, ownership, lifecycle, or system boundaries.
- Add a `glossary/*` file for domain terms or naming meaning.
- Add an `examples/*` file for a focused real project pattern.
- Add or change a `skills/*` file only for task workflow.

Every example must include:

- `Source: ` with a real project file path and SHA-256 hash.
- `Why this is canonical:` explaining the project convention it demonstrates.

## Adding A Skill

1. Create `ai/skills/<skill-name>.md`.
2. Keep the skill small: goal, read-first references, workflow, expected output, verification.
3. Add the skill to `ai/registry.json`.
4. Add all reusable context files to the skill's `references` array.
5. Run `npm run ai:sync`.
6. Run `npm run ai:check`.

## Validation

- `npm run ai:sync` writes generated routes and removes orphan generated routes.
- `npm run ai:check` verifies registry entries, references, generated route content, orphan routes, registered canonical skills, `Read First` parity, and example hashes.
- `npm run lint` runs `ai:check`.

## Anti-Patterns

- Do not teach generic React, Rust, TypeScript, Python, or programming advice in skills.
- Do not duplicate architecture explanations across skills.
- Do not duplicate global rules across skills.
- Do not create generated route content by hand.
- Do not add a new skill when a reusable rule, architecture doc, glossary entry, or example would better solve the context gap.
