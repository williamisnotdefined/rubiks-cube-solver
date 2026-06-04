from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml.data import (
    CUBE2_COMPATIBILITY,
    CUBE3_COMPATIBILITY,
    FEATURE_DIM,
    LABEL_TARGET,
    CubieStateParseError,
    Cube2StateParseError,
    DatasetError,
    encode_examples,
    load_jsonl,
    parse_cube2_state,
    parse_cubie_state,
)


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "datasets/fixtures/small.jsonl"
CUBE2_FIXTURE = ROOT / "datasets/fixtures/cube2-small-v2.jsonl"
SOLVED_STATE = (
    "cp=0,1,2,3,4,5,6,7;"
    "co=0,0,0,0,0,0,0,0;"
    "ep=0,1,2,3,4,5,6,7,8,9,10,11;"
    "eo=0,0,0,0,0,0,0,0,0,0,0,0"
)
CUBE2_SOLVED_STATE = "cp=0,1,2,3,4,5,6,7;co=0,0,0,0,0,0,0,0"


def test_loads_committed_fixture_and_encodes_numeric_features() -> None:
    examples = load_jsonl(FIXTURE)

    assert len(examples) == 12
    assert examples[0].state == SOLVED_STATE
    assert examples[0].puzzle_id == CUBE3_COMPATIBILITY.puzzle_id
    assert examples[0].state_encoding_id == CUBE3_COMPATIBILITY.state_encoding_id
    assert examples[0].label_target == LABEL_TARGET
    assert examples[0].replay_verified is True
    assert examples[0].verified_solution_length == 0
    assert examples[0].best_move is None

    features, targets = encode_examples(examples)
    assert len(features) == len(examples)
    assert len(features[0]) == FEATURE_DIM
    assert targets[0] == 0.0
    assert all(0.0 <= value <= 1.0 for row in features for value in row)


def test_loads_generated_jsonl_from_temp_file(tmp_path: Path) -> None:
    record = {
        "schema_version": 1,
        "state": SOLVED_STATE,
        "scramble": "",
        "scramble_depth": 0,
        "verified_solution": "",
        "verified_solution_length": 0,
        "best_move": None,
        "label_source": "reversible_scramble_inverse_replay_verified",
        "split": "train",
    }
    dataset = tmp_path / "generated.jsonl"
    dataset.write_text(json.dumps(record) + "\n", encoding="utf-8")

    examples = load_jsonl(dataset)

    assert len(examples) == 1
    assert examples[0].cubie_state is not None
    assert examples[0].cubie_state.corner_permutation == tuple(range(8))
    assert examples[0].cubie_state.edge_permutation == tuple(range(12))


def test_loads_solver_labeled_jsonl_from_temp_file(tmp_path: Path) -> None:
    record = {
        "schema_version": 1,
        "state": SOLVED_STATE,
        "scramble": "",
        "scramble_depth": 0,
        "verified_solution": "",
        "verified_solution_length": 0,
        "best_move": None,
        "label_source": "generated_two_phase_solver_replay_verified",
        "split": "train",
    }
    dataset = tmp_path / "solver-generated.jsonl"
    dataset.write_text(json.dumps(record) + "\n", encoding="utf-8")

    examples = load_jsonl(dataset)

    assert len(examples) == 1
    assert examples[0].label_source == "generated_two_phase_solver_replay_verified"


def test_loads_cube3_schema_v2_jsonl_from_temp_file(tmp_path: Path) -> None:
    record = cube3_v2_record()
    dataset = tmp_path / "cube3-v2.jsonl"
    dataset.write_text(json.dumps(record) + "\n", encoding="utf-8")

    examples = load_jsonl(dataset)
    features, targets = encode_examples(examples)

    assert len(examples) == 1
    assert examples[0].schema_version == 2
    assert examples[0].puzzle_id == CUBE3_COMPATIBILITY.puzzle_id
    assert examples[0].solver_strategy_id == "generated-two-phase-quality"
    assert len(features[0]) == FEATURE_DIM
    assert targets == [0.0]


def test_loads_committed_cube2_schema_v2_fixture() -> None:
    examples = load_jsonl(CUBE2_FIXTURE)

    assert len(examples) == 5
    assert examples[0].schema_version == 2
    assert examples[0].puzzle_id == CUBE2_COMPATIBILITY.puzzle_id
    assert examples[0].state_encoding_id == CUBE2_COMPATIBILITY.state_encoding_id
    assert examples[0].state == CUBE2_SOLVED_STATE
    assert examples[0].cube2_state is not None
    assert examples[0].cube2_state.corner_permutation == tuple(range(8))
    assert examples[0].cube2_state.corner_orientation == (0, 0, 0, 0, 0, 0, 0, 0)
    assert examples[0].cubie_state is None
    assert examples[1].verified_solution == "R'"
    assert all(example.replay_verified for example in examples)


