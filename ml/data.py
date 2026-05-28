from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

SCHEMA_VERSION = 1
LABEL_SOURCE = "reversible_scramble_inverse_replay_verified"
SOLVER_LABEL_SOURCE = "generated_two_phase_solver_replay_verified"
SOLVER_QUALITY_LABEL_SOURCE = "generated_two_phase_quality_solver_replay_verified"
SOLVER_MULTIPROBE_LABEL_SOURCE = "generated_two_phase_multiprobe_solver_replay_verified"
SUPPORTED_LABEL_SOURCES = {
    LABEL_SOURCE,
    SOLVER_LABEL_SOURCE,
    SOLVER_QUALITY_LABEL_SOURCE,
    SOLVER_MULTIPROBE_LABEL_SOURCE,
}
FEATURE_DIM = 40

REQUIRED_FIELDS = {
    "schema_version",
    "state",
    "scramble",
    "scramble_depth",
    "verified_solution",
    "verified_solution_length",
    "best_move",
    "label_source",
    "split",
}

SPLITS = {"train", "validation", "test"}
DEPTH_BUCKETS = ("0", "1-3", "4-6", "7-9", "10+")


class DatasetError(ValueError):
    """Raised when a JSONL dataset row does not match schema version 1."""


class CubieStateParseError(ValueError):
    """Raised when Rust CubieState serialization cannot be parsed or validated."""


@dataclass(frozen=True)
class CubieState:
    corner_permutation: tuple[int, ...]
    corner_orientation: tuple[int, ...]
    edge_permutation: tuple[int, ...]
    edge_orientation: tuple[int, ...]

    def feature_vector(self) -> list[float]:
        return encode_cubie_state(self)


@dataclass(frozen=True)
class TrainingExample:
    schema_version: int
    state: str
    scramble: str
    scramble_depth: int
    verified_solution: str
    verified_solution_length: int
    best_move: str | None
    label_source: str
    split: str
    cubie_state: CubieState

    @property
    def target(self) -> float:
        return float(self.verified_solution_length)

    @property
    def depth_bucket(self) -> str:
        return depth_bucket(self.verified_solution_length)


def load_jsonl(path: str | Path) -> list[TrainingExample]:
    dataset_path = Path(path)
    examples: list[TrainingExample] = []

    with dataset_path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                raise DatasetError(f"{dataset_path}:{line_number}: blank JSONL rows are not allowed")

            try:
                record = json.loads(line)
            except json.JSONDecodeError as error:
                raise DatasetError(
                    f"{dataset_path}:{line_number}: invalid JSON: {error.msg}"
                ) from error

            if not isinstance(record, dict):
                raise DatasetError(f"{dataset_path}:{line_number}: row must be a JSON object")

            examples.append(parse_training_example(record, dataset_path, line_number))

    if not examples:
        raise DatasetError(f"{dataset_path}: dataset must contain at least one example")

    return examples


def parse_training_example(
    record: dict[str, Any], path: Path | None = None, line_number: int | None = None
) -> TrainingExample:
    context = _context(path, line_number)
    fields = set(record)
    missing = sorted(REQUIRED_FIELDS - fields)
    extra = sorted(fields - REQUIRED_FIELDS)
    if missing or extra:
        details: list[str] = []
        if missing:
            details.append(f"missing fields {missing}")
        if extra:
            details.append(f"unknown fields {extra}")
        raise DatasetError(f"{context}: schema mismatch: {', '.join(details)}")

    schema_version = _require_int(record, "schema_version", context)
    if schema_version != SCHEMA_VERSION:
        raise DatasetError(
            f"{context}: unsupported schema_version {schema_version}; expected {SCHEMA_VERSION}"
        )

    state = _require_string(record, "state", context, allow_empty=False)
    scramble = _require_string(record, "scramble", context, allow_empty=True)
    scramble_depth = _require_int(record, "scramble_depth", context)
    verified_solution = _require_string(
        record, "verified_solution", context, allow_empty=True
    )
    verified_solution_length = _require_int(record, "verified_solution_length", context)
    label_source = _require_string(record, "label_source", context, allow_empty=False)
    split = _require_string(record, "split", context, allow_empty=False)

    best_move = record["best_move"]
    if best_move is not None and not isinstance(best_move, str):
        raise DatasetError(f"{context}: best_move must be a string or null")

    if scramble_depth < 0:
        raise DatasetError(f"{context}: scramble_depth must be non-negative")
    if verified_solution_length < 0:
        raise DatasetError(f"{context}: verified_solution_length must be non-negative")
    if label_source not in SUPPORTED_LABEL_SOURCES:
        raise DatasetError(
            f"{context}: unsupported label_source {label_source!r}; expected one of {sorted(SUPPORTED_LABEL_SOURCES)!r}"
        )
    if split not in SPLITS:
        raise DatasetError(f"{context}: split must be one of {sorted(SPLITS)}")

    try:
        cubie_state = parse_cubie_state(state)
    except CubieStateParseError as error:
        raise DatasetError(f"{context}: invalid CubieState: {error}") from error

    return TrainingExample(
        schema_version=schema_version,
        state=state,
        scramble=scramble,
        scramble_depth=scramble_depth,
        verified_solution=verified_solution,
        verified_solution_length=verified_solution_length,
        best_move=best_move,
        label_source=label_source,
        split=split,
        cubie_state=cubie_state,
    )


