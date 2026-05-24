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
```

When Rust is installed:

```bash
cargo test
```

## External Visualization Library

`@houstonp/rubiks-cube` can be useful later for frontend visualization or sticker-state experiments, but it is not the solver core. This project keeps the solver engine in Rust with cubie representation so search, heuristics, pattern databases, and WASM can evolve without depending on a Three.js/web-component state model.
