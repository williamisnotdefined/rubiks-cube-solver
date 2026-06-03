# Many Cubes Solver Plan

## Purpose

This document defines the technical plan for evolving the repository from a 3x3x3-focused Rubik's Cube solver into a multi-puzzle solver platform.

The first implementation target is `2x2x2`. Later targets are Pyraminx, Clock, Skewb, cubic NxNxN puzzles, Square-1, and Megaminx.

The current 3x3x3 product path must keep working while this expansion is built.

## Branch

The implementation branch for this work is:

```txt
feat/many-cubes
```

## Scope

Puzzles in scope, in initial implementation order:

1. 2x2x2
2. Pyraminx
3. Clock
4. Skewb
5. Cubic NxNxN puzzles, starting with 4x4x4
6. Square-1
7. Megaminx

## Out Of Scope

Cuboids are out of scope for this roadmap.

Examples of cuboids that must not drive this design yet:

- 2x3x3
- 3x3x5
- 15x15x5
- any non-cubic `A x B x C` block where dimensions differ

Other non-goals:

- No universal `CubieState` that pretends to model every puzzle.
- No universal solver that all puzzles must use.
- No ML-first solver path.
- No scanner generalization before the non-scanner solve paths work.
- No optimality claims without a complete strategy, proof boundary, and tests.
- No browser-side solver logic.
- No large generated artifacts committed to git.

## Existing Repository Baseline

The repository currently has a strong 3x3x3 implementation path.

Current 3x3-specific anchors:

- `crates/cube-engine/src/cube/cubies.rs` defines 8 corners, 12 edges, and `CubieState`.
- `crates/cube-engine/src/cube/moves.rs` defines the 18 outer face turns.
- `crates/cube-engine/src/cube/facelets` assumes 54 facelets and six fixed centers.
- `crates/cube-engine/src/search/two_phase` implements Kociemba-like generated two-phase tables.
- `crates/cube-engine/src/search/heuristics.rs` is typed around `Cube` and `CubieState`.
- `crates/cube-engine/src/solver/strategy.rs` exposes 3x3 strategy metadata.
- `crates/api/src/solve.rs` receives notation or scan input and builds a 3x3 `Cube`.
- `apps/web/src/pages/SolvePage/CubeStage.tsx` renders `<rubiks-cube cube-type="Three">`.
- `ml/data.py` and `crates/cube-engine/src/search/hybrid/encoding.rs` encode 3x3 `cp/co/ep/eo` as 40 features.

This is not a weakness. The current 3x3 path should be treated as the first puzzle implementation, not as a generic engine.

## Core Architectural Decision

Do not build one generic puzzle state.

Each puzzle owns:

- state representation;
- move enum or move structure;
- notation parser;
- legal move generator;
- state validator;
- replay verifier;
- solver strategy;
- heuristics;
- coordinates;
- artifact compatibility rules;
- ML state encoding, if any.

Shared layers are allowed only where they stay puzzle-neutral:

- puzzle identity;
- puzzle metadata;
- strategy metadata;
- solve request and response shape;
- search budgets;
- search metrics;
- replay verification reporting;
- artifact metadata format;
- dataset/model compatibility metadata;
- frontend puzzle selection and rendering adapters.

## Dedicated Search Per Puzzle

It is acceptable to implement one IDA* per puzzle when that is simpler.

This plan intentionally avoids forcing all puzzles through one generic IDA* abstraction at the start.

Dedicated IDA* is preferred initially because:

- each puzzle has different move pruning rules;
- Square-1 legal moves depend on shape;
- Clock likely does not need IDA* at all;
- NxN should use reduction phases rather than full-state IDA*;
- 2x2, Pyraminx, and Skewb can have very small puzzle-specific PDBs;
- puzzle-specific code is easier to test and reason about early.

The repository can still share small neutral types:

- `SearchBudget`
- `SearchOutcome`
- `SearchSolution`
- node and depth metrics
- elapsed time reporting
- common not-found-within-limits status

The repository should not prematurely share:

- state type;
- move type;
- heuristic trait typed to one state;
- pruning policy;
- legal move generator;
- notation parser;
- coordinate profile.

## Proposed Module Layout

Target layout over time:

```txt
crates/cube-engine/src/
  puzzle/
    ids.rs
    definition.rs
    registry.rs
    input.rs
    output.rs
    artifacts.rs
    ml.rs
  puzzles/
    cube3/
    cube2/
    pyraminx/
    clock/
    skewb/
    nxn/
    square1/
    megaminx/
  search/
    common/
    pruning/
    hybrid/
  solver/
    registry.rs
    config.rs
    result.rs
```

