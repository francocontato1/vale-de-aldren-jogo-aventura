"""Offline renderer: sample playback, small synths, hall reverb, mix bus, mastering.

Everything is deterministic given the cue seed.
"""
import glob
import os
import re
import subprocess
from functools import lru_cache

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 44100


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def note_to_midi(name):
    m = re.fullmatch(r'([A-G])(s|#)?(\d)', name)
    pc = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[m.group(1)] + (1 if m.group(2) else 0)
    return pc + 12 * (int(m.group(3)) + 1)


def load_audio(path):
    if path.endswith('.wav'):
        x, sr = sf.read(path, dtype='float32', always_2d=True)
        assert sr == SR, path
    else:
        raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-f', 'f32le', '-ac', '2',
                              '-ar', str(SR), '-'], capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    if x.shape[1] == 2 and np.allclose(x[:, 0], x[:, 1]):
        x = x[:, :1]
    return x


@lru_cache(maxsize=None)
def lp_sos(fc):
    fc = min(fc, SR * 0.45)
    return signal.butter(2, fc, 'low', fs=SR, output='sos')


def lowpass(x, fc, order=2):
    if fc >= SR * 0.45:
        return x
    sos = lp_sos(int(fc)) if order == 2 else signal.butter(order, fc, 'low', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def highpass(x, fc, order=2):
    sos = signal.butter(order, fc, 'high', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def hermite(x, ratio, n_out):
    """4-point Hermite resampling of x (n, ch) by playback ratio."""
    n_out = int(min(n_out, (len(x) - 2) / ratio))
    if n_out <= 0:
        return np.zeros((0, x.shape[1]), np.float32)
    pos = np.arange(n_out) * ratio
    i = pos.astype(np.int64)
    f = (pos - i)[:, None]
    xp = np.concatenate([x[:1], x, np.zeros((3, x.shape[1]), x.dtype)])
    xm1, x0, x1, x2 = xp[i], xp[i + 1], xp[i + 2], xp[i + 3]
    c1 = 0.5 * (x1 - xm1)
    c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2
    c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1)
    return (((c3 * f + c2) * f + c1) * f + x0).astype(np.float32)


def raised_cos(n):
    return 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, max(n, 1)))


def shape_curve(kind, n):
    if not kind or n <= 0:
        return None
    x = np.linspace(0, 1, n)
    if kind == 'swell':
        return 0.5 + 0.5 * np.sin(np.pi * x) ** 1.2
    if kind == 'cresc':
        return 0.55 + 0.45 * x
    if kind == 'dim':
        return 1.0 - 0.45 * x
    if kind == 'fp':
        return np.where(x < 0.15, 1.0 - 2.5 * x, 0.62 + 0.25 * x)
    raise ValueError(kind)


# ======================================================================= instruments

