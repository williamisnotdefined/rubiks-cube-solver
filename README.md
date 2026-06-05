# Rubik's Cube Solver

Bootstrap repository for a Rubik's Cube solver focused on a Rust engine first, then user-state validation, short-solution search, a native HTTP API, and a web interface.

The product goal is defined in `GOALS.md`: a web interface where a user can input a valid 3x3 cube state and receive the shortest practical replay-verified solution found within explicit limits.

The project is method-agnostic. Generated two-phase search is a current classical strategy, not the final product goal; bounded optimal search, stronger pattern databases, solver portfolios, external classical algorithms, ML-assisted ordering, and hybrid search are valid paths when they keep Rust-owned validation and replay verification intact.

## Current Status

- Rust workspace scaffolded.
- `cube-engine` contains cubie state, moves, notation parsing, scrambles, validation, bounded IDA*, generated two-phase search, solver datasets, and quality reporting.
- AI knowledge routing is managed from canonical files under `ai/`.

## Quick Start

Prerequisites:

- Node.js and npm (for workspace scripts)
- Rust toolchain (for API, tests, and pruning-table generation)
- Python 3.11+ for optional vision and machine-learning helpers

Install the required Node dependencies:

```bash
npm install
```

Optional local helpers:

```bash
npm run vision:install
python -m pip install -r ml/requirements.txt
```

Install `vision_ml/requirements.txt` only when training, exporting, or evaluating scanner models locally. It includes heavier training/export dependencies that are not required for the live Vision service.

Start the full local stack (API, optional vision service, and web dev server):

```bash
npm run dev
```

Core command quick refs:

```bash
npm run api:dev
npm run web:dev
npm run build
npm run product:gate
```

## Commands

```bash
npm run ai:sync
npm run ai:check
npm run dev
npm run web:dev
npm run api:dev
npm run build
npm run lint
npm run format -w @rubiks-cube-solver/web
npm run live:start
npm run product:gate
```

The web workspace uses Biome for linting and formatting through `npm run lint -w @rubiks-cube-solver/web` and `npm run format -w @rubiks-cube-solver/web`. The root `npm run format` remains reserved for AI route synchronization.

When Rust is installed:

```bash
cargo test
```

## Python, Vision, And ML Boundaries

The repository currently has three Python areas with different ownership. They are intentionally separate so runtime scanner dependencies, scanner training tooling, and solver ML experiments do not blur together.

| Path | Role | Used by default runtime? | Notes |
| --- | --- | --- | --- |
| `ml/` | Solver ML value baseline. | No | Consumes Rust-generated solver datasets and writes local value artifacts for hybrid move-ordering experiments. It is not a product solver dependency. |
| `vision/` | Runtime Vision service. | Yes, when scanner flows are enabled | FastAPI/OpenCV service proxied by the Rust API for `/scan/analyze-face` and `/analyze-session`. |
| `vision_ml/` | Scanner training, datasets, replay/evaluation, and ONNX export. | No, except for local model artifact paths | Generates and validates scanner artifacts such as `vision_ml/local-models/tile-detector.onnx`; the live service receives those paths through environment variables. |

Current scanner path:

```txt
Web scanner -> Rust API -> Python vision service -> optional YOLO ONNX tile detector
```

The active live scanner model path is the tile detector configured by `RUBIKS_VISION_TILE_DETECTOR_MODEL`, usually `vision_ml/local-models/tile-detector.onnx` for local runs. The `vision_ml` package is not imported by normal `vision` request handling; it prepares datasets, labels, replay reports, training runs, and exported models.

The sticker CNN and face detector code paths are optional or experimental. They are kept for research and smoke coverage, but the current live scanner path uses the YOLO tile detector for visible sticker localization and color classification.

