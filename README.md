# Rubik's Cube Solver

Bootstrap repository for a Rubik's Cube solver focused on a Rust engine first, then user-state validation, short-solution search, a native HTTP API, and a web interface.

The product goal is defined in `GOALS.md`: a web interface where a user can input a valid 3x3 cube state and receive the shortest practical replay-verified solution found within explicit limits.

The project is method-agnostic. Generated two-phase search is a current classical strategy, not the final product goal; bounded optimal search, stronger pattern databases, solver portfolios, and external classical algorithms are valid paths when they keep Rust-owned validation and replay verification intact.

## Current Status

- Rust workspace scaffolded.
- `cube-engine` contains cubie state, moves, notation parsing, scrambles, validation, bounded IDA*, generated two-phase search, pruning tables, and quality reporting.
- `web` uses `react-i18next` locale resources with browser-language detection for English, Spanish, Brazilian Portuguese, Italian, German, French, Russian, Simplified Chinese, and Japanese.
- AI knowledge routing is managed from canonical files under `ai/`.

## Quick Start

Prerequisites:

- Node.js and npm (for workspace scripts)
- Rust toolchain (for API, tests, and pruning-table generation)
- Python 3.11+ for the optional scanner runtime and scanner training helpers

Install the required Node dependencies:

```bash
npm install
```

Optional local helpers:

```bash
npm run vision:install
```

Install `scanner/training/requirements.txt` only when training, exporting, or evaluating scanner models locally. It includes heavier training/export dependencies that are not required for the live scanner runtime.

Start the full local stack (API, optional vision service, and web dev server):

```bash
npm run dev
```

Core command quick refs:

```bash
npm run api:dev
npm run web:dev
npm run build
npm run bootstrap:check
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
npm run bootstrap:check
npm run live:start
npm run product:gate
```

The web workspace uses Biome for linting and formatting through `npm run lint -w @rubiks-cube-solver/web` and `npm run format -w @rubiks-cube-solver/web`. The root `npm run format` remains reserved for AI route synchronization.

When Rust is installed:

```bash
cargo test
```

## Clean Bootstrap Check

Use `bootstrap:check` to validate a fresh install without private scanner datasets or model artifacts:

```bash
npm ci
npm run vision:install
npm run bootstrap:check
```

The check runs AI route validation, Rust formatting, cube-engine tests, API tests, scanner runtime/training tests, web build, web lint, and a YOLO artifact readiness check. Missing YOLO training datasets or local `scanner/models/tile-detector.onnx` are reported as external artifacts and do not fail the core bootstrap gate.

## Python And Scanner Boundaries

Python is used for the camera scanner only. Solver runtime, validation, search, heuristics, pruning tables, and replay verification remain Rust-owned.

| Path | Role | Used by default runtime? | Notes |
| --- | --- | --- | --- |
| `scanner/contracts/` | Shared scanner contracts. | Yes | Pydantic contracts and scanner dataset schemas shared by runtime and training. |
| `scanner/runtime/` | Runtime scanner service. | Yes, when scanner flows are enabled | FastAPI/OpenCV service proxied by the Rust API for `/scan/analyze-face`. |
| `scanner/training/` | Scanner training and evaluation tooling. | No | Generates and validates scanner datasets, replay reports, YOLO datasets, training runs, and exported models. |

Current scanner path:

```txt
Web scanner -> Rust API -> scanner runtime -> optional YOLO ONNX tile detector
```

The active live scanner model path is the tile detector configured by `RUBIKS_VISION_TILE_DETECTOR_MODEL`, usually `scanner/models/tile-detector.onnx` for local runs. The scanner is YOLO-only: it does not use a sticker CNN, face detector, or color-classifier fallback.

Do not commit private camera images, downloaded datasets, generated YOLO datasets, training runs, checkpoints, `.pt` files, `.onnx` files, or local `outputs/` directories. These paths are intentionally ignored so scanner experiments can run locally without becoming repository artifacts.

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

Generated two-phase rows read local pruning-table artifacts from `crates/cube-engine/pruning-tables` by default. Missing artifacts report `generated_tables_unavailable`; corrupt or incompatible artifacts report `generated_tables_corrupt_or_incompatible`. The CLI prints the Markdown report and exits nonzero for `unexpected_regression`, unavailable generated-table rows, or corrupt generated-table rows. These artifacts are local generated files and should not be committed.

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
- `RUBIKS_WEB_DIST_DIR=web/dist`

API endpoints:

- `GET /health`
- `GET /puzzles`
- `GET /puzzles/:puzzleSlug`
- `GET /puzzles/:puzzleSlug/strategies`
- `POST /puzzles/:puzzleSlug/solve` with `{ "input": { "kind": "notation", "value": "R U R'" }, "strategyId": "cube2-pdb-ida-star", "limits": { "maxDepth": 14, "maxNodes": 1000000 }, "metric": "htm" }`
- `GET /strategies`
- `POST /solve-notation` with `{ "moves": "R2 D2 F'", "strategyId": "generated-two-phase-quality", "maxDepth": 30, "maxNodes": 10000000 }`
- `POST /solve-scan` with `{"faces": {"U":"UUURRR...", "R":"...", ...}, "strategyId": "generated-two-phase-quality", "maxDepth": 30, "maxNodes": 10000000 }`
- `POST /scan/analyze-face` with `{ "expectedCenter": "R", "image": "<base64-png>" }`
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

