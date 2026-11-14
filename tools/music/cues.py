"""Original score for 'Ecos de Aldren' - every note below was written for this game.

Main motif ("Aldren motif"), scale degrees 5-1-2-3 . 2-6 :
    D major:  A4 D5 E5 F#5 | E5 B4     (rhythm  1/2 1/2 1 2 | 1 3)
It opens `title`, returns in `morning` (G), `dusk` (F), `night` (E lydian),
`ruins` (D dorian, distant horn), `memory` (Eb lydian, celesta), `discover`
(celesta), `village_night` (G lullaby) and in full in `finale` (D -> E).
"""
import numpy as np

from theory import (N, seq, prog, arpeggio, blocks, basses, roll, gliss, waltz, pedal,
                    changes_of, shift, transpose_prog, shift_prog, pcs, arp_pool, voice, midi)


class Track:
    def __init__(self, name, inst, notes, gain=0.0, pan=0.0, rev=0.35, dry=1.0, width=1.0,
                 lp=None, hp=None, tj=0.008, vj=0.05, roll=0.0, dyn=None, level=None, **opts):
        self.name, self.inst, self.notes = name, inst, list(notes)
        self.gain, self.pan, self.rev, self.dry, self.width = gain, pan, rev, dry, width
        self.lp, self.hp, self.tj, self.vj, self.roll = lp, hp, tj, vj, roll
        self.dyn, self.level, self.opts = dyn, level, opts


MEL_TRACKS = {'flute', 'violin', 'violins', 'celesta', 'cello', 'guitar_mel', 'musicbox', 'horn', 'piano_rh'}
ACC_TRACKS = {'strings', 'pad', 'harp', 'low', 'guitar', 'choir', 'piano_lh', 'air'}


def avoid_clashes(tracks, min_len=0.99, overlap=0.25):
    """Re-voice accompaniment notes that rub a minor 2nd/9th against a sustained melody note:
    below the melody -> down a whole step (e.g. maj7 -> 6th); above -> down an octave."""
    mel = [n for t in tracks if t.name in MEL_TRACKS for n in t.notes if n.d >= min_len]
    mel.sort(key=lambda n: n.t)
    starts = np.array([n.t for n in mel]) if mel else np.zeros(0)
    fixed = 0
    for tr in tracks:
        if tr.name not in ACC_TRACKS:
            continue
        for a in tr.notes:
            for _ in range(2):
                hit = None
                i1 = np.searchsorted(starts, a.t + a.d)
                for n in mel[:i1]:
                    if n.end - a.t < overlap or min(n.end, a.t + a.d) - max(n.t, a.t) < overlap:
                        continue
                    hi_, lo_ = max(n.m, a.m), min(n.m, a.m)
                    if (hi_ - lo_) % 12 == 1 and hi_ - lo_ < 26:
                        hit = n
                        break
                if hit is None:
                    break
                a.m = a.m - 2 if a.m < hit.m else a.m - 12
                fixed += 1
    return fixed


class Cue:
    def __init__(self, name, tempo, end, tracks, rt=3.0, tail=7.0, loop=False, seed=1,
                 wet_gain=1.0, mood='', use=''):
        self.name, self.tempo, self.end, self.tracks = name, tempo, end, tracks
        self.rt, self.tail, self.loop, self.seed, self.wet_gain = rt, tail, loop, seed, wet_gain
        self.mood, self.use = mood, use
        self.revoiced = avoid_clashes(tracks)


# ----------------------------------------------------------------- shared material (D major)
TA_PROG = "Dadd9:4 | Gmaj7:4 | Bm7:4 | Gmaj9:2 Asus4:2 | D/F#:4 | Gmaj7:4 | Em7:2 A7sus4:2 | Dadd9:4"
TA_MEL = ("A4:.5 D5:.5 E5 F#5:2 | E5 B4:3 | A4:.5 D5:.5 E5 F#5 A5 | G5:1.5 F#5:.5 E5:2 | "
          "F#5:1.5 E5:.5 D5 A4 | B4 D5 E5:2 | F#5:1.5 G5:.5 A5 E5 | D5:4")
TB_PROG = "Bm9:4 | Gmaj7:4 | Em9:4 | Asus4:2 A:2 | Bm7:4 | Gmaj7#11:4 | Em7:2 A7sus4:2 | A:2 A7:2"
TB_MEL = ("F#5 E5:.5 D5:.5 C#5 D5 | B4:3 D5 | E5 F#5:.5 G5:.5 F#5 E5 | D5:2 C#5:2 | "
          "B4:.5 C#5:.5 D5 F#5:2 | A5:1.5 G5:.5 F#5 E5 | G5 F#5 E5:1.5 D5:.5 | C#5:3 r:1")
HORN_A = "F#4:4 | G4:2 F#4:2 | F#4:4 | D4:2 E4:2 | F#4:2 A4:2 | G4:4 | G4:2 E4:2 | F#4:4"
HORN_B = "F#4:4 | G4:2 D4:2 | G4:2 B4:2 | A4:2 E4:2 | F#4:4 | G4:2 F#4:2 | G4:2 G4:2 | A4:4"

ARP8 = [0, 1, 2, 3, 4, 3, 2, 1]
ARP8B = [0, 2, 1, 3, 2, 4, 3, 1]


def P(s, start=0.0):
    return prog(s, start)


def piano_part(p, lo, hi, pattern, step=0.5, vel=0.3, hold=None):
    return pedal(arpeggio(p, lo, hi, pattern, step, vel), changes_of(p), hold)


def melody_pedal(notes, p, hold=0.6):
    return pedal(notes, changes_of(p), hold)


