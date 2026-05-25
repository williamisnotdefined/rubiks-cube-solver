# Roadmap Runner Rules

Rules for executing the Rubik roadmap through the external Roadrunner CLI.

## Always

- Keep `ai/roadmap/queue.json` as the operational roadmap source of truth.
- Keep `roadrunner.config.json` aligned with this repository's queue, prompts, logs, process registry, and lock paths.
- Keep Rubik-specific Roadrunner prompts under `ai/roadmap/prompts`.
- Use `openai/gpt-5.5` with variant `xhigh` for autonomous Roadrunner work.
- Treat `GOALS.md` as the immutable product north star.
- Keep `queue[0]` as the only next executable task.
- Keep completed work in `history` and unresolved failures in `blocked`.
- Preserve `history` and `blocked` records during reconciliation.
- Keep generated logs, locks, and process registry files under `.autopilot`, which is gitignored.
- Run long Roadrunner sessions from a normal terminal or `tmux`, not from inside OpenCode.
- Review and commit completed Roadrunner work manually after verification; implementation agents must not own git history.
- Treat `roadrunner import-roadmap` output as a draft queue that must be reconciled against `GOALS.md` before unattended execution.
- Use Roadrunner's `rstask` interactive control only to restart the current task attempt from planning.

## Never

- Do not reintroduce local Roadrunner implementation files under `scripts/roadmap` or `scripts/autopilot`.
- Do not bypass failing verification commands.
- Do not implement a roadmap step before a plan exists for that step.
- Do not let implementation agents commit, push, or mark roadmap steps done.
- Do not let reconciliation edit files other than `ai/roadmap/queue.json`.
- Do not let any autonomous step edit `GOALS.md`.
- Do not rewrite or delete `history` and `blocked` records during reconciliation.
- Do not use destructive git commands to recover from failed automation.
- Do not commit large generated datasets, model checkpoints, or Roadrunner logs.
- Do not probe active Roadrunner subcommands with `--help` inside this repository; use plain `roadrunner` for the command list unless the CLI has verified subcommand help behavior.

## Verification

- `npm run roadmap:check` validates the queue once Roadrunner is available.
- `npm run roadmap:status` shows progress once Roadrunner is available.
- `npm run roadmap:next` shows the next runnable step once Roadrunner is available.
- `npm run roadmap:plan` generates a saved plan for the selected next step once Roadrunner is available.
- `npm run roadmap:cleanup` cleans up only Roadrunner-owned subprocesses once Roadrunner is available.
- `roadrunner import-roadmap` can seed a queue from `roadmap.md`, but the result should be reviewed and reconciled before running.

## Queue Reconciliation

- The implementation phase may change code and tests for the current `queue[0]` task.
- The reconciliation phase may only update the future `queue` in `ai/roadmap/queue.json`.
- Reconciliation may split, add, remove, or reorder queued tasks based on the current repository state.
- Reconciliation must not mark tasks complete; only Roadrunner moves verified tasks from `queue` to `history`.
- Roadrunner updates queue state after verification, but commit creation remains a manual review step for this repository.
- Reconciliation must compare the queue to `GOALS.md` and keep product-flow tasks ahead of datasets, ML, and research extensions until the web solve flow works.
- Reconciliation should add Playwright/E2E validation once the frontend exists.
