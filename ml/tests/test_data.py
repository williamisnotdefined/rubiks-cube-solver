from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml.data import (
    FEATURE_DIM,
    CubieStateParseError,
    DatasetError,
    encode_examples,
    load_jsonl,
    parse_cubie_state,
)


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "datasets/fixtures/small.jsonl"
SOLVED_STATE = (
    "cp=0,1,2,3,4,5,6,7;"
    "co=0,0,0,0,0,0,0,0;"
    "ep=0,1,2,3,4,5,6,7,8,9,10,11;"
    "eo=0,0,0,0,0,0,0,0,0,0,0,0"
)


def test_loads_committed_fixture_and_encodes_numeric_features() -> None:
    examples = load_jsonl(FIXTURE)

    assert len(examples) == 12
    assert examples[0].state == SOLVED_STATE
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