def stars(rng, p, t0, t1, every=(3, 7), lo=84, hi=100, vel=(0.12, 0.28), twinkle=0.25):
    """Seeded celesta 'stars': chord-aware isolated high notes."""
    out, t = [], t0 + rng.uniform(*every) * 0.5
    while t < t1:
        sym = next((s for (a, d, s) in p if a <= t < a + d), p[-1][2])
        cand = [m for m in range(lo, hi + 1) if m % 12 in pcs(sym)]
        m = int(rng.choice(cand))
        v = rng.uniform(*vel)
        pan = float(rng.uniform(-0.75, 0.75))
        out.append(N(t, m, 2.0, v, pan=pan))
        if rng.uniform() < twinkle:
            m2 = int(rng.choice([c for c in cand if c != m] or cand))
            out.append(N(t + 0.25, m2, 2.0, v * 0.7, pan=-pan * 0.5))
        t += rng.uniform(*every)
    return out


# =================================================================== 1. TITLE
def title():
    A = P(TA_PROG, 0)
    B = P(TB_PROG, 32)
    A2 = P("Dadd9:4 | Gmaj7:4 | Bm7:4 | Gmaj9:2 Asus4:2 | D/F#:4 | Gmaj7:4 | Em7:2 A7sus4:2 | Gmaj7#11:4", 64)
    CODA = P("Dmaj7#11:4 | Dadd9:8", 96)
    mel_a2 = ("A4:.5 D5:.5 E5 F#5:2 | E5 B4:3 | A4:.5 D5:.5 E5 F#5 A5 | G5:1.5 F#5:.5 E5:2 | "
              "F#5:1.5 E5:.5 D5 A4 | B4 D5 E5:2 | F#5:1.5 G5:.5 A5 B5 | A5:2 F#5:2")
    piano = (melody_pedal(seq(TA_MEL, 0, 0.52), A, 0.5)
             + piano_part(A, 38, 69, ARP8, vel=0.3)
             + [n for (t, d, s) in B for n in roll(s, t, 43, 67, 0.06, 0.2, d + 0.1)]
             + piano_part(A2, 38, 72, ARP8B, vel=0.27)
             + melody_pedal(seq("r:4 A5:.5 D6:.5 E6 F#6:2 | r:4", 96, 0.32), CODA, 2)
             + roll('Dadd9', 100, 38, 66, 0.1, 0.25, 8.5))
    flute = seq(TB_MEL, 32, 0.55, legato=True) + seq(mel_a2, 64, 0.6, legato=True) \
        + seq("E5 F#5 G#5:2 | A5:6", 96, 0.45, legato=True)
    violins = seq(mel_a2, 64, 0.42, legato=True, attack=0.18)
    harp = (arpeggio(B, 38, 81, [0, 1, 2, 3, 4, 5, 4, 3], 0.5, 0.3)
            + [n for (t, d, s) in A2 for n in roll(s, t, 43, 84, 0.05, 0.28, 4.0)]
            + roll('Dmaj7#11', 96, 50, 86, 0.11, 0.25, 4.0) + roll('Dadd9', 100.2, 38, 90, 0.13, 0.22, 7.0))
    pad = (blocks(B, 50, 74, 4, 0.36, shape='swell') + blocks(A2, 50, 76, 4, 0.42, shape='swell')
           + blocks(CODA, 50, 76, 4, 0.33, shape='dim'))
    low = basses(B + A2, 36, 50, 0.38) + [N(96, midi('D2'), 12, 0.35, shape='dim')]
    horn = seq(HORN_A, 64, 0.38, legato=True)
    cel = [N(101, midi('F#6'), 2, 0.22), N(103, midi('A6'), 2, 0.18), N(104.5, midi('E6'), 2, 0.15)]
    tracks = [
        Track('piano', 'piano', piano, level=-19, pan=0.0, width=0.75, rev=0.32,
              dyn=[(0, 1.0), (32, 1.0), (64, 0.95), (96, 0.9)]),
        Track('flute', 'flute', flute, level=-18, pan=0.22, rev=0.42,
              dyn=[(32, 0.9), (56, 1.0), (64, 0.98), (84, 1.1), (96, 0.85), (108, 0.7)]),
        Track('violins', 'strings', violins, level=-22, pan=-0.3, rev=0.5,
              dyn=[(64, 0.9), (84, 1.1), (96, 0.9)]),
        Track('harp', 'harp', harp, level=-24, pan=-0.45, rev=0.45, roll=0.0),
        Track('strings', 'strings', pad, level=-24, pan=0.0, width=1.0, rev=0.55),
        Track('low', 'strings_lo', low, level=-25, pan=0.15, rev=0.45),
        Track('horn', 'horn', horn, level=-26, pan=0.4, rev=0.75, dry=0.6, lp=2600),
        Track('celesta', 'celesta', cel, level=-28, pan=0.5, rev=0.6),
    ]
    return Cue('title', [(0, 62), (3, 72), (90, 72), (96, 64), (108, 50)], 108, tracks, rt=3.0, tail=7,
               seed=101, mood='nostalgic, hopeful; solo piano then flute over harp and strings',
               use='Main menu / title screen. Introduces the main motif. Play once, then silence.')


