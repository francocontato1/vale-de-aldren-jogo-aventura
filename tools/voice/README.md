# Voice pipeline (offline, pt-BR)

Pre-renders every spoken line of the game to `a/vox/<id>.mp3` (mono, 24 kHz, 48 kbps CBR)
plus `a/vox/manifest.json` (`{ "<id>": { "speaker", "dur", "text" } }`).

```
voices.json        per-character design: Kokoro reference recipe + Chatterbox params + emotion deltas
make_refs.py       builds refs/<speaker>.ogg (timbre/cloning prompts) with Kokoro-82M
refs/              the generated reference clips (committed so renders are reproducible)
generate.py        renders lines with Chatterbox Multilingual (language 'pt'), post-processes, ASR-checks, retries
run_all.sh         resumable full render (priority order, auto-restart on memory guard), then manifest + QA report
qa_report.py       summary table of the QA sidecars (qa/<out-dir-name>/*.json, report.tsv)
fix_loudness.py    one-off re-leveling of existing mp3s with the current limiter (used after the first full render)
voice_check.py     cast distinctness: per-speaker F0 + speaker-embedding cosine matrix of rendered lines
sample_lines.json  test script (2 lines per speaker) -> a/vox/_test/
lines.json         the game script (same schema) -> a/vox/
```

Line schema: `[{"id","speaker","text","emotion"?: "neutral|happy|sad|tender|surprised|tired|excited", "speed"?: float}]`
(optional per-line overrides: `exaggeration`, `cfg_weight`, `temperature`).
`...` / `…` in the text become real held pauses (the line is split there and joined with
`speakers.<x>.pause`-length silence, default 0.45 s); lines > 220 chars are split at sentence ends.
Write numbers out in words.

## How it works

1. **Timbre references** – `make_refs.py` synthesizes ~7–15 s of Portuguese per character with
   Kokoro-82M (lang `pt-br`, espeak-ng phonemizer), using a weighted blend of Kokoro voice style
   vectors (e.g. Odessa = af_kore 0.45 + af_nicole 0.35 + bf_emma 0.2, speed 0.82, -1 st), plus an
   optional ffmpeg rubberband pitch/formant shift (Tomé: +3 st, formants shifted, i.e. smaller vocal tract).
   The reference also sets the default pace/energy of the cloned voice, so each ref text is written
   in the character's manner (slow & paused for Odessa/Anselmo, quick for Celeste/Tomé).
2. **Rendering** – `generate.py` loads Chatterbox Multilingual, clones each reference zero-shot and
   speaks the line with `language_id='pt'`. Per line: `exaggeration`/`cfg_weight`/`temperature` =
   speaker base + emotion delta (`voices.json → emotions`). Chatterbox embeds Resemble's inaudible
   Perth watermark in its output (left on).
3. **Post** – 70 Hz high-pass, optional per-speaker pitch (Tomé +1.5 st) and per-line tempo (`speed`),
   silence trim keeping ~80 ms, loudness -18 LUFS (pyloudnorm) with true peak ≤ -1.5 dBTP
   (look-ahead limiter `alimiter` 5 ms/60 ms shaves the peaks, loudness restored), MP3 encode.
4. **QA** – round-trip ASR with whisper.cpp `small` (language pt), CER/WER on accent-less normalized
   text, speaking rate (flag outside 8–22 chars/s), longest internal pause (flag > 1.6 s). Lines with
   CER > 0.12 or a flag are re-rendered with new seeds and slightly more conservative sampling
   (`--max-retries` extra takes, default 1; up to `--max-retries-bad` = 2 when CER > `--bad-cer` 0.3);
   the best take is kept. Everything lands in `qa/<out>/<id>.json`; ASR digits are spelled out
   (num2words pt_BR) before scoring. `manifest.json` is updated atomically after every line.

Runtime notes: `OMP_WAIT_POLICY=PASSIVE` is set because on a shared/loaded CPU torch's spinning
OpenMP threads collapse (one T3 step went from 0.16 s to 3.5 s with 4 threads under load).
PyTorch's CPU allocator grows ~0.1 GB per line, so `generate.py` exits with code 3 above
`--max-rss-gb` (9) and `run_all.sh` restarts it (resume skips finished mp3s). `--flow-bf16`
(bf16 autocast of the S3Gen decoder, AMX) is ~25 % faster overall but deviates ~0.33 mean |Δlog-mel|
from fp32, so it is off by default.

Two local fixes are monkey-patched into chatterbox 0.1.7 at runtime (see `patch_chatterbox`):
the attention-spy hook leaked on every call is removed, and the "2 identical speech tokens ⇒ force
EOS" heuristic (which truncates lines at pauses) is relaxed to "≥4 after the text is spoken, ≥14 anywhere".

