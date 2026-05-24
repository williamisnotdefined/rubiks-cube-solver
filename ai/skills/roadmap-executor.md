# Roadmap Executor

Use this skill when changing `ai/roadmap/queue.json`, `ai/roadmap/prompts`, `roadrunner.config.json`, package roadmap aliases, or Roadrunner execution behavior for this project.

## Goal

Keep the Rubik roadmap queue safe, resumable, deterministic, and aligned with the external Roadrunner CLI.

## Read First

- `ai/rules/roadmap-runner-rules.md`
- `ai/rules/repository-rules.md`
- `ai/rules/testing-rules.md`
- `ai/rules/ai-rules.md`
- `ai/architecture/roadmap-runner.md`
- `ai/architecture/ai-knowledge-system.md`

## Workflow

- Validate `ai/roadmap/queue.json` with `npm run roadmap:check` after any queue edit once Roadrunner is available.
- Treat `GOALS.md` as read-only and as the product north star.
- Keep Roadrunner defaults on `openai/gpt-5.5` and variant `xhigh`.
- Treat `queue[0]` as the next and only current task.
- Keep roadmap execution plan-first: generate a plan before implementation and pass it to implementation/fix prompts.
- Keep long Roadrunner runs outside OpenCode, preferably in `tmux`, to avoid nested OpenCode sessions.
- Track and clean up only subprocesses created by Roadrunner.
- Keep unattended implementation scoped to one roadmap step per commit.
- Keep roadmap reconciliation as a separate pass and commit after each verified implementation step.
- Keep final git state transitions owned by Roadrunner, not by implementation agents.
- Preserve `history` and `blocked` when reconciling the queue.
- Do not reintroduce local Roadrunner implementation files under `scripts/roadmap` or `scripts/autopilot`.
- Prioritize user-state input, verified solutions, WASM, frontend solve UI, and Playwright validation before datasets/ML/research tasks.
- Prefer stopping with logs over trying unsafe recovery.
- Regenerate AI routes with `npm run ai:sync` after skill or registry changes.

## Expected Output

- Roadmap commands delegate to the external `roadrunner` CLI.
- Roadrunner can generate only the next plan with `npm run roadmap:plan` once installed.
- Roadrunner refuses nested OpenCode by default and uses a lockfile for concurrent-run protection.
- Roadrunner can clean up registered child processes with `npm run roadmap:cleanup` once installed.
- Roadmap reconciliation can update future queue items without touching source code.
- Roadmap reconciliation keeps the queue aligned with `GOALS.md`.
- Generated route files are synchronized from canonical AI knowledge.
- CI continues to validate Rust, AI routes, and roadmap queue metadata.

## Verification

- `npm run roadmap:check`
- `npm run ai:check`
- `npm run lint`
- `npm run roadmap:next`