This is a target, not a single refactor step.

The first code phase should add the registry around the current 3x3 code without moving the full 3x3 implementation.

## Naming Policy

Use explicit puzzle-specific names for new implementation types.

Recommended names:

- `Cube2State`
- `Cube2Move`
- `Cube2Algorithm`
- `Cube2NotationError`
- `Cube2SolverConfig`
- `Cube2SolveResult`
- `Cube2Heuristic`
- `Cube2IdaStarSolver`
- `Cube2CornerOrientationPdb`
- `Cube2CornerPermutationPdb`

For existing 3x3 code, avoid a disruptive rename at first. The current `Cube`, `CubieState`, and `Move` can remain as compatibility names while the registry identifies them as `cube/3x3x3`.

Later, after the 2x2 path is stable, the 3x3 internals can be moved or aliased under `puzzles/cube3`.

## Puzzle Identity

Use stable internal puzzle IDs and URL-safe slugs separately.

Internal IDs:

```txt
cube/3x3x3
cube/2x2x2
pyraminx
clock
skewb
cube/nxn
square1
megaminx
```

API slugs:

```txt
cube-3x3x3
cube-2x2x2
pyraminx
clock
skewb
cube-nxn
square1
megaminx
```

The internal ID is the semantic identity. The slug is only an API routing convenience.

## Puzzle Definition Metadata

The registry should eventually expose metadata like this:

```txt
puzzle_id
slug
label
family
status
default_metric
supported_inputs
supported_visualizations
default_strategy_id
default_limits
strategy_ids
scanner_supported
notes
```

Recommended status values:

```txt
stable
experimental
planned
disabled
```

The first registry can be static. Dynamic plugins are out of scope.

## Strategy Metadata

Strategy metadata must be scoped to a puzzle.

Required fields:

```txt
strategy_id
puzzle_id
label
solver_mode
status_text
status
default_max_depth
default_max_nodes
supported_metrics
supported_inputs
requires_artifacts
artifact_profile_id
guarantee
is_experimental
```

Recommended guarantee values:

```txt
replay_verified
bounded_optimal
optimal_with_complete_table
best_effort_verified
experimental_verified
```

Do not use `optimal` unless the strategy and tests support it.

## Input Kinds

Initial input kinds:

```txt
notation
facelets3x3
scan3x3
```

Future input kinds:

```txt
facelets2x2
faceletsNxN
pyraminxStickers
clockState
square1ShapeAndPermutation
megaminxStickers
```

The first 2x2 implementation should support `notation` only.

2x2 facelet input is deferred because physical 2x2 orientation has no fixed centers. It needs a separate color/orientation policy.

## Output And Visualization State

The current API returns `visualState` as an optional string. That is not enough for multiple puzzles.

Target visual state shape:

```json
{
  "kind": "cube3-facelets-v1",
  "value": "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
}
```

Other possible kinds:

```txt
cube2-facelets-v1
nxn-stickers-v1
pyraminx-stickers-v1
clock-dials-v1
square1-shape-v1
megaminx-stickers-v1
none
```

The frontend must choose a renderer by `puzzle_id` and `visualState.kind`.

## API Plan

Keep existing routes for compatibility:

```txt
GET /health
GET /strategies
POST /solve-notation
POST /solve-scan
POST /scan/analyze-face
POST /scan/solve-session
```

Add puzzle-aware routes:

```txt
GET /puzzles
GET /puzzles/:puzzleSlug
GET /puzzles/:puzzleSlug/strategies
POST /puzzles/:puzzleSlug/solve
```

The legacy `/strategies` route should keep returning current 3x3 strategies until the frontend fully migrates.

Puzzle-aware solve request:

```json
{
  "input": {
    "kind": "notation",
    "value": "R U R' U'"
  },
  "strategyId": "cube2-corner-pdb-ida-star",
  "limits": {
    "maxDepth": 14,
    "maxNodes": 1000000
  },
  "metric": "htm"
}
```

Puzzle-aware solve response:

```json
{
  "ok": true,
  "status": "success",
  "puzzleId": "cube/2x2x2",
  "puzzleSlug": "cube-2x2x2",
  "strategyId": "cube2-corner-pdb-ida-star",
  "strategyLabel": "2x2 corner PDB IDA*",
  "solverMode": "cube2_pdb_ida_star",
  "metric": "htm",
  "maxDepth": 14,
  "maxNodes": 1000000,
  "moves": ["R'", "U", "R"],
  "length": 3,
  "exploredNodes": 1234,
  "elapsedMs": 12,
  "replayVerified": true,
  "visualState": {
    "kind": "cube2-facelets-v1",
    "value": "..."
  }
}
```

