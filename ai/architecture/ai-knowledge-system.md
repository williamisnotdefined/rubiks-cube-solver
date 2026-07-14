# AI Knowledge System Architecture

`ai` is the canonical AI knowledge base for this repository.

## Source Layers

- `rules`: reusable constraints, conventions, and anti-patterns.
- `architecture`: system boundaries and integration points.
- `glossary`: cube and solver vocabulary.
- `skills`: task-oriented workflows that reference the other layers.

## Registry

`ai/registry.json` defines routed skills.

`ai/registry.schema.json` documents the registry shape and the sync script enforces the same structural constraints during `npm run ai:check`.

Each skill entry defines the canonical skill file, its reusable references, generated route paths, and tool-specific matching metadata. The `## Read First` list in the canonical skill must match the registry `references` list exactly and in the same order.

## Generated Routes

`scripts/ai/sync-routes.mjs` compiles each canonical skill and its references into tool routes:

- OpenCode: `.opencode/skills/<skill-name>/SKILL.md`.
- Codex: `.agents/skills/<skill-name>/SKILL.md`.
- Cursor: `.cursor/rules/<skill-name>.mdc`.
- GitHub Copilot: `.github/instructions/<skill-name>.instructions.md`.

Generated routes must not be edited manually.

`npm run ai:sync` writes stale routes and removes orphan generated routes. `npm run ai:check` verifies registry shape, reference files, generated content, route collisions, `Read First` parity, and registered canonical skill files.
