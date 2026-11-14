#!/usr/bin/env python3
"""Download the CC-BY 3.0 instrument samples used by the renderer (~80 MB, not committed).

    python3 tools/music/fetch_samples.py --dest /path/to/samples
"""
import argparse
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

TONEJS = 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples'
SALAMANDER = 'https://raw.githubusercontent.com/Tonejs/audio/master/salamander'

# note lists as published in nbrosowsky/tonejs-instruments Tonejs-Instruments.js ('#' -> 's' in file names)
NOTES = {
    'cello': 'E3 E4 F2 F3 F4 F#3 F#4 G2 G3 G4 G#2 G#3 G#4 A2 A3 A4 A#2 A#3 B2 B3 B4 C2 C3 C4 C5 C#3 C#4 D2 D3 D4 '
             'D#2 D#3 D#4 E2',
    'contrabass': 'C2 C#3 D2 E2 E3 F#1 F#2 G1 G#2 G#3 A2 A#1 B3',
    'flute': 'A6 C4 C5 C6 C7 E4 E5 E6 A4 A5',
    'french-horn': 'D3 D5 D#2 F3 F5 G2 A1 A3 C2 C4',
    'guitar-nylon': 'F#2 F#3 F#4 F#5 G3 G5 G#2 G#4 G#5 A2 A3 A4 A5 A#5 B1 B2 B3 B4 C#3 C#4 C#5 D2 D3 D5 D#4 E2 E3 '
                    'E4 E5',
    'harp': 'C5 D2 D4 D6 D7 E1 E3 E5 F2 F4 F6 F7 G1 G3 G5 A2 A4 A6 B1 B3 B5 B6 C3',
    'violin': 'A3 A4 A5 A6 C4 C5 C6 C7 E4 E5 E6 G4 G5 G6',
}
SAL = ['A0'] + [f'{n}{o}' for o in range(1, 8) for n in ('C', 'Ds', 'Fs', 'A')] + ['C8']


def jobs(dest):
    for inst, notes in NOTES.items():
        for n in notes.split():
            f = n.replace('#', 's') + '.wav'
            yield f'{TONEJS}/{inst}/{f}', os.path.join(dest, 'tonejs', inst, f)
    for n in SAL:
        yield f'{SALAMANDER}/{n}.mp3', os.path.join(dest, 'salamander', f'{n}.mp3')


def get(job):
    url, path = job
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return None
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        with urllib.request.urlopen(url, timeout=60) as r, open(path + '.part', 'wb') as f:
            f.write(r.read())
        os.replace(path + '.part', path)
    except Exception as e:  # noqa: BLE001
        return f'{url}: {e}'
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dest', required=True)
    a = ap.parse_args()
    errs = [e for e in ThreadPoolExecutor(8).map(get, list(jobs(a.dest))) if e]
    for e in errs:
        print('FAILED', e, file=sys.stderr)
    print('done' if not errs else f'{len(errs)} failures')
    sys.exit(1 if errs else 0)


if __name__ == '__main__':
    main()
