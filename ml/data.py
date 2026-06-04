from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

SCHEMA_VERSION = 1
SCHEMA_VERSION_V2 = 2
LABEL_SOURCE = "reversible_scramble_inverse_replay_verified"
SOLVER_LABEL_SOURCE = "generated_two_phase_solver_replay_verified"
SOLVER_QUALITY_LABEL_SOURCE = "generated_two_phase_quality_solver_replay_verified"
SOLVER_MULTIPROBE_LABEL_SOURCE = "generated_two_phase_multiprobe_solver_replay_verified"
CUBE2_PDB_LABEL_SOURCE = "cube2_pdb_ida_star_solver_replay_verified"
LABEL_TARGET = "verified_solution_length"
SUPPORTED_LABEL_SOURCES = {
    LABEL_SOURCE,
    SOLVER_LABEL_SOURCE,
    SOLVER_QUALITY_LABEL_SOURCE,
    SOLVER_MULTIPROBE_LABEL_SOURCE,
    CUBE2_PDB_LABEL_SOURCE,
}
FEATURE_DIM = 40


@dataclass(frozen=True)
class DatasetCompatibility:
    puzzle_id: str
    puzzle_slug: str
    state_encoding_id: str
    move_set_id: str
    metric: str


CUBE3_COMPATIBILITY = DatasetCompatibility(
    puzzle_id="cube/3x3x3",
    puzzle_slug="cube-3x3x3",
    state_encoding_id="cube3-cubie-v1",
    move_set_id="cube3-htm-v1",
    metric="htm",
)
CUBE2_COMPATIBILITY = DatasetCompatibility(
    puzzle_id="cube/2x2x2",
    puzzle_slug="cube-2x2x2",
    state_encoding_id="cube2-corners-v1",
    move_set_id="cube2-htm-v1",
    metric="htm",
)
SUPPORTED_COMPATIBILITY = {
    CUBE3_COMPATIBILITY.puzzle_id: CUBE3_COMPATIBILITY,
    CUBE2_COMPATIBILITY.puzzle_id: CUBE2_COMPATIBILITY,
}

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
REQUIRED_FIELDS_V2 = {
    "schema_version",
    "puzzle_id",
    "puzzle_slug",
    "state_encoding_id",
    "move_set_id",
    "metric",
    "state",
    "scramble",
    "scramble_depth",
    "verified_solution",
    "verified_solution_length",
    "best_move",
    "label_source",
    "label_target",
    "split",
    "generator_seed",
    "solver_strategy_id",
    "replay_verified",
}

SPLITS = {"train", "validation", "test"}
DEPTH_BUCKETS = ("0", "1-3", "4-6", "7-9", "10+")


class DatasetError(ValueError):
    """Raised when a JSONL dataset row does not match a supported schema."""


class CubieStateParseError(ValueError):
    """Raised when Rust CubieState serialization cannot be parsed or validated."""


class Cube2StateParseError(ValueError):
    """Raised when Rust Cube2State serialization cannot be parsed or validated."""


@dataclass(frozen=True)
class CubieState:
    corner_permutation: tuple[int, ...]
    corner_orientation: tuple[int, ...]
    edge_permutation: tuple[int, ...]
    edge_orientation: tuple[int, ...]

    def feature_vector(self) -> list[float]:
        return encode_cubie_state(self)


@dataclass(frozen=True)
class Cube2State:
    corner_permutation: tuple[int, ...]
    corner_orientation: tuple[int, ...]


@dataclass(frozen=True)
class TrainingExample:
    schema_version: int
    puzzle_id: str
    puzzle_slug: str
    state_encoding_id: str
    move_set_id: str
    metric: str
    state: str
    scramble: str
    scramble_depth: int
    verified_solution: str
    verified_solution_length: int
    best_move: str | None
    label_source: str
    label_target: str
    split: str
    generator_seed: int | None
    solver_strategy_id: str | None
    replay_verified: bool
    cubie_state: CubieState | None
    cube2_state: Cube2State | None

    @property
    def compatibility(self) -> DatasetCompatibility:
        return DatasetCompatibility(
            puzzle_id=self.puzzle_id,
            puzzle_slug=self.puzzle_slug,
            state_encoding_id=self.state_encoding_id,
            move_set_id=self.move_set_id,
            metric=self.metric,
        )

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
    if "schema_version" not in record:
        raise DatasetError(f"{context}: schema mismatch: missing fields ['schema_version']")

    schema_version = _require_int(record, "schema_version", context)
    if schema_version == SCHEMA_VERSION:
        return _parse_training_example_v1(record, context)
    if schema_version == SCHEMA_VERSION_V2:
        return _parse_training_example_v2(record, context)

    raise DatasetError(
        f"{context}: unsupported schema_version {schema_version}; expected {SCHEMA_VERSION} or {SCHEMA_VERSION_V2}"
    )