def parse_cubie_state(serialized: str) -> CubieState:
    sections: dict[str, tuple[int, ...]] = {}
    expected_lengths = {"cp": 8, "co": 8, "ep": 12, "eo": 12}

    for section in serialized.split(";"):
        if "=" not in section:
            raise CubieStateParseError(f"section {section!r} is missing '='")
        key, raw_values = section.split("=", 1)
        if key not in expected_lengths:
            raise CubieStateParseError(f"unknown section {key!r}")
        if key in sections:
            raise CubieStateParseError(f"duplicate section {key!r}")
        sections[key] = _parse_values(key, raw_values, expected_lengths[key])

    missing = sorted(set(expected_lengths) - set(sections))
    if missing:
        raise CubieStateParseError(f"missing sections {missing}")

    corner_permutation = sections["cp"]
    corner_orientation = sections["co"]
    edge_permutation = sections["ep"]
    edge_orientation = sections["eo"]

    _validate_permutation("cp", corner_permutation, 8)
    _validate_permutation("ep", edge_permutation, 12)
    _validate_orientation("co", corner_orientation, 2, 3)
    _validate_orientation("eo", edge_orientation, 1, 2)

    corner_parity_odd = _permutation_parity_odd(corner_permutation)
    edge_parity_odd = _permutation_parity_odd(edge_permutation)
    if corner_parity_odd != edge_parity_odd:
        raise CubieStateParseError(
            "invalid permutation parity: "
            f"corner odd={corner_parity_odd}, edge odd={edge_parity_odd}"
        )

    return CubieState(
        corner_permutation=corner_permutation,
        corner_orientation=corner_orientation,
        edge_permutation=edge_permutation,
        edge_orientation=edge_orientation,
    )


def encode_cubie_state(state: CubieState) -> list[float]:
    features = [value / 7.0 for value in state.corner_permutation]
    features.extend(value / 2.0 for value in state.corner_orientation)
    features.extend(value / 11.0 for value in state.edge_permutation)
    features.extend(float(value) for value in state.edge_orientation)

    if len(features) != FEATURE_DIM:
        raise AssertionError(f"expected {FEATURE_DIM} features, got {len(features)}")

    return features


def encode_examples(examples: Iterable[TrainingExample]) -> tuple[list[list[float]], list[float]]:
    features: list[list[float]] = []
    targets: list[float] = []

    for example in examples:
        features.append(example.cubie_state.feature_vector())
        targets.append(example.target)

    return features, targets


def depth_bucket(depth: int) -> str:
    if depth == 0:
        return "0"
    if depth <= 3:
        return "1-3"
    if depth <= 6:
        return "4-6"
    if depth <= 9:
        return "7-9"
    return "10+"


def _context(path: Path | None, line_number: int | None) -> str:
    if path is None:
        return "dataset row"
    if line_number is None:
        return str(path)
    return f"{path}:{line_number}"


def _require_string(
    record: dict[str, Any], field: str, context: str, *, allow_empty: bool
) -> str:
    value = record[field]
    if not isinstance(value, str):
        raise DatasetError(f"{context}: {field} must be a string")
    if not allow_empty and value == "":
        raise DatasetError(f"{context}: {field} must not be empty")
    return value


def _require_int(record: dict[str, Any], field: str, context: str) -> int:
    value = record[field]
    if isinstance(value, bool) or not isinstance(value, int):
        raise DatasetError(f"{context}: {field} must be an integer")
    return value


def _parse_values(section: str, raw_values: str, expected_count: int) -> tuple[int, ...]:
    values = raw_values.split(",")
    if len(values) != expected_count:
        raise CubieStateParseError(
            f"section {section!r} has {len(values)} values; expected {expected_count}"
        )

    parsed: list[int] = []
    for position, value in enumerate(values):
        if not value.isdigit():
            raise CubieStateParseError(
                f"section {section!r} value {value!r} at position {position} is not an unsigned integer"
            )
        parsed.append(int(value))

    return tuple(parsed)


def _validate_permutation(section: str, values: tuple[int, ...], count: int) -> None:
    expected = list(range(count))
    observed = sorted(values)
    if observed != expected:
        raise CubieStateParseError(
            f"section {section!r} must be a permutation of {expected}; got {list(values)}"
        )


def _validate_orientation(
    section: str, values: tuple[int, ...], maximum: int, modulus: int
) -> None:
    for position, value in enumerate(values):
        if value > maximum:
            raise CubieStateParseError(
                f"section {section!r} orientation {value} at position {position} exceeds {maximum}"
            )

    total = sum(values)
    if total % modulus != 0:
        raise CubieStateParseError(
            f"section {section!r} orientation sum {total} is not divisible by {modulus}"
        )


def _permutation_parity_odd(values: tuple[int, ...]) -> bool:
    inversions = 0
    for left in range(len(values)):
        for right in range(left + 1, len(values)):
            if values[left] > values[right]:
                inversions += 1
    return inversions % 2 == 1
