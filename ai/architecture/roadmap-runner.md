# Roadmap Runner Architecture

Rubik roadmap execution is delegated to the external Roadrunner CLI. This repository owns the product goals, queue, prompts, and configuration; Roadrunner owns the generic runner implementation.

## Source Files

- `roadmap.md`: strategic project roadmap.
- `GOALS.md`: read-only product north star for autonomous planning.
- `.roadrunner/queue.json`: operational stack with `queue`, `history`, and `blocked`.
- `.roadrunner/prompts/*.md`: Rubik-specific prompts consumed by Roadrunner.
- `.roadrunner/config.json`: Roadrunner path and provider configuration for this repository.
- `package.json`: npm aliases that delegate roadmap commands to `roadrunner`.
- `.roadrunner/`: Roadrunner state directory. Queue, config, prompts, and README are project files; logs, locks, and process registry files are gitignored runtime artifacts.

## Boundary

Roadrunner implementation code does not live in this repository. Do not add local runner, queue validator, process supervisor, or OpenCode provider implementations under `scripts/roadmap` or `scripts/autopilot`.

This repository may keep project-specific prompts and queue metadata because those are product state, not generic runner code.

Roadrunner can seed queue metadata from `roadmap.md` with `import-roadmap`, but imported queues are drafts. The checked-in queue should remain a small, goal-aligned operational sequence rather than a direct dump of the strategic roadmap.

## Runner Flow

Roadrunner follows:

```txt
Plan -> Execute -> Verify -> Reconcile -> Update Queue
```

Roadrunner selects `queue[0]`, generates a plan, executes the step, runs the step's verification commands, reconciles future queue items against `GOALS.md`, then moves verified work to `history`. Commits are reviewed and created manually after a successful Roadrunner step.

During an interactive run, `rstask` may be used to restart the current task attempt from planning without changing the product goals or bypassing verification.

## Safety Boundaries

Planning must not edit files or git state.

Implementation agents must not commit, push, change branches, edit `GOALS.md`, or edit `.roadrunner/queue.json`.

Reconciliation may edit only `.roadrunner/queue.json`. It may modify the future `queue`, but it must preserve `history` and `blocked` records and must not mark tasks complete.

Cleanup must be limited to subprocesses registered by Roadrunner itself.

## Queue File Semantics

- `queue[0]`: next task to implement.
- `queue[1..]`: future tasks that the reconciler may refine.
- `history`: verified tasks completed by Roadrunner.
- `blocked`: tasks removed from the queue after persistent automation failure.

## Goal-Aware Planning

The reconciler must compare the queue against `GOALS.md` after each completed step. The core product path is user state input, validation, solving, WASM exposure, frontend solve UI, and Playwright verification. Datasets, ML, and hybrid research stay behind that flow unless they directly unblock it.
