# Product Validation Gate

This report is the durable product gate for `GOALS.md` and completed roadmap phases 1 through 10. It maps the product capabilities to concrete repository checks and records the latest local gate outcome for generated artifacts, Rust engine logic, WASM, web UI, Playwright, AI route checks, dataset fixtures, ML smoke tests, solver quality reporting, and the isolated hybrid move-ordering experiment.

The gate does not claim optimality, God's Number coverage, or a 20-move guarantee. Success means returned moves are replay verified for the covered states and that unsupported or insufficient limits are reported honestly.

## Latest Result

- Date: 2026-05-26
- Runner: Roadrunner implementation environment
- Status: Pending final local gate run in this step
- Aggregate convenience command: `npm run product:gate`
- Required Roadrunner commands: the individual commands below remain the source of acceptance and are listed unchanged in `roadrunner.config.json`.

| Command | Latest outcome | Evidence and notes |
| --- | --- | --- |
| `npm run ai:check` | Pending | Confirms generated AI route files match canonical files under `ai/`. |
| `cargo fmt --check` | Pending | Checks Rust formatting across the workspace. |
| `cargo test` | Pending | Covers cube invariants, moves, notation, facelets, validation, solver APIs, pruning, dataset generation helpers, WASM wrapper tests, and quality-report tests. |
| `cargo clippy --all-targets --all-features -- -D warnings` | Pending | Enforces Rust lint cleanliness for all targets and features. |
| `cargo run --quiet -p cube-engine --bin generate_pruning_tables -- --output crates/cube-engine/pruning-tables --max-depth 8` | Pending | Generates ignored native depth-8 pruning-table artifacts used by solver quality rows. |
| `npm run pruning:web:generate` | Pending | Generates ignored browser depth-6 pruning-table artifacts under `apps/web/public/generated-pruning-tables/`. |
| `npm run wasm:build` | Pending | Builds the Rust/WASM adapter package under ignored `crates/wasm/pkg/`. |
| `npm run build` | Pending | Builds the web app against the generated WASM package. |
| `npm run lint -w @rubiks-cube-solver/web` | Pending | Runs the web workspace ESLint gate. |
| `npm run test:e2e` | Pending | Runs Playwright product-flow coverage after the package pretest rebuilds WASM and web assets. |
| `python -m pytest ml` | Pending | Runs ML fixture/data/model tests without making ML a product dependency. |
| `python -m ml.train_value_baseline --dataset datasets/fixtures/small.jsonl --epochs 1 --seed 0 --output ml/outputs/value-baseline --inference-repeats 1` | Pending | Produces ignored local `metrics.json` and `value_outputs.tsv`; labels are replay-verified inverse scramble lengths, not optimal distances. |
| `cargo run --quiet -p cube-engine --bin solver_quality_report` | Pending | Emits native solver quality rows, including generated-table status and replay verification. |
| `cargo run --quiet -p cube-engine --bin solver_quality_report -- --hybrid-value-outputs ml/outputs/value-baseline/value_outputs.tsv` | Pending | Emits the same classical quality gate plus isolated hybrid move-ordering rows from local value outputs. |

## GOALS.md Coverage

