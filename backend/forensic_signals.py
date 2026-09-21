# -*- coding: utf-8 -*-
"""
Training-free image-forensics signals used to complement the pretrained neural
detectors. None of these require training or a paid API; they are classical
signal-processing cues with support in the forensics literature:

  * radial_highfreq_ratio  - camera images fall off roughly as 1/f in the Fourier
    domain; many generators leave excess or deficit high-frequency energy
    (Durall et al., 2020; Frank et al., 2020).
  * spectral_peakiness      - transposed-convolution upsampling in GANs leaves
    periodic 'grid' peaks in the azimuthally-averaged spectrum (Zhang et al., 2019).
  * ela_mean                - Error Level Analysis: recompress at a known JPEG
    quality and measure the residual; re-rendered / spliced content often shows a
    flatter or displaced error surface (Krawetz, 2007).

Each returns a raw feature. Squash helpers map a feature to [0,1]; the centres are
documented defaults that eval/evaluate.py validates (per-signal AUC + ablation), so
they are evidence-checked rather than hidden constants.
"""
import io
import numpy as np
from PIL import Image


def _gray(img: Image.Image) -> np.ndarray:
    return np.asarray(img.convert("L"), dtype=np.float32)


def radial_highfreq_ratio(img: Image.Image, cutoff: float = 0.25) -> float:
    """Fraction of Fourier magnitude energy beyond `cutoff` * Nyquist radius."""
    g = _gray(img)
    g = g - g.mean()
    mag = np.abs(np.fft.fftshift(np.fft.fft2(g)))
    h, w = mag.shape
    cy, cx = h // 2, w // 2
    yy, xx = np.ogrid[:h, :w]
    r = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
    rmax = float(np.sqrt(cy ** 2 + cx ** 2)) + 1e-8
    total = float(mag.sum()) + 1e-8
    return float(mag[r > cutoff * rmax].sum() / total)


def spectral_peakiness(img: Image.Image) -> float:
    """Std of the detrended log azimuthal power spectrum (periodic-peak strength)."""
    g = _gray(img)
    g = g - g.mean()
    ps = np.abs(np.fft.fftshift(np.fft.fft2(g))) ** 2
    h, w = ps.shape
    cy, cx = h // 2, w // 2
    yy, xx = np.ogrid[:h, :w]
    r = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2).astype(int)
    nbins = int(min(cy, cx))
    if nbins < 8:
        return 0.0
    prof = np.array([ps[r == i].mean() if np.any(r == i) else 0.0 for i in range(1, nbins)])
    prof = np.log(prof + 1e-8)
    k = max(3, nbins // 16)
    base = np.convolve(prof, np.ones(k) / k, mode="same")
    return float(np.std(prof - base))


def ela_mean(img: Image.Image, quality: int = 90) -> float:
    """Mean absolute Error-Level-Analysis residual after one JPEG round-trip."""
    buf = io.BytesIO()
    rgb = img.convert("RGB")
    rgb.save(buf, "JPEG", quality=quality)
    buf.seek(0)
    a = np.asarray(rgb, dtype=np.float32)
    b = np.asarray(Image.open(buf).convert("RGB"), dtype=np.float32)
    return float(np.abs(a - b).mean())


def _squash(x: float, centre: float, scale: float) -> float:
    return float(1.0 / (1.0 + np.exp(-(x - centre) / scale)))


def frequency_artifact_score(img: Image.Image):
    """Combine the two spectral cues into a [0,1] artificiality score + raw features."""
    hf = radial_highfreq_ratio(img)
    pk = spectral_peakiness(img)
    # Documented default centres (validated in eval): stronger periodic peaks and
    # an unusually low high-frequency tail both push the score up.
    s = 0.6 * _squash(pk, 0.75, 0.30) + 0.4 * _squash(0.5 - hf, 0.35, 0.15)
    return float(np.clip(s, 0.0, 1.0)), {"hf_ratio": hf, "peakiness": pk}


def ela_artifact_score(img: Image.Image):
    """Map the ELA residual to a [0,1] score (very low residual is suspicious)."""
    e = ela_mean(img)
    s = _squash(6.0 - e, 2.0, 1.5)   # flatter ELA (low residual) -> higher score
    return float(np.clip(s, 0.0, 1.0)), {"ela_mean": e}
