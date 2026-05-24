# Rubik's Cube Solver

Bootstrap repository for a Rubik's Cube solver focused on a Rust engine first, then user-state validation, short-solution search, WebAssembly, and a web interface.

The product goal is defined in `GOALS.md`: a web interface where a user can input a valid 3x3 cube state and receive a verified solution, preferably within 20 moves when feasible. Autonomous roadmap execution treats `GOALS.md` as read-only.

## Current Status

- Rust workspace scaffolded.
- `cube-engine` contains cubie state, moves, notation parsing, scrambles, validation, BFS, IDDFS, and simple heuristics.
- AI knowledge routing is managed from canonical files under `ai/`.

## Commands

```bash
npm run ai:sync
npm run ai:check
npm run roadmap:check
npm run roadmap:status
npm run roadmap:next
```

When Rust is installed:

```bash
cargo test
```

## Roadmap Autopilot

The operational roadmap lives in `ai/roadmap/queue.json`. It uses `queue[0]` as the next executable task, `history` for completed verified work, and `blocked` for persistent failures. The queue is reconciled against `GOALS.md` after each completed step.

Dry-run the next autonomous step:

```bash
npm run autopilot:roadmap -- --dry-run
```

Generate the plan for the next step without executing it:

```bash
npm run autopilot:roadmap -- --plan-only
```

Run one autonomous step on the default `autopilot/roadmap` branch:

```bash
npm run autopilot:roadmap -- --max-steps 1
```

Run longer unattended sessions with explicit limits:

```bash
npm run autopilot:roadmap -- --max-steps 999 --max-hours 72
```

Run unattended autopilot from a normal terminal or `tmux`, not from inside an existing OpenCode session. The runner refuses nested `opencode -> autopilot -> opencode` by default and uses `.autopilot/roadmap.lock` to prevent concurrent runs.

Clean only autopilot-owned subprocesses if a runner is interrupted:

```bash
npm run autopilot:cleanup
```

The autopilot uses `opencode run --model openai/gpt-5.5 --variant xhigh`, writes runtime logs under `.autopilot/`, plans each step before execution, verifies each step, commits, pushes, then runs a reconciliation pass that may update the future queue in a separate commit. When the frontend exists, the queue should include Playwright tests that submit cube states, receive solutions, replay moves, and verify the cube is solved.

## External Visualization Library

`@houstonp/rubiks-cube` can be useful later for frontend visualization or sticker-state experiments, but it is not the solver core. This project keeps the solver engine in Rust with cubie representation so search, heuristics, pattern databases, and WASM can evolve without depending on a Three.js/web-component state model.
