# -*- coding: utf-8 -*-
"""
Central configuration for the AI-Generated Detection module: model identifiers,
fusion weights, decision thresholds, and sampling parameters.
"""
import os

# ---- pretrained models (all open, no paid API) ------------------------------------------
SYNTHETIC_MODELS = os.environ.get(
    "SYNTHETIC_MODELS",
    "umm-maybe/AI-image-detector,Organika/sdxl-detector",  # ensembled by mean
).split(",")

# ---- frame sampling ---------------------------------------------------------------------
SYNTHETIC_SAMPLE_INTERVAL_S = 1     # seconds between sampled frames
MAX_FRAMES = 40                     # hard cap so long clips stay bounded

# ---- synthetic (AI-generated) module ----------------------------------------------------
# Final frame score = w_model * ensemble_prob + w_freq * frequency + w_ela * ELA.
SYNTHETIC_FUSION = {"model": 0.85, "frequency": 0.08, "ela": 0.07}
SYNTHETIC_BANDS = {"low": 35.0, "high": 65.0}
