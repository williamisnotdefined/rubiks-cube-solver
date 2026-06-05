# Product Validation Gate

This report is the durable product gate for `GOALS.md` and completed roadmap phases 1 through 10. It maps the product capabilities to concrete repository checks and records the latest local gate outcome for generated artifacts, Rust engine logic, native HTTP API, web UI, Playwright, AI route checks, dataset fixtures, ML smoke tests, solver quality reporting, and the isolated hybrid move-ordering experiment.

The gate does not claim optimality, `<=16`, God's Number coverage, or a 20-move guarantee. Success means returned moves are replay verified for the covered states and that unsupported or insufficient limits are reported honestly, regardless of which solver strategy produced the moves.

## Latest Result

- Date: 2026-05-27
- Runner: Roadrunner implementation environment
- Status: Passed
- Aggregate convenience command: `npm run product:gate`
- Required Roadrunner commands: the individual commands below remain the source of acceptance and are listed unchanged in `roadrunner.config.json`.

| Command | Latest outcome | Evidence and notes |
| --- | --- | --- |
| `npm run ai:check` | Passed | Checked 5 compiled skills, 3 tools, and 13 reference files against canonical AI files under `ai/`. |
| `cargo fmt --check` | Passed | Rust formatting checked across the workspace. |
| `cargo test` | Passed | Workspace Rust tests passed, including cube invariants, moves, notation, facelets, validation, solver APIs, HTTP API tests, pruning, dataset helpers, generated two-phase coverage, and quality-report tests. |
| `cargo clippy --all-targets --all-features -- -D warnings` | Passed | Workspace Rust clippy completed with warnings denied. |
| `cargo run --quiet -p cube-engine --bin generate_pruning_tables -- --output crates/cube-engine/pruning-tables --phase1-max-depth 8 --phase2-max-depth 10` | Passed | Generated ignored native pruning-table artifacts for API and generated two-phase rows. |
| `npm run api:test` | Passed | Native HTTP API tests passed. |
| `npm run build` | Passed | Built the API-backed web app. |
| `npm run lint -w @rubiks-cube-solver/web` | Passed | Web workspace Biome lint completed with warnings denied. |
| `npm run test:e2e` | Passed | Playwright started the native API and web preview, verified notation-only UI controls, checked the 350px cube cap, solved shallow and real move-notation flows through HTTP, and checked replay-verified UI results. |
| `python -m pytest ml` | Passed | ML fixture tests passed with 8 passed and 1 skipped. |
| `python -m ml.train_value_baseline --dataset datasets/fixtures/small.jsonl --epochs 1 --seed 0 --output ml/outputs/value-baseline --inference-repeats 1` | Passed | Produced ignored local `metrics.json` and `value_outputs.tsv`; PyTorch was unavailable, so the documented constant-train-mean dependency fallback ran without writing a checkpoint. |
| `cargo run --quiet -p cube-engine --bin solver_quality_report` | Passed | Native solver quality report loaded generated tables as available, replay verified successes, retained expected limit failures, and reported no unexpected regressions, unavailable generated tables, or corrupt generated tables. |
| `cargo run --quiet -p cube-engine --bin solver_quality_report -- --hybrid-value-outputs ml/outputs/value-baseline/value_outputs.tsv` | Passed | Re-ran the classical quality gate and appended isolated hybrid move-ordering rows from local value outputs; dependency-fallback hybrid rows were reported without changing product solver defaults. |

Environment notes for this run:

- Rust/Cargo, Node/npm, Playwright, Python, and pytest were available locally.
- PyTorch was not installed; the ML smoke command completed through the documented `constant_train_mean_dependency_fallback` path with `pytorch_available=false`.
- The gate intentionally generated ignored local artifacts for native pruning tables, frontend build output, Playwright output, and ML outputs. No generated datasets, model checkpoints, or large generated artifacts are part of the durable report.

## Frontend UI Libraries Rollout Validation

