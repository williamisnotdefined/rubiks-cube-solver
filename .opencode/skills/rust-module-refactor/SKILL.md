---
name: "rust-module-refactor"
description: "Use when splitting large Rust files, changing mod.rs facades, moving tests, tightening visibility, or improving Rust module boundaries without changing behavior."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/rust-module-refactor.md`.

Referenced context:
- `../../../ai/rules/rust-module-refactor-rules.md`
- `../../../ai/rules/testing-rules.md`
- `../../../ai/architecture/project-architecture.md`
- `../../../ai/architecture/rust-module-boundaries.md`
- `../../../ai/glossary/cube-terms.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: rust-module-refactor

## Canonical Skill: `ai/skills/rust-module-refactor.md`

# Rust Module Refactor

Use this skill when splitting large Rust files, changing `mod.rs` facades, moving tests, tightening visibility, or improving Rust module boundaries without changing behavior.

## Goal

Make Rust code easier to read and maintain by extracting concrete responsibilities while preserving public API, solver behavior, artifact compatibility, and verification coverage.

## Read First

- `ai/rules/rust-module-refactor-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/rust-module-boundaries.md`
- `ai/glossary/cube-terms.md`

## Related References

- Use `cube-engine` when the refactor touches cube state, moves, notation, facelets, or validation.
- Use `solver-search` when the refactor touches search, heuristics, pruning tables, or two-phase internals.
- Use `api-boundary` when the refactor touches Axum routes, request/response structs, or frontend-facing status contracts.

## Workflow

- Identify the current public API and preserve it with facade modules and `pub use` before moving implementation details.
- Split one responsibility at a time: errors, config, result types, parsing, conversion, dispatch, table IO, search traversal, ordering, or tests.
- Prefer private modules and `pub(crate)` exports unless an existing caller needs the item.
- Keep mechanical moves separate from algorithm, heuristic, format, or contract changes.
- Move tests only when the new location makes the behavior owner clearer.
- Run targeted tests after each module family, then broader crate tests after a larger boundary is stable.

## Expected Output

- Large Rust files shrink into focused modules with stable facades.
- Public imports used by API, bins, tests, and frontend contracts keep compiling.
- No solver behavior, artifact format, strategy metadata, or API response semantics changes during mechanical extraction.

## Verification

- Run `cargo fmt --check` after Rust module changes.
- Run `cargo test -p cube-engine` after engine or solver module refactors.
- Run `cargo test -p rubiks-cube-solver-api` after API module refactors.
- Run `npm run ai:check` after AI knowledge changes.

# Referenced Context

## Reference: `ai/rules/rust-module-refactor-rules.md`

# Rust Module Refactor Rules

Rules for splitting Rust files, tightening module boundaries, and reducing refactor risk.

## Always

- Preserve observable behavior and public exports during structural refactors.
- Keep `mod.rs` or the original file as a facade when moving code into submodules.
- Use `pub use` only for the existing public crate API or a current cross-module consumer.
- Prefer `pub(crate)` for internal solver, table, helper, and adapter seams.
- Split by responsibility: types, errors, parsing, conversion, search traversal, table IO, report formatting, and tests.
- Move tests with the code only when it improves locality; otherwise keep behavior tests at the owning public boundary.
- Run `cargo fmt` after module moves and the narrowest relevant `cargo test` before broad tests.

## Never

- Do not change algorithms, heuristics, budgets, status strings, artifact formats, or API contracts as part of a file split.
- Do not introduce generic repositories, base services, traits, or compatibility layers without a concrete current boundary.
- Do not make private search or cube helpers public only to avoid arranging modules correctly.
- Do not move solver logic into `crates/api`, `web`, scanner code, or AI tooling.
- Do not combine large search-performance changes with mechanical module extraction.

## Verification

- Run `cargo fmt --check` for every Rust module refactor.
- Run the crate-level test for the affected boundary: `cargo test -p cube-engine` or `cargo test -p rubiks-cube-solver-api`.
- Run targeted integration tests for facelets, generated two-phase, pruning, or solver quality when those files move.

## Reference: `ai/rules/testing-rules.md`

# Testing Rules

Testing rules for this repository.

## Always

