#!/usr/bin/env python3
"""Dublagem final com XTTS-v2 (elenco em xtts_cast.json).

Fluxo (ver run_xtts.sh):
  1. node export_lines.mjs                         -> lines.json + redub_ids.txt
  2. python3 dub_xtts.py plan --attempt N          -> jobs_xtts.json (só as falas sem gravação ou com texto/timbre novos)
  3. <xtts venv>/python -I render_xtts.py <modelo> jobs_xtts.json <raw> 4
  4. <venv com whisper>/python dub_xtts.py post --raw <raw>
     -> a/vox/<id>.mp3 + manifest.json; o que falhar no teste de ida e volta (whisper) volta pro passo 2 com outra semente.
  approved: tomadas aprovadas uma a uma pelo dono do jogo (caminho do wav bruto); entram direto no passo 4.
"""
import argparse, json, os, sys, glob, re, hashlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
VOX = ROOT / 'a' / 'vox'
QA = HERE / 'qa' / 'xtts'
REFS = HERE / 'refs_xtts'
STATE = QA / 'state.json'
norm = lambda t: ' '.join(str(t).split())
# o arquivo bruto leva um hash do texto+timbre+tentativa: se a fala mudar, gera de novo; se não, aproveita
tag = lambda l, att: hashlib.md5((norm(l['text']) + '|' + l['speaker'] + '|' + str(att)).encode()).hexdigest()[:8]


def load(p, d):
    try:
        return json.load(open(p))
    except Exception:
        return d


def needs(lines, man):
    return [l for l in lines if not man.get(l['id']) or norm(man[l['id']]['text']) != norm(l['text']) or man[l['id']].get('speaker') != l['speaker']]


def plan(a):
    lines = json.load(open(HERE / 'lines.json'))
    cast = json.load(open(HERE / 'xtts_cast.json'))
    man = load(VOX / 'manifest.json', {})
    st = load(STATE, {})
    approved = load(a.approved, {}) if a.approved else {}
    only = set(a.only.split(',')) if a.only else None
    jobs = []
    for l in needs(lines, man):
        i = l['id']
        if only and i not in only: continue
        if i in approved: continue
        if st.get(i, {}).get('attempts', 0) > a.attempt: continue  # já tentou nesta rodada
        c = cast.get(l['speaker'])
        if not c:
            print('sem elenco para', l['speaker'], i, file=sys.stderr); continue
        j = {'name': i + '__' + tag(l, a.attempt), 'text': l['text'], 'speed': c.get('speed', 1.0), 'seed': c.get('seed', 1234) + a.attempt * 101,
             'temperature': c.get('temperature', 0.7) + a.attempt * 0.03, 'split': c.get('split', True)}
        if 'studio' in c: j['studio'] = c['studio']
        else: j['ref'] = str(REFS / (c['ref'] + '.wav'))
        sty = c.get('style', {})
        s = sty.get(l.get('emotion')) or sty.get('*')
        if s: j['style_ref'] = str(REFS / (s + '.wav'))
        if not j['split']:
            j['text'] = j['text'].rstrip('.')  # o XTTS às vezes lê "ponto" no fim
        jobs.append(j)
    json.dump(jobs, open(a.out, 'w'), ensure_ascii=False, indent=1)
    print(len(jobs), 'falas para gerar (tentativa', a.attempt, ')')


def post(a):
    sys.path.insert(0, str(HERE))
    import numpy as np, soundfile as sf, librosa
    import generate as G
    lines = {l['id']: l for l in json.load(open(HERE / 'lines.json'))}
    man = load(VOX / 'manifest.json', {})
    st = load(STATE, {})
    QA.mkdir(parents=True, exist_ok=True)
    asr = G.ASR(a.asr, 4)
    src = []
    for p in sorted(glob.glob(os.path.join(a.raw, '*.wav'))):
        stem = Path(p).stem; i, _, h = stem.partition('__'); l = lines.get(i)
        if not l or h not in [tag(l, k) for k in range(4)]: continue  # gravação de um texto antigo
        src.append((i, p, False))
    for i, p in (load(a.approved, {}) if a.approved else {}).items():
        src.append((i, p, True))
    for i, p, appr in src:
        l = lines.get(i)
        if not l: continue
        if man.get(i) and norm(man[i]['text']) == norm(l['text']) and man[i].get('speaker') == l['speaker']: continue
        x, sr = sf.read(p, dtype='float32')
        if x.ndim > 1: x = x.mean(1)
        if sr != G.SR: x = librosa.resample(x, orig_sr=sr, target_sr=G.SR)
        x = G.ffmpeg_filter(x, 'highpass=f=70')
        x = G.trim_silence(x)
        y, lufs, _ = G.loudness_normalize(x)
        hyp = asr(y); cer, wer = G.score(l['text'], hyp)
        dur = len(y) / G.SR
        s = st.setdefault(i, {'attempts': 0, 'best': 9})
        if not appr: s['attempts'] += 1
        ok = appr or cer <= (0.16 if len(l['text']) < 30 else 0.10)
        last = s['attempts'] >= a.max_attempts
        tmp = QA / (i + '.best.wav')
        if not ok and cer < s['best']:
            s['best'] = cer; sf.write(tmp, y, G.SR)
        if ok or last:
            if not ok and tmp.exists():
                y, _ = sf.read(tmp, dtype='float32'); dur = len(y) / G.SR; cer = s['best']
            G.encode_mp3(y, str(VOX / (i + '.mp3')))
            man[i] = {'speaker': l['speaker'], 'dur': round(dur, 3), 'text': l['text']}
            s['done'] = True; s['cer'] = round(cer, 3)
            if tmp.exists(): tmp.unlink()
        json.dump({'id': i, 'text': l['text'], 'asr': hyp, 'cer': round(cer, 3), 'dur': round(dur, 2), 'ok': ok, 'approved': appr, 'attempt': s['attempts']},
                  open(QA / (i + '.json'), 'w'), ensure_ascii=False, indent=1)
        print(('OK ' if ok else ('ACEITA ' if last else 'REFAZER ')) + i, round(cer, 3), '|', hyp, flush=True)
    order = list(lines)
    json.dump({k: man[k] for k in order if k in man}, open(VOX / 'manifest.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(st, open(STATE, 'w'), indent=1)
    # apaga gravações de falas que não existem mais
    for k in list(man):
        if k not in lines:
            p = VOX / (k + '.mp3')
            if p.exists(): p.unlink()


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest='cmd')
    p1 = sub.add_parser('plan'); p1.add_argument('--attempt', type=int, default=0); p1.add_argument('--out', default=str(HERE / 'jobs_xtts.json')); p1.add_argument('--only'); p1.add_argument('--approved')
    p2 = sub.add_parser('post'); p2.add_argument('--raw', required=True); p2.add_argument('--asr', default='/home/user/voxw/ggml-small.bin'); p2.add_argument('--approved'); p2.add_argument('--max-attempts', type=int, default=3)
    a = ap.parse_args()
    plan(a) if a.cmd == 'plan' else post(a)