Do not commit private camera images, downloaded datasets, generated YOLO datasets, training runs, checkpoints, `.pt` files, `.onnx` files, or local `outputs/` directories. These paths are intentionally ignored so scanner experiments can run locally without becoming repository artifacts.

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
npm run solver:short16:portfolio
npm run solver:short16:api-budget
```

These scripts run deterministic generated depth-16 scrambles with seed `0` and report the same exclusive buckets, including `len_0_to_16`. The default and API-budget variants use 20 generated fixtures; the corner-PDB, PDB16, `multiprobe`, and portfolio variants intentionally use 5 fixtures because they spend more budget on short-solution attempts. This is a quality metric and not a guarantee that every state has a 16-move solution. Generate the local corner PDB first with `npm run pdb:corner:deep` before relying on `solver:short16:corner-pdb`, and generate both corner plus edge PDBs before relying on `solver:short16:pdb16` or `solver:short16:portfolio`.

For a heavier local portfolio sample, run:

```bash
npm run solver:short16:portfolio:large
```

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
- `RUBIKS_WEB_DIST_DIR=apps/web/dist`

API endpoints:

- `GET /health`
- `GET /puzzles`
- `GET /puzzles/:puzzleSlug`
- `GET /puzzles/:puzzleSlug/strategies`
- `POST /puzzles/:puzzleSlug/solve` with `{ "input": { "kind": "notation", "value": "R U R'" }, "strategyId": "cube2-pdb-ida-star", "limits": { "maxDepth": 14, "maxNodes": 1000000 }, "metric": "htm" }`
- `GET /strategies`
- `POST /solve-notation` with `{ "moves": "R2 D2 F'", "strategyId": "generated-two-phase-quality", "maxDepth": 30, "maxNodes": 10000000 }`
- `POST /solve-scan` with `{"faces": {"U":"UUURRR...", "R":"...", ...}, "strategyId": "generated-two-phase-quality", "maxDepth": 30, "maxNodes": 10000000 }`
- `POST /scan/analyze-face` with `{ "expectedCenter": "R", "image": "<base64-png>", "knownCenters": { ... } }`
- `POST /scan/solve-session` for 3x3 scan sessions.
- `POST /puzzles/:puzzleSlug/scan/solve-session` for puzzle-scoped scan sessions such as `cube-2x2x2`.
- If `maxNodes` is omitted, the API uses `10000000`; the request cap is `25000000`.
- `strategyId` must be one of the IDs returned by `GET /strategies`.
- Experimental: `strategyId="generated-two-phase-multiprobe"` spends budget on forward and inverse `<=16` move-order probes before falling back to deeper generated two-phase quality.
- Experimental: `strategyId="optimal-bounded-corner-pdb"` tries the local corner PDB first, then falls back to generated two-phase quality.
- Experimental: `strategyId="optimal-bounded-pdb16"` tries local corner plus 6-edge PDBs for a bounded `<=16` IDA* attempt, then falls back to generated two-phase quality.
- Experimental: `strategyId="short-solution-portfolio"` tries bounded PDB16 and generated `<=16` probes before falling back to generated two-phase quality.

Every successful API solve includes `replayVerified=true`.
The default web-facing contract is now puzzle-aware move-notation solving through `POST /puzzles/:puzzleSlug/solve`, while the legacy 3x3 `POST /solve-notation` route remains available for compatibility. Facelet/Kociemba strings are not used by the main product input form. Scan-based input uses the additional `/solve-scan`, `/scan/analyze-face`, `/scan/solve-session`, and puzzle-scoped scan-session endpoints.

### Multi-Puzzle And 2x2 Support

The many-cubes track is documented in `docs/many-cubes-plan.md` and `roadmap-many-cubes.md`. The current implementation keeps `cube/3x3x3` stable and adds experimental `cube/2x2x2` support through the same Rust/API/frontend boundary.

Current puzzle IDs and slugs:

- `cube/3x3x3` -> `cube-3x3x3`, stable.
- `cube/2x2x2` -> `cube-2x2x2`, experimental.
- Pyraminx, Clock, Skewb, NxNxN cubes, Square-1, and Megaminx are registered as planned metadata only.

2x2 support includes a puzzle-specific Rust state, move model, notation parser, replay verification, dedicated bounded IDA*, in-memory PDB-backed IDA*, puzzle registry metadata, puzzle-aware API solving, 2x2 scan-session handling, web selection, visualization, and inverse-solution playback.

2x2 strategy IDs:

- `cube2-bounded-ida-star`
- `cube2-pdb-ida-star`

The initial 2x2 API defaults are conservative and experimental: HTM metric, `maxDepth=14`, `maxNodes=1000000`, depth cap `20`, and node cap `10000000`. The implementation verifies returned solutions by replay and does not claim optimality, a God's Number proof, or a universal short-solution guarantee.

Run the dedicated 2x2 quality report with:

```bash
npm run solver:bench:2x2
```

### Vision Service Integration

Scan analysis is handled by the optional Rust-proxied Vision service in `vision/`.

- API defaults to `http://127.0.0.1:8790` for scan analysis (`RUBIKS_VISION_URL` overrides this).
- The Vision service exposes `/analyze-face` for live face preview and `/analyze-session` for full scan-session analysis.
- The Rust API proxies scanner calls through `/scan/analyze-face`, `/scan/solve-session`, and related scan routes.
- The active live scanner path uses the optional YOLO tile detector when `RUBIKS_VISION_TILE_DETECTOR_MODEL` points to an exported ONNX model.
- The default local detector path used by scanner scripts is `vision_ml/local-models/tile-detector.onnx`.
- The sticker CNN (`RUBIKS_VISION_CNN_MODEL`) and face detector (`RUBIKS_VISION_FACE_DETECTOR_MODEL`) are optional or experimental and are not the current live scanner path.

