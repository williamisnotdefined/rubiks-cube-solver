from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from vision_ml.dataset_schema import load_dataset_file, validate_dataset


FIXTURE_PATH = Path(__file__).parents[2] / "vision_ml" / "fixtures" / "sample_session.json"


def test_sample_vision_dataset_fixture_is_valid() -> None:
    dataset = load_dataset_file(FIXTURE_PATH)

    assert dataset.schemaVersion == "vision-scan-dataset-v1"
    assert dataset.sessions[0].sessionId == "synthetic-session-001"
    assert dataset.sessions[0].faces[0].stickers[4].symbol == "F"


def test_rejects_invalid_split() -> None:
    data = load_dataset_file(FIXTURE_PATH).model_dump()
    data["sessions"][0]["split"] = "private"

    with pytest.raises(ValidationError):
        validate_dataset(data)


def test_rejects_duplicate_sticker_indexes() -> None:
    data = load_dataset_file(FIXTURE_PATH).model_dump()
    data["sessions"][0]["faces"][0]["stickers"][8]["index"] = 7

    with pytest.raises(ValidationError, match="stickers must contain each index"):
        validate_dataset(data)


def test_rejects_invalid_face_symbol() -> None:
    data = load_dataset_file(FIXTURE_PATH).model_dump()
    data["sessions"][0]["faces"][0]["faceSymbol"] = "Q"

    with pytest.raises(ValidationError, match="symbol must be one of"):
        validate_dataset(data)