API validation must reject:

- unknown puzzle slug;
- unsupported input kind for puzzle;
- unsupported strategy for puzzle;
- strategy from another puzzle;
- invalid notation for the selected puzzle;
- limits above puzzle/API caps;
- missing required artifacts;
- solution that fails replay verification.

## Frontend Plan

The current solve page should become puzzle-aware in small steps.

Target composition:

```txt
SolvePage
  PuzzleSelector
  StrategySelector
  PuzzleInputPanel
  PuzzleVisualizer
  SolveResult
  SolutionPlayback
```

Initial UI behavior:

- default puzzle remains 3x3x3;
- 3x3 flow stays compatible;
- puzzle list comes from `/puzzles`;
- strategies are filtered by selected puzzle;
- 2x2 uses notation input first;
- scanner remains visible only for 3x3;
- unknown visualizer falls back to textual solution and status.

Visualization adapters:

```txt
cube3: current @houstonp/rubiks-cube adapter
cube2: try @houstonp/rubiks-cube if cube-type Two is supported, otherwise fallback
nxn: future sticker/net or Three.js adapter
pyraminx: future puzzle-specific adapter
clock: future 2D dial adapter
skewb: future puzzle-specific adapter
square1: future shape adapter
megaminx: future 2D/3D adapter
```

Frontend must not parse puzzle correctness. It can parse notation only for visualization animation when that adapter supports it.

## Scanner Policy

Scanner remains 3x3-only for now.

Reasons:

- 2x2 has no fixed center stickers.
- 4x4 and larger cubes have multiple centers and paired edges.
- Pyraminx and Megaminx have different face layouts.
- Clock is not a sticker cube in the same sense.
- Square-1 changes shape.

Scanner multi-puzzle should have a separate roadmap after notation/state solvers work.

## Artifact Compatibility

Every generated table or model artifact must eventually declare compatibility metadata.

Required artifact metadata:

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
created_by
```

Runtime must reject incompatible artifacts before search starts.

Examples:

- a 3x3 Kociemba pruning table cannot load for 2x2;
- a 2x2 corner PDB cannot load for Pyraminx;
- an HTM table cannot silently serve QTM if metric matters;
- a model trained on `cube3-cubie-v1` cannot rank `cube2-corners-v1` states.

## Dataset And ML Plan

Dataset schema v1 is 3x3-specific. Multi-puzzle support needs dataset schema v2.

Dataset v2 required fields:

```txt
schema_version
puzzle_id
puzzle_slug
state_encoding_id
move_set_id
metric
state
scramble
scramble_depth
verified_solution
verified_solution_length
best_move
label_source
label_target
split
generator_seed
solver_strategy_id
replay_verified
```

Model artifact metadata required fields:

```txt
model_schema_version
puzzle_id
state_encoding_id
move_set_id
metric
feature_dim
label_target
label_source
role
admissible
validates_states
replaces_replay_verification
default_product_solver_dependency
```

Allowed ML roles initially:

```txt
value_estimation
policy_prior
move_ordering
```

Forbidden ML roles initially:

```txt
state_validation
replay_verification
required_product_solver
admissible_pruning_without_proof
```

ML remains optional and experimental until deterministic solvers and replay verification are correct.

## First Puzzle: 2x2x2

### 2x2 Goal

Add a correct 2x2x2 notation solve path with a puzzle-specific state, moves, solver, registry entry, API support, and frontend selection.

### 2x2 Initial Scope

Included:

- `puzzle_id = cube/2x2x2`
- `puzzle_slug = cube-2x2x2`
- notation input
- moves `U`, `D`, `L`, `R`, `F`, `B` with `2` and `'`
- fixed-orientation internal state
- corners-only validation
- replay verification
- dedicated 2x2 IDA* baseline
- 2x2 PDB heuristics
- puzzle-aware API endpoint
- basic frontend puzzle selection

Deferred:

- scanner input
- facelet input
- physical orientation ambiguity handling
- color scheme selection
- full-table optimal solver
- ML
- advanced visualization if no existing adapter supports it

### 2x2 State

Recommended state:

```rust
pub struct Cube2State {
    pub corner_permutation: [Cube2Corner; 8],
    pub corner_orientation: [u8; 8],
}
```

Validation rules:

- all 8 corners appear exactly once;
- each orientation is `0`, `1`, or `2`;
- orientation sum modulo 3 equals 0;
- no edge parity constraint exists;
- all corner permutation parities are allowed.

The state is initially interpreted in a fixed solved reference frame. This is fine for notation scrambles from solved state.

Future facelet input must define how physical 2x2 orientation is normalized because there are no fixed centers.

