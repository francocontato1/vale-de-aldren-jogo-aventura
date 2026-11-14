#!/usr/bin/env python3
"""Objective check that the cast sounds distinct: per-speaker median F0 (pyin) and a
speaker-embedding cosine-similarity matrix (Chatterbox VoiceEncoder) over rendered lines.
Usage: python voice_check.py <dir-with-mp3s> <manifest.json> --ckpt-dir $CHATTERBOX_DIR [--refs refs]"""
import argparse, json, os
from pathlib import Path

os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")
import numpy as np, librosa, torch

ap = argparse.ArgumentParser()
ap.add_argument("audio_dir"); ap.add_argument("manifest"); ap.add_argument("--ckpt-dir", required=True)
ap.add_argument("--refs", default=None, help="also compare against the reference clips")
a = ap.parse_args()
torch.set_num_threads(2)
from chatterbox.models.voice_encoder import VoiceEncoder
ve = VoiceEncoder(); ve.load_state_dict(torch.load(Path(a.ckpt_dir) / "ve.pt", map_location="cpu", weights_only=True)); ve.eval()

man = json.load(open(a.manifest, encoding="utf-8"))
by = {}
for i, m in man.items():
    by.setdefault(m["speaker"], []).append(Path(a.audio_dir) / f"{i}.mp3")
spk = sorted(by)
emb, f0s = {}, {}
for s in spk:
    wavs = [librosa.load(str(p), sr=16000)[0] for p in by[s]]
    e = ve.embeds_from_wavs(wavs, sample_rate=16000)
    emb[s] = e.mean(0) / np.linalg.norm(e.mean(0))
    f0 = []
    for w in wavs:
        f, v, _ = librosa.pyin(w, fmin=60, fmax=600, sr=16000, frame_length=1024); f0 += list(f[v])
    f0s[s] = (np.median(f0), np.percentile(f0, 10), np.percentile(f0, 90))
print(f"{'speaker':9s} {'n':>3s} {'F0 med':>7s} {'p10':>6s} {'p90':>6s}  nearest (cos)")
for s in spk:
    sims = sorted(((float(emb[s] @ emb[o]), o) for o in spk if o != s), reverse=True)
    print(f"{s:9s} {len(by[s]):3d} {f0s[s][0]:7.1f} {f0s[s][1]:6.1f} {f0s[s][2]:6.1f}  {sims[0][1]} {sims[0][0]:.3f}, {sims[1][1]} {sims[1][0]:.3f}")
print("\ncosine similarity matrix")
print(" " * 9 + "".join(f"{s[:7]:>8s}" for s in spk))
for s in spk:
    print(f"{s:9s}" + "".join(f"{float(emb[s] @ emb[o]):8.3f}" for o in spk))
if a.refs:
    print("\nrendered vs own reference clip (cos)")
    for s in spk:
        r = Path(a.refs) / f"{s}.ogg"
        if r.exists():
            e = ve.embeds_from_wavs([librosa.load(str(r), sr=16000)[0]], sample_rate=16000).mean(0)
            print(f"  {s:9s} {float(emb[s] @ (e / np.linalg.norm(e))):.3f}")
