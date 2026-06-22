# Project Plan

This document is the compact technical direction for the solver, API, web UI, scanner, and multi-puzzle boundaries. Keep detailed runbooks near the owning workspace.

## Product Goal

Build a web application where a user can provide a valid puzzle state, receive a replay-verified solution within explicit limits, and replay the result visually. Invalid states must be rejected with useful errors instead of unsafe solutions.

Current priorities:

1. Never return an invalid solution.
2. Reject impossible states with useful errors.
3. Keep solving, validation, heuristics, pruning tables, and replay verification in Rust.
4. Improve solution quality only when the result remains replay verified and honest about limits.
5. Keep API and frontend code as adapters around Rust-owned behavior.

## Current Surface

- `crates/cube-engine` owns 3x3 cubie state, 2x2 state, moves, notation, validation, bounded IDA*, generated two-phase search, pruning tables, solver strategies, quality reporting, and puzzle metadata.
- `crates/api` exposes the Rust engine through Axum, validates request limits, scopes strategies to puzzles, loads generated artifacts, and maps typed results to HTTP contracts.
- `web` provides puzzle-aware solve flows, scan flows, visualization, playback, locale resources, algorithms pages, notation pages, and timer flows.
- `packages/rubiks-cube` is a private visualization package. It is rendering code, not the solver core.
- `scanner` is Python-only and YOLO-only for camera analysis, scan-session tooling, training helpers, and ONNX export.
- `ai` is the canonical AI guidance source. Generated routes under `.opencode`, `.cursor`, and `.github/instructions` must be updated through `npm run ai:sync`.

## Implementation Rules

- Use cubie or puzzle-specific state as the primary engine model. Sticker, facelet, Kociemba, and visual-state strings are adapter formats.
- Verify every successful solution by replay before exposing success.
- Do not promise optimality, `<=16`, God's-number behavior, or 20-move guarantees without an implemented strategy and tests that support the claim.
- Treat two-phase, IDA*, PDBs, portfolios, and external classical algorithms as strategies, not product goals.
- Keep browser clients from submitting raw facelet, Kociemba, sticker-state, or solver-internal payloads unless a current API contract explicitly supports that input kind.
- Do not implement solver algorithms, cube validation, search, heuristics, or pruning-table generation in the frontend.
- Do not add machine learning, reinforcement learning, Transformers, or ML-guided solving without an explicit current product requirement.
- Do not commit generated pruning tables, model checkpoints, `.pt` files, `.onnx` files, private captures, training runs, or generated datasets.
- Track only explicitly approved source datasets through Git LFS.

## Architecture Direction

```txt
Web UI
        -> Rust HTTP API
        -> Rust cube-engine
        -> validated puzzle state
        -> puzzle-scoped solver strategy or portfolio
        -> replay-verified move sequence within limits
        -> playback / solved verification
```

Heavy solving stays behind the native Rust API. Browser-local solving is out of scope unless it becomes a concrete product requirement.

## Puzzle Support

Stable puzzle:

- `cube/3x3x3`: notation, 3x3 facelets, scan input, generated two-phase strategies, bounded searches, portfolio strategies, and cube visualization.

Experimental puzzle:

- `cube/2x2x2`: notation, scan input, 2x2-specific strategies, and cube2 visual state.

Catalog-only puzzle metadata:

- `pyraminx`
- `clock`
- `skewb`
- `square1`
- `megaminx`

Catalog-only entries are not solver commitments. A puzzle becomes supported only when it has puzzle-specific state, moves, notation or state input, validation, solver strategy, replay verification, API contracts, frontend behavior or fallback, and tests.

## Multi-Puzzle Boundary

Do not build one generic puzzle state, one generic move type, or one base engine.

Each puzzle owns:

- state representation;
- move enum or move structure;
- notation parser;
- legal move generator;
- state validator;
- replay verifier;
- solver strategy;
- heuristics and coordinates;
- artifact compatibility rules.

Shared layers are allowed only where they stay puzzle-neutral:

- puzzle identity and metadata;
- strategy metadata;
- solve request and response shape;
- search budgets, metrics, and not-found statuses;
- artifact metadata format;
- frontend puzzle selection and visualization adapter selection.

Do not introduce `BaseMove`, `BasePuzzle`, `BaseState`, universal puzzle state, universal move type, or inheritance-style puzzle abstractions.

## Artifact Compatibility

Generated solver artifacts must be rejected before search when they do not match the puzzle, state encoding, move set, metric, coordinate profile, table version, or generator version expected by the runtime.

Generated artifacts are local verification/runtime outputs unless an artifact is explicitly approved for source control.

## Scanner Policy

The runtime scanner path is YOLO ONNX tile detection plus Rust-side reviewed-state validation and solving. Scanner behavior may produce visual evidence, but cube validity and solving remain Rust/product responsibilities.

Scanner support is puzzle-specific. Current supported scan inputs are exposed by the puzzle registry and API contracts, not assumed from puzzle family.

## Active Work Areas

- Preserve the stable 3x3 product path while improving solver quality and limits honesty.
- Keep 2x2 experimental support puzzle-specific and replay verified.
- Maintain scanner training/runtime contracts without reintroducing non-YOLO detector paths.
- Keep API, web, and visualization adapters aligned with puzzle metadata and visual-state kinds.
- Keep generated AI routes synchronized from canonical `ai` files.

## Verification Policy

- AI knowledge changes: `npm run ai:check`.
- Rust engine changes: run the narrowest relevant test first, then `cargo test -p cube-engine` or `cargo test` when needed.
- API changes: `npm run api:test` or the relevant `cargo test -p rubiks-cube-solver-api` target.
- Web changes: `npm run build`, `npm run lint -w @rubiks-cube-solver/web`, and targeted web tests as needed.
- Scanner changes: `npm run vision:test` or `npm run scanner:training:test` depending on the affected area.
- Cross-boundary product changes: run affected targeted checks before broader gates such as `npm run product:gate`.
