# Contributing

Thanks for improving Rubik's Cube Solver. Keep changes small, reviewed, and aligned with the Rust-owned solver boundary.

## Development Setup

```bash
npm run dev
```

Use `npm run dev:stop` when you are done. The default development runtime is Docker-based; use `npm run dev:local:prepare` and `npm run dev:local` only when you need the non-Docker fallback.

Useful local commands:

```bash
npm run ai:check
cargo fmt --check
cargo test --workspace --all-targets
cargo clippy --workspace --all-targets --all-features -- -D warnings
npm run test -w @rubiks-cube-solver/web
npm run lint -w @rubiks-cube-solver/web
npm run build
npm run vision:test
npm run scanner:training:test
```

## Contribution Rules

- Keep puzzle state, validation, search, heuristics, pruning tables, and replay verification in Rust.
- Never expose a successful solve unless replay verification succeeds.
- Keep frontend code as UI and API orchestration only.
- Keep scanner predictions as evidence only; Rust validation remains authoritative.
- Do not commit generated pruning tables, model artifacts, private captures, logs, `.env` files, generated datasets, or local outputs.
- Update canonical AI guidance under `ai/` and run `npm run ai:sync`; do not edit generated AI routes manually.
- Create a task branch before changing files and never commit directly on `main`; Husky blocks commits on `main` locally.
- Preserve existing coverage thresholds and checks. Add tests for behavior changes.

## Pull Requests

- Use conventional commit-style titles when possible, such as `ci:`, `security:`, `api:`, `test:`, `scanner:`, `web:`, `build:`, or `docs:`.
- Include scope, risk, files changed, commands executed, test results, security implications, performance implications, rollback plan, and explicit follow-up work.
- Prefer focused pull requests over large mixed changes.
