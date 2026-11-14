#!/usr/bin/env python3
"""Offline voice-acting renderer for Vale de Aldren (pt-BR).

Engine: Chatterbox Multilingual (Resemble AI, MIT) with language_id='pt', zero-shot
cloning from per-character reference clips (tools/voice/refs/*.ogg, built by
make_refs.py with Kokoro-82M). Every rendered line is post-processed (70 Hz
high-pass, optional pitch/tempo, silence trim with ~80 ms margins, -18 LUFS /
<= -1.5 dBTP) and checked with round-trip ASR (whisper.cpp small, pt) +
speaking-rate sanity; failing lines are re-rendered with new seeds.

Input JSON: [{"id","speaker","text","emotion"?,"speed"?,
              "exaggeration"?,"cfg_weight"?,"temperature"?}]  (last three optional overrides)
Output: <out>/<id>.mp3 (mono 24 kHz, 48 kbps CBR) + <out>/manifest.json
QA sidecars: tools/voice/qa/<out-name>/<id>.json and report.tsv

Usage (Chatterbox venv, see README.md):
  python generate.py lines.json --out ../../a/vox --ckpt-dir /path/chatterbox --asr-model /path/ggml-small.bin
  options: --force  --ids a,b  --shard 0/2  --threads 4  --max-retries 2  --no-asr  --manifest-only
"""
import argparse, hashlib, json, logging, os, re, subprocess, sys, tempfile, time, unicodedata
from pathlib import Path

import numpy as np

os.environ.setdefault("TQDM_DISABLE", "1")
os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")  # CPU may be shared: spinning OpenMP threads collapse under contention
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
os.environ.setdefault("MALLOC_ARENA_MAX", "2")  # only effective if set before start; see README

HERE = Path(__file__).resolve().parent
SR = 24000
log = logging.getLogger("vox")

# ----------------------------------------------------------------------------- text utils

def spell_numbers(s):
    try:
        from num2words import num2words
    except ImportError:
        return s
    s = re.sub(r"(\d)\.(\d{3})", r"\1\2", s)
    return re.sub(r"\d+", lambda m: " " + num2words(int(m.group()), lang="pt_BR") + " ", s)


def norm_for_asr(s):
    s = unicodedata.normalize("NFKD", spell_numbers(s).lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return " ".join(s.split())


def split_chunks(text, max_chars=220, min_chars=10):
    """Split at '...'/'…' (rendered as a held pause) and, for long lines, at sentence ends.
    Returns [(chunk_text, pause_kind_after)] with pause_kind in {'ellipsis','sentence',None}."""
    t = " ".join(text.replace("…", "...").split())
    parts = []
    for i, seg in enumerate(re.split(r"\.\.\.+", t)):
        if i > 0 and parts:
            parts[-1][1] = "ellipsis"
        seg = seg.strip(" ,")
        if seg:
            parts.append([seg, None])
    if not parts:
        return [(t, None)]
    # chunks ending in an ellipsis keep a suspended (comma) intonation
    for p in parts:
        if p[1] == "ellipsis" and p[0][-1] not in ".!?,":
            p[0] = p[0] + ","
    # merge tiny chunks into the next one (very short prompts make the model ramble)
    merged = []
    for p in parts:
        if merged and len(re.sub(r"\W", "", merged[-1][0])) < min_chars:
            merged[-1] = [merged[-1][0].rstrip(",") + ", " + p[0][0].lower() + p[0][1:], p[1]]
        else:
            merged.append(p)
    if len(merged) > 1 and len(re.sub(r"\W", "", merged[-1][0])) < min_chars and merged[-2][1] == "ellipsis":
        last = merged.pop()
        merged[-1] = [merged[-1][0].rstrip(",") + ", " + last[0][0].lower() + last[0][1:], last[1]]
    # split long chunks at sentence boundaries
    out = []
    for seg, kind in merged:
        if len(seg) <= max_chars:
            out.append((seg, kind)); continue
        sents = re.split(r"(?<=[.!?])\s+", seg)
        cur = ""
        for s in sents:
            if cur and len(cur) + len(s) + 1 > max_chars:
                out.append((cur, "sentence")); cur = s
            else:
                cur = (cur + " " + s).strip()
        out.append((cur, kind))
    return out

# ----------------------------------------------------------------------------- audio utils

def ffmpeg_filter(x, filt):
    with tempfile.TemporaryDirectory() as td:
        a, b = os.path.join(td, "a.f32"), os.path.join(td, "b.f32")
        x.astype(np.float32).tofile(a)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", a,
                        "-af", filt, "-f", "f32le", "-ar", str(SR), "-ac", "1", b], check=True)
        return np.fromfile(b, dtype=np.float32)


