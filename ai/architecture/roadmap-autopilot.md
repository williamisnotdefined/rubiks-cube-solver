# Roadmap Autopilot Architecture

The roadmap autopilot converts the human roadmap into an operational queue that can be executed unattended in small verified commits.

## Source Files

- `roadmap.md`: strategic project roadmap.
- `ai/roadmap/execution.json`: operational ordered queue of implementation steps.
- `scripts/roadmap/*.mjs`: validation and status commands for the operational queue.
- `scripts/autopilot/run-roadmap.mjs`: unattended runner for one or more roadmap steps.
- `scripts/autopilot/prompts/*.md`: prompts passed to `opencode run`.
- `.autopilot/`: gitignored runtime logs and failure output.

## Runner Flow

The autopilot runner:

- requires a clean worktree;
- switches to `autopilot/roadmap` by default;
- selects the first pending step whose dependencies are done;
- calls `opencode run --model openai/gpt-5.5 --variant xhigh`;
- runs the step's verification commands;
- retries failures up to `--max-attempts`;
- marks the step `done` only after verification passes;
- commits and pushes each completed step.

## Safety Boundaries

The implementation agent is instructed not to commit, push, change branches, or edit `ai/roadmap/execution.json`. The runner owns state transitions and git operations.

The runner should stop on unresolved failures instead of continuing to later phases with a broken base.
