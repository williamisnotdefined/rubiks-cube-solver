# Rubik's Cube Solver

Bootstrap repository for a Rubik's Cube solver focused on a Rust engine first, then user-state validation, short-solution search, WebAssembly, and a web interface.

The product goal is defined in `GOALS.md`: a web interface where a user can input a valid 3x3 cube state and receive a verified solution, preferably within 20 moves when feasible.

## Current Status

- Rust workspace scaffolded.
- `cube-engine` contains cubie state, moves, notation parsing, scrambles, validation, BFS, IDDFS, and simple heuristics.
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

## Dataset Generation

`cube-engine` owns deterministic dataset generation. Examples are JSONL records with fixed field order and schema version `1`:

```json
{"schema_version":1,"state":"cp=...;co=...;ep=...;eo=...","scramble":"R U","scramble_depth":2,"verified_solution":"U' R'","verified_solution_length":2,"best_move":"U'","label_source":"reversible_scramble_inverse_replay_verified","split":"train"}
```

- `state` is the stable serialized `CubieState` string and is validated before writing.
- `scramble_depth` is the generated scramble length, not an optimal-distance claim.
- `verified_solution` is the replay-verified inverse of the documented reversible scramble.
- `verified_solution_length` is the length of that replay-verified solution.
- `best_move` is the first move of `verified_solution`, or `null` for solved examples.
- `split` is assigned from a stable hash of `state` into `train`, `validation`, or `test`.

Generate the committed small fixture with:

```bash
cargo run --quiet -p cube-engine --bin generate_dataset -- --seed 0 --count 12 --output datasets/fixtures/small.jsonl
```

Generate larger local datasets under the ignored `datasets/generated/` path, for example:

```bash
cargo run --quiet -p cube-engine --bin generate_dataset -- --seed 42 --count 10000 --output datasets/generated/train.jsonl --max-scramble-depth 20
```

## External Visualization Library

`@houstonp/rubiks-cube` can be useful later for frontend visualization or sticker-state experiments, but it is not the solver core. This project keeps the solver engine in Rust with cubie representation so search, heuristics, pattern databases, and WASM can evolve without depending on a Three.js/web-component state model.
