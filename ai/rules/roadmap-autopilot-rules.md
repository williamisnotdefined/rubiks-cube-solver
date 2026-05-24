# Roadmap Autopilot Rules

Rules for unattended roadmap execution.

## Always

- Run roadmap automation from a clean worktree.
- Execute one roadmap step at a time and commit only after verification passes.
- Use `openai/gpt-5.5` with variant `xhigh` for autonomous implementation attempts.
- Keep `ai/roadmap/execution.json` as the operational source of truth.
- Treat `GOALS.md` as the immutable product north star.
- Keep generated logs under `.autopilot`, which is gitignored.
- Stop at the first persistent blocker and leave a report instead of hiding failure.
- Preserve small, reviewable commits with the step's configured commit message.
- Run the roadmap reconciler after each verified implementation step unless explicitly disabled for debugging.
- Keep `queue[0]` as the only next executable task.
- Keep completed work in `history` and unresolved failures in `blocked`.

## Never

- Do not run unattended automation on dirty worktrees.
- Do not bypass failing verification commands.
- Do not mutate `main` directly by default; use an autopilot branch unless explicitly configured otherwise.
- Do not let the implementation agent commit, push, or mark roadmap steps done.
- Do not let the reconciliation agent edit files other than `ai/roadmap/execution.json`.
- Do not let any autonomous step edit `GOALS.md`.
- Do not rewrite or delete `history` and `blocked` records during reconciliation.
- Do not use destructive git commands to recover from failed automation.
- Do not commit large generated datasets, model checkpoints, or autopilot logs.

## Verification

- `npm run roadmap:check` validates operational roadmap shape and dependencies.
- `npm run roadmap:check` also validates that `GOALS.md` exists and names the final product target.
- `npm run roadmap:status` shows progress.
- `npm run roadmap:next` shows the next runnable step.
- `npm run autopilot:roadmap -- --dry-run` verifies the selected next step without implementation.

## Queue Reconciliation

- The implementation phase may change code and tests for the current `queue[0]` task.
- The reconciliation phase may only update the future `queue` in `ai/roadmap/execution.json`.
- Reconciliation may split, add, remove, or reorder queued tasks based on the current repository state.
- Reconciliation must not mark tasks complete; only the runner moves verified tasks from `queue` to `history`.
- Reconciliation must compare the queue to `GOALS.md` and keep product-flow tasks ahead of datasets, ML, and research extensions until the web solve flow works.
- Reconciliation should add Playwright/E2E validation once the frontend exists.
