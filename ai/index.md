# AI Knowledge Base

This directory is the source of truth for AI guidance used in this repository.

The goal is a project-specific AI knowledge base for the Rubik's Cube solver, not a folder of generic prompts. Reusable knowledge lives in `rules`, `architecture`, and `glossary`. Task workflows live in `skills` and reference that reusable context through `ai/registry.json`.

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

## Validation

- `npm run ai:sync` writes generated routes and removes orphan generated routes.
- `npm run ai:check` verifies registry entries, references, generated route content, and orphan routes.
- `npm run lint` runs `ai:check`.
