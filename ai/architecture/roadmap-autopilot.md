# Roadmap Autopilot Architecture

The roadmap autopilot converts the human roadmap into an operational queue that can be executed unattended in small verified commits.

## Source Files

- `roadmap.md`: strategic project roadmap.
- `GOALS.md`: read-only product north star for autonomous planning.
- `ai/roadmap/execution.json`: operational stack with `queue`, `history`, and `blocked`.
- `scripts/roadmap/*.mjs`: validation and status commands for the operational queue.
- `scripts/autopilot/run-roadmap.mjs`: unattended runner for one or more roadmap steps.
- `scripts/autopilot/processes.mjs`: process registry for autopilot-owned subprocesses.
- `scripts/autopilot/cleanup.mjs`: safe cleanup for registered autopilot-owned subprocesses.
- `scripts/autopilot/prompts/*.md`: prompts passed to `opencode run`.
- `.autopilot/`: gitignored runtime logs and failure output.

## Runner Flow

The autopilot runner:

- refuses nested OpenCode execution by default;
- requires a clean worktree;
- acquires `.autopilot/roadmap.lock` to prevent concurrent runs;
- tracks each autopilot-owned `opencode run` subprocess in `.autopilot/processes.json`;
- switches to `autopilot/roadmap` by default;
- selects `queue[0]` as the next executable step;
- generates a saved plan for the selected step;
- calls `opencode run --model openai/gpt-5.5 --variant xhigh`;
- runs the step's verification commands;
- retries failures up to `--max-attempts`;
- moves the verified step from `queue` to `history`;
- commits and pushes each completed step;
- runs a roadmap reconciliation pass;
- commits and pushes reconciliation changes separately when the queue changes.

## Safety Boundaries

The planning agent is instructed not to edit files or git state. The runner rejects planning if it produces worktree changes.

The runner should be launched from a normal terminal or `tmux`. Running it from inside OpenCode creates nested `opencode run` processes, so the runner rejects that mode unless `--allow-nested-opencode` is passed deliberately.

The runner must never kill arbitrary OpenCode processes. Cleanup is limited to subprocesses registered in `.autopilot/processes.json`, and PID reuse is checked with `/proc/<pid>/stat` start-time ticks before signaling a process group.

The implementation agent is instructed not to commit, push, change branches, or edit `ai/roadmap/execution.json`. The runner owns state transitions and git operations.

The reconciliation agent is instructed to edit only `ai/roadmap/execution.json`. It may modify the future `queue`, but it must preserve `history` and `blocked` records and must not mark tasks complete.

The runner rejects implementation attempts that edit `GOALS.md`.

The runner should stop on unresolved failures instead of continuing to later phases with a broken base.

## Execution File Semantics

- `queue[0]`: next task to implement.
- `queue[1..]`: future tasks that the reconciler may refine.
- `history`: verified tasks already committed by the runner.
- `blocked`: tasks removed from the queue after persistent automation failure.

## Goal-Aware Planning

The reconciler must compare the queue against `GOALS.md` after each completed step. The core product path is user state input, validation, solving, WASM exposure, frontend solve UI, and Playwright verification. Datasets, ML, and hybrid research stay behind that flow unless they directly unblock it.

## Plan-First Execution

Each step follows `Plan -> Execute -> Verify -> Commit -> Reconcile`. Plans are stored under `.autopilot/logs/.../plan.md` and are passed back into implementation/fix prompts as required context.