## Setup (CPU only, ~9 GB disk for venvs + weights, keep weights OUT of the repo)

```bash
W=/somewhere/outside/repo
apt-get install -y espeak-ng ffmpeg            # ffmpeg needs librubberband + libmp3lame (Ubuntu's has both)
# Chatterbox venv (python 3.11; torch 2.6 pinned by chatterbox-tts)
uv venv -p python3.11 $W/venv
VIRTUAL_ENV=$W/venv uv pip install chatterbox-tts==0.1.7 "setuptools<81" pywhispercpp jiwer num2words pyloudnorm soundfile scipy
# Kokoro venv (kokoro-onnx>=0.4 needs numpy 2, which conflicts with chatterbox)
uv venv -p python3.12 $W/kvenv
VIRTUAL_ENV=$W/kvenv uv pip install kokoro-onnx==0.6.1 soundfile
```

Weights (Hugging Face is not reachable from the build box, so they were fetched as Git-LFS objects
from GitHub mirrors via `https://media.githubusercontent.com/media/<owner>/<repo>/<branch>/<path>`;
verify the sha256):

| file | source | sha256 |
|---|---|---|
| chatterbox `t3_mtl23ls_v2.safetensors` (2.1 GB) | husseinnsourr/NeuralChatter@master `model_cache/ResembleAI_chatterbox/` (mirror of HF ResembleAI/chatterbox, MIT) | b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75 |
| chatterbox `s3gen.pt` (1.06 GB) | same | 9b9ff07e60b20c136e2b1b3d7563a24604e8d2c4c267888d1ee929dd0151d2a3 |
| chatterbox `ve.pt` | same | 4b16d836bc598509860f6fa068165a8bb5e9ac84f05582dfcf278a5a372879f1 |
| chatterbox `conds.pt` (default voice, unused) | same | 6552d70568833628ba019c6b03459e77fe71ca197d5c560cef9411bee9d87f4e |
| chatterbox `grapheme_mtl_merged_expanded_v1.json` | same (regular git file) | – |
| `kokoro-v1.0.onnx` (fp32) | Cokemonkey11/kokoro-tts@main (mirror of thewh1teagle/kokoro-onnx release; Kokoro-82M, Apache-2.0) | 7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5 |
| `voices-v1.0.bin` | same | d19762d46cf0e6648cb28a7711df1637aad15818185d13f4ff840d57f2f6dfed |
| whisper.cpp `ggml-small.bin` (QA only) | OpenAEC-Foundation/open-speech-studio@main `models/` (OpenAI Whisper, MIT) | 1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b |
| whisper.cpp `ggml-medium.bin` (optional QA) | sparkplugx1904/voiceoftrisma@main `models/` | 6c14d5adee5f86394037b4e4e8b59f1673b6cee10e3cf0b11bbdbee79c156208 |

Put the chatterbox files in one dir (`$CHATTERBOX_DIR`), Kokoro files in another.

## Run

```bash
cd tools/voice
$W/kvenv/bin/python make_refs.py --kokoro-dir $KOKORO_DIR            # only if voices.json 'ref' changed (--force)
$W/venv/bin/python generate.py sample_lines.json --out ../../a/vox/_test --ckpt-dir $CHATTERBOX_DIR --asr-model $W/ggml-small.bin
PY=$W/venv/bin/python ./run_all.sh lines.json --out ../../a/vox --ckpt-dir $CHATTERBOX_DIR --asr-model $W/ggml-small.bin
#   (PRIO env = comma list of id globs rendered first; default intro*,carta,chegada,od_*,lago*,...,fim*)
$W/venv/bin/python voice_check.py ../../a/vox ../../a/vox/manifest.json --ckpt-dir $CHATTERBOX_DIR --refs refs
$W/venv/bin/python qa_report.py lines.json --qa-dir qa/vox --all
```

Existing mp3s are skipped (resumable); `--force` re-renders, `--ids a,b` / `--speakers x` select.
Speed on a 4-core Xeon (no GPU): see the QA log (`qa/<out>/generate.log`).

## Licenses

- Chatterbox Multilingual weights + `chatterbox-tts` code: MIT (Resemble AI). Output carries the Perth watermark.
- Kokoro-82M weights and voices: Apache-2.0 (hexgrad); `kokoro-onnx`: MIT. Used only to make the reference clips.
- Whisper (ggml conversion) : MIT – QA only, nothing of it ships.
- espeak-ng: GPL-3.0, used as an external phonemizer tool at build time only (not shipped).
- Rendered audio in `a/vox/` is original output of the above; no third-party recordings are used.
