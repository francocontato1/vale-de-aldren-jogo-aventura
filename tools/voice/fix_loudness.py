#!/usr/bin/env python3
"""Re-level already rendered mp3s to -18 LUFS / <= -1.5 dBTP with the same limiter as generate.py
(used once for the first full render, which lowered gain instead of limiting peaks).
Only files off by more than --tol LU (or over the peak ceiling) are touched; manifest durations
are unchanged. Usage: python fix_loudness.py ../../a/vox [--tol 0.7] [--dry]"""
import argparse, subprocess, sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate as G  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("dir"); ap.add_argument("--tol", type=float, default=0.7); ap.add_argument("--dry", action="store_true")
a = ap.parse_args()
meter = pyln.Meter(G.SR)
fixed = 0
for mp3 in sorted(Path(a.dir).glob("*.mp3")):
    x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "f32le", "-ac", "1", "-ar", str(G.SR), "-"],
                                     capture_output=True, check=True).stdout, np.float32).copy()
    pad = np.concatenate([x, np.zeros(int(0.5 * G.SR), np.float32)]) if len(x) < G.SR else x
    lufs, tp = meter.integrated_loudness(pad), G.true_peak_db(x)
    if abs(lufs + 18) <= a.tol and tp <= -1.5:
        continue
    y, _, _ = G.loudness_normalize(x)
    y2 = np.concatenate([y, np.zeros(int(0.5 * G.SR), np.float32)]) if len(y) < G.SR else y
    print(f"{mp3.name:22s} {lufs:6.1f} LUFS {tp:5.1f} dBTP -> {meter.integrated_loudness(y2):6.1f} LUFS {G.true_peak_db(y):5.1f} dBTP")
    if not a.dry:
        G.encode_mp3(y, mp3)
    fixed += 1
print(f"{fixed} files re-leveled")
