# Roadmap Runner Architecture

Rubik roadmap execution is delegated to the external Roadrunner CLI. This repository owns the product goals, queue, prompts, and configuration; Roadrunner owns the generic runner implementation.

## Source Files

- `roadmap.md`: strategic project roadmap.
- `GOALS.md`: read-only product north star for autonomous planning.
- `ai/roadmap/queue.json`: operational stack with `queue`, `history`, and `blocked`.
- `ai/roadmap/prompts/*.md`: Rubik-specific prompts consumed by Roadrunner.
- `roadrunner.config.json`: Roadrunner path and provider configuration for this repository.
- `package.json`: npm aliases that delegate roadmap commands to `roadrunner`.
- `.autopilot/`: gitignored Roadrunner runtime logs, locks, and process registry files.

## Boundary

Roadrunner implementation code does not live in this repository. Do not add local runner, queue validator, process supervisor, or OpenCode provider implementations under `scripts/roadmap` or `scripts/autopilot`.

This repository may keep project-specific prompts and queue metadata because those are product state, not generic runner code.

## Runner Flow

Roadrunner follows:

```txt
Plan -> Execute -> Verify -> Commit -> Reconcile
```

Roadrunner selects `queue[0]`, generates a plan, executes the step, runs the step's verification commands, moves verified work to `history`, commits, then reconciles future queue items against `GOALS.md`.

## Safety Boundaries

Planning must not edit files or git state.

Implementation agents must not commit, push, change branches, edit `GOALS.md`, or edit `ai/roadmap/queue.json`.

Reconciliation may edit only `ai/roadmap/queue.json`. It may modify the future `queue`, but it must preserve `history` and `blocked` records and must not mark tasks complete.

Cleanup must be limited to subprocesses registered by Roadrunner itself.

## Queue File Semantics

- `queue[0]`: next task to implement.
- `queue[1..]`: future tasks that the reconciler may refine.
- `history`: verified tasks already committed by Roadrunner.
- `blocked`: tasks removed from the queue after persistent automation failure.

## Goal-Aware Planning

The reconciler must compare the queue against `GOALS.md` after each completed step. The core product path is user state input, validation, solving, WASM exposure, frontend solve UI, and Playwright verification. Datasets, ML, and hybrid research stay behind that flow unless they directly unblock it.