def test_encode_examples_rejects_cube2_until_value_encoder_exists() -> None:
    examples = load_jsonl(CUBE2_FIXTURE)

    with pytest.raises(DatasetError, match="current value model only supports"):
        encode_examples(examples)


def test_parse_cube2_state_rejects_invalid_orientation_sum() -> None:
    invalid_state = CUBE2_SOLVED_STATE.replace("co=0,0,0,0,0,0,0,0", "co=1,0,0,0,0,0,0,0")

    with pytest.raises(Cube2StateParseError, match="orientation sum"):
        parse_cube2_state(invalid_state)


@pytest.mark.parametrize(
    "label_source",
    [
        "generated_two_phase_quality_solver_replay_verified",
        "generated_two_phase_multiprobe_solver_replay_verified",
    ],
)
def test_loads_quality_solver_labeled_jsonl_from_temp_file(
    tmp_path: Path, label_source: str
) -> None:
    record = {
        "schema_version": 1,
        "state": SOLVED_STATE,
        "scramble": "",
        "scramble_depth": 0,
        "verified_solution": "",
        "verified_solution_length": 0,
        "best_move": None,
        "label_source": label_source,
        "split": "train",
    }
    dataset = tmp_path / "quality-solver-generated.jsonl"
    dataset.write_text(json.dumps(record) + "\n", encoding="utf-8")

    examples = load_jsonl(dataset)

    assert len(examples) == 1
    assert examples[0].label_source == label_source


def test_parse_cubie_state_rejects_invalid_orientation_sum() -> None:
    invalid_state = SOLVED_STATE.replace(
        "co=0,0,0,0,0,0,0,0", "co=1,0,0,0,0,0,0,0"
    )

    with pytest.raises(CubieStateParseError, match="orientation sum"):
        parse_cubie_state(invalid_state)


def test_loader_rejects_schema_drift(tmp_path: Path) -> None:
    record = {
        "schema_version": 1,
        "state": SOLVED_STATE,
        "scramble": "",
        "scramble_depth": 0,
        "verified_solution": "",
        "verified_solution_length": 0,
        "best_move": None,
        "label_source": "reversible_scramble_inverse_replay_verified",
    }
    dataset = tmp_path / "missing_split.jsonl"
    dataset.write_text(json.dumps(record) + "\n", encoding="utf-8")

    with pytest.raises(DatasetError, match="schema mismatch"):
        load_jsonl(dataset)


def test_loader_rejects_schema_v2_metadata_mismatch(tmp_path: Path) -> None:
    record = cube3_v2_record()
    record["puzzle_slug"] = "cube-2x2x2"
    dataset = tmp_path / "wrong_slug.jsonl"
    dataset.write_text(json.dumps(record) + "\n", encoding="utf-8")

    with pytest.raises(DatasetError, match="incompatible dataset metadata"):
        load_jsonl(dataset)


def test_loader_rejects_schema_v2_unverified_rows(tmp_path: Path) -> None:
    record = cube3_v2_record()
    record["replay_verified"] = False
    dataset = tmp_path / "unverified.jsonl"
    dataset.write_text(json.dumps(record) + "\n", encoding="utf-8")

    with pytest.raises(DatasetError, match="replay_verified must be true"):
        load_jsonl(dataset)


def test_loader_rejects_mixed_dataset_compatibility(tmp_path: Path) -> None:
    cube3_record = cube3_v2_record()
    cube2_record = json.loads(CUBE2_FIXTURE.read_text(encoding="utf-8").splitlines()[0])
    dataset = tmp_path / "mixed.jsonl"
    dataset.write_text(
        json.dumps(cube3_record) + "\n" + json.dumps(cube2_record) + "\n",
        encoding="utf-8",
    )

    examples = load_jsonl(dataset)
    with pytest.raises(DatasetError, match="one puzzle/state encoding"):
        encode_examples(examples)


def cube3_v2_record() -> dict[str, object]:
    return {
        "schema_version": 2,
        "puzzle_id": CUBE3_COMPATIBILITY.puzzle_id,
        "puzzle_slug": CUBE3_COMPATIBILITY.puzzle_slug,
        "state_encoding_id": CUBE3_COMPATIBILITY.state_encoding_id,
        "move_set_id": CUBE3_COMPATIBILITY.move_set_id,
        "metric": CUBE3_COMPATIBILITY.metric,
        "state": SOLVED_STATE,
        "scramble": "",
        "scramble_depth": 0,
        "verified_solution": "",
        "verified_solution_length": 0,
        "best_move": None,
        "label_source": "generated_two_phase_quality_solver_replay_verified",
        "label_target": LABEL_TARGET,
        "split": "train",
        "generator_seed": 0,
        "solver_strategy_id": "generated-two-phase-quality",
        "replay_verified": True,
    }
