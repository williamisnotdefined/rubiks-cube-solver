from __future__ import annotations

import random
import time
from typing import Any

from .data import FEATURE_DIM, TrainingExample, encode_examples

try:
    import torch
    from torch import nn
except ModuleNotFoundError as error:  # pragma: no cover - covered by environment setup.
    torch = None
    nn = None
    _TORCH_IMPORT_ERROR = error
else:
    _TORCH_IMPORT_ERROR = None


def is_torch_available() -> bool:
    return torch is not None


def require_torch() -> Any:
    if torch is None:
        raise RuntimeError(
            "PyTorch is required for the ML value baseline. "
            "Install dependencies with: python -m pip install -r ml/requirements.txt"
        ) from _TORCH_IMPORT_ERROR
    return torch


if nn is not None:

    class ValueModel(nn.Module):
        def __init__(self, input_dim: int = FEATURE_DIM, hidden_dim: int = 64) -> None:
            super().__init__()
            self.network = nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, 1),
            )

        def forward(self, inputs: Any) -> Any:
            return self.network(inputs).squeeze(-1)

else:

    class ValueModel:  # type: ignore[no-redef]
        def __init__(self, *_args: Any, **_kwargs: Any) -> None:
            require_torch()


def set_deterministic(seed: int) -> None:
    torch_module = require_torch()
    random.seed(seed)
    torch_module.manual_seed(seed)
    torch_module.set_num_threads(1)
    torch_module.use_deterministic_algorithms(True)


def examples_to_tensors(examples: list[TrainingExample]) -> tuple[Any, Any]:
    torch_module = require_torch()
    features, targets = encode_examples(examples)
    if not features:
        raise ValueError("at least one training example is required")

    return (
        torch_module.tensor(features, dtype=torch_module.float32),
        torch_module.tensor(targets, dtype=torch_module.float32),
    )


def train_value_model(
    examples: list[TrainingExample],
    *,
    epochs: int,
    seed: int,
    learning_rate: float,
    hidden_dim: int,
) -> tuple[ValueModel, list[float]]:
    if epochs < 0:
        raise ValueError("epochs must be non-negative")
    if learning_rate <= 0:
        raise ValueError("learning_rate must be positive")
    if hidden_dim <= 0:
        raise ValueError("hidden_dim must be positive")

    torch_module = require_torch()
    set_deterministic(seed)
    features, targets = examples_to_tensors(examples)
    value_model = ValueModel(FEATURE_DIM, hidden_dim)
    optimizer = torch_module.optim.Adam(value_model.parameters(), lr=learning_rate)
    history: list[float] = []

    value_model.train()
    for _epoch in range(epochs):
        optimizer.zero_grad(set_to_none=True)
        predictions = value_model(features)
        loss = torch_module.nn.functional.mse_loss(predictions, targets)
        loss.backward()
        optimizer.step()
        history.append(float(loss.detach().item()))

    return value_model, history


def predict(value_model: ValueModel, examples: list[TrainingExample]) -> list[float]:
    torch_module = require_torch()
    features, _targets = examples_to_tensors(examples)

    value_model.eval()
    with torch_module.no_grad():
        predictions = value_model(features)

    return [float(value) for value in predictions.detach().cpu().tolist()]


def inference_us_per_state(
    value_model: ValueModel, examples: list[TrainingExample], *, repeats: int
) -> float:
    if repeats <= 0:
        raise ValueError("repeats must be positive")

    torch_module = require_torch()
    features, _targets = examples_to_tensors(examples)
    value_model.eval()

    with torch_module.no_grad():
        value_model(features)
        start = time.perf_counter()
        for _repeat in range(repeats):
            value_model(features)
        elapsed = time.perf_counter() - start

    return elapsed * 1_000_000.0 / (len(examples) * repeats)
