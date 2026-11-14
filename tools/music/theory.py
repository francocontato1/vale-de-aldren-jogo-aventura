"""Small music-theory / notation helpers used by cues.py.

Notation
--------
Melody strings:   "A4:.5 D5:.5 E5 F#5:2 | E5 B4:3"
    NOTE[:beats][@velmult]   default 1 beat; '|' is a visual bar line (ignored)
    r:beats                  rest
    D5+F#5:2                 simultaneous notes
Progressions:     "Dadd9:4 | Gmaj7:4 | Gmaj9:2 Asus4:2"
"""
import itertools
import re

PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    """'C4' -> 60, 'F#5' / 'Fs5' / 'Bb3' supported."""
    if isinstance(name, (int, float)):
        return name
    m = re.fullmatch(r'([A-G])(#|s|b)?(-?\d)', name.strip())
    if not m:
        raise ValueError(f'bad note {name!r}')
    pc = PC[m.group(1)] + {'#': 1, 's': 1, 'b': -1, None: 0}[m.group(2)]
    return pc + 12 * (int(m.group(3)) + 1)


class N:
    """A note event, times in beats."""
    __slots__ = ('t', 'm', 'd', 'v', 'o')

    def __init__(self, t, m, d, v=0.6, **o):
        self.t, self.m, self.d, self.v, self.o = float(t), m, float(d), float(v), o

    def copy(self, **kw):
        n = N(self.t, self.m, self.d, self.v, **dict(self.o))
        for k, val in kw.items():
            if k in ('t', 'm', 'd', 'v'):
                setattr(n, k, val)
            else:
                n.o[k] = val
        return n

    @property
    def end(self):
        return self.t + self.d

    def __repr__(self):
        return f'N({self.t:.2f},{self.m},{self.d:.2f},{self.v:.2f})'


def seq(s, start=0.0, vel=0.6, tr=0, **opts):
    """Parse a melody string into notes starting at beat `start`."""
    out, t = [], float(start)
    for tok in s.replace('|', ' ').split():
        velm = 1.0
        if '@' in tok:
            tok, vm = tok.split('@')
            velm = float(vm)
        if ':' in tok:
            name, d = tok.split(':')
            d = float(d)
        else:
            name, d = tok, 1.0
        if name != 'r':
            for nn in name.split('+'):
                out.append(N(t, midi(nn) + tr, d, vel * velm, **opts))
        t += d
    return out


def seq_len(s):
    t = 0.0
    for tok in s.replace('|', ' ').split():
        tok = tok.split('@')[0]
        t += float(tok.split(':')[1]) if ':' in tok else 1.0
    return t


QUAL = [
    ('maj7#11', [0, 4, 7, 11, 18]), ('maj9', [0, 4, 7, 11, 14]), ('maj7', [0, 4, 7, 11]),
    ('m7b5', [0, 3, 6, 10]), ('madd9', [0, 3, 7, 14]), ('m11', [0, 3, 7, 10, 14, 17]),
    ('m9', [0, 3, 7, 10, 14]), ('m7', [0, 3, 7, 10]), ('m6', [0, 3, 7, 9]),
    ('7sus4', [0, 5, 7, 10]), ('sus4', [0, 5, 7]), ('sus2', [0, 2, 7]),
    ('add9', [0, 4, 7, 14]), ('69', [0, 4, 7, 9, 14]), ('9', [0, 4, 7, 10, 14]),
    ('7', [0, 4, 7, 10]), ('6', [0, 4, 7, 9]), ('dim', [0, 3, 6]), ('5', [0, 7]),
    ('m', [0, 3, 7]), ('', [0, 4, 7]),
]


def chord(sym):
    """Return (root_pc, intervals, bass_pc)."""
    m = re.fullmatch(r'([A-G])(#|b)?([^/]*)(?:/([A-G])(#|b)?)?', sym)
    if not m:
        raise ValueError(sym)
    root = (PC[m.group(1)] + {'#': 1, 'b': -1, None: 0}[m.group(2)]) % 12
    q = m.group(3)
    for name, ivs in QUAL:
        if q == name:
            break
    else:
        raise ValueError(f'unknown quality {q!r} in {sym}')
    bass = root
    if m.group(4):
        bass = (PC[m.group(4)] + {'#': 1, 'b': -1, None: 0}[m.group(5)]) % 12
    return root, ivs, bass


