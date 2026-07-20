# Architecture

Rubik's Cube Solver is a Rust-first puzzle solver with a native HTTP API, React web UI, and optional YOLO/ONNX scanner service.

```txt
User
  -> Web UI
  -> Rust HTTP API
  -> Rust cube-engine
  -> validated puzzle-specific state
  -> puzzle-scoped solver strategy
  -> replay-verified solution
  -> Web playback
```

## Components

| Component | Responsibility |
| --- | --- |
| `crates/cube-engine` | Puzzle state, notation, validation, search, heuristics, pruning artifacts, solver strategies, quality reporting, and replay verification. |
| `crates/api` | Axum HTTP contracts, limit validation, puzzle routing, scanner integration, artifact loading, and response mapping. |
| `apps/web` | React 19 UI, compiled with React Compiler, for solve flows, scan flows, visualization, playback, algorithms pages, notation pages, and timer flows. |
| `packages/rubiks-cube` | Private visualization package for puzzle rendering and playback support. |
| `scanner` | Python YOLO/ONNX scanner runtime, contracts, and training/evaluation helpers. |
| `ai` | Canonical AI guidance and generated route source. |

## Trust Boundary Diagram

```txt
Browser input and camera evidence
  -> API validation and request limits
  -> Rust-owned validation and solving
  -> replay verification gate
  -> successful response only when replayVerified=true

Scanner model output
  -> tile evidence and confidence
  -> reviewed sticker state
  -> Rust validation
  -> Rust solving
```

## Supported Scope

Stable: `cube/3x3x3` notation, scan input, generated two-phase strategies, bounded searches, portfolio strategies, and cube visualization.

Experimental: `cube/2x2x2` notation, scan input, 2x2-specific strategies, and cube2 visual state.

Catalog-only: `pyraminx`, `clock`, `skewb`, `square1`, and `megaminx`. Catalog-only entries are not solver commitments.

## Web Rendering

`apps/web` uses React 19 with React Compiler enabled through the Vite React compiler preset. Components and hooks use ordinary render-time calculations and callbacks; the compiler owns memoization.

- Do not introduce `useMemo`, `useCallback`, `React.memo`, or `forwardRef` in web application code.
- Use React 19's `ref` prop with `ComponentPropsWithRef` when a component exposes a DOM ref. Use `useImperativeHandle` with that prop only for a deliberate non-DOM imperative API.
- Use `useEffectEvent` for effect-owned callbacks that need the latest props or state without resubscribing an effect.
- Keep side effects and mutable refs out of render. Use effects or event handlers for imperative work.
- Do not make memoized identity a correctness requirement. Express effects in terms of the values they observe.

## Validation Commands

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
