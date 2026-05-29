# Rubik's Cube Solver

Bootstrap repository for a Rubik's Cube solver focused on a Rust engine first, then user-state validation, short-solution search, a native HTTP API, and a web interface.

The product goal is defined in `GOALS.md`: a web interface where a user can input a valid 3x3 cube state and receive the shortest practical replay-verified solution found within explicit limits.

The project is method-agnostic. Generated two-phase search is a current classical strategy, not the final product goal; bounded optimal search, stronger pattern databases, solver portfolios, external classical algorithms, ML-assisted ordering, and hybrid search are valid paths when they keep Rust-owned validation and replay verification intact.

## Current Status

- Rust workspace scaffolded.
- `cube-engine` contains cubie state, moves, notation parsing, scrambles, validation, BFS, IDDFS, generated two-phase search, and quality reporting.
- AI knowledge routing is managed from canonical files under `ai/`.

## Commands

```bash
npm run ai:sync
npm run ai:check
npm run dev
npm run web:dev
npm run api:dev
npm run build
npm run product:gate
```

When Rust is installed:

```bash
cargo test
```

## Product Validation Gate

`PRODUCT_VALIDATION.md` is the durable product gate report for `GOALS.md` and completed roadmap phases. It lists the required Roadrunner verification commands, latest dated outcomes, generated artifact locations, and the product safety limits: every success is replay verified, generated tables are local artifacts, solver methods are interchangeable implementation details, ML is research-only unless explicitly integrated behind replay verification, and the solver does not claim optimality, `<=16`, or a 20-move guarantee.

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

Generate the native compact artifacts used by generated two-phase rows with:

```bash
npm run pruning:native
```

The generated harder quality fixtures use the documented phase-2/G1 scramble `U R2 F2 D L2 B2 U2 R2` and require matching local depth-8 artifacts. The report includes generated artifact depth, table versions, move sets, generation source, and coordinate profile metadata in `table_depths` and `table_metadata` columns when those local artifacts are available.

The quality report verifies every success by replay, but it does not claim optimality, `<=16`, or a 20-move guarantee.

## Real Scramble Benchmark

Use the real scramble benchmark to track hard user-provided scrambles without giving the solver the inverse scramble. Each fixture is converted to a cubie state first; only that state is submitted to the configured solver, and every success is replay verified. Treat strategy names as current implementations; the durable metric is solution length, success/failure honesty, nodes, time, and replay verification:

```bash
npm run solver:real-scrambles
```

The npm script uses `generated-two-phase-quality` with `max_depth=30` and a small smoke budget of `max_nodes=1000`. Raise `--max-nodes` when running `cargo run --quiet -p cube-engine --bin solver_real_scramble_report -- ...` for deeper local experiments. The report loads the generated two-phase solver once, separates setup time from per-scramble search time, and includes a summary with exclusive replay-verified solution buckets: `len_0_to_16`, `len_17_to_18`, `len_19_to_20`, and `len_gt_20`. It is an honest progress report, not an optimality proof: current failures or long buckets identify the next deterministic solver work.

The CLI also supports a quality gate such as `--require-max-solution-len 20`; combine it with `--require-success` only when the current generated tables and budgets support that threshold locally.

Use the short-solution benchmark to track replay-verified `<=16` frequency on a deterministic generated sample without giving the solver inverse scrambles:

```bash
npm run solver:short16
npm run solver:short16:corner-pdb
npm run solver:short16:pdb16
npm run solver:short16:multiprobe
npm run solver:short16:api-budget
```

These scripts run deterministic generated depth-16 scrambles with seed `0` and report the same exclusive buckets, including `len_0_to_16`. The default and API-budget variants use 20 generated fixtures; the corner-PDB, PDB16, and `multiprobe` variants intentionally use 5 fixtures because they spend more budget on short-solution attempts. This is a quality metric and not a guarantee that every state has a 16-move solution. Generate the local corner PDB first with `npm run pdb:corner:deep` before relying on `solver:short16:corner-pdb`, and generate both corner plus edge PDBs before relying on `solver:short16:pdb16`.

For an intentionally heavy local/server-side run, use the deep 20-move gate:

```bash
npm run solver:real-scrambles:deep20
```

This uses `generated-two-phase-quality` with `max_nodes=50000000`. At that budget the quality schedule gives the depth-20 attempt up to 40M nodes, which is enough for the current committed real-scramble fixture set to replay-verify `9/9` at `<=20`. It can take minutes and is not the web/API default budget.

Run the real-scramble gate after generating native pruning tables with Phase 2 depth 10:

```bash
cargo run --quiet -p cube-engine --bin generate_pruning_tables -- --output crates/cube-engine/pruning-tables --phase1-max-depth 8 --phase2-max-depth 10
npm run solver:real-scrambles:gate
```

Inspect pruning-table coverage before raising budgets or regenerating artifacts:

```bash
npm run pruning:report
```

Optional server-side corner pattern databases can be generated for the experimental `optimal-bounded-corner-pdb` strategy:

