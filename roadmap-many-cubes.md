# Many Cubes Roadmap

## Purpose

This roadmap defines the multi-puzzle expansion track for the repository.

The main `roadmap.md` remains the source of truth for the current 3x3x3 product path. This document describes the larger work required to support many puzzle types without destabilizing the existing solver.

## Branch

Implementation branch:

```txt
feat/many-cubes
```

## Product Goal

Build a Rust-first multi-puzzle solving platform that can solve multiple twisty puzzles through typed puzzle-specific engines, explicit solver strategies, replay verification, and a web/API adapter layer.

The first new puzzle is 2x2x2.

## Product Priorities

1. Preserve the existing 3x3x3 product behavior.
2. Never return an unverified solution.
3. Keep puzzle logic in Rust.
4. Add puzzles one at a time.
5. Prefer puzzle-specific correctness over premature generic abstractions.
6. Keep API and frontend as adapters over engine capabilities.
7. Keep strategy guarantees honest.
8. Keep generated artifacts local unless explicitly small and intended for source control.
9. Keep ML optional and compatibility-checked.

## Scope

Puzzle implementation order:

1. 2x2x2
2. Pyraminx
3. Clock
4. Skewb
5. NxNxN cubic puzzles, starting with 4x4x4
6. Square-1
7. Megaminx

## Exclusions

Cuboids are excluded from this roadmap.

Excluded examples:

- 2x3x3
- 3x3x5
- 15x15x5
- any non-cubic `A x B x C` puzzle with unequal dimensions

Other exclusions:

- scanner support for all puzzles in the initial track;
- a universal state type;
- a universal move type;
- a universal IDA* requirement;
- ML as a required product solver;
- optimality claims without proof boundaries and tests.

## Architectural Direction

The multi-puzzle architecture is registry based.

Each puzzle gets its own implementation:

```txt
Puzzle-specific state
Puzzle-specific move model
Puzzle-specific notation parser
Puzzle-specific validator
Puzzle-specific solver
Puzzle-specific heuristics
Puzzle-specific artifacts
Puzzle-specific ML encoders, if any
```

Shared infrastructure remains puzzle-neutral:

```txt
Puzzle IDs
Strategy metadata
Solve budgets
Solve outcomes
Metrics
Replay verification reporting
API request/response contracts
Artifact metadata
Dataset/model compatibility metadata
Frontend adapters
```

## Phase 0 - Documentation And Branch

Goal: open the multi-puzzle line of work with explicit scope and no behavior changes.

Deliverables:

- create branch `feat/many-cubes`;
- add `docs/many-cubes-plan.md`;
- add `roadmap-many-cubes.md`;
- document that cuboids are out of scope;
- document that 2x2x2 is first;
- document that dedicated IDA* per puzzle is allowed;
- document that Clock may use a non-IDA* solver;
- document that NxN should use reduction rather than full-state brute force.

Exit criteria:

- docs exist;
- scope is explicit;
- no code behavior changed.

Verification:

```bash
git status --short --branch
```

## Phase 1 - Puzzle Metadata Types

Goal: add a minimal Rust metadata layer without moving the current 3x3 implementation.

Deliverables:

- `PuzzleId` type;
- API-safe puzzle slug mapping;
- `PuzzleFamily` enum;
- `PuzzleStatus` enum;
- `MoveMetric` enum;
- `InputKind` enum;
- `VisualizationKind` enum;
- `PuzzleDefinition` struct;
- `SolverStrategyDefinition` struct;
- tests for ID/slug round trips;
- tests for stable metadata.

Initial puzzle metadata:

```txt
cube/3x3x3 stable
cube/2x2x2 planned
pyraminx planned
clock planned
skewb planned
cube/nxn planned
square1 planned
megaminx planned
```

Exit criteria:

- current 3x3 code compiles unchanged;
- registry metadata can list planned puzzles;
- no solve behavior has changed.

Verification:

```bash
cargo test -p cube-engine puzzle
```

## Phase 2 - Register Existing 3x3 As A Puzzle

Goal: describe the current 3x3 implementation through the new metadata layer.

Deliverables:

- register `cube/3x3x3`;
- map existing `SolverStrategy` values into `SolverStrategyDefinition`;
- keep existing `SolverStrategy::ALL` temporarily;
- expose default strategy metadata for 3x3;
- add tests proving current strategy IDs remain stable.

Current 3x3 strategy IDs to preserve:

