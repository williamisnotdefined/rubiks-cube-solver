# Rubik's Cube Solver

Rust-first puzzle solver with a native HTTP API, React web UI, replay verification, and optional YOLO-based camera scanner.

The product goal is a web interface where a user can input a valid puzzle state and receive the shortest practical replay-verified solution found within explicit limits.

## Current Status

- `crates/cube-engine` owns state, moves, notation, validation, search, heuristics, pruning tables, solver strategies, and replay verification.
- `crates/api` exposes the Rust engine through Axum HTTP endpoints.
- `web` provides puzzle-aware solve flows, visualization, playback, and locale resources.
- `scanner` is Python-only and YOLO-only for camera analysis, training helpers, and ONNX export.
- AI routing is generated from canonical files under `ai/`.

## Project Docs

- `docs/project-plan.md`: current technical direction, implementation rules, and puzzle boundaries.
- `docs/runtime.md`: local, Docker, production, tunnel, and training runtime commands.
- `scanner/training/SCANNER_YOLO_RUNBOOK.md`: scanner dataset, training, export, and artifact workflow.
- `scanner/runtime/README.md`: scanner runtime service details.

## Prerequisites

- Node.js and npm.
- Rust toolchain for API, engine tests, and pruning-table generation.
- Python 3.11+ for optional scanner runtime and scanner training helpers.
- Git LFS for source datasets tracked under `scanner/datasets`.

## Quick Start

```bash
npm install
npm run vision:install
npm run dev
```

For a prepared local runtime without the full validation gate:

```bash
npm run zero:prepare
npm run zero:start
```

This starts dev ports that can run alongside Docker production:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8788`
- Vision: `http://127.0.0.1:8791`

Stop or inspect the local runtime with:

```bash
npm run zero:stop
npm run zero:status
```

Core commands:

```bash
npm run api:dev
npm run web:dev
npm run build
npm run bootstrap:check
npm run product:gate
```

## Docker Runtime

Production-like Docker runs the Rust API and built web app in one `app` container, with scanner vision in a separate `vision` container:

```bash
npm run prod:deploy
npm run prod:restart
npm run prod:status
npm run prod:logs
npm run prod:down
```

Use `prod:deploy` after a merge to update `main`, rebuild Docker images, start containers in the background, wait for `http://127.0.0.1:8787/health`, and print Compose status. Use `prod:restart` only when the local checkout is already current and you just need to rebuild/recreate containers.

Open `http://127.0.0.1:8787/`. The scanner model is mounted from `scanner/models/tile-detector.onnx`; if it is missing, the app still starts but scanner health reports the detector unavailable.

To deploy the current `main` build and start the Cloudflare tunnel:

```bash
npm run live:start
```

`tunnel:run:prod` is kept as a compatibility alias for `live:start`. `live:tunnel` runs only `cloudflared tunnel run wilho` and assumes Docker production is already healthy.

Docker dev uses separate hot-reload services and non-conflicting ports:

```bash
npm run docker:dev
npm run docker:dev:down
```

Scanner training is separate from normal runtime:

```bash
npm run docker:train
npm run docker:train-gpu
```

GPU training requires NVIDIA Container Toolkit. See `docs/runtime.md` for details.

When Rust is installed:

```bash
cargo test
```

## Clean Bootstrap Check

Use `bootstrap:check` to validate a fresh install:

```bash
npm ci
npm run vision:install
npm run bootstrap:check
```

The check runs AI route validation, Rust formatting, cube-engine tests, API tests, scanner runtime/training tests, web build, web lint, and a YOLO artifact readiness check. Missing local runtime ONNX files do not fail the core bootstrap gate.

## Scanner YOLO Pipeline

The repository tracks the current Roboflow COCO source export through Git LFS at:

```txt
scanner/datasets/roboflow/rubiks-cube-colors-v2.coco.zip
```

Source Roboflow Universe project: <https://universe.roboflow.com/dhyan-thacker/rubiks-cube-colors>.

Train and install a local runtime detector from scratch with `scanner/training/SCANNER_YOLO_RUNBOOK.md`.

The installed runtime model is local and ignored by git:

```txt
scanner/models/tile-detector.onnx
```

Override the source dataset when testing another Roboflow export:

```bash
RUBIKS_ROBOFLOW_COCO_ZIP=/path/to/export.zip npm run scan:tile-yolo-roboflow-dataset
```

## Artifact Rules

Do not commit generated pruning tables, local camera captures, generated YOLO datasets, training runs, checkpoints, `.pt` files, `.onnx` files, logs, `.env` files, or local `outputs/` directories.

The explicit exception is the approved source dataset under `scanner/datasets/roboflow`, tracked through Git LFS.

## Native HTTP API

Start the API:

```bash
npm run api:dev
```

Useful endpoints:

- `GET /health`
- `GET /puzzles`
- `GET /puzzles/:puzzleSlug`
- `GET /puzzles/:puzzleSlug/strategies`
- `POST /puzzles/:puzzleSlug/solve`
- `POST /solve-notation`
- `POST /solve-scan`
- `POST /scan/analyze-face`
- `POST /scan/solve-session`
- `POST /puzzles/:puzzleSlug/scan/solve-session`

Every successful API solve includes `replayVerified=true`.

## Solver Quality Commands

```bash
npm run pruning:native
npm run solver:real-scrambles
npm run solver:short16
npm run solver:short16:portfolio
npm run pruning:report
```

Generated pruning tables are local artifacts under `crates/cube-engine/pruning-tables` and should not be committed.

## AI Knowledge

Update generated AI routes only from canonical files under `ai/`:

```bash
npm run ai:sync
npm run ai:check
```

Do not edit `.opencode/skills`, `.cursor/rules`, or `.github/instructions` manually.