The many-cubes track is documented in `docs/many-cubes-plan.md`. The current implementation keeps `cube/3x3x3` stable and adds experimental `cube/2x2x2` support through the same Rust/API/frontend boundary.

Current puzzle IDs and slugs:

- `cube/3x3x3` -> `cube-3x3x3`, stable.
- `cube/2x2x2` -> `cube-2x2x2`, experimental.
- Pyraminx, Clock, Skewb, Square-1, and Megaminx are registered as planned metadata only.
- Future big-cube solver support should expose concrete sizes such as `cube/4x4x4`, not a generic `cube/nxn` catalog entry.

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

Scan preview is handled by the optional Rust-proxied scanner runtime in `scanner/runtime/`.

- API defaults to `http://127.0.0.1:8790` for scan analysis (`RUBIKS_VISION_URL` overrides this).
- The scanner runtime exposes `/analyze-face` for live face preview.
- The Rust API proxies live preview through `/scan/analyze-face`; `/scan/solve-session` validates reviewed stickers and solves in Rust.
- The active live scanner path uses the optional YOLO tile detector when `RUBIKS_VISION_TILE_DETECTOR_MODEL` points to an exported ONNX model.
- The default local detector path used by scanner scripts is `scanner/models/tile-detector.onnx`.

Install and run the runtime scanner service with:

```bash
npm run vision:install
npm run vision:dev
```

Run the scanner runtime tests with:

```bash
npm run vision:test
```

Run the full local stack with the current scanner detector environment configured:

```bash
npm run dev
```

Scanner training and evaluation tooling lives in `scanner/training/`. Use it to label sessions, replay scans, evaluate scanner quality, generate YOLO datasets, train/export local ONNX models, and keep private image artifacts out of git.

Useful scanner tooling commands:

```bash
npm run scanner:training:test
npm run scan:label
npm run scan:replay
npm run scan:evaluate
npm run scan:tile-yolo-roboflow-dataset
npm run scan:tile-yolo-check
npm run scan:tile-yolo-train
npm run scan:tile-yolo-export
npm run scan:tile-yolo-install
```

`scanner/runtime/README.md` documents the runtime service. `scanner/training/README.md` and `scanner/training/SCANNER_YOLO_RUNBOOK.md` document scanner datasets, model quality expectations, Roboflow/YOLO conversion, ONNX export, and artifact handling.

## Troubleshooting

- If solving returns `generated_tables_unavailable`, run:

```bash
npm run pruning:native
```

- If solving returns `unsupported_strategy`, use one of the IDs from `GET /strategies`.
- If the client gets `invalid_notation` or `invalid_limits`, send shorter notation and keep limits within `maxDepth <= 30` and `maxNodes <= 25000000`.
- If image scan fails, check `RUBIKS_VISION_URL` and restart both `npm run vision:dev` and the API.
- If startup logs show web missing, ensure `npm run build` produced `web/dist/index.html`.

## API-Backed Web App

The web app talks to the native HTTP API so generated two-phase pruning tables stay on the server and Rust owns artifact loading, solving, playback, and replay verification.

Current frontend stack:

- React 19, TypeScript, Vite, and React Router 7 with `BrowserRouter` for clean `/solve` and `/timer` routes.
- TanStack React Query for API health, puzzle metadata, strategy metadata, and solve mutation state.
- Radix-backed shared primitives for dialogs, alert dialogs, selects, switches, checkboxes, toasts, popovers, and tooltips; feature code should use wrappers in `web/src/components` instead of direct Radix imports.
- React Hook Form plus Zod for solve-form limit validation and submission shaping; Rust remains responsible for notation semantics, cube validity, and solver correctness.
- Zustand for scoped client state such as timer sessions/settings, solve settings, theme, and toast notifications.
- TanStack Table and TanStack Virtual for the timer solve table.
- Motion for small overlay, select, toast, and error-boundary transitions with reduced-motion support.
- Tailwind CSS v4 through the single `web/src/index.css` entrypoint and semantic `app-*` tokens. The UI stays square: do not add `rounded-*` utilities.
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

Production follows the same local tunnel model used by `zelda-proto`: one local HTTP server listens on port `3001`, serves the built web app, exposes the Rust API routes, and Cloudflare Tunnel publishes it at `wilho.com.br`. The production scanner runtime listens on `8791` by default, so `npm run live:start` can run alongside `npm run dev`.

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
- `RUBIKS_WEB_DIST_DIR=web/dist`
- The production web build uses the same origin for API calls when `VITE_RUBIKS_API_URL` is not set

## Solver Quality Report

The native solver quality report is Rust-only. It uses the fixture catalog in `crates/cube-engine/src/solver/quality.rs` to check deterministic solver rows, generated pruning-table availability, replay verification, and honest limit failures:

```bash
cargo run --quiet -p cube-engine --bin solver_quality_report
```

The Rust report summary includes status counts by solver selection, replay-verified successes, solution-length range, and explored-node totals. Row-level elapsed timing is local and non-deterministic.

## Local Visualization Package

`@rubiks-cube-solver/rubiks-cube` is used for frontend visualization, but it is not the solver core. This project keeps the solver engine in Rust with cubie representation so search, heuristics, pattern databases, and the HTTP API can evolve without depending on a Three.js/web-component state model.