def pcs(sym):
    r, ivs, b = chord(sym)
    out = []
    for iv in ivs:
        p = (r + iv) % 12
        if p not in out:
            out.append(p)
    return out


def prog(s, start=0.0):
    """'Dadd9:4 Gmaj7:4' -> [(start, dur, sym), ...]"""
    out, t = [], float(start)
    for tok in s.replace('|', ' ').split():
        sym, d = tok.rsplit(':', 1)
        out.append((t, float(d), sym))
        t += float(d)
    return out


def prog_len(p):
    return p[-1][0] + p[-1][1] - p[0][0] if p else 0.0


def in_range(pc, lo, hi):
    return [m for m in range(lo, hi + 1) if m % 12 == pc]


def bass_of(sym, lo=36, hi=50):
    r, ivs, b = chord(sym)
    return in_range(b, lo, hi)[0]


def voice(sym, lo, hi, prev=None, n=None, drop_root=False):
    """Choose a smooth, uncluttered voicing of `sym` inside [lo, hi]."""
    r, ivs, b = chord(sym)
    tones = pcs(sym)
    if drop_root and len(tones) > 3:
        tones = [p for p in tones if p != r]
    if n is not None:
        fifth = (r + 7) % 12
        while len(tones) > n:
            if fifth in tones and len(tones) > 3:
                tones.remove(fifth)
            elif r in tones:
                tones.remove(r)
            else:
                tones.pop()
    cands = [in_range(p, lo, hi)[:4] for p in tones]
    cands = [c for c in cands if c]
    best, bcost = None, 1e9
    centre = (lo + hi) / 2
    for combo in itertools.product(*cands):
        v = sorted(combo)
        if len(set(v)) < len(v):
            continue
        cost = 0.0
        gaps = [v[i + 1] - v[i] for i in range(len(v) - 1)]
        cost += sum(4 for g in gaps if g == 1) + sum(1.0 for g in gaps if g == 2) * 0.3
        span = v[-1] - v[0]
        cost += max(0, span - 17) * 0.8 + max(0, 7 - span) * 0.5
        cost += sum(max(0, g - 9) for g in gaps[1:]) * 0.6
        if prev:
            pv = sorted(prev)
            if len(pv) == len(v):
                cost += sum(abs(a - c) for a, c in zip(v, pv)) * 0.5
            else:
                cost += sum(min(abs(a - c) for c in pv) for a in v) * 0.5
        else:
            cost += abs(sum(v) / len(v) - centre) * 0.3
        if cost < bcost:
            best, bcost = v, cost
    return best


def arp_pool(sym, lo, hi, min_gap=3, bass=True):
    """Open spread of chord tones from the bass upwards."""
    r, ivs, b = chord(sym)
    tones = set(pcs(sym))
    out = []
    if bass:
        out.append(in_range(b, lo, lo + 11)[0])
    for m in range((out[-1] + 1) if out else lo, hi + 1):
        gap = max(min_gap, 7 if m < 50 else (5 if m < 55 else min_gap))
        if m % 12 in tones and (not out or m - out[-1] >= gap):
            # avoid doubling the 3rd low in the bass region
            out.append(m)
    return out


# ---------------------------------------------------------------- patterns

def arpeggio(p, lo, hi, pattern, step=0.5, vel=0.4, accent=1.15, dur=None,
             min_gap=3, rotate_bars=None, **opts):
    """Broken chords: pattern = indices into the arp pool, one per `step`."""
    out = []
    for (t0, d, sym) in p:
        pool = arp_pool(sym, lo, hi, min_gap)
        k = 0
        t = t0
        while t < t0 + d - 1e-6:
            idx = pattern[k % len(pattern)]
            if idx is not None:
                m = pool[min(idx, len(pool) - 1)]
                v = vel * (accent if k == 0 else 1.0)
                nd = dur if dur is not None else (t0 + d - t)
                out.append(N(t, m, nd, v, **opts))
            k += 1
            t += step
    return out