- Add Rust unit tests next to pure functions when behavior is introduced.
- Add integration tests under the owning crate when behavior crosses module boundaries.
- Add regression tests next to changed behavior when fixing bugs.
- Test observable cube behavior: solved state, inverse moves, notation parsing, scramble inversion, validation, and search output.
- Test HTTP/API behavior through request and response contracts when `crates/api` behavior changes.
- Test web API-client and UI behavior through public component or request boundaries when frontend behavior changes.
- Test scanner training code with deterministic fixtures or fixed seeds.
- Keep algorithm tests deterministic.
- Run the narrowest test first, then the affected crate test command.
- Use Vitest APIs such as `describe`, `it`, `expect`, `vi.fn`, and `vi.spyOn` for `web` unit and component tests.
- Keep `web` tests in `__tests__/` folders beside the source area they cover.
- Use Testing Library for React component behavior and public accessibility queries.
- Use Playwright accessibility queries for E2E flows and shared E2E helpers for non-native controls such as Radix Select.
- Keep `web/src/api` request and hook tests in `web/src/api/__tests__`, using shared fetch and React Query helpers under `web/src/test`.
- Keep `web/src/core` tests under `web/src/core/<category>/__tests__/<name>.test.ts`.
- Keep `web` coverage thresholds at 95% or higher for statements, branches, functions, and lines when coverage is configured.

## Never

- Do not rely on random tests without a fixed seed.
- Do not assert implementation details when public cube behavior can be asserted.
- Do not leave focused-only tests such as `.only` in committed test files.
- Do not add duplicate test helpers when nearby crate, web, API, or scanner helpers already cover the setup.
- Do not add tests for future surfaces that do not exist yet.
- Do not use Jest-only APIs or `jest.mock` patterns in Vitest tests.
- Do not place `web` tests as loose sibling `*.test.ts(x)` files when a nearby `__tests__/` folder is available.
- Do not add duplicate web test helpers when `web/src/test/render.tsx` or `web/src/test/api.ts` already covers the setup.
- Do not use Playwright `selectOption()` or `locator('option')` for Radix Select controls; use helpers under `tests/e2e/select-helpers.ts`.

## Verification

- Cube engine tests: `cargo test -p cube-engine`.
- API tests: `npm run api:test` or `cargo test -p rubiks-cube-solver-api`.
- Workspace tests: `cargo test`.
- Web build/lint: `npm run build` and `npm run lint -w @rubiks-cube-solver/web`.
- Web unit tests: `npm run test -w @rubiks-cube-solver/web`.
- Web coverage: `npm run test:coverage -w @rubiks-cube-solver/web`.
- Web Storybook: `npm run storybook:build -w @rubiks-cube-solver/web`.
- End-to-end tests: `npm run test:e2e` after the API, web app, and pruning-table prerequisites are available.
- E2E split commands: `npm run test:e2e:smoke` for product/responsive/timer smoke, `npm run test:e2e:scan` for serial manual scan coverage, and `npm run test:e2e:full` for the complete non-heavy suite.
- Product gate: `npm run product:gate` for release-level or cross-boundary validation.
- AI routes: `npm run ai:check`.

## Reference: `ai/architecture/project-architecture.md`

# Project Architecture

The target is a Rubik's Cube solver with a Rust engine, search algorithms, heuristics, pattern databases, a native HTTP API, optional scanner support, and a modern web visualization.

## Current Structure

- `crates/cube-engine`: Rust crate for cube representation, moves, notation, scramble handling, search, and heuristics.
- `crates/api`: Axum HTTP API around the Rust engine and generated pruning-table artifacts.
- `web`: Vite React app for puzzle-aware solve flows, scan flows, visualization, playback, algorithms pages, notation pages, and timer flows.
- `scanner`: Python scanner contracts, FastAPI runtime, and offline scanner training/evaluation tooling.
- `ai`: canonical AI knowledge base and route generation system.
- `docs/project-plan.md`: current technical direction, implementation rules, and puzzle boundaries.

## Generated Artifacts

- Native pruning tables are generated by `cube-engine` binaries and loaded by `crates/api`.
- Solver quality reports and real-scramble gates are executable verification artifacts, not frontend behavior.

## Runtime And Deployment

