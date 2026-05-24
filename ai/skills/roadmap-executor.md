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
- Keep unattended implementation scoped to one roadmap step per commit.
- Keep final git state transitions owned by `scripts/autopilot/run-roadmap.mjs`.
- Prefer stopping with logs over trying unsafe recovery.
- Regenerate AI routes with `npm run ai:sync` after skill or registry changes.

## Expected Output

- Roadmap automation can be dry-run with `npm run autopilot:roadmap -- --dry-run`.
- Generated route files are synchronized from canonical AI knowledge.
- CI continues to validate Rust, AI routes, and roadmap execution metadata.

## Verification

- `npm run roadmap:check`
- `npm run ai:check`
- `npm run lint`
- `npm run autopilot:roadmap -- --dry-run`
