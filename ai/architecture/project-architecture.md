# Project Architecture

The final target is a hybrid Rubik's Cube solver with a Rust engine, search algorithms, heuristics, pattern databases, optional ML heuristics, WebAssembly integration, and a modern web visualization.

## Current Bootstrap

- `crates/cube-engine`: Rust crate for cube representation, moves, notation, scramble handling, search, and heuristics.
- `ai`: canonical AI knowledge base and route generation system.
- `roadmap.md`: source roadmap and implementation order.

## Future Boundaries

- `crates/wasm`: future wasm-bindgen bridge around the Rust engine.
- `apps/web`: future TypeScript React visualization and playback UI.
- `datasets`: future generated training datasets.
- `ml`: future Python/PyTorch training code.

## Ownership

- Cube state, moves, validation, search, and heuristics belong in Rust.
- Frontend code should only render, send moves, receive states, and play animations.
- ML code should consume generated datasets and expose learned heuristics only after deterministic search is correct.