| Required capability | Product evidence | Gate coverage |
| --- | --- | --- |
| Accept a user-provided 3x3 cube state through a web UI. | `apps/web/src/App.tsx` provides raw facelet and sticker-net entry. | `npm run build`, `npm run lint -w @rubiks-cube-solver/web`, `npm run test:e2e`. |
| Validate color counts, piece validity, orientation, permutation, and parity before solving. | `crates/cube-engine/src/cube/facelets.rs`, cubie validation, WASM validation wrappers, and UI validation messages keep validation Rust-owned. | `cargo test`, `cargo clippy --all-targets --all-features -- -D warnings`, `npm run test:e2e`. |
| Convert user-facing facelets or stickers into Rust cubie representation. | Facelet parsing and conversion live in `cube-engine`; the web sticker net only edits the submitted facelet string. | `cargo test`, `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Solve valid states with Rust solver logic exposed through WebAssembly. | `crates/wasm/src/lib.rs` delegates solving to `cube-engine`; `apps/web/src/wasm/solverClient.ts` is a boundary adapter. | `npm run wasm:build`, `npm run build`, `npm run test:e2e`, `cargo test`. |
| Return a move sequence that is verified to solve the submitted state. | Rust solver APIs verify results by replay before success; the web app replays success moves through WASM playback. | `cargo test`, `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Prefer short solutions while reporting honest configured limits. | Solver strategies expose explicit limits, metrics, and `not_found_within_limits`; generated two-phase artifacts report unavailable or corrupt states. | `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Display notation and support playback or visual verification in the UI. | The UI displays notation, metrics, strategy status, and step-through playback states returned by WASM. | `npm run build`, `npm run lint -w @rubiks-cube-solver/web`, `npm run test:e2e`. |
| Let automated tests submit known states, receive solutions, replay them, and verify solved. | `tests/e2e/product-flow.spec.ts` covers solved, shallow, invalid, limited baseline, generated-table unavailable/corrupt, playback-to-solved, and generated two-phase success when local browser artifacts exist. | `npm run pruning:web:generate`, `npm run test:e2e`. |

## Roadmap Phase Coverage

| Completed phase | Evidence | Gate coverage |
| --- | --- | --- |
| Phase 1, Cube Engine | Cubie state, moves, notation, scrambles, validation, search, and deterministic tests in `crates/cube-engine`. | `cargo fmt --check`, `cargo test`, `cargo clippy --all-targets --all-features -- -D warnings`. |
| Phase 2, User State Input | Kociemba facelet parsing, center/count validation, facelet-to-cubie conversion, round-trip rendering, and structured errors. | `cargo test`, `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Phase 3, Product Solver | Bounded IDA*, two-phase selections, typed config/results/errors, replay-verified solutions, and honest limit failures. | `cargo test`, `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Phase 4, WebAssembly | `crates/wasm` exposes validation, solving, strategy metadata, generated pruning artifacts, and playback without owning solver logic. | `cargo test`, `npm run wasm:build`, `npm run build`, `npm run test:e2e`. |
| Phase 5, Frontend Web | React/Vite app receives facelets, selects solver strategy and limits, displays notation/metrics, and drives playback through WASM. | `npm run build`, `npm run lint -w @rubiks-cube-solver/web`, `npm run test:e2e`. |
| Phase 6, E2E Validation | Playwright covers product flow and failure modes, with generated artifacts ignored locally. | `npm run pruning:web:generate`, `npm run test:e2e`. |
| Phase 7, Classical Solver Quality | Pruning-table generation, generated two-phase quality rows, fixture validation, replay verification, and quality report metadata. | `cargo run --quiet -p cube-engine --bin generate_pruning_tables -- --output crates/cube-engine/pruning-tables --max-depth 8`, `cargo run --quiet -p cube-engine --bin solver_quality_report`. |
| Phase 8, Datasets | Deterministic Rust dataset generation helpers and committed `datasets/fixtures/small.jsonl` with replay-verified inverse-scramble labels. | `cargo test`, `python -m pytest ml`, ML smoke command using `datasets/fixtures/small.jsonl`. |
| Phase 9, Machine Learning | Python value baseline consumes cubie serialization and writes ignored local metrics/value outputs; it is not a solver dependency. | `python -m pytest ml`, `python -m ml.train_value_baseline --dataset datasets/fixtures/small.jsonl --epochs 1 --seed 0 --output ml/outputs/value-baseline --inference-repeats 1`. |
| Phase 10, Hybrid Search | Native quality report appends hybrid move-ordering rows from local value outputs only for move ordering. | `cargo run --quiet -p cube-engine --bin solver_quality_report -- --hybrid-value-outputs ml/outputs/value-baseline/value_outputs.tsv`. |

## Artifact Policy

Local generated artifacts are intentionally ignored and must not be committed:

- `crates/cube-engine/pruning-tables/`
- `apps/web/public/generated-pruning-tables/`
- `crates/wasm/pkg/`
- frontend build and Playwright outputs
- `ml/outputs/`
- `datasets/generated/`

Committed durable evidence lives in this report, `README.md`, source tests, committed dataset fixtures, and the Roadrunner allowed command list.

## Product Safety Notes

- Rust remains the source of truth for cube parsing, conversion, validation, solving, and replay verification.
- The frontend is an input, display, strategy-selection, artifact-fetching, and playback controller only.
- Generated pruning tables are optional local artifacts. Missing or corrupt artifacts produce structured unavailable/corrupt outcomes.
- ML labels are replay-verified inverse scramble lengths, not optimal-distance labels.
- ML value outputs are isolated to native hybrid move ordering and do not validate states, prune branches, replace replay verification, or change Rust/WASM/web defaults.
- The solver quality report and generated two-phase path do not claim optimality or a 20-move guarantee.