```txt
bounded-ida-star
generated-two-phase
generated-two-phase-quality
generated-two-phase-multiprobe
optimal-bounded-corner-pdb
optimal-bounded-pdb16
short-solution-portfolio
```

Exit criteria:

- 3x3 strategies are discoverable by puzzle metadata;
- legacy strategy API still works;
- no frontend change required yet.

Verification:

```bash
cargo test -p cube-engine solver::strategy
npm run api:test
```

## Phase 3 - Puzzle Metadata API

Goal: expose puzzle capabilities without changing solve behavior.

Deliverables:

- `GET /puzzles`;
- `GET /puzzles/:puzzleSlug`;
- `GET /puzzles/:puzzleSlug/strategies`;
- API response structs for puzzle metadata;
- tests for all new routes;
- tests for unknown puzzle slug;
- keep `GET /strategies` as a 3x3 compatibility route.

Exit criteria:

- API clients can discover puzzle support;
- 3x3 solve remains unchanged.

Verification:

```bash
npm run api:test
```

## Phase 4 - Puzzle-Aware Solve Contract

Goal: add a generic solve endpoint while delegating only to 3x3 initially.

Deliverables:

- `POST /puzzles/:puzzleSlug/solve`;
- generic solve request with input kind, value, strategy, metric, and limits;
- generic solve response with puzzle identity;
- typed visual state object;
- 3x3 notation adapter that calls current engine path;
- tests for successful 3x3 notation solve through new endpoint;
- tests for unsupported input kind;
- tests for unsupported strategy;
- tests for strategy/puzzle mismatch;
- tests for replay verification fields.

Exit criteria:

- 3x3 solves through both old and new endpoints;
- frontend can migrate when ready;
- old endpoints still work.

Verification:

```bash
npm run api:test
cargo test -p cube-engine
```

## Phase 5 - 2x2 Engine State And Moves

Goal: implement a correct 2x2 state model and move application.

Deliverables:

- module under `crates/cube-engine/src/puzzles/cube2`;
- `Cube2Corner` enum;
- `Cube2State` struct;
- `Cube2Move` enum or compact move struct;
- `Cube2Algorithm` type;
- `Cube2NotationError`;
- solved state constructor;
- state validation;
- move application;
- inverse move support;
- algorithm inverse support;
- serialization for tests and future datasets.

2x2 validation rules:

- 8 unique corners;
- orientations are in `0..=2`;
- corner orientation sum modulo 3 is zero;
- no edge parity constraint;
- no cuboid support.

Required tests:

- solved state is valid;
- duplicate corner is invalid;
- missing corner is invalid;
- invalid corner orientation is invalid;
- invalid orientation sum is invalid;
- every move preserves validity;
- every move followed by inverse solves;
- four quarter turns solve;
- algorithm inverse solves;
- notation parser accepts all 18 legal tokens;
- notation parser rejects wide/slice/rotation tokens.

Exit criteria:

- 2x2 move engine is deterministic and reversible;
- no solver exists yet unless tests require shallow replay helpers.

Verification:

```bash
cargo test -p cube-engine cube2
```

## Phase 6 - 2x2 Baseline Solver

Goal: solve shallow 2x2 scrambles with dedicated IDA*.

Deliverables:

- `cube2-bounded-ida-star` strategy implementation;
- dedicated 2x2 IDA* search module;
- `Cube2SearchBudget` or reuse of neutral budget type;
- `Cube2SearchOutcome` or reuse of neutral outcome type;
- node counting;
- depth limit;
- optional node limit;
- replay verification before success;
- zero heuristic baseline;
- simple admissible heuristic baseline.

Required tests:

- solved state returns empty solution;
- one-move scramble solves;
- two-move scramble solves;
- three-move scramble solves;
- insufficient depth returns not found;
- node budget returns not found honestly;
- returned solution replays to solved;
- solver never returns illegal moves.

Exit criteria:

- 2x2 can solve shallow scrambles;
- API is not required yet;
- no optimality claim yet.

Verification:

```bash
cargo test -p cube-engine cube2
```

## Phase 7 - 2x2 PDB Heuristics

Goal: make 2x2 solving practical.

Deliverables:

- corner orientation coordinate;
- corner permutation coordinate;
- coordinate round-trip tests;
- orientation PDB;
- permutation PDB;
- combined max heuristic;
- PDB generation tests;
- optional in-memory `OnceLock` tables;
- artifact metadata plan if file artifacts are introduced.

Expected small coordinate sizes:

```txt
corner orientation: 3^7 = 2187
corner permutation: 8! = 40320
```