# =================================================================== 2. MORNING (G)
def morning():
    I = P("Gmaj9:4 | Cmaj7#11:4 | Gmaj9:4 | Cmaj7#11:4", 0)
    a_prog = "Gmaj9:4 | Cmaj7#11:4 | Em9:4 | Dsus4:2 D:2 | Gmaj9:4 | Cmaj7#11:4 | Am9:2 D7sus4:2 | G:4"
    A = P(a_prog, 16)
    B = P("Em7:4 | Cmaj7:4 | Am7:4 | D:4 | Bm7:4 | Cmaj7#11:4 | Am9:2 D7:2 | G:4", 48)
    IN = P("Em9:4 | Cmaj7#11:4 | G/B:4 | Dsus4:2 D:2", 80)
    A2 = P(a_prog, 96)
    C = P("Cmaj9:4 | Bm7:4 | Am9:4 | Gmaj7:4 | Cmaj7#11:4 | Bm7:4 | Am9:2 Dsus4:2 | Gmaj9:4", 128)
    O = P("Gmaj9:4 | Cmaj7#11:4 | Gmaj9:4 | Cmaj7#11:4 | Gadd9:8", 160)
    a_mel = ("D5:.5 G5:.5 A5 B5:2 | A5 E5:3 | r:.5 G5:.5 F#5:.5 G5:.5 B5 A5 | G5:2 F#5:2 | "
             "D5:.5 G5:.5 A5 B5:1.5 D6:.5 | C6 B5 A5 F#5 | E5:1.5 G5:.5 A5 C6 | B5:3 r:1")
    a2_mel = a_mel.replace("B5:3 r:1", "B5:2 A5 G5")
    b_mel = ("B5 A5:.5 G5:.5 E5:2 | G5 F#5:.5 E5:.5 D5:2 | C5 E5 A5:2 | F#5:3 r:1 | "
             "D6 B5:.5 A5:.5 F#5:2 | E5 F#5 G5 B5 | A5:2 G5 F#5 | G5:3 r:1")
    in_mel = "B4:.5 E5:.5 F#5 G5:2 | F#5 B4:3 | D5:.5 G5:.5 A5 B5:2 | A5:4"
    c_mel = ("E5:1.5 D5:.5 E5 G5 | F#5:2 D5:2 | C5 B4:.5 C5:.5 E5:2 | D5:3 r:1 | "
             "E5:1.5 F#5:.5 G5 B5 | A5:2 F#5:2 | E5 G5 A5 G5 | F#5:2 G5:2")
    c_flute = "G5:4 | A5:2 F#5:2 | E5:4 | D5:4 | G5:4 | F#5:4 | E5:2 D5:2 | D5:4"
    all_arps = I + A + B + A2 + O[:4]
    piano = (piano_part(I + A, 55, 79, ARP8, vel=0.27)
             + piano_part(B, 55, 77, ARP8B, vel=0.24)
             + piano_part(A2, 55, 79, ARP8B, vel=0.26)
             + piano_part(C, 50, 69, [0, 2, 1, 3, 2, 1, 2, 3], vel=0.2)
             + piano_part(O[:4], 55, 79, ARP8, vel=0.22)
             + pedal(basses(I + A + B + IN + A2 + C + O[:4], 36, 50, 0.3), changes_of(all_arps + IN + C))
             + [n for (t, d, s) in IN for n in roll(s, t, 43, 64, 0.07, 0.22, d)]
             + melody_pedal(seq(in_mel, 80, 0.45), IN, 0.6)
             + melody_pedal(seq(c_mel, 128, 0.46), C, 0.5)
             + melody_pedal(seq("r:2 D6:.5 G6:.5 A6 | B6:4", 168, 0.25), O, 2)
             + roll('Gadd9', 176, 31, 74, 0.1, 0.24, 9))
    flute = (seq(a_mel, 16, 0.55, legato=True) + seq(b_mel, 48, 0.55, legato=True)
             + seq(a2_mel, 96, 0.58, legato=True) + seq(c_flute, 128, 0.33, legato=True, shape='swell')
             + seq("D5:.5 G5:.5 A5 B5:2 | A5 E5:3", 160, 0.42, legato=True))
    strings = blocks(A2 + C, 55, 74, 4, 0.27, shape='swell') + blocks(O[:4], 55, 74, 4, 0.22, shape='dim')
    harp = [n for (t, d, s) in B for n in roll(s, t, 43, 79, 0.06, 0.22, 4.0)]
    tracks = [
        Track('piano', 'piano', piano, level=-20, width=0.7, rev=0.3, dyn=[(0, 0.85), (16, 1.0), (176, 0.9)]),
        Track('flute', 'flute', flute, level=-18, pan=0.25, rev=0.42),
        Track('strings', 'strings', strings, level=-26, pan=-0.2, rev=0.55),
        Track('harp', 'harp', harp, level=-26, pan=-0.5, rev=0.45),
    ]
    return Cue('morning', [(0, 70), (4, 76), (170, 76), (184, 58)], 184, tracks, rt=2.8, tail=7, seed=202,
               mood='light, airy, dawn in tall grass; flowing piano and flute (G major, lydian colour)',
               use='Exploration at dawn / early morning. Play once, then minutes of silence.')