### 2x2 Moves

Use the same six face letters as 3x3, but define a separate `Cube2Move`.

Do not reuse the public 3x3 `Move` enum directly in 2x2 APIs. Reuse implementation constants only if it does not make 2x2 depend on 3x3 edge behavior.

Move requirements:

- each quarter turn is reversible;
- half turns are equivalent to two quarter turns;
- prime turns are equivalent to three quarter turns;
- four quarter turns return solved for that face;
- inverse algorithm solves any applied algorithm in tests.

### 2x2 Notation

Parser accepts:

```txt
U U2 U'
D D2 D'
L L2 L'
R R2 R'
F F2 F'
B B2 B'
```

Parser rejects:

```txt
Rw
M
x
y
z
3Uw
invalid tokens
```

Wide moves and rotations are deferred.

### 2x2 Solver Baseline

Implement `cube2-bounded-ida-star` first.

Baseline details:

- dedicated implementation under `puzzles/cube2/search`;
- depth limit required;
- optional node limit;
- starts with `ZeroHeuristic` equivalent;
- prunes immediate repeated same-face moves;
- may prune opposite-face same-axis ordering if proven correct for the move set;
- stores path states to avoid cycles;
- returns `NotFoundWithinLimits` honestly;
- verifies replay before returning success.

### 2x2 Heuristics

Simple heuristics:

- misplaced corners lower bound;
- misoriented corners lower bound;
- max of simple bounds.

PDB heuristics:

- corner orientation coordinate size `3^7 = 2187`;
- corner permutation coordinate size `8! = 40320`;
- optional combined full-state table size `8! * 3^7 = 88179840` raw states before orientation equivalence reduction, which should not be required initially;
- use separate small PDBs first;
- use `max(orientation_pdb, permutation_pdb)` as admissible heuristic if generation proves exact distances in projected spaces.

Note: 2x2 God's number is small in standard metrics, but the project must not claim optimality until the implemented metric, search, and heuristic combination support it.

### 2x2 Runtime Artifacts

Initial PDBs can be generated lazily in memory with `OnceLock` if small enough.

Artifact files are optional for the first practical 2x2 solver.

If artifact files are introduced, they must include puzzle compatibility metadata.

### 2x2 API Defaults

Initial defaults can be conservative:

```txt
default_max_depth = 14
max_depth_cap = 20
default_max_nodes = 1000000
max_nodes_cap = 10000000
metric = htm
```

These values should be revised after benchmarks.

### 2x2 Tests

Required Rust tests:

- solved state is valid;
- duplicate corner is invalid;
- invalid orientation value is invalid;
- invalid orientation sum is invalid;
- all legal moves preserve validity;
- move followed by inverse solves;
- four quarter turns solve;
- algorithm inverse solves;
- notation parser accepts all legal tokens;
- notation parser rejects invalid tokens;
- IDA* solved state returns empty solution;
- IDA* solves one-move scramble;
- IDA* solves two-move scramble;
- insufficient depth returns not found;
- returned solution replays to solved;
- heuristic estimate for solved is zero;
- heuristic does not overestimate shallow known scrambles.

Required API tests:

- `/puzzles` includes 2x2 once registered;
- 2x2 strategies are returned only for 2x2;
- 2x2 notation solve succeeds;
- 2x2 invalid notation returns stable error;
- 3x3 strategy on 2x2 is rejected;
- 2x2 strategy on 3x3 is rejected;
- replay verification appears in success response.

Required frontend tests:

- puzzle selector defaults to 3x3;
- selecting 2x2 fetches/uses 2x2 strategies;
- submitting 2x2 notation sends puzzle slug/id;
- scanner is hidden or disabled for 2x2;
- result rendering works without a 3D visualizer.

## Pyraminx Plan

Pyraminx should not reuse cube state.

Expected model:

- tips;
- axial pieces/edges depending on chosen representation;
- orientation/permutation coordinates appropriate for Pyraminx;
- main moves plus tip moves.

Likely strategy:

- dedicated PDB or full-table search;
- dedicated IDA* if table-only solve is not chosen;
- notation parser for WCA-like Pyraminx scrambles;
- replay verification.

Initial support should be notation-only.

## Clock Plan

Clock should not be forced through IDA*.

Expected model:

- dial values modulo 12;
- pin states;
- front/back move semantics;
- WCA-like notation parser.

Likely strategy:

- linear/modular solver or precomputed table;
- BFS/table if simpler;
- replay verification by applying returned moves to dial state.

Clock visualizer should eventually be a 2D dial renderer.

## Skewb Plan

Skewb should have its own compact state.

