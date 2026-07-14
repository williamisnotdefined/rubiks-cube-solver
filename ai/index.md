# AI Knowledge Base

This directory is the source of truth for project-specific AI guidance in this repository.

## Structure

```txt
ai/
  rules/
  architecture/
  glossary/
  skills/
  registry.schema.json
  registry.json
  index.md
```

- `rules`: durable constraints, conventions, and anti-patterns.
- `architecture`: ownership boundaries, flows, and integration points.
- `glossary`: cube and solver vocabulary.
- `skills`: task workflows that reference reusable context through `ai/registry.json`.

## Routing

`ai/registry.json` defines the routed skills and generated destinations:

- OpenCode: `.opencode/skills/<skill-name>/SKILL.md`.
- Codex: `.agents/skills/<skill-name>/SKILL.md`.
- Cursor: `.cursor/rules/<skill-name>.mdc`.
- GitHub Copilot: `.github/instructions/<skill-name>.instructions.md`.

Generated route files must not be edited manually. Change canonical files under `ai`, then run:

```bash
npm run ai:sync
npm run ai:check
```

`project-core` is the only global skill. Task-specific skills should stay opt-in and reference the narrowest rules or architecture docs they need.

## Maintenance Rules

- Put reusable project knowledge in `rules`, `architecture`, or `glossary` before adding a new skill.
- Keep skills short: goal, read-first references, workflow, expected output, and verification.
- Do not duplicate global rules or architecture explanations across skills.
- Do not teach generic React, Rust, TypeScript, Python, or programming advice here unless it is tied to a project-specific boundary.
- Run `npm run ai:check` before finishing AI knowledge changes.