# =================================================================== 3. AFTERNOON (waltz, A)
def afternoon():
    a_prog = ("Amaj7:3 A6:3 F#m7:3 F#m7:3 Dmaj7:3 E/D:3 C#m7:3 F#m7:3 "
              "Bm7:3 E7sus4:3 C#m7:3 F#m7:3 Dmaj7:3 E7sus4:3 E7:3 A:3")
    a_mel = ("E4 A4 B4 | C#5:2 B4 | F#4:3 | A4:2 G#4 | F#4 A4 C#5 | E5:2 D5 | C#5:2 B4 | A4:3 | "
             "B4 D5 F#5 | E5:2 D5 | C#5 E5 G#5 | F#5:2 E5 | D5 C#5 A4 | B4:2 A4 | G#4 B4 D5 | A4:3")
    b_prog = ("Dmaj7:3 Dmaj7:3 C#m7:3 F#m7:3 Bm7:3 E7:3 Amaj7:3 A7:3 "
              "Dmaj7:3 Dm6:3 C#m7:3 F#7:3 Bm7:3 E7sus4:3 E7:3 A:3")
    b_mel = ("A5:2 F#5 | E5:1.5 D5:.5 C#5 | E5:2 G#5 | A5:3 | F#5:2 D5 | E5:1.5 D5:.5 B4 | C#5:3 | E5 G5 A5 | "
             "F#5:2 A5 | A5:1.5 F5:.5 D5 | E5:3 | E5 C#5 A#4 | B4:2 D5 | E5:2 A5 | G#5:1.5 F#5:.5 E5 | E5:3")
    c_prog = ("F#m9:3 Dmaj7:3 Bm9:3 C#m7:3 F#m9:3 Dmaj7:3 Bm7:3 E7sus4:3 "
              "F#m9:3 Dmaj7:3 Bm9:3 C#m7:3 F#m9:3 Dmaj7:3 Bm7:3 E7:3")
    c_mel = ("A4 G#4 A4 | C#5:2 A4 | B4 C#5 D5 | E5:2 C#5 | A4 G#4 A4 | F#5:2 E5 | D5 C#5 B4 | A4:3 | "
             "A4 G#4 A4 | C#5:2 A4 | B4 C#5 D5 | E5:2 C#5 | A4 G#4 A4 | F#5:2 E5 | D5 E5 F#5 | G#4:3")
    flute_ctr = ("G#5:3 | A5:3 | A5:3 | A5:3 | A5:3 | G#5:3 | G#5:3 | A5:3 | "
                 "A5:3 | A5:3 | G#5:3 | A5:3 | F#5:3 | E5:3 | D5:3 | C#5:3")
    I = P("Amaj7:3 A6:3 Amaj7:3 A6:3", 0)
    A1, B1, A2, C1, A3 = P(a_prog, 12), P(b_prog, 60), P(a_prog, 108), P(c_prog, 156), P(a_prog, 204)
    O = P("Amaj7:3 A6:3 Dmaj7:3 Dm6:3 Amaj7:3 Dm6:3 A:6", 252)
    guitar = (waltz(I + A1 + B1, 40, 52, 55, 71, 0.33) + waltz(A3, 40, 52, 55, 71, 0.33)
              + waltz(O[:6], 40, 52, 55, 71, 0.3)
              + roll('A', 270, 40, 69, 0.05, 0.32, 6))
    guitar_mel = seq(c_mel, 156, 0.6)
    harp = (arpeggio(B1, 45, 81, [0, 2, 3, 4, 3, 2], 0.5, 0.2, dur=1.5)
            + waltz(A2, 40, 52, 57, 74, 0.27)
            + arpeggio(C1, 42, 74, [0, 2, 3, 4, 3, 2], 0.5, 0.24, dur=2.0)
            + arpeggio(A3, 57, 81, [0, 1, 2, 3, 2, 1], 0.5, 0.15, dur=1.0)
            + roll('Amaj7', 270.1, 45, 88, 0.08, 0.25, 6))
    violin = seq(a_mel, 12, 0.58, legato=True) + seq(a_mel, 108, 0.55, legato=True) \
        + seq(a_mel, 204, 0.62, legato=True)
    flute = (seq(b_mel, 60, 0.55, legato=True) + seq(flute_ctr, 108, 0.32, legato=True)
             + seq(a_mel, 204, 0.4, tr=12, legato=True)
             + seq("E5 A5 B5 | C#6:2 B5 | A5:3 | A5:1.5 F5:.5 D5 | E5:3 | F5:2 D5 | C#5:6", 252, 0.42, legato=True))
    pad = blocks(C1, 54, 71, 3, 0.25, shape='swell') + blocks(A3, 56, 73, 3, 0.22) + blocks(O, 56, 73, 3, 0.22, shape='dim')
    cello = [N(t, n.m, 2.6, 0.35) for n in basses(A3 + O[:6], 36, 48) for t in [n.t]]
    tracks = [
        Track('guitar', 'guitar', guitar, level=-22, pan=-0.25, rev=0.3, tj=0.01),
        Track('guitar_mel', 'guitar', guitar_mel, level=-18, pan=0.1, rev=0.35),
        Track('harp', 'harp', harp, level=-24, pan=0.45, rev=0.4),
        Track('violin', 'violin', violin, level=-18, pan=-0.1, rev=0.45,
              dyn=[(12, 0.95), (40, 1.05), (60, 1.0), (204, 1.05), (240, 1.1), (252, 1.0)]),
        Track('flute', 'flute', flute, level=-20, pan=0.3, rev=0.45),
        Track('strings', 'strings', pad, level=-27, pan=0.0, rev=0.5),
        Track('cello', 'strings_lo', cello, level=-27, pan=0.2, rev=0.4),
    ]
    return Cue('afternoon', [(0, 110), (12, 116), (258, 116), (276, 80)], 276, tracks, rt=2.6, tail=6,
               seed=303, mood='warm village waltz (3/4); nylon guitar & harp, violin and flute',
               use='Afternoon in or near the village. Play once, then silence.')


