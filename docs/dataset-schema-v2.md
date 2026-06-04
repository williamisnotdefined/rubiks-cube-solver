# Dataset Schema V2

## Purpose

Dataset schema v2 makes solver datasets puzzle-aware. Schema v1 remains the legacy 3x3 fixture format used by the current value-model smoke tests.

Schema v2 rows describe the puzzle, state encoding, move set, metric, label target, solver strategy, generator seed, and replay verification status explicitly. A model artifact must only consume rows with compatible metadata.

## Required Fields

Every schema v2 JSONL row must contain exactly these fields:

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

## Supported Profiles

Current 3x3 profile:

```txt
puzzle_id = cube/3x3x3
puzzle_slug = cube-3x3x3
state_encoding_id = cube3-cubie-v1
move_set_id = cube3-htm-v1
metric = htm
feature_dim = 40
```

Current 2x2 profile:

```txt
puzzle_id = cube/2x2x2
puzzle_slug = cube-2x2x2
state_encoding_id = cube2-corners-v1
move_set_id = cube2-htm-v1
metric = htm
feature_dim = not trainable yet
```

## Label Semantics

The initial label target is:

```txt
verified_solution_length
```

`verified_solution_length` is the length of a replay-verified solution emitted by the configured solver strategy. It is not an optimal-distance claim.

`best_move` is the first move from `verified_solution`, or `null` for solved rows.

`replay_verified` must be `true` for ML training rows.

## Split Stability

Schema v1 split assignment hashes only the serialized 3x3 state for backward compatibility.

Schema v2 split assignment hashes:

```txt
puzzle_id
state_encoding_id
state
```

This keeps split assignment stable while preventing unrelated puzzle encodings with the same text state from sharing a hash namespace.

## Examples

3x3 v2 row:

```json
{"schema_version":2,"puzzle_id":"cube/3x3x3","puzzle_slug":"cube-3x3x3","state_encoding_id":"cube3-cubie-v1","move_set_id":"cube3-htm-v1","metric":"htm","state":"cp=0,1,2,3,4,5,6,7;co=0,0,0,0,0,0,0,0;ep=0,1,2,3,4,5,6,7,8,9,10,11;eo=0,0,0,0,0,0,0,0,0,0,0,0","scramble":"","scramble_depth":0,"verified_solution":"","verified_solution_length":0,"best_move":null,"label_source":"generated_two_phase_quality_solver_replay_verified","label_target":"verified_solution_length","split":"train","generator_seed":0,"solver_strategy_id":"generated-two-phase-quality","replay_verified":true}
```

2x2 v2 row:

```json
{"schema_version":2,"puzzle_id":"cube/2x2x2","puzzle_slug":"cube-2x2x2","state_encoding_id":"cube2-corners-v1","move_set_id":"cube2-htm-v1","metric":"htm","state":"cp=0,1,2,3,4,5,6,7;co=0,0,0,0,0,0,0,0","scramble":"","scramble_depth":0,"verified_solution":"","verified_solution_length":0,"best_move":null,"label_source":"cube2_pdb_ida_star_solver_replay_verified","label_target":"verified_solution_length","split":"train","generator_seed":0,"solver_strategy_id":"cube2-pdb-ida-star","replay_verified":true}
```

The committed 2x2 fixture is `datasets/fixtures/cube2-small-v2.jsonl`.

## Model Artifact Compatibility

Model artifacts and value-output diagnostics include these compatibility fields:

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

The current value baseline supports only:

```txt
puzzle_id = cube/3x3x3
state_encoding_id = cube3-cubie-v1
move_set_id = cube3-htm-v1
metric = htm
label_target = verified_solution_length
role = value_estimation
```

The loader validates 2x2 v2 rows, but the current value model rejects them until a 2x2 encoder and model path are added in a later phase.

## Safety Rules

- ML does not validate puzzle states.
- ML does not replace replay verification.
- ML is not an admissible heuristic unless a separate proof or safe bound is added.
- ML is not a default product solver dependency.
- Dataset rows with mismatched puzzle, state encoding, move set, metric, label target, or replay verification status are rejected before training.

## Verification

Run:

```bash
cargo test -p cube-engine dataset
python -m pytest ml
```