def trim_silence(x, keep=0.08, rel_db=-42.0, abs_db=-50.0):
    hop = int(0.01 * SR)
    n = len(x) // hop
    if n < 3:
        return x
    rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    thr = max(db.max() + rel_db, abs_db)
    on = np.where(db > thr)[0]
    if not len(on):
        return x
    s = max(0, on[0] * hop - int(keep * SR))
    e = min(len(x), (on[-1] + 1) * hop + int(keep * SR))
    y = x[s:e].copy()
    f = int(0.005 * SR)  # 5 ms fades against clicks
    y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y


def max_internal_pause(x, rel_db=-40.0):
    hop = int(0.01 * SR); n = len(x) // hop
    if n < 3:
        return 0.0
    db = 20 * np.log10(np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12))
    sil = db < db.max() + rel_db
    best = cur = 0
    for v in sil:
        cur = cur + 1 if v else 0; best = max(best, cur)
    return best * 0.01


def true_peak_db(x):
    from scipy.signal import resample_poly
    return 20 * np.log10(np.max(np.abs(resample_poly(x, 4, 1))) + 1e-12)


def loudness_normalize(x, target=-18.0, tp_max=-1.5):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    pad = np.concatenate([x, np.zeros(int(0.5 * SR), dtype=x.dtype)]) if len(x) < SR else x
    lufs = meter.integrated_loudness(pad)
    y = x * (10 ** ((target - lufs) / 20.0))
    tp = true_peak_db(y)
    limited = False
    if tp > tp_max:  # keep it clean: lower gain rather than squash transients
        y = y * (10 ** ((tp_max - 0.05 - tp) / 20.0)); limited = True
    return y.astype(np.float32), lufs, limited


def encode_mp3(x, path):
    tmp = str(path) + ".part.mp3"
    p = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-c:a", "libmp3lame", "-b:a", "48k", "-ar", str(SR), "-ac", "1", tmp],
                       input=x.astype(np.float32).tobytes())
    if p.returncode:
        raise RuntimeError("ffmpeg mp3 encode failed")
    os.replace(tmp, path)

# ----------------------------------------------------------------------------- chatterbox patches

def patch_chatterbox():
    """(1) remove the attention-spy hooks after every call (upstream leaks one per generate);
    (2) relax the 'token repetition => force EOS' heuristic, which in chatterbox 0.1.7 fires on
    ANY 2 identical consecutive tokens and truncates lines with held pauses."""
    from chatterbox.models.t3.inference import alignment_stream_analyzer as asa
    import torch
    orig_step = asa.AlignmentStreamAnalyzer.step

    def step(self, logits, next_token=None):
        toks = getattr(self, "_vox_tokens", [])
        if next_token is not None:
            toks.append(int(next_token)); toks = toks[-16:]
        self._vox_tokens = toks
        # hide the token history from the upstream check, run it, then apply our own rule
        self.generated_tokens = []
        out = orig_step(self, logits, next_token=None)
        n = 4 if self.complete else 14   # stuck token: >=4 after text is done, >=14 anywhere (~0.5 s)
        if len(toks) >= n and len(set(toks[-n:])) == 1:
            out = -(2 ** 15) * torch.ones_like(out); out[..., self.eos_idx] = 2 ** 15
        return out

    asa.AlignmentStreamAnalyzer.step = step


