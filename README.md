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

## Roadrunner

The operational roadmap lives in `.roadrunner/queue.json`. It uses `queue[0]` as the next executable task, `history` for completed verified work, and `blocked` for persistent failures. Roadrunner uses `.roadrunner/config.json` plus the prompts in `.roadrunner/prompts` to run and reconcile the queue against `GOALS.md`.

The generic runner implementation lives outside this repository. Once `roadrunner` is installed on `PATH`, these aliases delegate to it:

```bash
npm run roadmap:check
npm run roadmap:status
npm run roadmap:next
npm run roadmap:plan
npm run roadmap:run -- --max-steps 1
npm run roadmap:run:long
npm run roadmap:cleanup
```

The current Roadrunner CLI also supports `roadrunner import-roadmap` for seeding a queue from `roadmap.md` and the interactive `rstask` control to restart the current task attempt from planning. Treat imported queues as drafts: reconcile them against `GOALS.md` before unattended execution. Use plain `roadrunner` to inspect available commands; avoid probing active subcommands with `--help` inside this repo because older/local CLI builds may execute the subcommand instead of showing help.

Run longer unattended sessions with explicit limits from a normal terminal or `tmux`, not from inside an existing OpenCode session:

```bash
npm run roadmap:run -- --max-steps 999 --max-hours 72
```

Roadrunner uses `opencode run --model openai/gpt-5.5 --variant xhigh`, writes runtime logs under `.roadrunner/logs/`, plans each step before execution, verifies each step, then runs a reconciliation pass that may update the future queue. This repository keeps commit and push decisions manual after review. When the frontend exists, the queue should include Playwright tests that submit cube states, receive solutions, replay moves, and verify the cube is solved.

## External Visualization Library

`@houstonp/rubiks-cube` can be useful later for frontend visualization or sticker-state experiments, but it is not the solver core. This project keeps the solver engine in Rust with cubie representation so search, heuristics, pattern databases, and WASM can evolve without depending on a Three.js/web-component state model.
