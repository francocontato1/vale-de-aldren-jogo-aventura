#!/usr/bin/env python3
"""Build the per-character timbre reference clips with Kokoro-82M (Apache-2.0).

Each speaker in voices.json has a 'ref' recipe: a weighted blend of Kokoro voice
style vectors, a speaking speed and Portuguese text (lang pt-br via espeak-ng),
optionally followed by an ffmpeg rubberband pitch/formant shift. The resulting
clip (~10 s, 24 kHz mono Ogg Vorbis q7) is the zero-shot cloning prompt for Chatterbox.

Usage (in the Kokoro venv, see README.md):
  python make_refs.py --kokoro-dir /path/to/kokoro [--only lia,tome] [--force]
"""
import argparse, json, os, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent


def blend_style(k, blend):
    total = sum(blend.values())
    style = None
    for name, w in blend.items():
        v = k.get_voice_style(name) * (w / total)
        style = v if style is None else style + v
    return style.astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kokoro-dir", required=True, help="dir with kokoro-v1.0.onnx and voices-v1.0.bin")
    ap.add_argument("--voices", default=str(HERE / "voices.json"))
    ap.add_argument("--out", default=str(HERE / "refs"))
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    cfg = json.load(open(a.voices, encoding="utf-8"))["speakers"]
    only = set(filter(None, a.only.split(",")))
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    kd = Path(a.kokoro_dir)
    k = Kokoro(str(kd / "kokoro-v1.0.onnx"), str(kd / "voices-v1.0.bin"))

    for spk, c in cfg.items():
        if only and spk not in only:
            continue
        dst = out / f"{spk}.ogg"
        if dst.exists() and not a.force:
            print(f"[skip] {dst.name}"); continue
        r = c["ref"]
        style = blend_style(k, r["blend"])
        audio, sr = k.create(r["text"], voice=style, speed=r.get("speed", 1.0), lang="pt-br")
        with tempfile.TemporaryDirectory() as td:
            raw = os.path.join(td, "raw.wav"); sf.write(raw, audio, sr)
            filt = []
            if r.get("pitch"):
                ratio = 2 ** (r["pitch"] / 12.0)
                filt.append(f"rubberband=pitch={ratio:.5f}:formant={r.get('formant', 'preserved')}:pitchq=quality")
            # trim leading/trailing silence, keep it natural
            filt.append("silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05")
            filt.append("areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", ",".join(filt),
                            "-ar", "24000", "-ac", "1", "-c:a", "libvorbis", "-q:a", "7", str(dst)], check=True)
        d = sf.info(str(dst)).duration
        print(f"[ref] {spk:9s} {d:5.2f}s  {dst.stat().st_size // 1024} KB  blend={r['blend']}")


if __name__ == "__main__":
    sys.exit(main())
