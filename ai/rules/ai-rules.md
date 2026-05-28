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