# =================================================================== 4. DUSK (F)
def dusk():
    I = P("Fmaj9:4 | Dbmaj7:4 | Fmaj9:4 | Bbm6/F:4", 0)
    a_prog = "Fmaj9:4 | Dm9:4 | Bbmaj7:4 | C7sus4:2 C7:2 | Am7:4 | Dm9:4 | Bbm6:4 | Fadd9:4"
    A, A2 = P(a_prog, 16), P(a_prog, 96)
    B = P("Dbmaj7:4 | Eb:4 | Fmaj9:4 | Dm7:4 | Gm9:4 | C7sus4:4 | Dbmaj7:2 Bbm6:2 | C7sus4:2 C7:2", 48)
    IN = P("Fmaj9:4 | Dbmaj7:4 | Fmaj9:4 | Eb/F:4", 80)
    O = P("Dbmaj7:4 | Bbm6:4 | Fmaj9:8", 128)
    a_mel = ("C5:.5 F5:.5 G5 A5:2 | G5 D5:3 | C5:.5 F5:.5 G5 A5 C6 | Bb5:1.5 A5:.5 G5:2 | "
             "A5:1.5 G5:.5 E5 C5 | D5 E5 F5:2 | G5:1.5 F5:.5 Db5:2 | C5:4")
    b_mel = ("F5:1.5 G5:.5 Ab5:2 | G5:3 F5:.5 Eb5:.5 | E5 G5 A5:2 | F5:2 D5:2 | "
             "Bb5:1.5 A5:.5 G5 F5 | G5:3 F5 | Ab5:2 G5 F5 | F5:2 E5:2")
    cello_ctr = "Ab3:4 | Bb3:2 G3:2 | A3:2 C4:2 | D4:2 A3:2 | Bb3:2 D4:2 | C4:2 Bb3:2 | Ab3:2 Db4:2 | C4:2 Bb3:2"
    piano = (melody_pedal(seq(a_mel, 16, 0.5), A, 0.6)
             + piano_part(A, 41, 67, [0, 1, 2, 3], step=1.0, vel=0.27)
             + piano_part(B, 41, 72, [0, 2, 3, 4, 3, 2, 1, 2], vel=0.21)
             + melody_pedal(seq("C5:.5 F5:.5 G5 A5:2 | G5 F5 C5:2 | r:2 A4 C5 | Bb4:2 G4:2", 80, 0.42), IN, 0.8)
             + [n for (t, d, s) in IN for n in roll(s, t, 41, 60, 0.08, 0.22, d)]
             + piano_part(A2, 41, 72, ARP8, vel=0.25)
             + melody_pedal(seq("C5:.5 F5:.5 G5 Ab5:2 | G5:2 F5 Db5 | C5:4 | r:2 A5:2", 128, 0.38), O, 1.5)
             + [n for (t, d, s) in O for n in roll(s, t, 29, 60, 0.1, 0.24, d)])
    strings = (blocks(I, 48, 72, 4, 0.36, shape='swell') + blocks(A, 50, 70, 4, 0.24)
               + blocks(B, 50, 72, 4, 0.3, shape='swell') + blocks(A2, 50, 74, 4, 0.38, shape='swell')
               + blocks(O, 50, 72, 4, 0.3, shape='dim'))
    low = basses(I + B + A2, 36, 48, 0.32) + [N(128, midi('Db2'), 4, 0.3), N(132, midi('Bb1'), 4, 0.3),
                                               N(136, midi('F2'), 8, 0.28, shape='dim')]
    violins = seq(b_mel, 48, 0.5, legato=True, attack=0.2) + seq(a_mel, 96, 0.52, legato=True, attack=0.2)
    cello = seq(cello_ctr, 48, 0.45, legato=True)
    horn = seq("C4:4 | A3:4 | Bb3:2 Db4:2 | C4:4", 112, 0.32, legato=True)
    tracks = [
        Track('piano', 'piano', piano, level=-20, width=0.75, rev=0.35),
        Track('strings', 'strings', strings, level=-22, rev=0.55, width=1.0),
        Track('low', 'strings_lo', low, level=-25, pan=0.15, rev=0.45),
        Track('violins', 'strings', violins, level=-19, pan=-0.3, rev=0.5,
              dyn=[(48, 0.9), (60, 1.05), (80, 1.0), (96, 0.9), (112, 1.1), (124, 0.95)]),
        Track('cello', 'cello', cello, level=-23, pan=0.35, rev=0.45),
        Track('horn', 'horn', horn, level=-27, pan=0.45, rev=0.75, dry=0.6, lp=2400),
    ]
    return Cue('dusk', [(0, 54), (8, 60), (124, 60), (136, 52), (144, 44)], 144, tracks, rt=3.2, tail=8,
               seed=404, mood='golden hour, bittersweet; swelling strings and piano (F major, borrowed bVI/iv)',
               use='Sunset / golden hour by the lake. Play once, then silence.')


# =================================================================== 5. NIGHT (E lydian, 3/4)
def night():
    rng = np.random.default_rng(55)
    p = P("Emaj9:12 | Emaj9:6 F#/E:6 C#m9:6 Amaj7:6 | Bsus4:6 | "
          "Emaj9:6 C#m7:6 Amaj7#11:6 F#m9:6 B7sus4:6 | Emaj9:6 | "
          "Cmaj7:6 Amaj9:6 F#/E:6 Emaj9:6 | Emaj7#11:18", 0)
    mel = ("r:12 | r:1 B5:2 | G#5:3 | r:1 A#5 C#6 | F#5:3 | r:1 E5 G#5 | D#5:3 | r:1 C#6:2 | B5:3 | r:6 | "
           "B4 E5 F#5 | G#5:3 | F#5:2 r:1 | C#5:3 | r:1 E5 G#5 | D#6:3 | C#6:2 A5 | G#5:3 | r:1 F#5:2 | E5:3 | r:6 | "
           "r:1 G5 B5 | E5:3 | r:1 C#6 B5 | G#5:3 | A#5 C#6 A#5 | F#5:3 | B4 E5 F#5 | G#5:3 | "
           "r:3 | r:1 B5:2 | A#5:3 | r:1 G#5:2 | D#6:6")
    rh = pedal(seq(mel, 0, 0.42), changes_of(p), 1.5)
    lh = []
    for (t, d, s) in p:
        if t < 6:
            continue
        pool = arp_pool(s, 40, 66)
        for i, m in enumerate(pool[:3]):
            lh.append(N(t + i * 0.18, m, d, 0.26 - 0.03 * i))
        if d >= 6:
            lh.append(N(t + 4, pool[min(1, len(pool) - 1)] + 12, d - 4, 0.15))
    lh = pedal(lh, changes_of(p))
    pad = blocks(p, 52, 71, 4, 0.3, attack=3.5, release=4.0)
    choir = blocks(p[6:], 57, 69, 3, 0.22, attack=3.0)
    air = blocks(P("Bsus4:6", 36) + P("Emaj9:6", 72) + P("Emaj7#11:18", 102), 64, 83, 3, 0.4)
    st = stars(rng, p, 3, 116, every=(2.5, 6.0), lo=83, hi=100, vel=(0.14, 0.3))
    tracks = [
        Track('piano_rh', 'piano', rh, level=-19, width=0.7, rev=0.45, tj=0.012),
        Track('piano_lh', 'piano', lh, level=-24, width=0.7, rev=0.45),
        Track('pad', 'pad', pad, level=-27, rev=0.5, lp=3500),
        Track('choir', 'choir', choir, level=-31, rev=0.6),
        Track('air', 'air', air, level=-33, rev=0.6),
        Track('stars', 'celesta', st, level=-28, rev=0.7, dry=0.8),
    ]
    return Cue('night', [(0, 44), (96, 44), (108, 40), (120, 34)], 120, tracks, rt=3.5, tail=10, seed=505,
               mood='starry night; sparse slow piano, soft pad, celesta stars (E lydian)',
               use='Night exploration under the stars. Very sparse; play once, then silence.')


