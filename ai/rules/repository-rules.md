# Repository Rules

Global rules for changes anywhere in this repository.

## Always

- Read `docs/project-plan.md`, nearby code, and current tests before changing behavior.
- Prefer the smallest correct change with the lowest surface area.
- Follow existing naming, file layout, import style, error handling, and command style before introducing a new pattern.
- Keep implementation aligned with the current priorities in `docs/project-plan.md` and the capabilities already present in code.
- Keep solver logic in Rust engine code, not in frontend or AI tooling.
- Use cubie representation as the primary engine model.
- For multi-puzzle work, keep state, move models, notation, validation, and solver strategy puzzle-specific unless a shared type is strictly metadata or infrastructure.
- Keep workspace-specific code inside the owning workspace unless there is a current cross-workspace consumer.
- Use repository-root commands such as `npm run ai:check`, `npm run api:test`, `npm run build`, and `cargo test` so paths and workspaces resolve consistently.
- For `web`, use Biome through workspace scripts for linting and formatting; do not add ESLint or Prettier configs unless explicitly requested.
- Run targeted verification for the affected area and report any environment blockers.
- Before any AI-created commit or pull request, run `cargo clippy --all-targets --all-features -- -D warnings` from the repository root when the Rust toolchain is available.
- Keep AI route files generated from canonical files under `ai`.
- Use `prod:deploy` for local production Docker deploys after `main` changes, `prod:restart` only when the checkout is already current, and `live:start` when the Cloudflare tunnel should be started after a production deploy.

## Never

- Do not add machine learning, reinforcement learning, or Transformers without an explicit current product requirement.
- Do not use sticker/color arrays as the primary solver representation.
- Do not mix UI rendering logic with cube engine logic.
- Do not add a generic puzzle engine, universal state type, universal move type, `BaseMove`, `BaseState`, `BasePuzzle`, or inheritance-style puzzle abstraction.
- Do not commit `.env` files, raw secrets, API tokens, model artifacts with private data, or local solver output that is not intended for source control.
- Do not edit `.opencode/skills`, `.cursor/rules`, or `.github/instructions` AI route files manually.
- Do not add compatibility layers or future abstractions without a concrete current consumer.
- Do not add a new formatter, linter, framework, or workspace-wide tool unless explicitly requested.
- Do not use `docker restart` or start an old production container to deploy code changes; production code changes require a Docker rebuild through `prod:deploy`, `prod:restart`, or the lower-level `docker:up` wrapper.

## Runtime Scripts

- `zero:prepare`, `zero:start`, `zero:status`, and `zero:stop`: local non-Docker runtime for development/debugging on ports `5173`, `8788`, and `8791`.
- `prod:deploy`: preferred production update command after PRs merge; switches to `main`, pulls `origin/main`, rebuilds/recreates Docker production, waits for `http://127.0.0.1:8787/health`, and prints status.
- `prod:restart`: rebuilds/recreates Docker production without pulling Git; use when the checkout is already current.
- `prod:health`, `prod:status`, `prod:logs`, and `prod:down`: production health/status/log/stop helpers.
- `live:start`: deploys production with `prod:deploy`, then starts `cloudflared tunnel run wilho`.
- `live:tunnel`: starts only the Cloudflare tunnel and assumes production Docker is already healthy.
- `tunnel:run:prod` and `tunnel:check:prod`: compatibility aliases for `live:start` and `prod:health`.
- `docker:up`, `docker:down`, `docker:restart`, `docker:status`, and `docker:logs`: lower-level `rubiks-prod` Compose wrappers; prefer `prod:*` unless you specifically need raw Compose behavior.
- `docker:dev` and `docker:dev:down`: containerized hot-reload dev runtime with non-production ports.
- `docker:train` and `docker:train-gpu`: scanner training containers, separate from normal runtime.

## Verification

- AI knowledge changes: `npm run ai:check`.
- Rust engine changes: run the narrowest relevant `cargo test` first, then `cargo test -p cube-engine` or `cargo test` when Rust is installed.
- API changes: `npm run api:test` or the relevant `cargo test -p rubiks-cube-solver-api` target.
- Web changes: `npm run build` and `npm run lint -w @rubiks-cube-solver/web` when dependencies are installed.
- Broad repository changes: run affected targeted checks first, then broader checks only when the change crosses boundaries.
- Commit and PR requests: run `cargo clippy --all-targets --all-features -- -D warnings` before committing, pushing, or opening/updating the PR, or report the environment blocker if it cannot run.