```bash
npm run pdb:corner
npm run pdb:corner:deep
```

`pdb:corner` creates a depth-8 smoke artifact. `pdb:corner:deep` creates a full corner permutation+orientation artifact at `crates/cube-engine/pruning-tables/corner-pattern-database.rpdb`; it is about 88 MB locally and should not be committed. The strategy uses the corner PDB only for a bounded `<=16` proof attempt, then falls back to `generated-two-phase-quality`, so it is diagnostic/experimental rather than the product default.

Optional 6-edge pattern databases can be generated for the experimental `optimal-bounded-pdb16` strategy:

```bash
npm run pdb:edge
npm run pdb:edge:deep
```

`pdb:edge` creates two depth-6 smoke artifacts. `pdb:edge:deep` creates two denser depth-8 local artifacts, `edge-pattern-database-a.repdb` and `edge-pattern-database-b.repdb`, under `crates/cube-engine/pruning-tables/`; this can take many minutes. The `optimal-bounded-pdb16` strategy uses `max(corner_pdb, edge_pdb_a, edge_pdb_b, orientation_pdb)` for an admissible IDA* attempt up to 16 moves, then falls back to `generated-two-phase-quality` without claiming that no short solution exists.

Generate ML training rows labeled by the generated two-phase solver instead of inverse scrambles:

```bash
npm run dataset:solver
npm run dataset:solver:1k
npm run ml:solver:1k
```

The solver dataset generator supports `--solver-label-mode generated-two-phase`, `generated-two-phase-quality`, and `generated-two-phase-multiprobe`. The npm dataset scripts use `generated-two-phase-quality` labels by default, replay-verify every emitted solution, and keep generated JSONL files under `datasets/generated/` for local experiments.

When PyTorch is available, `ml.train_value_baseline` writes both diagnostic `value_outputs.tsv` rows and a portable `model.json` MLP artifact. The Rust quality report can score unseen child states from that artifact with:

```bash
npm run solver:bench:hybrid-model
```

## Native HTTP API

The API is the preferred path for heavy generated two-phase solving because it keeps native pruning-table artifacts on the server instead of shipping large solver assets to the browser.

Generate native tables, then start the API:

```bash
npm run pruning:native
npm run api:dev
```

Defaults:

- `RUBIKS_API_ADDR=127.0.0.1:8787`
- `RUBIKS_PRUNING_TABLE_DIR=crates/cube-engine/pruning-tables`

Endpoints:

- `GET /health`
- `GET /strategies`
- `POST /solve-notation` with `{ "moves": "R2 D2 F'", "strategyId": "generated-two-phase-quality", "maxDepth": 30, "maxNodes": 10000000 }`
- If `maxNodes` is omitted, the API uses `10000000`; the request cap is `25000000`.
- Experimental: `strategyId="generated-two-phase-multiprobe"` runs the quality solver first, then uses inverse-state move-order probes when the quality result is still longer than 16 moves and node budget remains.
- Experimental: `strategyId="optimal-bounded-corner-pdb"` tries the local corner PDB first, then falls back to generated two-phase quality.
- Experimental: `strategyId="optimal-bounded-pdb16"` tries local corner plus 6-edge PDBs for a bounded `<=16` IDA* attempt, then falls back to generated two-phase quality.

Every successful API solve includes `replayVerified=true`. The client-facing API accepts move notation only; facelet/Kociemba strings are not client request payloads.

## API-Backed Web App

The web app talks to the native HTTP API so generated two-phase pruning tables stay on the server and Rust owns artifact loading, solving, playback, and replay verification.

Start the full development environment with one command:

```bash
npm run dev
```

This generates native pruning tables when needed, starts the API on `127.0.0.1:8787`, and starts the Vite dev server. Use `npm run web:dev` only when you intentionally want to run the frontend without starting the API.

Run the browser product flow with native API coverage:

```bash
npm run pruning:native
npm run build
npm run lint -w @rubiks-cube-solver/web
npm run test:e2e
```

Playwright starts both the API and the Vite preview server. The UI accepts a `Scramble` field as the only product input, prefers `generated-two-phase-quality` when the API advertises it, falls back to `generated-two-phase`, never asks the browser client to submit facelets, and displays `replay verified` only for API-confirmed solving results.

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
- ML is not a dependency of the default Rust API or web solve path.
- Classical deterministic solving remains the fallback for product behavior.

## Hybrid Move Ordering Experiment

The first hybrid-search experiment is isolated to the native solver quality report. It loads local value outputs and uses them only to order legal bounded IDA* child moves by predicted value, with lower values tried first. It does not validate states, prune branches, change depth or node limits, claim admissibility, replace Rust replay verification, or change Rust API/web product defaults.

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

`@houstonp/rubiks-cube` is used for frontend visualization, but it is not the solver core. This project keeps the solver engine in Rust with cubie representation so search, heuristics, pattern databases, and the HTTP API can evolve without depending on a Three.js/web-component state model.