# =================================================================== 6. RUINS (D dorian)
def ruins():
    p = P("D5:8 | Dm9:8 | G/D:8 | F:4 C:4 | Dm:8 | Dm9:4 G/D:4 | D5:8 | "
          "Dm9:8 | Fmaj7:4 G:4 | G:4 C:4 | F:4 Dm:4 | Dm9:4 G/D:4 | D5:4 Dsus2:8", 0)
    cello = seq("r:8 | r:2 A3:2 | D4:3 E4 | F4:2 E4 D4 | C4:3 r:1 | D4 F4 A4:2 | G4:2 E4:2 | D4:4 | r:4", 0, 0.5, legato=True) \
        + seq("r:1 D4 E4 F4 | A4:3 G4 | F4:2 E4 F4 | G4:2 A4:2 | B4:3 A4 | G4:2 E4:2 | F4:2 E4 C4 | D4:6", 56, 0.55,
              legato=True)
    horn = seq("A3:.5 D4:.5 E4 F4:2 | E4 B3:3", 40, 0.42, legato=True) + seq("A3:.5 D4:.5 E4 F4:2 | E4 B3:4", 88, 0.32,
                                                                                legato=True)
    echo = seq("r:1 A4:.5 D5:.5 E5 F5 | E5 B4:3", 48, 0.2) + seq("r:1 A5 D6 E6", 96, 0.14)
    tolls = []
    for (b, names, v) in [(0, 'D1 D2', 0.36), (8, 'D2 A2', 0.3), (16, 'G1 D2', 0.3), (24, 'F1 C2', 0.28),
                          (32, 'D2 A2', 0.3), (40, 'D1 D2', 0.32), (56, 'D2 A2', 0.3), (64, 'F1 C2', 0.28),
                          (68, 'G1 D2', 0.28), (76, 'C2 G2', 0.26), (80, 'F1 C2', 0.27), (84, 'D2 A2', 0.3),
                          (88, 'D1 D2', 0.3), (96, 'D1 D2 A2', 0.3)]:
        for i, nm in enumerate(names.split()):
            tolls.append(N(b + i * 0.05, midi(nm), 8 if b < 96 else 12, v))
    # pads only under the phrases - the gaps between them stay open and empty
    choir = (blocks(P("Dm9:8 | G/D:8 | F:4 C:4", 8), 50, 69, 3, 0.2, attack=4.0)
             + blocks(P("Dm9:8 | Fmaj7:4 G:4 | G:4 C:4 | F:4 Dm:4", 56), 50, 69, 3, 0.2, attack=4.0)
             + blocks(P("Dsus2:8", 100), 50, 69, 3, 0.18, attack=3.0))
    air = blocks(P("Dm9:4 G/D:4 | D5:8", 40) + P("Dm9:4 G/D:4", 88), 62, 76, 2, 0.3)
    tracks = [
        Track('cello', 'cello', cello, level=-18, pan=-0.15, rev=0.5, tj=0.012),
        Track('horn', 'horn', horn, level=-24, pan=0.45, rev=1.0, dry=0.35, lp=1800),
        Track('echo', 'harp', echo, level=-30, pan=0.6, rev=0.9, dry=0.5),
        Track('tolls', 'piano', tolls, level=-23, width=0.6, rev=0.55, lp=2500),
        Track('choir', 'choir', choir, level=-30, rev=0.7),
        Track('air', 'air', air, level=-34, rev=0.7),
    ]
    return Cue('ruins', [(0, 54), (92, 54), (108, 42)], 108, tracks, rt=3.5, tail=10, seed=606,
               mood='mystery and wonder; solo cello, low piano, distant horn (D dorian), lots of space',
               use='Approaching the ancient ruins / stone giants. Play once, then silence.')


