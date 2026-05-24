# Roadmap Autopilot Rules

Rules for unattended roadmap execution.

## Always

- Run roadmap automation from a clean worktree.
- Execute one roadmap step at a time and commit only after verification passes.
- Use `openai/gpt-5.5` with variant `xhigh` for autonomous implementation attempts.
- Keep `ai/roadmap/execution.json` as the operational source of truth.
- Keep generated logs under `.autopilot`, which is gitignored.
- Stop at the first persistent blocker and leave a report instead of hiding failure.
- Preserve small, reviewable commits with the step's configured commit message.

## Never

- Do not run unattended automation on dirty worktrees.
- Do not bypass failing verification commands.
- Do not mutate `main` directly by default; use an autopilot branch unless explicitly configured otherwise.
- Do not let the implementation agent commit, push, or mark roadmap steps done.
- Do not use destructive git commands to recover from failed automation.
- Do not commit large generated datasets, model checkpoints, or autopilot logs.

## Verification

- `npm run roadmap:check` validates operational roadmap shape and dependencies.
- `npm run roadmap:status` shows progress.
- `npm run roadmap:next` shows the next runnable step.
- `npm run autopilot:roadmap -- --dry-run` verifies the selected next step without implementation.