class Sampled:
    """Multi-sampled instrument (one velocity layer) with pitch shifting,
    velocity filtering, loop-extension for sustains and smooth envelopes."""

    def __init__(self, name, folder, sustain=False, attack=0.004, release=0.25,
                 max_len=8.0, vel_gamma=1.5, lp_lo=1500, lp_hi=16000, lo=None, hi=None,
                 legato_attack=None, pattern='*'):
        self.name, self.folder, self.sustain = name, folder, sustain
        self.attack, self.release, self.max_len = attack, release, max_len
        self.vel_gamma, self.lp_lo, self.lp_hi = vel_gamma, lp_lo, lp_hi
        self.legato_attack = legato_attack or attack
        self.pattern = pattern
        self._s = None
        self.lo, self.hi = lo, hi

    def load(self):
        if self._s is not None:
            return
        files = sorted(glob.glob(os.path.join(self.folder, self.pattern)))
        files = [f for f in files if f.endswith(('.wav', '.mp3'))]
        if not files:
            raise FileNotFoundError(f'no samples for {self.name} in {self.folder}')
        s = {}
        for f in files:
            base = os.path.splitext(os.path.basename(f))[0]
            try:
                m = note_to_midi(base)
            except Exception:
                continue
            x = load_audio(f)
            x = x - x.mean(axis=0)
            a = np.abs(x).max(axis=1)
            thr, pre = (0.06, 0.03) if self.sustain else (0.004, 0.004)
            on = int(np.argmax(a > thr * a.max()))
            on = max(0, on - int(pre * SR))
            x = x[on:]
            x[:64] *= raised_cos(64)[:, None]
            s[m] = x
        peak = max(np.abs(v).max() for v in s.values())
        self._s = {k: (v / peak).astype(np.float32) for k, v in s.items()}
        self.keys = np.array(sorted(self._s))

    def pick(self, m, alt=0):
        self.load()
        order = self.keys[np.argsort(np.abs(self.keys - m) + 0.01 * (self.keys < m))]
        k = int(order[min(alt, len(order) - 1)])
        return k, self._s[k]

    def extend(self, x, need, f0):
        """Loop the sustain portion with pitch-period-aligned crossfades."""
        n = len(x)
        if n >= need:
            return x
        P = SR / f0
        b = int(n * 0.82)
        a = int(n * 0.30)
        seg = int(round(round((b - a) / P) * P))
        a = b - seg
        xf = min(int(0.12 * SR), seg // 3)
        body = x[a + xf:b]
        head = x[a:a + xf]
        w = np.sin(np.linspace(0, np.pi / 2, xf))[:, None] ** 2
        out = [x[:b].copy()]
        total = b
        while total < need:
            prev = out[-1]
            prev[-xf:] = prev[-xf:] * (1 - w) + head * w
            nb = body.copy()
            out.append(nb)
            total += len(nb)
        return np.concatenate(out)

    def render(self, m, dur, vel, rng, o):
        k, x = self.pick(m, o.get('alt', 0))
        ratio = 2 ** ((m - k) / 12)
        rel = o.get('release', self.release)
        if self.sustain:
            n_out = int((dur + rel * 5) * SR)
            x = self.extend(x, int(n_out * ratio) + 8, hz(k))
        else:
            n_out = int(min(dur + rel * 5, self.max_len) * SR)
        y = hermite(x, ratio, n_out)
        n = len(y)
        if n == 0:
            return y
        env = np.ones(n, np.float32)
        att = o.get('attack', self.legato_attack if o.get('legato') else self.attack)
        if self.sustain:
            att = att * (1.35 - 0.6 * vel)
        na = min(n, max(8, int(att * SR)))
        env[:na] *= raised_cos(na)
        nd = int(dur * SR)
        if nd < n:
            t = np.arange(n - nd) / SR
            env[nd:] *= np.exp(-t / max(rel, 0.01))
        sc = shape_curve(o.get('shape'), min(n, max(nd, 1)))
        if sc is not None:
            env[:len(sc)] *= sc
            env[len(sc):] *= sc[-1]
        nf = min(n, int(0.03 * SR))
        env[-nf:] *= raised_cos(nf)[::-1]
        y = y * env[:, None]
        fc = self.lp_lo * (self.lp_hi / self.lp_lo) ** vel
        fc = o.get('lp', fc)
        y = lowpass(y, fc)
        return y * (vel ** self.vel_gamma)


class Ensemble:
    """A small string section built from solo samples (detuned, staggered, spread)."""

    def __init__(self, high, low, bass=None, split=55, voices=3, attack=0.35, release=0.7,
                 spread=0.55):
        self.high, self.low, self.bass, self.split = high, low, bass, split
        self.voices, self.attack, self.release, self.spread = voices, attack, release, spread

    def render(self, m, dur, vel, rng, o):
        src = self.high if m >= self.split else self.low
        if self.bass is not None and m < 36:
            src = self.bass
        outs = []
        pans = np.linspace(-self.spread, self.spread, self.voices)
        for k in range(self.voices):
            oo = dict(o)
            oo.setdefault('attack', self.attack)
            oo.setdefault('release', self.release)
            oo['alt'] = k % 2
            det = rng.normal(0, 6) / 100.0
            dl = int((k * 0.011 + rng.uniform(0, 0.012)) * SR)
            y = src.render(m + det, dur, vel, rng, oo)
            if y.shape[1] == 1:
                y = pan_mono(y[:, 0], pans[k])
            outs.append((dl, y))
        n = max(d + len(y) for d, y in outs)
        out = np.zeros((n, 2), np.float32)
        for d, y in outs:
            out[d:d + len(y)] += y
        return out / np.sqrt(self.voices)


def additive(freqs_amps_decays, n, phase_rng, vib=None):
    t = np.arange(n) / SR
    y = np.zeros(n, np.float64)
    for f, a, dec in freqs_amps_decays:
        if f >= SR * 0.45:
            continue
        ph = phase_rng.uniform(0, 2 * np.pi)
        arg = 2 * np.pi * f * t
        if vib is not None:
            arg = 2 * np.pi * f * (t + vib)
        e = np.exp(-t / dec) if dec else 1.0
        y += a * e * np.sin(arg + ph)
    return y


class Bell:
    """Celesta / music box / star-bell: struck partials with fast-decaying highs."""

    def __init__(self, ratios, amps, decays, base_decay=2.5, ref=880.0, click=0.0,
                 detune_cents=0.0, lp=9000):
        self.ratios, self.amps, self.decays = ratios, amps, decays
        self.base_decay, self.ref, self.click, self.detune, self.lp = base_decay, ref, click, detune_cents, lp

    def render(self, m, dur, vel, rng, o):
        f = hz(m)
        bd = self.base_decay * (self.ref / f) ** 0.45
        n = int(min(bd * 5, 9.0) * SR)
        parts = []
        for r, a, d in zip(self.ratios, self.amps, self.decays):
            aa = a * (0.6 + 0.6 * vel) ** (1 if r == 1 else 2)
            parts.append((f * r, aa, bd * d))
            if self.detune:
                parts.append((f * r * 2 ** (self.detune / 1200), aa * 0.5, bd * d * 0.9))
        y = additive(parts, n, rng)
        if self.click:
            nc = int(0.004 * SR)
            c = rng.normal(0, 1, nc) * np.exp(-np.arange(nc) / (0.0008 * SR))
            c = signal.sosfilt(signal.butter(2, [min(f * 2, 9000), min(f * 6, 16000)], 'band', fs=SR, output='sos'), c)
            y[:nc] += self.click * c
        na = int(0.0015 * SR)
        y[:na] *= raised_cos(na)
        nd = int(dur * SR)
        if nd < n and o.get('damp'):
            y[nd:] *= np.exp(-np.arange(n - nd) / (0.25 * SR))
        nf = int(0.05 * SR)
        y[-nf:] *= raised_cos(nf)[::-1]
        y = lowpass(y, self.lp)
        return (y * vel ** 1.4 * 0.35)[:, None].astype(np.float32)


def wt_osc(table, freq, phase0=0.0):
    """Wavetable oscillator; freq is an array (Hz) per sample."""
    ph = (phase0 + np.cumsum(freq) / SR) % 1.0
    L = len(table)
    pos = ph * L
    i = pos.astype(np.int64)
    f = pos - i
    return table[i % L] * (1 - f) + table[(i + 1) % L] * f


class Pad:
    """Warm detuned pad / soft 'oo' choir (wavetable voices, slow movement)."""

    def __init__(self, bright=1800, attack=2.0, release=3.0, voices=((-7, -0.7), (0, 0.0), (7, 0.7)),
                 choir=False, vowel='oo'):
        self.bright, self.attack, self.release, self.voices = bright, attack, release, voices
        self.choir, self.vowel = choir, vowel

    def table(self, f, rng):
        L = 4096
        ph = np.arange(L) / L
        nh = int(max(1, min(40, 7000 / f)))
        form = {'oo': [(320, 110, 1.0), (850, 150, 0.3), (2300, 300, 0.05)],
                'ah': [(700, 140, 1.0), (1200, 170, 0.45), (2600, 300, 0.1)]}[self.vowel]
        tab = np.zeros(L)
        for k in range(1, nh + 1):
            fk = f * k
            if self.choir:
                a = sum(g * np.exp(-((fk - F) / bw) ** 2) for F, bw, g in form) + 0.03 / k
            else:
                a = (1.0 / k) * np.exp(-fk / self.bright)
            tab += a * np.sin(2 * np.pi * k * ph + rng.uniform(0, 2 * np.pi))
        return tab / (np.abs(tab).max() + 1e-9)

    def render(self, m, dur, vel, rng, o):
        f0 = hz(m)
        att = o.get('attack', self.attack)
        rel = o.get('release', self.release)
        n = int((dur + rel) * SR)
        t = np.arange(n) / SR
        out = np.zeros((n, 2), np.float64)
        tab = self.table(f0, rng)
        for det, pan in self.voices:
            f = f0 * 2 ** ((det + rng.normal(0, 1.5)) / 1200)
            if self.choir:
                fv = rng.uniform(4.6, 5.4)
                depth = 0.005 * (0.5 + 0.5 * raised_cos(n) if n > 1 else 1)
                freq = f * (1 + depth * np.sin(2 * np.pi * fv * t + rng.uniform(0, 6)))
            else:
                freq = f * (1 + 0.0007 * np.sin(2 * np.pi * rng.uniform(0.15, 0.35) * t + rng.uniform(0, 6)))
            y = wt_osc(tab, freq, rng.uniform())
            y *= 1 + 0.12 * np.sin(2 * np.pi * rng.uniform(0.07, 0.2) * t + rng.uniform(0, 6))
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            out[:, 0] += y * l
            out[:, 1] += y * r
        env = np.ones(n)
        na = min(n, int(att * SR))
        env[:na] = raised_cos(na)
        nd = int(dur * SR)
        if nd < n:
            env[nd:] *= raised_cos(n - nd)[::-1]
        sc = shape_curve(o.get('shape'), min(n, nd))
        if sc is not None:
            env[:len(sc)] *= sc
            env[len(sc):] *= sc[-1]
        out *= env[:, None]
        out = lowpass(out, o.get('lp', 5000))
        return (out / len(self.voices) ** 0.5 * 0.5 * vel ** 1.3).astype(np.float32)


class Air:
    """Breathy, pitched noise (filtered at the note's first harmonics)."""

    def __init__(self, attack=2.5, release=3.0, width=0.012, harmonics=4):
        self.attack, self.release, self.width, self.h = attack, release, width, harmonics

    def render(self, m, dur, vel, rng, o):
        f0 = hz(m)
        n = int((dur + self.release) * SR)
        nfft = 1 << int(np.ceil(np.log2(n)))
        fr = np.fft.rfftfreq(nfft, 1 / SR)
        out = np.zeros((n, 2), np.float32)
        mask = np.zeros_like(fr)
        for k in range(1, self.h + 1):
            mask += (1.0 / k ** 1.3) * np.exp(-((fr - f0 * k) / (f0 * k * self.width)) ** 2)
        for ch in range(2):
            X = np.fft.rfft(rng.normal(0, 1, nfft)) * mask
            out[:, ch] = np.fft.irfft(X, nfft)[:n]
        env = np.ones(n)
        na = min(n, int(o.get('attack', self.attack) * SR))
        env[:na] = raised_cos(na)
        nd = int(dur * SR)
        if nd < n:
            env[nd:] *= raised_cos(n - nd)[::-1]
        out *= env[:, None]
        out /= (np.abs(out).max() + 1e-9)
        return (out * 0.5 * vel ** 1.3).astype(np.float32)


def pan_mono(y, p):
    l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
    return np.stack([y * l, y * r], axis=1) * np.sqrt(2)


def place(y, p, width=1.0):
    if y.shape[1] == 1:
        return pan_mono(y[:, 0], p)
    mid = 0.5 * (y[:, 0] + y[:, 1])
    side = 0.5 * (y[:, 0] - y[:, 1]) * width
    l, r = mid + side, mid - side
    gl, gr = min(1.0, 1 - p), min(1.0, 1 + p)
    return np.stack([l * gl, r * gr], axis=1)


def build_instruments(sdir):
    T = os.path.join(sdir, 'tonejs')
    piano = Sampled('piano', os.path.join(sdir, 'salamander'), release=0.18, max_len=14.0,
                    vel_gamma=1.6, lp_lo=1300, lp_hi=14000)
    violin = Sampled('violin', os.path.join(T, 'violin'), sustain=True, attack=0.12, release=0.35,
                     legato_attack=0.09, vel_gamma=1.3, lp_lo=2200, lp_hi=9000)
    cello = Sampled('cello', os.path.join(T, 'cello'), sustain=True, attack=0.1, release=0.35,
                    legato_attack=0.08, vel_gamma=1.3, lp_lo=1500, lp_hi=7000)
    cbass = Sampled('contrabass', os.path.join(T, 'contrabass'), sustain=True, attack=0.25, release=0.5,
                    vel_gamma=1.3, lp_lo=600, lp_hi=3000)
    flute = Sampled('flute', os.path.join(T, 'flute'), sustain=True, attack=0.05, release=0.18,
                    legato_attack=0.05, vel_gamma=1.25, lp_lo=2500, lp_hi=9000)
    horn = Sampled('horn', os.path.join(T, 'french-horn'), sustain=True, attack=0.14, release=0.4,
                   legato_attack=0.1, vel_gamma=1.3, lp_lo=900, lp_hi=4000)
    harp = Sampled('harp', os.path.join(T, 'harp'), release=0.6, max_len=7.0, vel_gamma=1.4,
                   lp_lo=1800, lp_hi=12000, attack=0.003)
    guitar = Sampled('guitar', os.path.join(T, 'guitar-nylon'), release=0.35, max_len=5.0,
                     vel_gamma=1.4, lp_lo=1600, lp_hi=9000, attack=0.003)
    strings = Ensemble(violin, cello, cbass, split=55, voices=3, attack=0.45, release=0.8)
    strings_lo = Ensemble(cello, cello, cbass, split=200, voices=3, attack=0.5, release=0.8)
    celesta = Bell([1, 2.0, 3.0, 5.4], [1, 0.22, 0.08, 0.05], [1, 0.45, 0.3, 0.12], base_decay=2.2,
                   click=0.03, lp=9000)
    musicbox = Bell([1, 2.0, 4.95, 9.9], [1, 0.25, 0.16, 0.05], [1, 0.5, 0.25, 0.08], base_decay=1.7,
                    click=0.06, detune_cents=3.0, lp=10000)
    return {
        'piano': piano, 'violin': violin, 'cello': cello, 'contrabass': cbass, 'flute': flute,
        'horn': horn, 'harp': harp, 'guitar': guitar, 'strings': strings, 'strings_lo': strings_lo,
        'celesta': celesta, 'musicbox': musicbox,
        'pad': Pad(bright=1400, attack=2.5, release=3.5),
        'choir': Pad(choir=True, attack=1.8, release=3.0, vowel='oo',
                     voices=((-9, -0.8), (-3, -0.3), (4, 0.3), (10, 0.8))),
        'air': Air(),
    }


# ======================================================================= reverb

def hall_ir(rt=3.0, predelay=0.02, seed=7, damp=(1.25, 1.0, 0.72, 0.45)):
    rng = np.random.default_rng(seed)
    n = int(rt * 1.25 * SR)
    t = np.arange(n) / SR
    bands = [(None, 400), (400, 1800), (1800, 6000), (6000, None)]
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.normal(0, 1, n)
        acc = np.zeros(n)
        for (lo, hi), mult in zip(bands, damp):
            if lo is None:
                sos = signal.butter(3, hi, 'low', fs=SR, output='sos')
            elif hi is None:
                sos = signal.butter(3, lo, 'high', fs=SR, output='sos')
            else:
                sos = signal.butter(3, [lo, hi], 'band', fs=SR, output='sos')
            acc += signal.sosfilt(sos, noise) * 10 ** (-3 * t / (rt * mult))
        # diffuse build-up
        nb = int(0.06 * SR)
        acc[:nb] *= raised_cos(nb) ** 0.7
        # sparse early reflections
        for _ in range(14):
            d = int(rng.uniform(0.004, 0.07) * SR)
            acc[d] += rng.choice([-1, 1]) * rng.uniform(0.6, 2.2) * np.exp(-d / (0.05 * SR))
        ir[:, ch] = acc
    ir = lowpass(ir, 9000)
    ir /= np.sqrt((ir ** 2).sum(axis=0).mean())
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros((pd, 2)), ir])
    nf = int(0.3 * SR)
    ir[-nf:] *= raised_cos(nf)[::-1, None]
    return ir.astype(np.float32)