class Engine:
    def __init__(self, ckpt_dir, threads, flow_bf16=False):
        import contextlib, torch
        torch.set_num_threads(threads)
        patch_chatterbox()
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        self.torch = torch
        self.m = ChatterboxMultilingualTTS.from_local(ckpt_dir, "cpu")
        self.conds = {}
        self.timing = {"t3": 0.0, "flow": 0.0, "hift": 0.0, "tokens": 0}
        T = self.timing

        def timed(obj, name, key, ctx=contextlib.nullcontext):
            f = getattr(obj, name)
            def g(*a, **k):
                t = time.time()
                with ctx():
                    r = f(*a, **k)
                T[key] += time.time() - t
                if key == "t3":
                    T["tokens"] += int(r.shape[-1])
                return r
            setattr(obj, name, g)
        # bf16 autocast of the flow-matching decoder uses AMX/AVX512-BF16 when present (~2x faster on that stage)
        bf16 = (lambda: torch.autocast("cpu", dtype=torch.bfloat16)) if flow_bf16 else contextlib.nullcontext
        timed(self.m.t3, "inference", "t3")
        timed(self.m.s3gen, "flow_inference", "flow", bf16)
        timed(self.m.s3gen, "hift_inference", "hift")

    def set_speaker(self, spk, ref, exaggeration):
        if spk not in self.conds:
            self.m.prepare_conditionals(str(ref), exaggeration=exaggeration)
            self.conds[spk] = self.m.conds
        self.m.conds = self.conds[spk]

    def tts(self, text, seed, exaggeration, cfg_weight, temperature):
        self.torch.manual_seed(seed)
        w = self.m.generate(text, language_id="pt", exaggeration=exaggeration,
                            cfg_weight=cfg_weight, temperature=temperature)
        for layer in self.m.t3.tfmr.layers:  # drop leaked hooks
            layer.self_attn._forward_hooks.clear()
        return w.squeeze(0).float().numpy().astype(np.float32)


class ASR:
    def __init__(self, model_path, threads):
        from pywhispercpp.model import Model
        self.m = Model(model_path, n_threads=threads, language="pt", print_progress=False,
                       print_realtime=False, redirect_whispercpp_logs_to=None)

    def __call__(self, x):
        import librosa
        y = librosa.resample(x, orig_sr=SR, target_sr=16000).astype(np.float32)
        y = np.concatenate([np.zeros(8000, np.float32), y, np.zeros(8000, np.float32)])
        return " ".join(s.text for s in self.m.transcribe(y)).strip()


def score(ref_text, hyp):
    import jiwer
    r, h = norm_for_asr(ref_text), norm_for_asr(hyp)
    if not h:
        return 1.0, 1.0
    return jiwer.cer(r, h), jiwer.wer(r, h)

# ----------------------------------------------------------------------------- main

def params_for(line, voices, attempt):
    spk = voices["speakers"][line["speaker"]]
    emo = voices["emotions"].get(line.get("emotion") or "neutral", voices["emotions"]["neutral"])
    p = {k: spk["tts"][k] + emo.get(k, 0.0) for k in ("exaggeration", "cfg_weight", "temperature")}
    for k in p:
        if k in line:
            p[k] = float(line[k])
    if attempt > 0:  # retries: a bit more conservative sampling
        p["temperature"] = max(0.5, p["temperature"] - 0.07 * attempt)
        p["cfg_weight"] = min(0.6, p["cfg_weight"] + 0.05 * attempt)
    p["exaggeration"] = float(np.clip(p["exaggeration"], 0.25, 1.2))
    p["cfg_weight"] = float(np.clip(p["cfg_weight"], 0.1, 0.8))
    return {k: round(v, 3) for k, v in p.items()}


def render_line(eng, line, voices, refs_dir, attempt):
    spk = voices["speakers"][line["speaker"]]
    p = params_for(line, voices, attempt)
    eng.set_speaker(line["speaker"], refs_dir / f"{line['speaker']}.ogg", p["exaggeration"])
    seed = int(hashlib.sha1(f"{line['id']}#{attempt}".encode()).hexdigest()[:8], 16)
    pauses = {"ellipsis": spk.get("pause", 0.45), "sentence": 0.3}
    pieces = []
    for i, (chunk, kind) in enumerate(split_chunks(line["text"])):
        w = trim_silence(eng.tts(chunk, seed + i, **p), keep=0.04)
        pieces.append(w)
        if kind:
            pieces.append(np.zeros(int(pauses[kind] * SR), np.float32))
    x = np.concatenate(pieces)
    # post: high-pass, optional pitch (child), optional tempo
    filt = ["highpass=f=70:poles=2"]
    post = spk.get("post", {})
    if post.get("pitch"):
        filt.append(f"rubberband=pitch={2 ** (post['pitch'] / 12):.5f}:formant={post.get('formant', 'preserved')}:pitchq=quality")
    if line.get("speed") and abs(float(line["speed"]) - 1) > 1e-3:
        filt.append(f"rubberband=tempo={float(line['speed']):.4f}:pitchq=quality")
    x = ffmpeg_filter(x, ",".join(filt))
    x = trim_silence(x, keep=0.08)
    x, lufs_in, limited = loudness_normalize(x)
    return x, {"params": p, "seed": seed, "lufs_in": round(lufs_in, 1), "tp_limited": limited}


