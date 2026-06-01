from __future__ import annotations

from .model import require_torch


def create_face_box_detector():
    torch_module, nn_module = require_torch()

    class FaceBoxDetector(nn_module.Module):
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
                nn_module.MaxPool2d(2),
                nn_module.Conv2d(64, 96, kernel_size=3, padding=1),
                nn_module.BatchNorm2d(96),
                nn_module.ReLU(inplace=True),
                nn_module.AdaptiveAvgPool2d((1, 1)),
            )
            self.regressor = nn_module.Sequential(
                nn_module.Linear(96, 64),
                nn_module.ReLU(inplace=True),
                nn_module.Linear(64, 4),
                nn_module.Sigmoid(),
            )

        def forward(self, batch):
            features = self.features(batch)
            return self.regressor(torch_module.flatten(features, 1))

    return FaceBoxDetector()