- Docker dev is the default development runtime. Use `npm run dev` to build/recreate the `rubiks-dev` Compose project, wait for health, and serve web/API/vision on ports `5173`, `8788`, and `8791`.
- Local non-Docker fallback uses `dev:local:prepare` and `dev:local` for development/debugging when Docker is not desired.
- Docker production uses the `rubiks-prod` Compose project. Use `live:deploy` after merges to pull `origin/main`, rebuild/recreate containers, wait for app health, and print status.
- Use `live:restart` only when the checkout is already current and containers need to be rebuilt/recreated.
- `live:start` runs production deploy first and then starts the Cloudflare tunnel. `live:tunnel` runs only `cloudflared tunnel run wilho`.
- Docker dev, Docker production, and scanner training use separate Compose projects/commands so they do not collide.

## Multi-Puzzle Direction

- Additional puzzles must own puzzle-specific state, move models, notation parsers, validators, solvers, heuristics, coordinates, and artifact rules.
- Shared multi-puzzle code is limited to metadata, registries, budgets, results, compatibility checks, API contracts, and visualization adapter selection.
- Do not introduce a generic puzzle engine, universal move type, universal state type, `BaseMove`, `BaseState`, `BasePuzzle`, or inheritance-style puzzle hierarchy.

## Future Or Optional Boundaries

- `crates/wasm`: optional future wasm-bindgen bridge around the Rust engine if browser-local solving becomes a concrete product requirement.
- Additional frontend routing, shared component libraries, or state managers should wait for current UI complexity to require them.

## Ownership

- Cube state, moves, validation, search, and heuristics belong in Rust.
- The API validates HTTP contracts, applies safety limits, calls Rust solver code, and returns typed solver results.
- Frontend code should only render, collect notation/limits, send solve requests, receive states, and play animations.
- Scanner runtime code may produce visual evidence, but reviewed stickers, cube validation, and solving remain Rust/product boundaries.

## Reference: `ai/architecture/rust-module-boundaries.md`

# Rust Module Boundaries

Rust module structure should make the cube domain and solver flow easier to read without adding speculative abstraction.

## Crate Boundaries

- `crates/cube-engine` owns cube state, moves, validation, search, heuristics, pruning tables, solver orchestration, and reports.
- `crates/api` owns HTTP routing, request and response types, CORS, API safety caps, generated solver loading, and HTTP error mapping.
- `web` renders UI and calls the API; it should not receive solver internals.
- `scanner` owns Python scanner runtime and offline scanner model tooling; it should not receive solver internals.

## Module Shape

Use a facade module when preserving public paths matters:

```txt
solver/
  mod.rs          # public facade and reexports
  config.rs
  dispatch.rs
  errors.rs
  input.rs
  playback.rs
  result.rs
  strategy.rs
```

Prefer narrow files named after concrete responsibilities. Good seams in this repository include:

- `errors`: typed error enums and `Display` implementations.
- `metadata`: stable artifact, report, or solver metadata structs.
- `table` / `artifact`: pruning-table representation and binary IO.
- `coordinates`: phase or cubie coordinate structs and checked conversions.
- `ordering`: deterministic move ordering and pruning predicates.
- `dispatch`: public solver strategy selection.
- `responses`: API response mapping.

## DDD Mapping For This Project

- Domain: cubies, moves, coordinates, facelets, invariants, and pure transformations.
- Application/use case: solver entry points, strategy dispatch, replay verification, and reports.
- Infrastructure/adapters: Axum handlers, local artifact loading, CLI binaries, and filesystem writes.

## Visibility

- Public crate exports should be intentional and stable once used by API, frontend, tests, or binaries.
- Internal helpers should stay `pub(crate)` or private to their parent module.
- Traits are useful for real boundaries such as swappable artifacts or external inference, not for ordinary helper extraction.

## Reference: `ai/glossary/cube-terms.md`

# Cube Terms

## Cubie

A physical movable piece of the cube. The core engine tracks cubies rather than face colors as the primary model.

## Corner

A cubie with three stickers. A 3x3 cube has eight corners.

## Edge

A cubie with two stickers. A 3x3 cube has twelve edges.

## Permutation

Which cubie occupies each position.

## Orientation

How a cubie is twisted or flipped in its current position.

## Move

A face turn such as `R`, `U`, `R'`, or `U2`.

## Scramble

A sequence of moves applied from the solved state to produce a valid cube state.

## Heuristic

An estimate of distance from a cube state to the solved state.

## Admissible Heuristic

A heuristic that never overestimates the true distance to the solved state.

## Pattern Database

A precomputed lookup table mapping partial cube states to minimum solution distances.

## Kociemba String

A facelet string format commonly used by two-phase solvers. It can be an adapter format, not the primary engine model.