def blocks(p, lo, hi, n=4, vel=0.4, legato=0.0, prev=None, bass=None, **opts):
    """Sustained chords with voice-leading (pads / strings)."""
    out = []
    for (t0, d, sym) in p:
        v = voice(sym, lo, hi, prev, n)
        prev = v
        for m in v:
            out.append(N(t0, m, d + legato, vel, **opts))
        if bass:
            out.append(N(t0, bass_of(sym, *bass), d + legato, vel, **opts))
    return out


def basses(p, lo=36, hi=50, vel=0.5, frac=1.0, legato=0.0, **opts):
    return [N(t0, bass_of(sym, lo, hi), d * frac + legato, vel, **opts) for (t0, d, sym) in p]


def roll(sym, t, lo, hi, spacing=0.08, vel=0.4, dur=4.0, min_gap=3, down=False, **opts):
    pool = arp_pool(sym, lo, hi, min_gap)
    if down:
        pool = pool[::-1]
    return [N(t + i * spacing, m, dur, vel, **opts) for i, m in enumerate(pool)]


def scale_notes(pcs_list, lo, hi):
    return [m for m in range(lo, hi + 1) if m % 12 in pcs_list]


def gliss(pcs_list, t, lo, hi, length, vel=0.35, dur=3.0, down=False, **opts):
    ns = scale_notes(pcs_list, lo, hi)
    if down:
        ns = ns[::-1]
    dt = length / max(1, len(ns) - 1)
    out = []
    for i, m in enumerate(ns):
        x = i / max(1, len(ns) - 1)
        v = vel * (0.7 + 0.5 * x if not down else 1.1 - 0.5 * x)
        out.append(N(t + i * dt, m, dur, v, **opts))
    return out


def waltz(p, bass_lo=40, bass_hi=52, lo=55, hi=71, vel=0.35, n=3, **opts):
    """Oom-pah-pah: bass on 1, chord on 2 and 3 (per 3-beat bar)."""
    out, prev = [], None
    for (t0, d, sym) in p:
        v = voice(sym, lo, hi, prev, n)
        prev = v
        bars = int(round(d / 3))
        for b in range(bars):
            tb = t0 + 3 * b
            bm = bass_of(sym, bass_lo, bass_hi)
            if b % 2 == 1:  # alternate bass to the fifth
                r, ivs, bb = chord(sym)
                f = in_range((r + 7) % 12, bass_lo, bass_hi + 7)
                bm = f[0] if f else bm
            out.append(N(tb, bm, 2.9, vel * 1.15, **opts))
            for beat in (1, 2):
                for m in v:
                    out.append(N(tb + beat, m, 0.9, vel * (0.85 if beat == 1 else 0.75), **opts))
    return out


def pedal(notes, changes, hold_melody=None):
    """Sustain-pedal: a note rings until the next pedal change after its onset.
    `changes` = sorted beat positions where the pedal is re-taken."""
    ch = sorted(changes)
    out = []
    for n in notes:
        nxt = next((c for c in ch if c > n.t + 1e-6), None)
        nn = n.copy()
        if nxt is not None:
            target = nxt + 0.04
            if hold_melody is not None:
                target = min(target, n.end + hold_melody)
            nn.d = max(n.d, target - n.t)
        out.append(nn)
    return out


def changes_of(p):
    return [t for (t, d, s) in p] + [p[-1][0] + p[-1][1]]


def shift(notes, dt=0.0, tr=0, vm=1.0):
    return [n.copy(t=n.t + dt, m=n.m + tr, v=n.v * vm) for n in notes]


def transpose_prog(p, semis):
    names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    out = []
    for (t, d, sym) in p:
        m = re.fullmatch(r'([A-G])(#|b)?([^/]*)(?:/([A-G])(#|b)?)?', sym)
        r = (PC[m.group(1)] + {'#': 1, 'b': -1, None: 0}[m.group(2)] + semis) % 12
        s = names[r] + m.group(3)
        if m.group(4):
            b = (PC[m.group(4)] + {'#': 1, 'b': -1, None: 0}[m.group(5)] + semis) % 12
            s += '/' + names[b]
        out.append((t, d, s))
    return out


def shift_prog(p, dt):
    return [(t + dt, d, s) for (t, d, s) in p]