- Date: 2026-06-05
- Status: Passed for the frontend rollout scope; this section does not replace the full `npm run product:gate` result above.
- Scope: React Router `HashRouter`, Radix-backed primitives, React Hook Form/Zod solve controls, Zustand scoped UI stores, TanStack Table/Virtual timer table, Motion transitions, route code-splitting, timer E2E coverage, responsive/reduced-motion smoke coverage, and updated AI route guidance.

| Command | Latest outcome | Evidence and notes |
| --- | --- | --- |
| `npm run test -w @rubiks-cube-solver/web` | Passed | 55 Vitest files and 368 tests passed, including timer penalty/unit coverage. |
| `npm run build` | Passed | Built the API-backed web app with route-level lazy chunks; the app build no longer reports the prior chunk-size warning, with `vendor-three-runtime` still near the configured limit. |
| `npm run lint` | Passed | Ran `ai:check`, `theme-colors:check`, and web Biome lint with zero lint warnings. |
| `npm run storybook:build -w @rubiks-cube-solver/web` | Passed | Storybook built successfully; the existing docgen skip warning for `.storybook/preview.tsx` remains informational. |
| `npm run test:e2e:full` | Passed | Full non-heavy Playwright suite ran serially with 31 passed and 1 heavy scan skipped by design. Coverage includes product solve, manual scan, responsive UI, and timer flows. |
| `npm run ai:sync` then `npm run ai:check` | Passed | Canonical AI docs and generated `.opencode`, `.cursor`, and `.github/instructions` routes were synchronized and checked. |

Additional E2E split commands for this rollout:

- `npm run test:e2e:smoke` runs product, responsive UI, and timer smoke specs.
- `npm run test:e2e:scan` runs manual scan specs serially.
- `npm run test:e2e:full` runs the complete non-heavy suite serially.
- `npm run test:e2e:heavy-scan` remains opt-in through `RUN_HEAVY_SCAN_E2E=1` and is not part of the default full suite.

## GOALS.md Coverage