Required tests:

- solved heuristic is zero;
- heuristic does not overestimate shallow scrambles;
- coordinate round trips preserve values;
- PDB values are stable for known states;
- PDB-backed IDA* solves representative scrambles within limits.

Exit criteria:

- 2x2 solver can handle realistic scrambles within reasonable local limits;
- replay verification remains required;
- no false optimality claims.

Verification:

```bash
cargo test -p cube-engine cube2
```

## Phase 8 - Register 2x2 Strategies

Goal: make 2x2 visible to the puzzle registry.

Deliverables:

- `cube/2x2x2` status changes from planned to experimental;
- `cube2-bounded-ida-star` strategy metadata;
- `cube2-corner-pdb-ida-star` strategy metadata;
- default 2x2 limits;
- metric declaration;
- input kind declaration;
- tests for registry entries;
- tests for strategy/puzzle mismatch helpers.

Initial default limits:

```txt
metric = htm
default_max_depth = 14
max_depth_cap = 20
default_max_nodes = 1000000
max_nodes_cap = 10000000
```

Exit criteria:

- registry can list 2x2 as experimental;
- 2x2 strategies are not mixed with 3x3 strategies.

Verification:

```bash
cargo test -p cube-engine puzzle
```

## Phase 9 - 2x2 API Solve

Goal: expose 2x2 notation solving through the puzzle-aware API.

Deliverables:

- route dispatch for `cube-2x2x2`;
- notation input parser wired to 2x2 engine;
- strategy dispatch to 2x2 solver;
- success response with `puzzleId = cube/2x2x2`;
- invalid notation error;
- limit errors;
- strategy mismatch errors;
- replay verification failure guard;
- tests for all paths.

Required API tests:

- 2x2 solve success;
- 2x2 invalid notation;
- 2x2 depth cap exceeded;
- 2x2 max nodes cap exceeded;
- 3x3 strategy rejected for 2x2;
- 2x2 strategy rejected for 3x3;
- unknown puzzle slug rejected;
- response includes typed visual state or explicit `none`.

Exit criteria:

- API can solve 2x2 by notation;
- old 3x3 routes still pass tests.

Verification:

```bash
npm run api:test
cargo test -p cube-engine
```

## Phase 10 - 2x2 Frontend Solve Flow

Goal: allow users to select and solve 2x2 from the web UI.

Deliverables:

- frontend API hooks for `/puzzles`;
- frontend API hook for puzzle-aware solve;
- puzzle selector;
- strategy selector or default strategy per puzzle;
- notation form submits selected puzzle;
- scanner hidden or disabled for non-3x3 puzzles;
- 2x2 result rendering;
- visualizer fallback if no 2x2 adapter is ready;
- tests for request payload and UI behavior.

Required frontend tests:

- default selected puzzle is 3x3;
- selecting 2x2 updates strategies;
- solving 2x2 posts to puzzle-aware endpoint;
- scanner button is hidden or disabled for 2x2;
- solution playback controls still render move list;
- visualizer fallback does not crash.

Exit criteria:

- 3x3 solve still works;
- 2x2 solve works from UI;
- no frontend solver logic added.

Verification:

```bash
npm run build
npm run lint -w @rubiks-cube-solver/web
npm run test -w @rubiks-cube-solver/web
```

## Phase 11 - 2x2 Quality Report

Goal: make 2x2 regressions visible.

Deliverables:

- 2x2 quality fixture catalog;
- solved fixture;
- shallow fixtures;
- representative WCA-like notation fixtures;
- invalid notation fixtures;
- benchmark rows by strategy;
- Markdown report section or dedicated report binary;
- npm scripts for 2x2 quality.

Exit criteria:

- 2x2 solver quality can be checked independently;
- failures are honest and categorized.

Verification:

```bash
cargo test -p cube-engine cube2
cargo run --quiet -p cube-engine --bin solver_quality_report
```

## Phase 12 - Dataset Schema V2

Goal: make datasets puzzle-aware before adding ML for new puzzles.

Deliverables:

- schema v2 documentation;
- Rust dataset writer for v2;
- Python parser for v2;
- v1 compatibility decision;
- 2x2 fixture JSONL;
- tests for incompatible rows;
- tests for split stability by puzzle-aware state hash;
- model artifact compatibility fields.

Exit criteria:

- 3x3 v1 fixtures still work where needed;
- v2 rows can represent 2x2;
- ML code rejects wrong puzzle/model combinations.

Verification:

```bash
cargo test -p cube-engine dataset
python -m pytest ml
```

