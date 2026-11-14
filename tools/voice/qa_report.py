#!/usr/bin/env python3
"""Summarize QA sidecars written by generate.py: per-line table of problems + per-speaker stats.
Usage: python qa_report.py lines.json [--qa-dir tools/voice/qa/vox] [--all]"""
import argparse, json, statistics as st, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument("lines"); ap.add_argument("--qa-dir", default=str(HERE / "qa" / "vox")); ap.add_argument("--all", action="store_true")
a = ap.parse_args()
lines = json.load(open(a.lines, encoding="utf-8")); qa = Path(a.qa_dir)
recs = []
for ln in lines:
    p = qa / f"{ln['id']}.json"
    if p.exists():
        recs.append(json.load(open(p, encoding="utf-8")))
rows = ["id\tspeaker\temotion\tdur\tcps\tcer\twer\ttries\trtf\tproblems\tasr"]
print(f"{'id':22s} {'speaker':9s} {'emo':9s} {'dur':>5s} {'cps':>5s} {'cer':>5s} {'try':>3s} {'rtf':>4s}  problems / asr")
for r in recs:
    rows.append("\t".join(str(x) for x in [r["id"], r["speaker"], r["emotion"], r["dur"], r["cps"], r["cer"], r["wer"], r["attempt"] + 1, r["rtf"], " ".join(r["final_problems"]), r["asr"]]))
    if a.all or r["final_problems"]:
        print(f"{r['id']:22s} {r['speaker']:9s} {r['emotion']:9s} {r['dur']:5.1f} {r['cps']:5.1f} {r['cer'] if r['cer'] is not None else '-':>5} {r['attempt']+1:3d} {r['rtf']:4.1f}  {' '.join(r['final_problems']) or 'ok'} | {r['asr']}")
(qa / "report.tsv").write_text("\n".join(rows) + "\n", encoding="utf-8")
print(f"\n{'speaker':9s} {'n':>4s} {'audio':>7s} {'cps':>5s} {'meanCER':>8s} {'medCER':>7s} {'fail':>4s} {'retried':>7s}")
by = {}
for r in recs: by.setdefault(r["speaker"], []).append(r)
for spk, rs in list(by.items()) + [("ALL", recs)]:
    cers = [r["cer"] for r in rs if r["cer"] is not None] or [0]
    print(f"{spk:9s} {len(rs):4d} {sum(r['dur'] for r in rs):6.0f}s {st.mean(r['cps'] for r in rs):5.1f} {st.mean(cers):8.3f} {st.median(cers):7.3f} "
          f"{sum(1 for r in rs if r['final_problems']):4d} {sum(1 for r in rs if r['attempt'] > 0):7d}")
missing = [ln["id"] for ln in lines if not (qa / f"{ln['id']}.json").exists()]
if missing: print(f"\n{len(missing)} lines without QA record (not rendered yet?)")
