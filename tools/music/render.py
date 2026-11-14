#!/usr/bin/env python3
"""Render, master, verify and encode the soundtrack.

    python3 tools/music/render.py --samples /path/to/samples [--work /tmp/music] [cue ...]

Writes a/music/<cue>.mp3 and a/music/manifest.json; WAVs and spectrogram PNGs go to --work.
"""
import argparse
import json
import os
import subprocess
import sys
import time

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))

import engine  # noqa: E402
from engine import SR  # noqa: E402
from cues import CUES  # noqa: E402

TARGET_LUFS = -20.0
TP_CEIL = -2.0  # pre-encode ceiling; leaves headroom so the decoded MP3 stays <= -1.5 dBTP


def clicks(x):
    """Count isolated broadband spikes (discontinuities)."""
    from scipy import signal
    from scipy.ndimage import uniform_filter1d
    m = x.mean(axis=1)
    hp = signal.sosfilt(signal.butter(4, 9000, 'high', fs=SR, output='sos'), m)
    a = np.abs(hp)
    loc = np.sqrt(np.maximum(uniform_filter1d(hp ** 2, int(0.02 * SR)), 0)) + 1e-9
    spikes = (a > 12 * loc) & (a > 10 ** (-60 / 20))
    spikes[:int(0.01 * SR)] = False  # filter start-up transient
    return int(spikes.sum())