## Phase 13 - 2x2 ML Experiment

Goal: optionally test learned move ordering for 2x2.

Deliverables:

- 2x2 state encoder;
- feature dimension metadata;
- 2x2 dataset generator;
- value baseline training support;
- model artifact compatibility checks;
- Rust loader rejects non-2x2 model for 2x2;
- Rust loader rejects 2x2 model for 3x3;
- optional move ordering experiment.

Exit criteria:

- deterministic solver remains default;
- ML only orders moves;
- replay verification remains required.

Verification:

```bash
python -m pytest ml
cargo test -p cube-engine hybrid
```

## Phase 14 - Pyraminx Engine And Solver

Goal: add the first non-cube twisty puzzle.

Deliverables:

- Pyraminx state;
- Pyraminx moves;
- tip moves;
- notation parser;
- validator;
- solver baseline;
- PDB or table strategy;
- replay verification;
- registry metadata;
- API solve support;
- frontend textual support.

Exit criteria:

- Pyraminx solves by notation;
- invalid notation and invalid state are rejected;
- replay verification is required.

Verification:

```bash
cargo test -p cube-engine pyraminx
npm run api:test
```

## Phase 15 - Clock Engine And Solver

Goal: support Clock without forcing it into cubie abstractions.

Deliverables:

- Clock dial state;
- pin state;
- WCA-like parser;
- move application;
- validator;
- linear/modular solver or table solver;
- replay verification;
- registry metadata;
- API solve support;
- simple 2D/text frontend display.

Exit criteria:

- Clock solves by notation or state input;
- solver choice is documented;
- no IDA* requirement is imposed if a simpler solver is better.

Verification:

```bash
cargo test -p cube-engine clock
npm run api:test
```

## Phase 16 - Skewb Engine And Solver

Goal: add a compact non-NxN twisty puzzle.

Deliverables:

- Skewb state;
- Skewb moves;
- notation parser;
- validator;
- PDB/table or dedicated IDA*;
- replay verification;
- registry metadata;
- API solve support;
- frontend fallback.

Exit criteria:

- Skewb solves by notation;
- shallow and representative fixtures pass.

Verification:

```bash
cargo test -p cube-engine skewb
npm run api:test
```

## Phase 17 - NxN Cubic Foundation

Goal: start cubic big-cube solving with 4x4x4.

Deliverables:

- explicit exclusion of cuboids in code metadata;
- `cube/4x4x4` or size-aware cubic ID;
- NxN move notation parser;
- wide move support;
- center representation;
- wing/edge representation;
- corner representation;
- move application;
- validator for generated notation states;
- reduction plan implementation scaffold.

Exit criteria:

- 4x4 notation states can be generated and replayed;
- no claim of complete 4x4 solve yet unless reduction is ready.

Verification:

```bash
cargo test -p cube-engine nxn
```

## Phase 18 - 4x4 Reduction Solver

Goal: solve controlled 4x4 cases through reduction.

Deliverables:

- center solving phase;
- edge pairing phase;
- reduced 3x3 projection;
- integration with current 3x3 solver for reduced state;
- parity detection;
- parity handling algorithms;
- replay of full 4x4 moves;
- API support for experimental 4x4;
- quality fixtures.

Exit criteria:

- controlled 4x4 scrambles solve;
- parity cases are handled or explicitly reported;
- failures are honest.

Verification:

```bash
cargo test -p cube-engine nxn
npm run api:test
```

## Phase 19 - Square-1 Engine And Solver

Goal: add state-dependent move legality.

Deliverables:

- Square-1 shape representation;
- top and bottom layer representation;
- slice move representation;
- legal move generator based on shape;
- parser;
- validator;
- shape solver;
- permutation solver;
- replay verification;
- registry metadata;
- API support;
- frontend fallback.

Exit criteria:

- legal Square-1 notation is accepted;
- illegal moves are rejected;
- representative solves work.

Verification:

```bash
cargo test -p cube-engine square1
npm run api:test
```

## Phase 20 - Megaminx Engine And Solver

Goal: add a larger non-cubic puzzle after smaller puzzle infrastructure is stable.

Deliverables:

- Megaminx state;
- face topology;
- move notation;
- validator;
- phase-based solver or heuristic solver;
- replay verification;
- registry metadata;
- API support;
- frontend fallback.

Exit criteria:

- Megaminx can solve initial representative cases;
- strategy status remains experimental unless quality is proven.

Verification:

```bash
cargo test -p cube-engine megaminx
npm run api:test
```