Expected model:

- corners;
- centers;
- Skewb move set;
- orientation/permutation invariants.

Likely strategy:

- PDB or full table;
- dedicated IDA* if needed;
- notation-only first.

## NxNxN Plan

NxN means cubic NxNxN only.

Cuboids are excluded.

Initial NxN target is 4x4x4.

Do not attempt full-state optimal IDA* for NxN.

Expected model:

- centers;
- wings;
- corner state;
- paired edges;
- reduction state;
- parity state.

Expected strategy:

- solve centers;
- pair edges;
- reduce to virtual 3x3;
- solve reduced 3x3 using existing 3x3 backend;
- handle OLL/PLL parity or reduction parity cases;
- replay full NxN moves.

Notation:

- outer face turns;
- wide moves;
- inner slice moves as needed;
- numeric wide moves for large N.

The frontend scramble catalog already generates big-cube notation. Solver notation must be Rust-owned and validated separately.

## Square-1 Plan

Square-1 needs state-dependent move legality.

Expected model:

- top layer shape;
- bottom layer shape;
- piece order;
- slice position;
- legal turn constraints;
- shape parity/permutation constraints.

Expected strategy:

- shape phase;
- cubeshape to permutation phase;
- dedicated search with legal move generator depending on current shape;
- replay verification.

Do not use a fixed global move list without legality checks.

## Megaminx Plan

Megaminx is a larger puzzle and should come after smaller non-cube puzzles.

Expected model:

- 12 faces;
- corners and edges in Megaminx topology;
- WCA-like scramble notation;
- state validator;
- phase-based or heuristic solver.

Initial solver can be non-optimal but must be replay-verified.

## Compatibility With Current 3x3

The existing 3x3 flow remains the product baseline while multi-puzzle work develops.

Compatibility rules:

- `/solve-notation` keeps working for 3x3 notation;
- `/solve-scan` remains 3x3-only;
- current 3x3 generated tables keep their existing loading path;
- current frontend defaults to 3x3;
- current tests remain valid;
- new puzzle APIs do not change old response contracts unless explicitly migrated with frontend updates.

## Migration Strategy

Recommended sequence:

1. Add docs and roadmap.
2. Add puzzle metadata types.
3. Register existing 3x3 metadata.
4. Expose puzzle metadata from API.
5. Add puzzle-aware solve endpoint that delegates to 3x3.
6. Implement 2x2 state and moves.
7. Implement 2x2 notation.
8. Implement 2x2 solver baseline.
9. Add 2x2 PDBs.
10. Register 2x2 strategies.
11. Expose 2x2 in API.
12. Add 2x2 frontend selection.
13. Add 2x2 quality report fixtures.
14. Introduce dataset/model compatibility v2.
15. Start Pyraminx.

## Verification Policy

Docs-only phase:

```bash
git status --short --branch
```

Rust engine changes:

```bash
cargo test -p cube-engine
```

API changes:

```bash
npm run api:test
```

Frontend changes:

```bash
npm run build
npm run lint -w @rubiks-cube-solver/web
npm run test -w @rubiks-cube-solver/web
```

ML changes:

```bash
python -m pytest ml
```

Release-level validation remains broader and should not be required for every small phase.

## Definition Of Supported Puzzle

A puzzle is not considered supported until it has:

- stable puzzle ID;
- registered strategy metadata;
- state representation;
- move application;
- notation or state input parser;
- validation rules;
- solver;
- replay verification;
- tests for solved state;
- tests for move/inverse behavior;
- tests for invalid input;
- tests for shallow solves;
- API contract tests;
- frontend support or explicit frontend fallback;
- documented limits and guarantees.

## Definition Of Stable Strategy

A strategy is not considered stable until it has:

- deterministic behavior;
- explicit metric;
- explicit limits;
- replay verification;
- tests for solved input;
- tests for shallow known scrambles;
- tests for insufficient limits;
- artifact compatibility checks if artifacts are used;
- honest status text;
- no false optimality claims.

## Risk Register

Primary risks:

- accidentally breaking the current 3x3 product path;
- over-generalizing too early;
- under-specifying puzzle/model/artifact compatibility;
- mixing scanner assumptions into puzzle engine design;
- adding frontend puzzle behavior before Rust contracts exist;
- treating ML as an admissible heuristic without proof;
- committing generated artifacts.

Mitigations:

- keep old 3x3 endpoints during migration;
- use puzzle-specific modules;
- add compatibility metadata before artifacts/models multiply;
- keep scanner 3x3-only initially;
- expose puzzle capabilities from API;
- keep ML optional and role-limited;
- preserve ignored artifact paths.
