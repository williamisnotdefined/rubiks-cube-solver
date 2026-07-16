# AI Knowledge System Architecture

`ai` is the canonical AI knowledge base for this repository.

## Source Layers

- `rules`: reusable constraints, conventions, and anti-patterns.
- `architecture`: system boundaries and integration points.
- `glossary`: cube and solver vocabulary.
- `skills`: task-oriented workflows that reference the other layers.

## Authority

Resolve contradictions in this order:

1. Executable contracts: checked types and schemas, tests, build output, and runtime behavior.
2. Accepted ADRs under `docs/adr`, with newer decisions superseding older decisions on the same subject.
3. Architecture documents in `ai/architecture`.
4. Rules in `ai/rules`.
5. Skills in `ai/skills`.

Executable behavior is not permission to preserve an accidental bug. When a task intentionally changes a contract, update the executable contract, affected ADR or architecture, rules, and routes in the same change. Skills only orchestrate references and verification.

Normative terms follow RFC-style strength: **MUST** is required, **SHOULD** is the default and needs a documented concrete reason to deviate, and **MAY** is optional. Exceptions should be narrow, identify the affected boundary, and include verification.

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

`npm run ai:sync` writes stale routes and removes orphan generated routes. `npm run ai:check` verifies registry shape, reference files, generated content, route collisions, `Read First` parity, and registered canonical skill files.
