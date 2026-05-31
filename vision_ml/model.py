from __future__ import annotations

try:
    import torch
    from torch import nn
except ImportError:  # pragma: no cover - exercised by optional dependency checks.
    torch = None  # type: ignore[assignment]
    nn = None  # type: ignore[assignment]


class TorchNotAvailableError(RuntimeError):
    pass


def require_torch():
    if torch is None or nn is None:
        raise TorchNotAvailableError(
            "PyTorch is required for vision_ml training/export. Install vision_ml/requirements.txt."
        )
    return torch, nn


def create_sticker_cnn(num_classes: int = 6):
    torch_module, nn_module = require_torch()

    class StickerCnn(nn_module.Module):
        def __init__(self) -> None:
            super().__init__()
            self.features = nn_module.Sequential(
                nn_module.Conv2d(3, 16, kernel_size=3, padding=1),
                nn_module.BatchNorm2d(16),
                nn_module.ReLU(inplace=True),
                nn_module.MaxPool2d(2),
                nn_module.Conv2d(16, 32, kernel_size=3, padding=1),
                nn_module.BatchNorm2d(32),
                nn_module.ReLU(inplace=True),
                nn_module.MaxPool2d(2),
                nn_module.Conv2d(32, 64, kernel_size=3, padding=1),
                nn_module.BatchNorm2d(64),
                nn_module.ReLU(inplace=True),
                nn_module.AdaptiveAvgPool2d((1, 1)),
            )
            self.classifier = nn_module.Linear(64, num_classes)

        def forward(self, batch):
            features = self.features(batch)
            return self.classifier(torch_module.flatten(features, 1))

    return StickerCnn()