def spectral_balance(x):
    m = x.mean(axis=1)
    n = 1 << 15
    k = len(m) // n
    P = np.zeros(n // 2 + 1)
    w = np.hanning(n)
    for i in range(k):
        P += np.abs(np.fft.rfft(m[i * n:(i + 1) * n] * w)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR)
    tot = P.sum()
    bands = [(0, 120), (120, 500), (500, 2000), (2000, 6000), (6000, 22050)]
    return [100 * P[(f >= a) & (f < b)].sum() / tot for a, b in bands]


def spectrogram_png(x, path, title):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    m = x.mean(axis=1)
    fig, ax = plt.subplots(2, 1, figsize=(14, 6), sharex=True, gridspec_kw={'height_ratios': [1, 3]})
    hop = int(0.1 * SR)
    k = len(m) // hop
    r = 10 * np.log10((m[:k * hop] ** 2).reshape(k, hop).mean(axis=1) + 1e-12)
    ax[0].plot(np.arange(k) * 0.1, r, lw=0.7)
    ax[0].set_ylim(-80, 0)
    ax[0].set_ylabel('RMS dB')
    ax[0].grid(alpha=0.3)
    ax[0].set_title(title)
    ax[1].specgram(m, NFFT=4096, Fs=SR, noverlap=3072, cmap='magma', vmin=-130, vmax=-30)
    ax[1].set_yscale('symlog', linthresh=500)
    ax[1].set_ylim(30, 16000)
    ax[1].set_ylabel('Hz')
    ax[1].set_xlabel('s')
    fig.tight_layout()
    fig.savefig(path, dpi=80)
    plt.close(fig)


GM = {'piano': 0, 'celesta': 8, 'musicbox': 10, 'guitar': 24, 'violin': 40, 'cello': 42, 'contrabass': 43,
      'harp': 46, 'strings': 48, 'strings_lo': 48, 'choir': 52, 'horn': 60, 'flute': 73, 'pad': 89, 'air': 91}


def _vlq(n):
    out = [n & 0x7F]
    n >>= 7
    while n:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    return bytes(reversed(out))


def export_midi(cue, path, ppq=480):
    """Write the cue's note data as a Standard MIDI File (type 1) for editing in a DAW."""
    import struct

    def chunk(events):
        events.sort(key=lambda e: (e[0], e[1]))
        data, last = b'', 0
        for tick, _, msg in events:
            data += _vlq(tick - last) + msg
            last = tick
        data += b'\x00\xff\x2f\x00'
        return b'MTrk' + struct.pack('>I', len(data)) + data

    tempo_ev = []
    for b, bpm in cue.tempo:
        us = int(round(60e6 / bpm))
        tempo_ev.append((int(b * ppq), 0, b'\xff\x51\x03' + us.to_bytes(3, 'big')))
    tracks = [chunk(tempo_ev)]
    for i, tr in enumerate(cue.tracks):
        ch = i % 15 + (1 if i % 15 >= 9 else 0)
        name = tr.name.encode()
        ev = [(0, 0, b'\xff\x03' + _vlq(len(name)) + name), (0, 1, bytes([0xC0 | ch, GM.get(tr.inst, 0)]))]
        for n in tr.notes:
            m = int(round(n.m))
            if not 0 <= m < 128:
                continue
            v = max(1, min(127, int(n.v * 127)))
            t0, t1 = int(n.t * ppq), int((n.t + n.d) * ppq)
            ev.append((t0, 3, bytes([0x90 | ch, m, v])))
            ev.append((max(t1, t0 + 1), 2, bytes([0x80 | ch, m, 0])))
        tracks.append(chunk(ev))
    with open(path, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), ppq) + b''.join(tracks))


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--samples', required=True, help='folder created by fetch_samples.py')
    ap.add_argument('--work', default=os.path.join(HERE, '.work'))
    ap.add_argument('--out', default=os.path.join(REPO, 'a', 'music'))
    ap.add_argument('--quality', default='4', help='LAME VBR quality (-q:a)')
    ap.add_argument('--midi', default=os.path.join(HERE, 'midi'), help='where to write .mid exports')
    ap.add_argument('cues', nargs='*')
    args = ap.parse_args()
    os.makedirs(args.work, exist_ok=True)
    os.makedirs(args.out, exist_ok=True)
    inst = engine.build_instruments(args.samples)
    names = args.cues or list(CUES)
    man_path = os.path.join(args.out, 'manifest.json')
    manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}
    rows = []
    for name in names:
        t0 = time.time()
        cue = CUES[name]()
        print(f'== {name}  (re-voiced {cue.revoiced} accompaniment notes)')
        os.makedirs(args.midi, exist_ok=True)
        export_midi(cue, os.path.join(args.midi, f'{name}.mid'))
        mix, end_s = engine.render_cue(cue, inst)
        y, info = engine.master(mix, TARGET_LUFS, TP_CEIL, loop=cue.loop)
        if not cue.loop:
            y = engine.trim_tail(y)
        wav = os.path.join(args.work, f'{name}.wav')
        sf.write(wav, y, SR, subtype='FLOAT')
        mp3 = os.path.join(args.out, f'{name}.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-q:a', args.quality,
                        '-ar', str(SR), '-ac', '2', mp3], check=True)
        d = decode(mp3)
        row = dict(cue=name, dur=len(y) / SR, lufs_wav=engine.loudness(y), lufs_mp3=engine.loudness(d),
                   tp_mp3=engine.true_peak(d), peak=20 * np.log10(np.abs(d).max()), dc=float(np.abs(y.mean(axis=0)).max()),
                   clicks=clicks(y), bal=spectral_balance(y), kb=os.path.getsize(mp3) / 1024,
                   comp=info['comp_max_gr_db'], lim=info['limiter_max_gr_db'], secs=time.time() - t0,
                   start_db=20 * np.log10(np.abs(y[:int(0.05 * SR)]).max() + 1e-12),
                   end_db=20 * np.log10(np.abs(y[-int(0.05 * SR):]).max() + 1e-12))
        rows.append(row)
        spectrogram_png(y, os.path.join(args.work, f'{name}.png'),
                        f"{name}  {row['dur']:.1f}s  {row['lufs_mp3']:.1f} LUFS  TP {row['tp_mp3']:.1f} dBTP")
        manifest[name] = {'file': f'a/music/{name}.mp3', 'dur': round(len(y) / SR, 2), 'loop': bool(cue.loop),
                          'mood': cue.mood, 'use': cue.use}
        print(f"   {row['dur']:.1f}s  {row['lufs_mp3']:.2f} LUFS  TP {row['tp_mp3']:.2f}  clicks {row['clicks']}"
              f"  comp {row['comp']:.1f} dB  lim {row['lim']:.1f} dB  ({row['secs']:.0f}s)")
    order = [n for n in CUES if n in manifest]
    manifest = {k: manifest[k] for k in order}
    with open(man_path, 'w') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print('\n| cue | dur s | LUFS (mp3) | true peak dBTP | sample peak dBFS | DC | clicks | <120/120-500/500-2k/2-6k/>6k % | start/end dBFS | KB |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for r in rows:
        b = '/'.join(f'{v:.0f}' for v in r['bal'])
        print(f"| {r['cue']} | {r['dur']:.1f} | {r['lufs_mp3']:.2f} | {r['tp_mp3']:.2f} | {r['peak']:.2f} | {r['dc']:.1e} |"
              f" {r['clicks']} | {b} | {r['start_db']:.0f}/{r['end_db']:.0f} | {r['kb']:.0f} |")
    tot = sum(os.path.getsize(os.path.join(args.out, f)) for f in os.listdir(args.out) if f.endswith('.mp3'))
    print(f'total mp3 size: {tot / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
