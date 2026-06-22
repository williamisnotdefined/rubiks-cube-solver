# Runtime And Containerization

This project has two supported runtime paths: local zero-install preparation and Docker runtime. Scanner training is separate from normal runtime because YOLO/CUDA dependencies are heavier and environment-sensitive.

## Local Zero Runtime

Prepare local dependencies and generated artifacts without running the full validation gate:

```bash
npm run zero:prepare
```

This command verifies prerequisites, pulls Git LFS assets, runs `npm ci`, creates `.venv`, installs scanner runtime dependencies, converts the Roboflow dataset when needed, and generates native pruning tables.

It does not run lint, Playwright, coverage, `bootstrap:check`, or scanner training by default.

Start local services:

```bash
npm run zero:start
```

Ports:

| Service | URL |
| --- | --- |
| Web | `http://127.0.0.1:5173` |
| API | `http://127.0.0.1:8788/health` |
| Vision | `http://127.0.0.1:8791/health` |

Manage services:

```bash
npm run zero:status
npm run zero:stop
```

Logs and PID files are written under `logs/zero-install/`.

## Scanner Training

Training is opt-in:

```bash
npm run zero:prepare -- --train-scanner
```

CPU is the safe default. CUDA is explicit:

```bash
npm run zero:prepare -- --train-scanner --device cuda --torch cu128 --epochs 100 --batch 16
```

Torch dependency modes:

```bash
npm run scan:tile-yolo-install-deps -- --torch cpu
npm run scan:tile-yolo-install-deps -- --torch cu128
npm run scan:tile-yolo-install-deps -- --torch skip
```

The installed runtime model path is:

```txt
scanner/models/tile-detector.onnx
```

The current vision model is trained from the Roboflow Universe Rubik's Cube Colors source project: <https://universe.roboflow.com/dhyan-thacker/rubiks-cube-colors>.

## Docker Production Runtime

Run a production-like local stack:

```bash
npm run docker:up
```

Open:

```txt
http://127.0.0.1:8787/
```

Services:

| Service | Role | Host Port |
| --- | --- | --- |
| `app` | Rust API, cube-engine, generated pruning tables, and `web/dist` | `8787` |
| `vision` | Python FastAPI scanner runtime and ONNX inference | internal only |

The `app` container calls vision at `http://vision:8790`. The scanner model is mounted from `./scanner/models:/models:ro`.

Stop production Docker:

```bash
npm run docker:down
```

## Docker Dev Runtime

Run hot-reload dev services in Docker:

```bash
npm run docker:dev
```

Ports are intentionally different from Docker production so both can run on the same PC:

| Environment | Web | API | Vision |
| --- | ---: | ---: | ---: |
| Docker production | `8787` | `8787` through `app` | internal `8790` |
| Local/Docker dev | `5173` | `8788` | `8791` |

Stop Docker dev:

```bash
npm run docker:dev:down
```

The npm scripts use Compose project names `rubiks-prod` and `rubiks-dev`, so container names, networks, and named volumes do not collide.

## Docker Trainer

Training is separate from runtime:

```bash
npm run docker:train
npm run docker:train-gpu
```

`docker:train-gpu` uses CUDA Torch wheels and requests NVIDIA GPU access. It requires NVIDIA Container Toolkit. CPU training is available but can be slow.

Trainer output stays in ignored local paths:

```txt
scanner/outputs/
scanner/runs/
scanner/models/tile-detector.onnx
```

## Validation

Fast runtime checks:

```bash
npm run scan:tile-yolo-check
curl http://127.0.0.1:8788/health
curl http://127.0.0.1:8791/health
curl http://127.0.0.1:8787/health
```

Full validation remains explicit:

```bash
npm run bootstrap:check
```
