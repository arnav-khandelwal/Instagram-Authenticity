# -*- coding: utf-8 -*-
"""
Unit tests for the pure logic of the AI-Generated Detection backend: forensic
signals, band decisions, and label parsing. These do not download any model.
"""
import os
import sys

import numpy as np
import pytest
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# ---- forensic signals -------------------------------------------------------------------
def _img(seed=0):
    rng = np.random.RandomState(seed)
    return Image.fromarray((rng.rand(128, 128, 3) * 255).astype("uint8"))


def test_frequency_score_range_and_determinism():
    import forensic_signals as fs
    s1, feat = fs.frequency_artifact_score(_img(1))
    s2, _ = fs.frequency_artifact_score(_img(1))
    assert 0.0 <= s1 <= 1.0
    assert s1 == s2                      # deterministic
    assert "hf_ratio" in feat and "peakiness" in feat


def test_ela_score_range():
    import forensic_signals as fs
    s, feat = fs.ela_artifact_score(_img(2))
    assert 0.0 <= s <= 1.0
    assert feat["ela_mean"] >= 0.0


def test_flat_image_has_low_highfreq():
    import forensic_signals as fs
    flat = Image.fromarray(np.full((128, 128, 3), 128, dtype="uint8"))
    noisy = _img(3)
    assert fs.radial_highfreq_ratio(flat) <= fs.radial_highfreq_ratio(noisy)


# ---- band / risk decisions --------------------------------------------------------------
def test_synthetic_bands():
    import analyze_synthetic as s
    assert s._band(10) == "LOW"
    assert s._band(50) == "MEDIUM"
    assert s._band(90) == "HIGH"


def test_label_parser():
    import analyze_synthetic as s
    assert s._artificial_prob([{"label": "artificial", "score": 0.7}, {"label": "human", "score": 0.3}]) == 0.7


# ---- config sanity ----------------------------------------------------------------------
def test_fusion_weights_sum_to_one():
    import config
    assert abs(sum(config.SYNTHETIC_FUSION.values()) - 1.0) < 1e-6


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
