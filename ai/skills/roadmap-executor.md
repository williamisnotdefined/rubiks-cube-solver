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
- Treat `GOALS.md` as read-only and as the product north star.
- Keep autopilot defaults on `openai/gpt-5.5` and variant `xhigh`.
- Treat `queue[0]` as the next and only current task.
- Keep roadmap execution plan-first: generate a plan before implementation and pass it to implementation/fix prompts.
- Keep long autopilot runs outside OpenCode, preferably in `tmux`, to avoid nested OpenCode sessions.
- Keep unattended implementation scoped to one roadmap step per commit.
- Keep roadmap reconciliation as a separate pass and commit after each verified implementation step.
- Keep final git state transitions owned by `scripts/autopilot/run-roadmap.mjs`.
- Preserve `history` and `blocked` when reconciling the queue.
- Prioritize user-state input, verified solutions, WASM, frontend solve UI, and Playwright validation before datasets/ML/research tasks.
- Prefer stopping with logs over trying unsafe recovery.
- Regenerate AI routes with `npm run ai:sync` after skill or registry changes.

## Expected Output

- Roadmap automation can be dry-run with `npm run autopilot:roadmap -- --dry-run`.
- Roadmap automation can generate only the next plan with `npm run autopilot:roadmap -- --plan-only`.
- Roadmap automation refuses nested OpenCode by default and uses a lockfile for concurrent-run protection.
- Roadmap reconciliation can update future queue items without touching source code.
- Roadmap reconciliation keeps the queue aligned with `GOALS.md`.
- Generated route files are synchronized from canonical AI knowledge.
- CI continues to validate Rust, AI routes, and roadmap execution metadata.

## Verification

- `npm run roadmap:check`
- `npm run ai:check`
- `npm run lint`
- `npm run autopilot:roadmap -- --dry-run`