# =================================================================== 7. MEMORY (Eb lydian)
def memory():
    p = P("Ebmaj7#11:4 | Ebmaj7#11:4 | F/Eb:4 | Cm9:4 | Abmaj7#11:4 | Ebmaj7#11:4 | F/Eb:4 | Ebmaj9:8", 0)
    cel = seq("r:4 | Bb5:.5 Eb6:.5 F6 G6:2 | F6 C6:3 | Bb5:.5 Eb6:.5 F6 G6 Bb6 | Ab6:1.5 G6:.5 F6 D6 | Eb6:4 | "
              "F6:.5 A6:.5 C7:.5 A6:.5 F6:2 | Bb6:4 | r:4", 0, 0.42)
    harp = arpeggio(p[:-1], 58, 89, [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 2, 3], 0.25, 0.2, dur=1.5) \
        + roll('Ebmaj9', 28, 39, 89, 0.12, 0.22, 7) + gliss([3, 5, 7, 9, 10, 0, 2], 22, 63, 94, 1.6, 0.18, 3)
    air = blocks(p, 55, 75, 4, 0.4, attack=2.5)
    choir = [N(0, m, 8, 0.25, shape='cresc', attack=4.0) for m in voice('Ebmaj7#11', 55, 70)] \
        + blocks(p[2:], 55, 70, 3, 0.2)
    tracks = [
        Track('celesta', 'celesta', cel, level=-19, pan=0.15, rev=0.6),
        Track('harp', 'harp', harp, level=-24, pan=-0.35, rev=0.55, tj=0.006),
        Track('air', 'air', air, level=-27, rev=0.6),
        Track('choir', 'choir', choir, level=-28, rev=0.6),
    ]
    return Cue('memory', [(0, 66), (26, 66), (36, 52)], 36, tracks, rt=3.4, tail=7, seed=707,
               mood='magical memory / vision; shimmering harp, celesta motif, airy pad (Eb lydian)',
               use='Stinger for visions / memories of the vanished people. Ends softly.')


# =================================================================== 8. DISCOVER
def discover():
    lyd = [2, 4, 6, 8, 9, 11, 1]
    harp = gliss(lyd, 0, 50, 93, 1.6, 0.32, 3) + roll('Dadd9', 6, 38, 86, 0.1, 0.25, 6)
    strings = [N(1.6, m, 6, 0.38, shape='swell', attack=0.4) for m in voice('Dadd9', 50, 74)] \
        + [N(1.6, midi('D2'), 6, 0.35, shape='swell')]
    choir = [N(1.6, m, 5, 0.25) for m in voice('Dmaj7#11', 62, 79)]
    cel = seq("A5:.5 D6:.5 E6:.5 F#6:2.5", 2.0, 0.42)
    tracks = [
        Track('harp', 'harp', harp, level=-20, pan=-0.3, rev=0.5, tj=0.004),
        Track('strings', 'strings', strings, level=-21, rev=0.55),
        Track('choir', 'choir', choir, level=-28, rev=0.6),
        Track('celesta', 'celesta', cel, level=-21, pan=0.3, rev=0.6),
    ]
    return Cue('discover', [(0, 84), (6, 80), (10, 64)], 10, tracks, rt=3.0, tail=5, seed=808,
               mood='short discovery stinger; harp glissando, soft chord, motif head on celesta',
               use='Finding a relic / point of interest / journal entry.')