def _parse_training_example_v1(record: dict[str, Any], context: str) -> TrainingExample:
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
        puzzle_id=CUBE3_COMPATIBILITY.puzzle_id,
        puzzle_slug=CUBE3_COMPATIBILITY.puzzle_slug,
        state_encoding_id=CUBE3_COMPATIBILITY.state_encoding_id,
        move_set_id=CUBE3_COMPATIBILITY.move_set_id,
        metric=CUBE3_COMPATIBILITY.metric,
        state=state,
        scramble=scramble,
        scramble_depth=scramble_depth,
        verified_solution=verified_solution,
        verified_solution_length=verified_solution_length,
        best_move=best_move,
        label_source=label_source,
        label_target=LABEL_TARGET,
        split=split,
        generator_seed=None,
        solver_strategy_id=None,
        replay_verified=True,
        cubie_state=cubie_state,
        cube2_state=None,
    )


def _parse_training_example_v2(record: dict[str, Any], context: str) -> TrainingExample:
    fields = set(record)
    missing = sorted(REQUIRED_FIELDS_V2 - fields)
    extra = sorted(fields - REQUIRED_FIELDS_V2)
    if missing or extra:
        details: list[str] = []
        if missing:
            details.append(f"missing fields {missing}")
        if extra:
            details.append(f"unknown fields {extra}")
        raise DatasetError(f"{context}: schema mismatch: {', '.join(details)}")

    schema_version = _require_int(record, "schema_version", context)
    puzzle_id = _require_string(record, "puzzle_id", context, allow_empty=False)
    puzzle_slug = _require_string(record, "puzzle_slug", context, allow_empty=False)
    state_encoding_id = _require_string(record, "state_encoding_id", context, allow_empty=False)
    move_set_id = _require_string(record, "move_set_id", context, allow_empty=False)
    metric = _require_string(record, "metric", context, allow_empty=False)
    state = _require_string(record, "state", context, allow_empty=False)
    scramble = _require_string(record, "scramble", context, allow_empty=True)
    scramble_depth = _require_int(record, "scramble_depth", context)
    verified_solution = _require_string(record, "verified_solution", context, allow_empty=True)
    verified_solution_length = _require_int(record, "verified_solution_length", context)
    label_source = _require_string(record, "label_source", context, allow_empty=False)
    label_target = _require_string(record, "label_target", context, allow_empty=False)
    split = _require_string(record, "split", context, allow_empty=False)
    generator_seed = _require_int(record, "generator_seed", context)
    solver_strategy_id = _require_string(record, "solver_strategy_id", context, allow_empty=False)
    replay_verified = _require_bool(record, "replay_verified", context)

    best_move = record["best_move"]
    if best_move is not None and not isinstance(best_move, str):
        raise DatasetError(f"{context}: best_move must be a string or null")

    if scramble_depth < 0:
        raise DatasetError(f"{context}: scramble_depth must be non-negative")
    if verified_solution_length < 0:
        raise DatasetError(f"{context}: verified_solution_length must be non-negative")
    if generator_seed < 0:
        raise DatasetError(f"{context}: generator_seed must be non-negative")
    if label_source not in SUPPORTED_LABEL_SOURCES:
        raise DatasetError(
            f"{context}: unsupported label_source {label_source!r}; expected one of {sorted(SUPPORTED_LABEL_SOURCES)!r}"
        )
    if label_target != LABEL_TARGET:
        raise DatasetError(f"{context}: label_target must be {LABEL_TARGET!r}")
    if split not in SPLITS:
        raise DatasetError(f"{context}: split must be one of {sorted(SPLITS)}")
    if not replay_verified:
        raise DatasetError(f"{context}: replay_verified must be true for ML training rows")

    expected = SUPPORTED_COMPATIBILITY.get(puzzle_id)
    if expected is None:
        raise DatasetError(
            f"{context}: unsupported puzzle_id {puzzle_id!r}; expected one of {sorted(SUPPORTED_COMPATIBILITY)}"
        )
    observed = DatasetCompatibility(
        puzzle_id=puzzle_id,
        puzzle_slug=puzzle_slug,
        state_encoding_id=state_encoding_id,
        move_set_id=move_set_id,
        metric=metric,
    )
    if observed != expected:
        raise DatasetError(
            f"{context}: incompatible dataset metadata for {puzzle_id!r}; expected {expected}, got {observed}"
        )

    cubie_state: CubieState | None = None
    cube2_state: Cube2State | None = None
    if expected == CUBE3_COMPATIBILITY:
        try:
            cubie_state = parse_cubie_state(state)
        except CubieStateParseError as error:
            raise DatasetError(f"{context}: invalid CubieState: {error}") from error
    elif expected == CUBE2_COMPATIBILITY:
        try:
            cube2_state = parse_cube2_state(state)
        except Cube2StateParseError as error:
            raise DatasetError(f"{context}: invalid Cube2State: {error}") from error
    else:  # pragma: no cover - guarded by SUPPORTED_COMPATIBILITY.
        raise DatasetError(f"{context}: unsupported dataset compatibility {expected}")

    return TrainingExample(
        schema_version=schema_version,
        puzzle_id=puzzle_id,
        puzzle_slug=puzzle_slug,
        state_encoding_id=state_encoding_id,
        move_set_id=move_set_id,
        metric=metric,
        state=state,
        scramble=scramble,
        scramble_depth=scramble_depth,
        verified_solution=verified_solution,
        verified_solution_length=verified_solution_length,
        best_move=best_move,
        label_source=label_source,
        label_target=label_target,
        split=split,
        generator_seed=generator_seed,
        solver_strategy_id=solver_strategy_id,
        replay_verified=replay_verified,
        cubie_state=cubie_state,
        cube2_state=cube2_state,
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


def parse_cube2_state(serialized: str) -> Cube2State:
    sections: dict[str, tuple[int, ...]] = {}
    expected_lengths = {"cp": 8, "co": 8}

    for section in serialized.split(";"):
        if "=" not in section:
            raise Cube2StateParseError(f"section {section!r} is missing '='")
        key, raw_values = section.split("=", 1)
        if key not in expected_lengths:
            raise Cube2StateParseError(f"unknown section {key!r}")
        if key in sections:
            raise Cube2StateParseError(f"duplicate section {key!r}")
        try:
            sections[key] = _parse_values(key, raw_values, expected_lengths[key])
        except CubieStateParseError as error:
            raise Cube2StateParseError(str(error)) from error

    missing = sorted(set(expected_lengths) - set(sections))
    if missing:
        raise Cube2StateParseError(f"missing sections {missing}")

    corner_permutation = sections["cp"]
    corner_orientation = sections["co"]

    try:
        _validate_permutation("cp", corner_permutation, 8)
        _validate_orientation("co", corner_orientation, 2, 3)
    except CubieStateParseError as error:
        raise Cube2StateParseError(str(error)) from error

    return Cube2State(
        corner_permutation=corner_permutation,
        corner_orientation=corner_orientation,
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
    examples = list(examples)
    validate_examples_for_current_value_model(examples)
    features: list[list[float]] = []
    targets: list[float] = []

    for example in examples:
        if example.cubie_state is None:
            raise DatasetError(
                f"current value model requires {CUBE3_COMPATIBILITY.puzzle_id} {CUBE3_COMPATIBILITY.state_encoding_id} rows"
            )
        features.append(example.cubie_state.feature_vector())
        targets.append(example.target)

    return features, targets


def dataset_compatibility(examples: Iterable[TrainingExample]) -> DatasetCompatibility:
    examples = list(examples)
    if not examples:
        raise DatasetError("dataset must contain at least one example")

    compatibility = examples[0].compatibility
    for example in examples[1:]:
        if example.compatibility != compatibility:
            raise DatasetError(
                "dataset rows must use one puzzle/state encoding/move set/metric combination; "
                f"got {compatibility} and {example.compatibility}"
            )

    return compatibility


def dataset_label_target(examples: Iterable[TrainingExample]) -> str:
    examples = list(examples)
    if not examples:
        raise DatasetError("dataset must contain at least one example")

    label_target = examples[0].label_target
    for example in examples[1:]:
        if example.label_target != label_target:
            raise DatasetError(
                f"dataset rows must use one label_target; got {label_target!r} and {example.label_target!r}"
            )

    return label_target


def validate_examples_for_current_value_model(examples: Iterable[TrainingExample]) -> None:
    examples = list(examples)
    if not examples:
        return

    compatibility = dataset_compatibility(examples)
    label_target = dataset_label_target(examples)
    if compatibility != CUBE3_COMPATIBILITY:
        raise DatasetError(
            "current value model only supports "
            f"{CUBE3_COMPATIBILITY.puzzle_id} with {CUBE3_COMPATIBILITY.state_encoding_id}; "
            f"got {compatibility.puzzle_id} with {compatibility.state_encoding_id}"
        )
    if label_target != LABEL_TARGET:
        raise DatasetError(f"current value model requires label_target {LABEL_TARGET!r}")


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


def _require_bool(record: dict[str, Any], field: str, context: str) -> bool:
    value = record[field]
    if not isinstance(value, bool):
        raise DatasetError(f"{context}: {field} must be a boolean")
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