def reverb(x, ir):
    out = np.zeros((len(x) + len(ir) - 1, 2), np.float32)
    for ch in range(2):
        out[:, ch] = signal.oaconvolve(x[:, ch], ir[:, ch])
    # small cross-feed for a wider, more even field
    l, r = out[:, 0].copy(), out[:, 1].copy()
    out[:, 0] = l + 0.25 * r
    out[:, 1] = r + 0.25 * l
    return out


# ======================================================================= mastering

def high_shelf(x, fc, gain_db):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * fc / SR
    alpha = np.sin(w0) / 2 * np.sqrt(2)
    cw = np.cos(w0)
    b0 = A * ((A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * alpha)
    b1 = -2 * A * ((A - 1) + (A + 1) * cw)
    b2 = A * ((A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * alpha)
    a0 = (A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * alpha
    a1 = 2 * ((A - 1) - (A + 1) * cw)
    a2 = (A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * alpha
    return signal.lfilter([b0 / a0, b1 / a0, b2 / a0], [1, a1 / a0, a2 / a0], x, axis=0)


def compress(x, thr_db, ratio=1.8, knee=8.0, tau_env=0.08, tau_gain=0.3):
    p = (x.astype(np.float64) ** 2).mean(axis=1)
    a = 1 - np.exp(-1 / (tau_env * SR))
    env = signal.lfilter([a], [1, -(1 - a)], p)
    lvl = 10 * np.log10(env + 1e-12)
    over = lvl - thr_db
    s = 1 / ratio - 1
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, s * over, s * (over + knee / 2) ** 2 / (2 * knee)))
    a2 = 1 - np.exp(-1 / (tau_gain * SR))
    gr = signal.filtfilt([a2], [1, -(1 - a2)], gr)
    return (x * 10 ** (gr / 20)[:, None]).astype(np.float32), gr


def _os_peak(x, chunk=SR * 10, pad=256):
    """Per-sample 4x-oversampled peak, computed in chunks to bound memory."""
    out = np.zeros(len(x), np.float32)
    for a in range(0, len(x), chunk):
        lo, hi = max(0, a - pad), min(len(x), a + chunk + pad)
        up = signal.resample_poly(x[lo:hi].astype(np.float64), 4, 1, axis=0)
        pk = np.abs(up).max(axis=1).reshape(-1, 4).max(axis=1)
        out[a:min(len(x), a + chunk)] = pk[a - lo:a - lo + min(chunk, len(x) - a)]
    return out


def true_peak(x):
    return 20 * np.log10(_os_peak(x).max() + 1e-12)


def limit(x, ceiling_db=-2.0):
    pk = _os_peak(x)
    ceil = 10 ** (ceiling_db / 20)
    g = np.minimum(1.0, ceil / (pk + 1e-12))
    L = int(0.006 * SR)
    g = minimum_filter1d(g, 2 * L + 1)
    g = uniform_filter1d(g, L)
    g = minimum_filter1d(g, 3)
    return (x * g[:, None]).astype(np.float32), 20 * np.log10(g.min())


def loudness(x):
    import pyloudnorm as pyln
    return pyln.Meter(SR).integrated_loudness(x.astype(np.float64))


def master(x, target=-20.0, tp_ceiling=-2.0, shelf_db=-2.5, loop=False):
    x = highpass(x, 38, order=2)
    x = high_shelf(x, 7000, shelf_db)
    x = x - x.mean(axis=0)
    g = 10 ** ((target - loudness(x)) / 20)
    x = x * g
    x, gr = compress(x, thr_db=target - 3, ratio=1.8)
    info = {'comp_max_gr_db': float(gr.min())}
    lim = 0.0
    for _ in range(4):
        x = x * 10 ** ((target - loudness(x)) / 20)
        tp = true_peak(x)
        if tp <= tp_ceiling + 0.05:
            break
        x, l = limit(x, tp_ceiling - 0.2)
        lim = min(lim, l)
    info['limiter_max_gr_db'] = float(lim)
    if not loop:
        n = int(0.004 * SR)
        x[:n] *= raised_cos(n)[:, None]
    return x.astype(np.float32), info


def trim_tail(x, floor_db=-72, keep=0.4, fade=1.2):
    a = np.abs(x).max(axis=1)
    idx = np.nonzero(a > 10 ** (floor_db / 20))[0]
    end = min(len(x), (idx[-1] if len(idx) else len(x)) + int(keep * SR))
    x = x[:end].copy()
    nf = min(len(x), int(fade * SR))
    x[-nf:] *= raised_cos(nf)[::-1, None]
    return x


# ======================================================================= render a cue

def active_rms(x, frame=0.1, rel_db=40):
    n = int(frame * SR)
    k = len(x) // n
    p = (x[:k * n] ** 2).mean(axis=1).reshape(k, n).mean(axis=1)
    if p.max() <= 0:
        return -120.0
    act = p[p > p.max() * 10 ** (-rel_db / 10)]
    return 10 * np.log10(act.mean())


class TempoMap:
    def __init__(self, points, end_beat):
        pts = sorted(points)
        self.grid = np.arange(0, end_beat + 64, 1 / 32)
        bpm = np.interp(self.grid, [p[0] for p in pts], [p[1] for p in pts])
        sec = np.concatenate([[0], np.cumsum(60.0 / bpm[:-1] / 32)])
        self.sec = sec

    def __call__(self, b):
        return float(np.interp(b, self.grid, self.sec))


def render_cue(cue, inst, verbose=True):
    rng = np.random.default_rng(cue.seed)
    tm = TempoMap(cue.tempo, cue.end)
    lead = 0.0 if cue.loop else 0.25
    end_s = tm(cue.end) + lead
    N = int((end_s + cue.tail + 12) * SR)
    dry = np.zeros((N, 2), np.float32)
    wet = np.zeros((N, 2), np.float32)
    stats = []
    for tr in cue.tracks:
        ins = inst[tr.inst]
        buf = np.zeros((N, 2), np.float32)
        mono = np.zeros(N, np.float32)
        notes = sorted(tr.notes, key=lambda n: (n.t, n.m))
        last_t, k = None, 0
        for n in notes:
            if last_t is not None and abs(n.t - last_t) < 1e-6:
                k += 1
            else:
                k = 0
            last_t = n.t
            dyn = np.interp(n.t, [p[0] for p in tr.dyn], [p[1] for p in tr.dyn]) if tr.dyn else 1.0
            t0 = tm(n.t) + float(np.clip(rng.normal(0, tr.tj), -0.02, 0.02)) + k * tr.roll + n.o.get('delay', 0.0)
            t1 = tm(n.t + n.d)
            t0 = max(t0, 0.0) + lead
            t1 += lead
            v = float(np.clip(n.v * dyn * (1 + rng.normal(0, tr.vj)), 0.03, 1.0))
            dur = max(0.05, t1 - t0 + n.o.get('extra', 0.0))
            o = dict(tr.opts)
            o.update(n.o)
            y = ins.render(n.m, dur, v, rng, o)
            i0 = int(t0 * SR)
            m = min(len(y), N - i0)
            if m <= 0:
                continue
            if y.shape[1] == 1 and 'pan' in n.o:
                y = pan_mono(y[:, 0], n.o['pan'])
            if y.shape[1] == 1:
                mono[i0:i0 + m] += y[:m, 0]
            else:
                buf[i0:i0 + m] += y[:m]
        buf = place(buf, tr.pan, tr.width) + pan_mono(mono, tr.pan)
        if tr.lp:
            buf = lowpass(buf, tr.lp).astype(np.float32)
        if tr.hp:
            buf = highpass(buf, tr.hp).astype(np.float32)
        g = 10 ** (tr.gain / 20)
        if tr.level is not None:
            g *= 10 ** ((tr.level - active_rms(buf)) / 20)
        buf *= g
        dry += buf * tr.dry
        wet += buf * tr.rev
        rms = active_rms(buf)
        stats.append((tr.name, tr.inst, len(tr.notes), rms))
    ir = hall_ir(cue.rt, seed=cue.seed + 1)
    w = reverb(wet, ir)[:N]
    mix = dry + w[:N] * cue.wet_gain
    loop_len = int(end_s * SR) if cue.loop else None
    if cue.loop:
        body = mix[:loop_len].copy()
        tail = mix[loop_len:]
        nt = min(len(tail), loop_len)
        body[:nt] += tail[:nt]
        mix = body
    else:
        mix = mix[:int((end_s + cue.tail) * SR)]
    if verbose:
        for s in stats:
            print(f'    {s[0]:14s} {s[1]:11s} notes={s[2]:4d} rms={s[3]:6.1f} dB')
    return mix, end_s
