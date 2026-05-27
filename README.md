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
npm run wasm:build
npm run build
npm run product:gate
```

When Rust is installed:

```bash
cargo test
```

## Product Validation Gate

`PRODUCT_VALIDATION.md` is the durable product gate report for `GOALS.md` and completed roadmap phases. It lists the required Roadrunner verification commands, latest dated outcomes, generated artifact locations, and the product safety limits: every success is replay verified, generated tables are local artifacts, ML is research-only, and the solver does not claim optimality or a 20-move guarantee.

## Solver Quality Report

The native solver quality gate uses the shared Rust fixture catalog for solved, shallow, nontrivial, mid-depth, and harder valid states. It validates cubie invariants, facelet parsing, facelet-to-cubie conversion, and facelet round-trips before solving rows are emitted.

Run the targeted gate tests with:

```bash
cargo test -p cube-engine solver_quality_report
```

Generate the deterministic Markdown report with:

```bash
cargo run --quiet -p cube-engine --bin solver_quality_report
```

Rows are ordered by fixture and solver selection. Compare fixture IDs, categories, input paths, expectations, solver selection, strategy, configured limits, generated-table status, row status, solution length, explored nodes, replay verification, and moves for regressions. `elapsed_us` is local timing output and is not deterministic.

Generated two-phase rows read local pruning-table artifacts from `crates/cube-engine/pruning-tables` by default. Missing artifacts report `generated_tables_unavailable`; corrupt or incompatible artifacts report `generated_tables_corrupt_or_incompatible`. The CLI prints the Markdown report and exits nonzero for native `unexpected_regression`, unavailable or corrupt generated-table rows, and hybrid missing, malformed, or unexpected-regression rows; a PyTorch dependency-fallback hybrid artifact remains a successful smoke outcome. These artifacts are local generated files and should not be committed.

Generate the native depth-8 compact artifacts used by generated two-phase quality rows with:

```bash
cargo run --quiet -p cube-engine --bin generate_pruning_tables -- --output crates/cube-engine/pruning-tables --max-depth 8
```

The generated harder quality fixtures use the documented phase-2/G1 scramble `U R2 F2 D L2 B2 U2 R2` and require matching local depth-8 artifacts. The report includes generated artifact depth, table versions, move sets, generation source, and coordinate profile metadata in `table_depths` and `table_metadata` columns when those local artifacts are available.

The quality report verifies every success by replay, but it does not claim optimality or a 20-move guarantee.

## Browser Generated Pruning Tables

Bounded IDA* remains the default web solver. The generated two-phase strategy can use local pruning-table artifacts when they are generated into Vite's public assets:

```bash
npm run pruning:web:generate
```

This writes ignored local depth-6 artifacts under `apps/web/public/generated-pruning-tables/`. Generated artifacts are compact depth-limited pruning tables: Rust generation may use dense visited memory internally, but the `.rpt` payload stores only reached `(coordinate_index, distance)` records plus Rust-owned metadata and checksum.

The web app fetches those files from `/generated-pruning-tables/` only when `generated-two-phase` is selected, then passes the bytes through WASM so Rust still owns artifact parsing, checksum validation, metadata validation, compatibility checks, solving, and replay verification.

If the files are absent, corrupt, or incompatible, the UI reports a structured generated-table unavailable or corrupt result. These generated tables are local artifacts and are not committed; regenerate old local `.rpt` files after artifact format changes. The generated two-phase path does not claim optimality or a 20-move guarantee.

To run the browser product gate with generated two-phase success coverage, generate the ignored depth-6 browser artifacts before E2E:

```bash
npm run pruning:web:generate
npm run wasm:build
npm run build
npm run lint -w @rubiks-cube-solver/web
npm run test:e2e
```

The generated two-phase success test skips only when the local `.rpt` artifacts are absent. When those artifacts exist, Playwright covers solved, shallow, nontrivial, and generated mid-depth fixtures through raw facelet and sticker-net entry, with Rust/WASM still owning artifact parsing, validation, solving, playback, and final solved verification.

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

## ML Value Baseline

The first ML baseline is isolated under `ml/`. It consumes Rust dataset JSONL records and derives model inputs from the serialized `CubieState` fields `cp`, `co`, `ep`, and `eo`. It does not use frontend sticker or color arrays as the primary model input.

Install Python dependencies with:

```bash
python -m pip install -r ml/requirements.txt
```

Run the fixture-based tests with:

```bash
python -m pytest ml
```

Train and evaluate the small deterministic PyTorch MLP value model with:

```bash
python -m ml.train_value_baseline --dataset datasets/fixtures/small.jsonl --epochs 1 --seed 0 --output ml/outputs/value-baseline --inference-repeats 1
```

The CLI prints a JSON report and writes `metrics.json` plus `value_outputs.tsv` under the requested `--output` directory. The TSV uses comment metadata followed by `CubieState<TAB>predicted_value` rows for local hybrid-search experiments. The default output directory is the ignored workspace-local `ml/outputs/value-baseline`, and the smoke baseline does not write model checkpoints.

If PyTorch is unavailable, the CLI exits successfully with an explicit dependency-fallback report so smoke verification still records label metrics; install `ml/requirements.txt` to train the PyTorch MLP.

The target label is `verified_solution_length`: the length of the replay-verified inverse scramble stored in the dataset. It is useful for a reproducible value-model smoke baseline, but it is not an optimal-distance label and must not be described as God's Number evidence or a 20-move guarantee. The direct `reversible_scramble_depth` baseline can score perfectly on the small fixture because the fixture labels come from reversible scramble inverses; that is evidence of label consistency, not optimal solving.

The report includes MAE, RMSE, bucket accuracy, metrics by depth bucket, and inference time per state for the ML value model or dependency fallback. Its `classical_baseline_comparison` section also includes direct fixture baselines for `reversible_scramble_depth` and `constant_train_mean`, each with MAE, RMSE, bucket accuracy, and depth-bucket metrics derived from `datasets/fixtures/small.jsonl`.

The same comparison section documents the reproducible Rust product solver-quality command and comparable metric names. The Rust report uses the separate `quality_fixtures()` catalog in `crates/cube-engine/src/solver/quality.rs`, so compare it as deterministic classical solver evidence rather than as the same label catalog used by the ML JSONL smoke test:

```bash
cargo run --quiet -p cube-engine --bin solver_quality_report
```

The Rust report summary includes status counts by solver selection, replay-verified successes, solution-length range, and explored-node totals. Row-level elapsed timing is local and non-deterministic.

Safety rules for ML experiments:

- ML does not validate cube states.
- ML does not replace replay verification of returned solutions.
- ML is not an admissible heuristic unless a separate proof or safe bound is added.
- ML is not a dependency of the default Rust, WASM, or web solve path.
- Classical deterministic solving remains the fallback for product behavior.

## Hybrid Move Ordering Experiment

The first hybrid-search experiment is isolated to the native solver quality report. It loads local value outputs and uses them only to order legal bounded IDA* child moves by predicted value, with lower values tried first. It does not validate states, prune branches, change depth or node limits, claim admissibility, replace Rust replay verification, or change Rust/WASM/web product defaults.

The no-arg quality report looks for local value outputs at:

```bash
ml/outputs/value-baseline/value_outputs.tsv
```

Generate that artifact with the ML smoke command:

```bash
python -m ml.train_value_baseline --dataset datasets/fixtures/small.jsonl --epochs 1 --seed 0 --output ml/outputs/value-baseline --inference-repeats 1
```

Run the report with the default artifact path:

```bash
cargo run --quiet -p cube-engine --bin solver_quality_report
```

Run the report with an explicit artifact path:

```bash
cargo run --quiet -p cube-engine --bin solver_quality_report -- --hybrid-value-outputs ml/outputs/value-baseline/value_outputs.tsv
```

The report keeps the deterministic classical rows unchanged and appends `Hybrid Move Ordering Experiment` rows using the same fixture budgets as `default-bounded-ida-star`. Hybrid rows include artifact status, row status, solution length, explored nodes, elapsed time, replay verification, scored value lookups, missing score lookups, and moves.

Missing artifacts report `artifact_unavailable`. PyTorch dependency-fallback artifacts report `artifact_dependency_fallback` instead of being treated as learned guidance. Malformed artifacts report `artifact_malformed`. A hybrid row is reported as `success` only when Rust replay verification proves the returned moves solve the fixture. The experiment does not claim optimality or a 20-move guarantee.

## External Visualization Library

`@houstonp/rubiks-cube` can be useful later for frontend visualization or sticker-state experiments, but it is not the solver core. This project keeps the solver engine in Rust with cubie representation so search, heuristics, pattern databases, and WASM can evolve without depending on a Three.js/web-component state model.
