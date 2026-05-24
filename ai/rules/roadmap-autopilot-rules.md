# Roadmap Autopilot Rules

Rules for unattended roadmap execution.

## Always

- Run roadmap automation from a clean worktree.
- Execute one roadmap step at a time and commit only after verification passes.
- Generate and save an explicit plan before every implementation attempt.
- Use `openai/gpt-5.5` with variant `xhigh` for autonomous implementation attempts.
- Keep `ai/roadmap/execution.json` as the operational source of truth.
- Treat `GOALS.md` as the immutable product north star.
- Keep generated logs under `.autopilot`, which is gitignored.
- Stop at the first persistent blocker and leave a report instead of hiding failure.
- Preserve small, reviewable commits with the step's configured commit message.
- Use saved plans as implementation context and keep them in `.autopilot` logs.
- Run long autopilot sessions from a normal terminal or `tmux`, not from inside OpenCode.
- Use the autopilot lockfile to prevent concurrent runs.
- Track only subprocesses created by the autopilot and clean up only those processes.
- Run the roadmap reconciler after each verified implementation step unless explicitly disabled for debugging.
- Keep `queue[0]` as the only next executable task.
- Keep completed work in `history` and unresolved failures in `blocked`.

## Never

- Do not run unattended automation on dirty worktrees.
- Do not bypass failing verification commands.
- Do not implement a roadmap step before a plan exists for that step.
- Do not run nested `opencode -> autopilot -> opencode` unless explicitly debugging with `--allow-nested-opencode`.
- Do not run multiple autopilot processes in the same worktree.
- Do not kill arbitrary `opencode` processes; use `npm run autopilot:cleanup` for autopilot-owned children only.
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
- `npm run autopilot:roadmap -- --plan-only` generates a saved plan for the selected next step without implementation.
- `npm run autopilot:cleanup` cleans up only registered autopilot-owned subprocesses.

## Planning

- Planning runs before implementation for every step.
- Planning must not edit files or git state.
- Planning invokes OpenCode, so unattended `--plan-only` must be run outside an existing OpenCode session unless `--allow-nested-opencode` is intentionally used.
- The generated plan must explain goal alignment, expected files, approach, tests, verification, risks, and out-of-scope work.
- Implementation should follow the saved plan unless a minimal safe deviation is required to pass verification.

## Queue Reconciliation

- The implementation phase may change code and tests for the current `queue[0]` task.
- The reconciliation phase may only update the future `queue` in `ai/roadmap/execution.json`.
- Reconciliation may split, add, remove, or reorder queued tasks based on the current repository state.
- Reconciliation must not mark tasks complete; only the runner moves verified tasks from `queue` to `history`.
- Reconciliation must compare the queue to `GOALS.md` and keep product-flow tasks ahead of datasets, ML, and research extensions until the web solve flow works.
- Reconciliation should add Playwright/E2E validation once the frontend exists.
