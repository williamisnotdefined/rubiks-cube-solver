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

## Normative Language And Precedence

- **MUST** and **MUST NOT** are required unless a higher-precedence contract makes them impossible.
- **SHOULD** and **SHOULD NOT** are defaults; deviations require a concrete rationale in the change or review.
- **MAY** marks an optional choice, not an established dependency or required pattern.
- When guidance conflicts, use this order: executable contracts (types, schemas, tests, build/runtime behavior), accepted ADRs, architecture documents, rules, then skills.
- Newer accepted ADRs supersede older ADRs on the same decision. A deliberate contract change must update the affected executable contract and higher-level documentation together rather than silently treating stale code as authoritative.
- Skills orchestrate the relevant sources and commands. They do not override or restate architecture and rules.