Install and run the runtime Vision service with:

```bash
npm run vision:install
npm run vision:dev
```

Run the Vision service tests with:

```bash
npm run vision:test
```

Run the full local stack with the current scanner detector environment configured:

```bash
npm run dev:scan-ml
```

Scanner training and evaluation tooling lives in `vision_ml/`. Use it to label sessions, replay scans, evaluate scanner quality, generate YOLO datasets, train/export local ONNX models, and keep private image artifacts out of git.

Useful scanner tooling commands:

```bash
npm run vision-ml:test
npm run scan:label
npm run scan:replay
npm run scan:evaluate
npm run scan:tile-yolo-dataset
```

`vision/README.md` documents the runtime service. `vision_ml/README.md` and `vision_ml/SCANNER_YOLO_RUNBOOK.md` document scanner datasets, model quality expectations, Roboflow/YOLO conversion, ONNX export, and artifact handling.

## Troubleshooting

- If solving returns `generated_tables_unavailable`, run:

```bash
npm run pruning:native
```

- If solving returns `unsupported_strategy`, use one of the IDs from `GET /strategies`.
- If the client gets `invalid_notation` or `invalid_limits`, send shorter notation and keep limits within `maxDepth <= 30` and `maxNodes <= 25000000`.
- If image scan fails, check `RUBIKS_VISION_URL` and restart both `npm run vision:dev` and the API.
- If startup logs show web missing, ensure `npm run build` produced `apps/web/dist/index.html`.

## API-Backed Web App

The web app talks to the native HTTP API so generated two-phase pruning tables stay on the server and Rust owns artifact loading, solving, playback, and replay verification.

Current frontend stack:

- React 19, TypeScript, Vite, and React Router 7 with `HashRouter` for `#/solve` and `#/timer` routes.
- TanStack React Query for API health, puzzle metadata, strategy metadata, and solve mutation state.
- Radix-backed shared primitives for dialogs, alert dialogs, selects, switches, checkboxes, toasts, popovers, and tooltips; feature code should use wrappers in `apps/web/src/components` instead of direct Radix imports.
- React Hook Form plus Zod for solve-form limit validation and submission shaping; Rust remains responsible for notation semantics, cube validity, and solver correctness.
- Zustand for scoped client state such as timer sessions/settings, solve settings, theme, and toast notifications.
- TanStack Table and TanStack Virtual for the timer solve table.
- Motion for small overlay, select, toast, and error-boundary transitions with reduced-motion support.
- Tailwind CSS v4 through the single `apps/web/src/index.css` entrypoint and semantic `app-*` tokens. The UI stays square: do not add `rounded-*` utilities.
- Storybook for component inspection and Playwright for product/timer E2E flows.

Start the full development environment with one command:

```bash
npm run dev
```

This generates native pruning tables when needed, starts the API on `127.0.0.1:8787`, starts Vision on `127.0.0.1:8790`, and starts the Vite dev server on `127.0.0.1:5173`. Use `npm run web:dev` only when you intentionally want to run the frontend without starting the API.

Local port split:

- Dev web: `127.0.0.1:5173`
- Dev API: `127.0.0.1:8787`
- Dev Vision: `127.0.0.1:8790`
- Prod web/API: `127.0.0.1:3001`
- Prod Vision: `127.0.0.1:8791`

Run the browser product flow with native API coverage:

```bash
npm run pruning:native
npm run test -w @rubiks-cube-solver/web
npm run build
npm run lint -w @rubiks-cube-solver/web
npm run storybook:build -w @rubiks-cube-solver/web
npm run test:e2e
```

Playwright starts both the API and the Vite preview server. The UI accepts a `Scramble` field as the only product input, prefers `generated-two-phase-quality` when the API advertises it, falls back to `generated-two-phase`, never asks the browser client to submit facelets, and displays `replay verified` only for API-confirmed solving results.

E2E tests should interact through accessible roles and labels. Radix Select controls are not native `<select>` elements, so Playwright specs should use the shared helpers in `tests/e2e/select-helpers.ts` instead of `selectOption()` or `locator('option')`. Timer E2E coverage includes keyboard start/stop, penalties (`OK`, `+2`, `DNF`), event selection, inspection/millisecond settings, scramble copy/history actions, solve deletion, and internal solve-list scrolling.

Useful E2E splits:

