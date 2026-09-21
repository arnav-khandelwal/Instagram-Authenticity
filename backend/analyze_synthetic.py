# -*- coding: utf-8 -*-
"""
AI-generated (synthetic) media detection.

Whole-frame analysis (so it catches fully generated content, not just faces). Per
frame we fuse three signals:
  * an ENSEMBLE of pretrained AI-vs-real ViT detectors (config.SYNTHETIC_MODELS),
    averaged, which is more stable than any single model across generators;
  * a frequency-domain artifact score; and
  * an Error-Level-Analysis score.
Weights and decision bands are in config.py; eval/evaluate.py reports the per-signal
and fused discrimination that motivate them.
"""
import logging
from typing import Dict, Any, List

import cv2
import numpy as np
from PIL import Image
import torch

import config
from forensic_signals import frequency_artifact_score, ela_artifact_score

log = logging.getLogger("provenance.synthetic")
# The AI-image detectors are TensorFlow models; keep them on CPU so they never
# contend with the torch models for the small GPU (they are light ViTs, ~0.3s/frame).
_DEVICE = -1
_classifiers = None
DISCLAIMER = ("This analysis provides probabilistic risk indicators, not factual "
              "determinations.")


def _get_classifiers():
    global _classifiers
    if _classifiers is None:
        from transformers import pipeline
        _classifiers = []
        for name in config.SYNTHETIC_MODELS:
            name = name.strip()
            try:
                _classifiers.append(pipeline("image-classification", model=name, device=_DEVICE))
                log.info("Synthetic detector loaded: %s", name)
            except Exception as e:  # noqa: BLE001
                log.warning("Could not load synthetic detector %s: %s", name, e)
    return _classifiers


def _artificial_prob(preds: List[Dict[str, Any]]) -> float:
    for p in preds:
        if any(k in p["label"].lower() for k in ("artificial", "ai", "fake", "synthetic", "generated")):
            return float(p["score"])
    for p in preds:
        if not any(k in p["label"].lower() for k in ("human", "real", "natural")):
            return float(p["score"])
    return float(preds[0]["score"])


def _ensemble_prob(img: Image.Image, classifiers) -> float:
    probs = []
    for clf in classifiers:
        try:
            probs.append(_artificial_prob(clf(img)))
        except Exception as e:  # noqa: BLE001
            log.debug("synthetic classifier error: %s", e)
    return float(np.mean(probs)) if probs else 0.0


def compute_synthetic_score(frame_paths: List[str]) -> Dict[str, Any]:
    """Return fused frame score plus components (used by eval and the endpoint)."""
    classifiers = _get_classifiers()
    fused_scores, model_scores, freq_scores, ela_scores = [], [], [], []
    for path in frame_paths:
        frame = cv2.imread(path)
        if frame is None:
            continue
        img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        mp = _ensemble_prob(img, classifiers) if classifiers else 0.0
        fq, _ = frequency_artifact_score(img)
        el, _ = ela_artifact_score(img)
        fused = (config.SYNTHETIC_FUSION["model"] * mp
                 + config.SYNTHETIC_FUSION["frequency"] * fq
                 + config.SYNTHETIC_FUSION["ela"] * el)
        model_scores.append(mp)
        freq_scores.append(fq)
        ela_scores.append(el)
        fused_scores.append(fused)

    if not fused_scores:
        return {"synthetic_probability": 0.0, "model_prob": 0.0, "freq_score": 0.0,
                "ela_score": 0.0, "consistency": 1.0, "high_ratio": 0.0, "frames": 0}

    return {
        "synthetic_probability": float(np.mean(fused_scores)),
        "model_prob": float(np.mean(model_scores)),
        "freq_score": float(np.mean(freq_scores)),
        "ela_score": float(np.mean(ela_scores)),
        "consistency": float(max(0.0, 1.0 - np.std(fused_scores))),
        "high_ratio": float(np.mean([s > 0.5 for s in fused_scores])),
        "frames": len(fused_scores),
    }


def _band(score: float) -> str:
    if score < config.SYNTHETIC_BANDS["low"]:
        return "LOW"
    return "MEDIUM" if score < config.SYNTHETIC_BANDS["high"] else "HIGH"


def analyze_synthetic_video(frame_paths: List[str]) -> Dict[str, Any]:
    if not frame_paths:
        return _empty("No frames to analyze.")
    r = compute_synthetic_score(frame_paths)
    if r["frames"] == 0:
        return _empty("Could not analyze frames.")

    synth = r["synthetic_probability"]
    risk_score = float(synth * 100)
    risk_level = _band(risk_score)
    consistency = r["consistency"]
    high_ratio = r["high_ratio"]

    forensic_status = "fail" if synth > 0.6 else ("warn" if synth > 0.35 else "pass")
    temporal_status = "warn" if consistency < 0.7 else "pass"
    contextual_status = "fail" if high_ratio > 0.6 else ("warn" if high_ratio > 0.3 else "pass")

    forensic_details = (
        f"Ensemble of {len(config.SYNTHETIC_MODELS)} AI-image detector(s) at "
        f"{r['model_prob']*100:.1f}%, fused with frequency ({r['freq_score']*100:.1f}%) and "
        f"Error-Level-Analysis ({r['ela_score']*100:.1f}%) cues over {r['frames']} frames "
        f"gives {synth*100:.1f}% synthetic likelihood.")
    temporal_details = (
        f"Frame-to-frame consistency {consistency*100:.1f}% "
        f"({'uniform generation signature' if consistency > 0.7 else 'variable across frames'}).")
    contextual_details = f"{high_ratio*100:.0f}% of frames scored above the 50% synthetic threshold."

    if risk_level == "HIGH":
        summary = (f"HIGH RISK: {synth*100:.1f}% likelihood of AI-generated content; frames show "
                   f"patterns characteristic of synthetic media. {DISCLAIMER}")
    elif risk_level == "MEDIUM":
        summary = (f"MEDIUM RISK: {synth*100:.1f}% likelihood of AI generation; some frames deviate "
                   f"from camera-captured norms. {DISCLAIMER}")
    else:
        summary = (f"LOW RISK: {synth*100:.1f}% AI-generation likelihood, consistent with "
                   f"camera-captured video. {DISCLAIMER}")

    return {
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "summary": summary,
        "signals": {
            "forensic": {"name": "Synthetic Media Likelihood", "status": forensic_status,
                         "confidence": 0.8, "details": forensic_details},
            "temporal": {"name": "Temporal Feature Coherence", "status": temporal_status,
                         "confidence": consistency, "details": temporal_details},
            "contextual": {"name": "Per-frame Synthetic Ratio", "status": contextual_status,
                           "confidence": high_ratio, "details": contextual_details},
        },
    }


def _empty(msg: str) -> Dict[str, Any]:
    return {
        "riskScore": 0, "riskLevel": "LOW", "summary": msg,
        "signals": {
            "forensic": {"name": "Synthetic Media Likelihood", "status": "pass", "confidence": 0.0, "details": "Insufficient data"},
            "temporal": {"name": "Temporal Feature Coherence", "status": "pass", "confidence": 0.0, "details": "No analysis performed"},
            "contextual": {"name": "Per-frame Synthetic Ratio", "status": "pass", "confidence": 0.0, "details": "No analysis performed"},
        },
    }