| Required capability | Product evidence | Gate coverage |
| --- | --- | --- |
| Accept a user-provided 3x3 cube state through a web UI. | `apps/web/src/App.tsx` accepts the `Scramble` field only and sends moves to the Rust HTTP API. Facelet/Kociemba input is not exposed in the interface. | `npm run build`, `npm run lint -w @rubiks-cube-solver/web`, `npm run test:e2e`. |
| Validate color counts, piece validity, orientation, permutation, and parity before solving. | `crates/cube-engine/src/cube/facelets.rs`, notation parsing, cubie validation, and API solve paths keep validation Rust-owned; facelet handling is not a browser request contract. | `cargo test`, `cargo clippy --all-targets --all-features -- -D warnings`, `npm run test:e2e`. |
| Convert user-facing notation into Rust cubie representation. | Notation parsing and cube construction live in Rust; facelet conversion remains an internal adapter for engine quality and rendering state only. | `cargo test`, `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Solve valid states with Rust solver logic exposed through the native HTTP API. | `crates/api` delegates solving to `cube-engine`; `apps/web/src/api/solverClient.ts` is the browser boundary adapter. | `npm run api:test`, `npm run build`, `npm run test:e2e`, `cargo test`. |
| Return a move sequence that is verified to solve the submitted state. | Rust solver APIs and API responses verify results by replay before success; the web app displays `replay verified` only for API-confirmed solves. | `cargo test`, `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Prefer the shortest verified solution available within configured limits. | Solver strategies expose explicit limits, metrics, and `not_found_within_limits`; generated two-phase, bounded/PDB, hybrid, and future portfolio strategies are implementation details as long as every success is replay verified. | `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Display notation and support playback or visual verification in the UI. | The UI displays notation, metrics, strategy status, and API replay verification. | `npm run build`, `npm run lint -w @rubiks-cube-solver/web`, `npm run test:e2e`. |
| Let automated tests submit known states, receive solutions, replay them, and verify solved. | `tests/e2e/product-flow.spec.ts` covers notation-only UI, cube size cap, shallow notation, real notation through API, and invalid notation handling. | `npm run test:e2e`. |

## Roadmap Phase Coverage

| Completed phase | Evidence | Gate coverage |
| --- | --- | --- |
| Phase 1, Cube Engine | Cubie state, moves, notation, scrambles, validation, search, and deterministic tests in `crates/cube-engine`. | `cargo fmt --check`, `cargo test`, `cargo clippy --all-targets --all-features -- -D warnings`. |
| Phase 2, User State Input | Kociemba facelet parsing, center/count validation, facelet-to-cubie conversion, round-trip rendering, and structured errors. | `cargo test`, `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Phase 3, Product Solver | Bounded IDA*, two-phase selections, typed config/results/errors, replay-verified solutions, and honest limit failures. | `cargo test`, `cargo run --quiet -p cube-engine --bin solver_quality_report`, `npm run test:e2e`. |
| Phase 4, Native HTTP API | `crates/api` exposes notation solving and strategy metadata without accepting facelet payloads from browser clients. | `npm run api:test`, `cargo test`, `npm run build`, `npm run test:e2e`. |
| Phase 5, Frontend Web | React/Vite app receives a scramble, selects solver strategy and limits, displays solution metrics, caps the cube at 350px, and calls the API. | `npm run build`, `npm run lint -w @rubiks-cube-solver/web`, `npm run test:e2e`. |
| Phase 6, E2E Validation | Playwright covers notation-only input, replay-verified successes, and invalid-notation failure modes, with native generated artifacts ignored locally. | `npm run test:e2e`. |
| Phase 7, Classical Solver Quality | Pruning-table generation, generated two-phase quality rows, fixture validation, replay verification, and quality report metadata. | `cargo run --quiet -p cube-engine --bin generate_pruning_tables -- --output crates/cube-engine/pruning-tables --phase1-max-depth 8 --phase2-max-depth 10`, `cargo run --quiet -p cube-engine --bin solver_quality_report`. |
| Phase 8, Datasets | Deterministic Rust solver-labeled dataset generation and committed `datasets/fixtures/small.jsonl` for fast ML smoke coverage. | `cargo test`, `python -m pytest ml`, ML smoke command using `datasets/fixtures/small.jsonl`. |
| Phase 9, Machine Learning | Python value baseline consumes cubie serialization and writes ignored local metrics/value outputs; it is not a solver dependency. | `python -m pytest ml`, `python -m ml.train_value_baseline --dataset datasets/fixtures/small.jsonl --epochs 1 --seed 0 --output ml/outputs/value-baseline --inference-repeats 1`. |
| Phase 10, Hybrid Search | Native quality report appends hybrid move-ordering rows from local value outputs only for move ordering. | `cargo run --quiet -p cube-engine --bin solver_quality_report -- --hybrid-value-outputs ml/outputs/value-baseline/value_outputs.tsv`. |

## Artifact Policy

Local generated artifacts are intentionally ignored and must not be committed:

- `crates/cube-engine/pruning-tables/`
- frontend build and Playwright outputs
- `ml/outputs/`
- `datasets/generated/`

Committed durable evidence lives in this report, `README.md`, source tests, committed dataset fixtures, and the Roadrunner allowed command list.

## Product Safety Notes

- Rust remains the source of truth for cube parsing, conversion, validation, solving, and replay verification.
- The frontend is an input, display, strategy-selection, and API controller only.
- Generated pruning tables are optional local artifacts. Missing or corrupt artifacts produce structured unavailable/corrupt outcomes.
- ML labels are replay-verified solution lengths, not optimal-distance labels; the committed small fixture still uses legacy inverse-scramble labels for smoke coverage.
- ML value outputs are isolated to native hybrid move ordering and do not validate states, prune branches, replace replay verification, or change Rust API/web defaults.
- Solver strategy names are implementation details; the product target is the shortest replay-verified solution found within explicit limits.
- The solver quality report and generated two-phase path do not claim optimality, `<=16`, or a 20-move guarantee.
