from __future__ import annotations

import pytest

from vision.color import DEFAULT_REFERENCES, estimate_color_probabilities
from vision.schemas import RgbColor


def test_estimates_default_reference_colors() -> None:
    for symbol, rgb in DEFAULT_REFERENCES.items():
        estimated = estimate_color_probabilities(rgb, {})

        assert estimated.symbol == symbol
        assert estimated.probabilities[symbol] == max(estimated.probabilities.values())
        assert sum(estimated.probabilities.values()) == pytest.approx(1.0, abs=1e-6)
        assert 0 <= estimated.margin <= 1


def test_close_red_orange_colors_have_lower_margin_than_easy_green() -> None:
    ambiguous_orange = RgbColor(r=244, g=92, b=40)
    easy_green = DEFAULT_REFERENCES["F"]

    ambiguous = estimate_color_probabilities(ambiguous_orange, {})
    easy = estimate_color_probabilities(easy_green, {})

    assert ambiguous.symbol in {"R", "L"}
    assert ambiguous.margin < easy.margin


def test_shaded_neutral_white_remains_plausibly_white() -> None:
    estimated = estimate_color_probabilities(RgbColor(r=172, g=181, b=214), {})

    assert estimated.symbol == "U"
    assert estimated.probabilities["U"] > 0.6