# =================================================================== 9. FINALE (D -> E)
def finale():
    rng = np.random.default_rng(99)
    I = P("Dadd9:8 | Gmaj7:8", 0)
    A = P(TA_PROG, 16)
    B = P(TB_PROG.replace("A:2 A7:2", "A:4"), 48)
    T = P("Gmaj7:4 | B7sus4:2 B7:2", 80)
    A2 = transpose_prog(P(TA_PROG, 88), 2)
    B2 = P("C#m9:4 | Amaj7#11:4 | F#m7:2 B7sus4:2 | E:4", 120)
    R = P("Emaj7#11:4 | C#m9:4 | Amaj7:4 | Bsus4:4 | Eadd9:8", 136)
    piano = (melody_pedal(seq("A5:.5 D6:.5 E6 F#6:2 | r:4 | E6 B5:3 | r:5", 0, 0.32), I, 2)
             + [N(0, midi('D2'), 8, 0.25), N(8, midi('G2'), 8, 0.25)]
             + piano_part(A, 38, 69, ARP8, vel=0.27) + piano_part(B, 38, 72, ARP8B, vel=0.27)
             + piano_part(T, 38, 72, ARP8, vel=0.3)
             + piano_part(A2, 40, 76, ARP8B, vel=0.34) + piano_part(B2, 40, 76, ARP8, vel=0.33)
             + melody_pedal(seq("B4:.5 E5:.5 F#5 G#5:2 | F#5 C#5:3 | B4:.5 E5:.5 F#5 G#5 B5 | F#5:2 A5:2 | G#5:8",
                                136, 0.42), R, 0.8)
             + [n for (t, d, s) in R for n in roll(s, t, 40, 64, 0.1, 0.24, d)])
    flute = seq(TA_MEL, 16, 0.55, legato=True) + seq(TA_MEL, 88, 0.62, tr=2, legato=True) \
        + seq("G#5 F#5:.5 E5:.5 D#5 E5 | B5:1.5 A5:.5 G#5 D#6 | C#6:2 B5 A5 | G#5:4", 120, 0.62, legato=True)
    violins = (seq(TB_MEL, 48, 0.52, legato=True, attack=0.2) + seq("B4 D5 F#5:2 | E5:2 D#5:2", 80, 0.52, legato=True)
               + seq(TA_MEL, 88, 0.6, tr=2, legato=True, attack=0.18)
               + seq("G#5 F#5:.5 E5:.5 D#5 E5 | B5:1.5 A5:.5 G#5 D#6 | C#6:2 B5 A5 | G#5:4", 120, 0.6,
                     legato=True))
    horn = seq(HORN_B, 48, 0.36, legato=True) + seq("G4:4 | F#4:2 F#4:2", 80, 0.36, legato=True) \
        + seq(HORN_A, 88, 0.45, tr=2, legato=True) + seq("G#4:4 | A4:4 | A4:2 F#4:2 | G#4:4", 120, 0.45, legato=True)
    strings = (blocks(A, 50, 74, 4, 0.26) + blocks(B + T, 50, 76, 4, 0.34, shape='swell')
               + blocks(A2 + B2, 52, 79, 5, 0.42, shape='swell') + blocks(R, 52, 76, 4, 0.24, shape='dim'))
    low = basses(B + T + A2 + B2, 36, 50, 0.38) + [N(136, midi('E2'), 24, 0.25, shape='dim')]
    harp = (arpeggio(A, 50, 84, [0, 1, 2, 3, 4, 5, 4, 3], 0.5, 0.22, dur=2)
            + gliss([7, 9, 11, 1, 2, 4, 6], 80, 55, 91, 2.5, 0.28, 3)
            + [n for (t, d, s) in A2 + B2 for n in roll(s, t, 40, 88, 0.05, 0.3, 4)]
            + roll('Eadd9', 152.3, 40, 92, 0.13, 0.24, 7))
    pad = blocks(I, 50, 74, 4, 0.35, attack=4) + blocks(R, 52, 76, 4, 0.3, attack=3)
    st = stars(rng, I, 1, 16, every=(1.5, 3.5), lo=84, hi=100) + stars(rng, R, 137, 158, every=(2, 4), lo=86, hi=100)
    tracks = [
        Track('piano', 'piano', piano, level=-20, width=0.75, rev=0.33),
        Track('flute', 'flute', flute, level=-18, pan=0.25, rev=0.42,
              dyn=[(16, 0.95), (40, 1.0), (88, 1.05), (120, 1.1), (136, 1.0)]),
        Track('violins', 'strings', violins, level=-19, pan=-0.3, rev=0.5,
              dyn=[(48, 0.9), (72, 1.05), (88, 1.05), (110, 1.15), (124, 1.15), (136, 1.0)]),
        Track('horn', 'horn', horn, level=-23, pan=0.45, rev=0.7, dry=0.7, lp=3000,
              dyn=[(48, 0.85), (88, 1.05), (124, 1.1)]),
        Track('strings', 'strings', strings, level=-22, rev=0.55),
        Track('low', 'strings_lo', low, level=-23, pan=0.15, rev=0.45),
        Track('harp', 'harp', harp, level=-24, pan=-0.5, rev=0.45),
        Track('pad', 'pad', pad, level=-28, rev=0.5, lp=3500),
        Track('stars', 'celesta', st, level=-27, rev=0.7, dry=0.8),
    ]
    return Cue('finale', [(0, 54), (8, 60), (116, 60), (130, 52), (136, 56), (150, 54), (160, 40)], 160,
               tracks, rt=3.2, tail=9, seed=909,
               mood='meteor-shower ending; the main motif in full, strings+piano+flute+horn, warm climax, quiet resolution',
               use='Ending / meteor shower sequence and credits. Play once.')


# =================================================================== 10. VILLAGE NIGHT (G lullaby, loop)
def village_night():
    p16 = ("Gmaj7:3 Gmaj7:3 Em7:3 Em9:3 Cmaj7:3 D:3 Bm7:3 D7:3 "
           "Gmaj7:3 Bm7:3 Cmaj7:3 Am7:3 G/B:3 Cadd9:3 D7sus4:2 D7:1 G:3")
    mel = ("D5 G5 A5 | B5:2 A5 | E5:3 | G5:2 F#5 | E5:1.5 D5:.5 E5 | F#5:2 A5 | B5:1.5 A5:.5 F#5 | F#5:2 r:1 | "
           "D5 G5 A5 | B5:2 D6 | C6:1.5 B5:.5 G5 | A5:2 E5 | D5 G5 B5 | D6:2 C6 | A5:1.5 G5:.5 F#5 | G5:3")
    P1, P2, P3 = P(p16, 0), P(p16, 48), P(p16, 96)
    box = seq(mel, 0, 0.5, tr=12) + seq(mel, 96, 0.44, tr=12)
    ctr = []
    for i, (t, d, s) in enumerate(P2):
        if i % 2 == 0:
            v = voice(s, 84, 96, None, 2)
            ctr.append(N(t, v[-1], 2, 0.3))
            ctr.append(N(t + 1.5, v[0], 2, 0.22))
    guitar = (arpeggio(P1 + P3, 40, 71, [0, 1, 2, 3, 2, 1], 0.5, 0.3, dur=1.6)
              + [N(t, n.m, 2.8, 0.3) for n in basses(P2, 40, 52) for t in [n.t]]
              + seq(mel, 48, 0.55))
    harp = arpeggio(P2, 43, 67, [None, 1, 2, 3, 2, 1], 0.5, 0.18, dur=1.2) + seq(mel, 96, 0.16)
    pad = blocks(P1 + P2 + P3, 50, 67, 3, 0.2, attack=3, release=3)
    tracks = [
        Track('musicbox', 'musicbox', box + ctr, level=-20, pan=0.2, rev=0.4),
        Track('guitar', 'guitar', guitar, level=-20, pan=-0.2, rev=0.32, tj=0.01),
        Track('harp', 'harp', harp, level=-27, pan=0.4, rev=0.4),
        Track('pad', 'pad', pad, level=-30, rev=0.4, lp=3000),
    ]
    return Cue('village_night', [(0, 78), (144, 78)], 144, tracks, rt=2.5, tail=6, loop=True, seed=1010,
               mood='lullaby by the village fire; music box and nylon guitar (G major)',
               use='Near the village campfire at night. Seamless loop (tail folded into the start); fade in/out in game.')


CUES = {f.__name__: f for f in [title, morning, afternoon, dusk, night, ruins, memory, discover, finale,
                                village_night]}
