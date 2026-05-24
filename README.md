# Rubik's Cube Solver

Bootstrap repository for a hybrid Rubik's Cube solver focused on a Rust cube engine first, then search, heuristics, WebAssembly, visualization, datasets, and machine learning.

The implementation order follows `roadmap.md`: do not start with AI or frontend logic. The first deliverable is a pure cube engine using cubie representation.

## Current Status

- Rust workspace scaffolded.
- `cube-engine` crate contains domain types, solved cubie state, notation parsing, and search module placeholders.
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

The operational roadmap lives in `ai/roadmap/execution.json`. It uses `queue[0]` as the next executable task, `history` for completed verified work, and `blocked` for persistent failures.

Dry-run the next autonomous step:

```bash
npm run autopilot:roadmap -- --dry-run
```

Run one autonomous step on the default `autopilot/roadmap` branch:

```bash
npm run autopilot:roadmap -- --max-steps 1
```

Run longer unattended sessions with explicit limits:

```bash
npm run autopilot:roadmap -- --max-steps 999 --max-hours 72
```

The autopilot uses `opencode run --model openai/gpt-5.5 --variant xhigh`, writes runtime logs under `.autopilot/`, verifies each step, commits, pushes, then runs a reconciliation pass that may update the future queue in a separate commit.

## External Visualization Library

`@houstonp/rubiks-cube` can be useful later for frontend visualization or sticker-state experiments, but it is not the solver core. This project keeps the solver engine in Rust with cubie representation so search, heuristics, pattern databases, and WASM can evolve without depending on a Three.js/web-component state model.