## Phase 21 - Multi-Puzzle Frontend Maturity

Goal: make the UI comfortable for multiple puzzle types.

Deliverables:

- puzzle selector polished;
- strategy selector polished;
- puzzle-specific limits;
- puzzle-specific examples/placeholders;
- visualizer adapter boundary;
- textual fallback for unsupported visualizers;
- scanner available only for supported puzzles;
- copy that avoids 3x3-only language;
- tests for main puzzle flows.

Exit criteria:

- UI does not assume every puzzle is a 3x3 cube;
- unsupported visualizers degrade gracefully;
- 3x3 and 2x2 remain product-grade.

Verification:

```bash
npm run build
npm run lint -w @rubiks-cube-solver/web
npm run test -w @rubiks-cube-solver/web
```

## Phase 22 - Multi-Puzzle Quality Matrix

Goal: track solver quality across puzzles and strategies.

Deliverables:

- quality report grouped by puzzle;
- fixture catalogs by puzzle;
- strategy status table;
- solution length buckets appropriate per puzzle;
- node/time metrics;
- replay verification count;
- unsupported/partial status reporting;
- npm scripts for targeted puzzle gates.

Exit criteria:

- regressions can be identified by puzzle;
- experimental puzzles do not block stable puzzle gates unless configured.

Verification:

```bash
cargo test -p cube-engine
cargo run --quiet -p cube-engine --bin solver_quality_report
```

## Phase 23 - Product Gate Update

Goal: define stable and experimental product gates.

Deliverables:

- stable gate for 3x3 and 2x2;
- experimental gates for remaining puzzles;
- documentation of local artifact generation;
- API contract stability notes;
- frontend flow checks;
- product validation report update.

Exit criteria:

- 3x3 remains stable;
- 2x2 can be considered product-supported if quality is sufficient;
- other puzzles have explicit experimental status.

Verification:

```bash
npm run product:gate
```

## Per-Puzzle Definition Of Done

A puzzle reaches experimental support when it has:

- puzzle ID;
- registry metadata;
- notation or state input;
- internal state;
- move application;
- validation;
- solver;
- replay verification;
- API solve route;
- tests for solved state;
- tests for inverse moves;
- tests for invalid input;
- shallow solve tests;
- frontend fallback.

A puzzle reaches stable support when it additionally has:

- representative quality fixtures;
- documented default limits;
- stable strategy status text;
- quality report rows;
- frontend UX coverage;
- no known replay verification gaps;
- documented limitations.

## Strategy Definition Of Done

A strategy reaches experimental status when it has:

- strategy metadata;
- puzzle-scoped ID;
- explicit metric;
- explicit limits;
- replay verification;
- tests for solved state;
- tests for shallow scrambles;
- honest failure behavior.

A strategy reaches stable status when it additionally has:

- quality fixtures;
- benchmark rows;
- artifact compatibility checks if needed;
- no false optimality claims;
- clear documentation of guarantees.

## Artifact Policy

Every generated artifact must declare:

```txt
artifact_schema_version
puzzle_id
state_encoding_id
move_set_id
metric
coordinate_profile_id
table_version
generator_version
max_depth
source
```

Large artifacts remain ignored and local.

Small fixtures may be committed only when they are deterministic, documented, and useful for tests.

## ML Policy

ML remains research-only until a deterministic puzzle solver path exists.

Allowed first use:

- value prediction;
- move ordering;
- policy prior;
- offline benchmarks.

Not allowed initially:

- state validation;
- replay verification;
- required product solving;
- admissible pruning without proof;
- replacing deterministic fallback.

## Scanner Policy

Scanner remains 3x3-only until the puzzle engines and notation solve paths mature.

Scanner expansion should be a separate roadmap because each puzzle requires different capture geometry, validation, and inference.

## Operational Summary

Short-form sequence:

```txt
0. docs and branch
1. puzzle metadata types
2. register current 3x3
3. puzzle metadata API
4. puzzle-aware solve endpoint
5. 2x2 state and moves
6. 2x2 baseline solver
7. 2x2 PDB heuristics
8. register 2x2 strategies
9. 2x2 API solve
10. 2x2 frontend flow
11. 2x2 quality report
12. dataset schema v2
13. optional 2x2 ML
14. Pyraminx
15. Clock
16. Skewb
17. NxN foundation
18. 4x4 reduction
19. Square-1
20. Megaminx
21. multi-puzzle frontend maturity
22. quality matrix
23. product gate update
```