def _write_json_atomic(path, obj):
    tmp = str(path) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def update_manifest(out_dir, ln, dur):
    """incremental: add/refresh one entry right after its mp3 is written (game can use partial results)"""
    p = out_dir / "manifest.json"
    try:
        man = json.load(open(p, encoding="utf-8")) if p.exists() else {}
    except Exception:
        man = {}
    man[ln["id"]] = {"speaker": ln["speaker"], "dur": round(dur, 3), "text": ln["text"]}
    _write_json_atomic(p, man)


def release_memory():
    import ctypes, gc
    gc.collect()
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except Exception:
        pass


def build_manifest(lines, out_dir):
    """manifest.json = {id: {speaker, dur, text}} for every input line whose mp3 exists
    (entries for ids not in this input file are kept)."""
    man_path = out_dir / "manifest.json"
    man = {}
    if man_path.exists():
        try:
            man = json.load(open(man_path, encoding="utf-8"))
        except Exception:
            man = {}
    for ln in lines:
        mp3 = out_dir / f"{ln['id']}.mp3"
        if not mp3.exists():
            man.pop(ln["id"], None); continue
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
                                   capture_output=True, text=True).stdout.strip() or 0)
        man[ln["id"]] = {"speaker": ln["speaker"], "dur": round(dur, 3), "text": ln["text"]}
    _write_json_atomic(man_path, man)
    return man


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lines")
    ap.add_argument("--out", default=str(HERE.parent.parent / "a" / "vox"))
    ap.add_argument("--voices", default=str(HERE / "voices.json"))
    ap.add_argument("--refs", default=str(HERE / "refs"))
    ap.add_argument("--ckpt-dir", default=os.environ.get("CHATTERBOX_DIR"))
    ap.add_argument("--asr-model", default=os.environ.get("WHISPER_GGML"))
    ap.add_argument("--qa-dir", default=None)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--ids", default="")
    ap.add_argument("--speakers", default="")
    ap.add_argument("--shard", default="0/1")
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--max-retries", type=int, default=1, help="extra takes for a flagged line")
    ap.add_argument("--max-retries-bad", type=int, default=2, help="extra takes allowed when CER is really bad")
    ap.add_argument("--bad-cer", type=float, default=0.3)
    ap.add_argument("--priority", default="", help="comma list of id prefixes (fnmatch globs) rendered first, in this order")
    ap.add_argument("--cer-max", type=float, default=0.12)
    ap.add_argument("--no-asr", action="store_true")
    ap.add_argument("--flow-bf16", action="store_true", help="bf16 autocast of the S3Gen flow decoder (~25%% faster, small spectral deviation)")
    ap.add_argument("--limit", type=int, default=0, help="render at most N lines then exit 3 if more remain")
    ap.add_argument("--max-rss-gb", type=float, default=9.0, help="exit 3 after the current line above this RSS (CPU allocator growth); run_all.sh restarts")
    ap.add_argument("--manifest-only", action="store_true")
    a = ap.parse_args()

    out_dir = Path(a.out); out_dir.mkdir(parents=True, exist_ok=True)
    qa_dir = Path(a.qa_dir) if a.qa_dir else HERE / "qa" / out_dir.name
    qa_dir.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s",
                        handlers=[logging.StreamHandler(sys.stdout), logging.FileHandler(qa_dir / "generate.log")])
    for noisy in ("chatterbox", "transformers", "diffusers"):
        logging.getLogger(noisy).setLevel(logging.ERROR)

    lines = json.load(open(a.lines, encoding="utf-8"))
    voices = json.load(open(a.voices, encoding="utf-8"))
    ids = set(filter(None, a.ids.split(","))); spks = set(filter(None, a.speakers.split(",")))
    si, sn = map(int, a.shard.split("/"))
    seen = set()
    for ln in lines:
        assert ln["id"] not in seen, f"duplicate id {ln['id']}"; seen.add(ln["id"])
        assert ln["speaker"] in voices["speakers"], f"unknown speaker {ln['speaker']} in {ln['id']}"

    todo = [ln for i, ln in enumerate(lines)
            if i % sn == si and (not ids or ln["id"] in ids) and (not spks or ln["speaker"] in spks)
            and (a.force or not (out_dir / f"{ln['id']}.mp3").exists())]
    if a.priority:
        import fnmatch
        pats = [p.strip() for p in a.priority.split(",") if p.strip()]
        def rank(ln):
            for i, p in enumerate(pats):
                if fnmatch.fnmatch(ln["id"], p if any(c in p for c in "*?[") else p):
                    return i
            return len(pats)
        todo.sort(key=rank)  # stable: keeps file order inside each group
    if a.manifest_only or not todo:
        build_manifest(lines, out_dir); log.info("manifest updated (%d todo)", len(todo)); return

    log.info("rendering %d/%d lines -> %s (shard %s)", len(todo), len(lines), out_dir, a.shard)
    eng = Engine(a.ckpt_dir, a.threads, flow_bf16=a.flow_bf16)
    asr = None if a.no_asr or not a.asr_model else ASR(a.asr_model, a.threads)
    t_all = time.time(); audio_all = 0.0
    for n, ln in enumerate(todo, 1):
        best = None
        for attempt in range(a.max_retries + 1):
            t0 = time.time(); tm0 = dict(eng.timing)
            x, info = render_line(eng, ln, voices, Path(a.refs), attempt)
            gen_s = time.time() - t0
            info["stage_s"] = {k: round(eng.timing[k] - tm0[k], 1) for k in ("t3", "flow", "hift")}
            info["tokens"] = eng.timing["tokens"] - tm0["tokens"]
            dur = len(x) / SR
            cps = len(ln["text"]) / max(dur, 1e-3)
            hyp, cer, wer = "", None, None
            if asr:
                hyp = asr(x); cer, wer = score(ln["text"], hyp)
            problems = []
            if cer is not None and cer > a.cer_max: problems.append(f"cer={cer:.2f}")
            if not 8 <= cps <= 22: problems.append(f"cps={cps:.1f}")
            pause = max_internal_pause(x)
            if pause > 1.6: problems.append(f"pause={pause:.1f}s")
            bad = (cer or 0) + (0.5 if problems else 0)
            rec = dict(id=ln["id"], speaker=ln["speaker"], emotion=ln.get("emotion", "neutral"), text=ln["text"],
                       dur=round(dur, 3), cps=round(cps, 1), cer=None if cer is None else round(cer, 3),
                       wer=None if wer is None else round(wer, 3), asr=hyp, attempt=attempt, gen_s=round(gen_s, 1),
                       rtf=round(gen_s / dur, 2), max_pause=round(pause, 2), problems=problems, **info)
            log.info("[%d/%d] %s %-8s try%d %.1fs audio in %.0fs (rtf %.1f; t3 %.0fs/%d tok, flow %.0fs) cps %.1f cer %s %s", n, len(todo),
                     ln["id"], ln["speaker"], attempt, dur, gen_s, gen_s / dur, info["stage_s"]["t3"], info["tokens"],
                     info["stage_s"]["flow"], cps, rec["cer"], " ".join(problems) or "ok")
            if best is None or bad < best[0]:
                best = (bad, x, rec)
            audio_all += dur
            if not problems:
                break
            if attempt >= a.max_retries and not (cer is not None and best[2]["cer"] is not None and best[2]["cer"] > a.bad_cer
                                                 and attempt < a.max_retries_bad):
                break
        _, x, rec = best
        rec["final_problems"] = rec["problems"]
        encode_mp3(x, out_dir / f"{ln['id']}.mp3")
        with open(qa_dir / f"{ln['id']}.json", "w", encoding="utf-8") as f:
            json.dump(rec, f, ensure_ascii=False, indent=1)
        update_manifest(out_dir, ln, len(x) / SR)
        release_memory()
        rss_gb = int(open("/proc/self/status").read().split("VmRSS:")[1].split()[0]) / 2 ** 20
        if n < len(todo) and ((a.limit and n >= a.limit) or rss_gb > a.max_rss_gb):
            log.info("stopping early for restart (rendered %d, rss %.1f GB, %d left)", n, rss_gb, len(todo) - n)
            sys.exit(3)
    el = time.time() - t_all
    log.info("done: %d lines, %.0fs CPU wall for %.0fs audio rendered (rtf %.2f incl. ASR/retries)", len(todo), el, audio_all, el / max(audio_all, 1))
    build_manifest(lines, out_dir)
    os.system(f"{sys.executable} {HERE / 'qa_report.py'} {a.lines} --qa-dir {qa_dir}")


if __name__ == "__main__":
    main()