- `npm run test:e2e:smoke`: product solve, responsive UI, and timer smoke coverage.
- `npm run test:e2e:scan`: manual 3x3/2x2 scan coverage, run serially for API/preview stability.
- `npm run test:e2e:full`: complete non-heavy Playwright gate, equivalent to the stable full suite.
- `npm run test:e2e:heavy-scan`: opt-in canonical generated scan report coverage.

## Cloudflare Tunnel

Production follows the same local tunnel model used by `zelda-proto`: one local HTTP server listens on port `3001`, serves the built web app, exposes the Rust API routes, and Cloudflare Tunnel publishes it at `wilho.com.br`. The production Vision service listens on `8791` by default, so `npm run live:start` can run alongside `npm run dev`.

Start the full production boot path plus tunnel:

```bash
npm run live:start
```

Start only the local production server after a build:

```bash
npm run pruning:native
npm run build
npm run build:api
npm start
```

Start only the tunnel:

```bash
npm run live:tunnel
```

Example tunnel config is included in `cloudflared-config.example.yml`.

Current production route target:

- `wilho.com.br` -> `http://localhost:3001`

Production defaults:

- `RUBIKS_API_ADDR=127.0.0.1:3001` in `npm start`
- `RUBIKS_VISION_PORT=8791` in `npm run vision:start`
- `RUBIKS_VISION_URL=http://127.0.0.1:$RUBIKS_VISION_PORT` in `npm start` unless explicitly overridden
- `RUBIKS_WEB_DIST_DIR=apps/web/dist`
- The production web build uses the same origin for API calls when `VITE_RUBIKS_API_URL` is not set

## Dataset Generation

`cube-engine` owns deterministic solver-labeled dataset generation. The current generator still emits legacy 3x3 JSONL records with fixed field order and schema version `1`:

```json
{"schema_version":1,"state":"cp=...;co=...;ep=...;eo=...","scramble":"R U","scramble_depth":2,"verified_solution":"U' R'","verified_solution_length":2,"best_move":"U'","label_source":"generated_two_phase_quality_solver_replay_verified","split":"train"}
```

- `state` is the stable serialized `CubieState` string and is validated before writing.
- `scramble_depth` is the generated scramble length, not an optimal-distance claim.
- `verified_solution` is the replay-verified solution returned by the configured generated two-phase solver mode.
- `verified_solution_length` is the length of that replay-verified solution, not an optimal-distance claim.
- `best_move` is the first move of `verified_solution`, or `null` for solved examples.
- `split` is assigned from a stable hash of `state` into `train`, `validation`, or `test`.

Generate a local smoke dataset with:

```bash
npm run dataset:solver
```

Generate larger local datasets under the ignored `datasets/generated/` path, for example:

```bash
npm run dataset:solver:1k
```

The committed `datasets/fixtures/small.jsonl` remains a tiny ML smoke fixture with legacy reversible-scramble labels. It is kept for fast deterministic tests, not as the preferred generator path for new training data.

Schema version `2` is puzzle-aware and records `puzzle_id`, `puzzle_slug`, `state_encoding_id`, `move_set_id`, `metric`, `label_target`, `generator_seed`, `solver_strategy_id`, and `replay_verified`. See `docs/dataset-schema-v2.md` for the full contract. The committed `datasets/fixtures/cube2-small-v2.jsonl` validates the initial 2x2 dataset representation, but the current ML value model still accepts only `cube/3x3x3` rows with `cube3-cubie-v1` encoding.

## ML Value Baseline

The first ML baseline is isolated under `ml/`. It consumes Rust dataset JSONL records and derives model inputs from the serialized 3x3 `CubieState` fields `cp`, `co`, `ep`, and `eo`. It does not use frontend sticker or color arrays as the primary model input.

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

The CLI prints a JSON report and writes `metrics.json` plus `value_outputs.tsv` under the requested `--output` directory. The TSV uses comment metadata followed by `CubieState<TAB>predicted_value` rows for local hybrid-search experiments. The report, model artifact, and TSV metadata include puzzle/model compatibility fields so a 3x3 model cannot silently consume 2x2 rows. The default output directory is the ignored workspace-local `ml/outputs/value-baseline`, and the dependency fallback does not write model checkpoints.

If PyTorch is unavailable, the CLI exits successfully with an explicit dependency-fallback report so smoke verification still records label metrics; install `ml/requirements.txt` to train the PyTorch MLP.

The target label is `verified_solution_length`: the length of the replay-verified solution stored in the dataset. It is useful for a reproducible value-model smoke baseline, but it is not an optimal-distance label and must not be described as God's Number evidence or a 20-move guarantee. The direct `reversible_scramble_depth` baseline can score perfectly on the small fixture because that committed fixture uses reversible scramble inverses; that is evidence of label consistency, not optimal solving.

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
