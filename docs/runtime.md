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

Use these scripts for the local production Docker stack that serves the built web app and Rust API at `http://127.0.0.1:8787/`.

| Script | Use When | What It Does |
| --- | --- | --- |
| `npm run prod:deploy` | After `main` changes or a PR is merged | Switches to `main`, pulls `origin/main`, rebuilds/recreates Docker production in the background, waits for app health, and prints status. |
| `npm run prod:restart` | Checkout is already current, but containers need a rebuild/recreate | Runs Docker production down/up, waits for app health, and prints status without pulling Git. |
| `npm run prod:health` | Need a quick app readiness check | Waits for `http://127.0.0.1:8787/health` to return 2xx. |
| `npm run prod:status` | Need container state | Shows `rubiks-prod` Compose containers. |
| `npm run prod:logs` | Need production logs | Follows logs for the `rubiks-prod` Compose project. |
| `npm run prod:down` | Need to stop production Docker | Stops and removes `rubiks-prod` containers and network. |
| `npm run live:start` | Need public production via Cloudflare | Runs `prod:deploy`, then starts `cloudflared tunnel run wilho`. |
| `npm run live:tunnel` | Docker production is already healthy and only tunnel is needed | Starts only the Cloudflare tunnel. |
| `npm run tunnel:run:prod` | Legacy command muscle memory | Compatibility alias for `live:start`. |
| `npm run tunnel:check:prod` | Legacy production health check | Compatibility alias for `prod:health`. |

Deploy or update the production-like local stack from `origin/main`:

```bash
npm run prod:deploy
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

`docker:up`, `docker:down`, `docker:restart`, `docker:status`, and `docker:logs` are lower-level Compose wrappers. Prefer `prod:*` for production operations because those commands include Git update and health-check behavior where appropriate.

Stop production Docker:

```bash
npm run prod:down
```

Inspect production Docker:

```bash
npm run prod:status
npm run prod:logs
```

Deploy the current `main` stack and start the Cloudflare tunnel:

```bash
npm run live:start
```

## Docker Dev Runtime

Use Docker dev when you want containerized hot-reload services instead of the local zero runtime. It is intentionally separate from Docker production.

| Script | Use When | What It Does |
| --- | --- | --- |
| `npm run docker:dev` | Need hot-reload dev services in Docker | Starts dev Compose with non-production ports. |
| `npm run docker:dev:down` | Need to stop Docker dev | Stops the `rubiks-dev` Compose project. |

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

| Script | Use When | What It Does |
| --- | --- | --- |
| `npm run docker:train` | Need scanner training in CPU/default Docker mode | Runs the trainer service once and removes the container. |
| `npm run docker:train-gpu` | Need scanner training with NVIDIA GPU | Runs the GPU trainer service once; requires NVIDIA Container Toolkit. |

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
