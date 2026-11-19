"""XTTS-v2 (coqui-tts) pt render. python -I render_xtts.py <model_dir> <jobs.json> <out_dir> [threads]
jobs: [{"name","text","ref"? (wav path or list) | "studio"? (built-in speaker name), "temperature"?, "speed"?}]
Pass jobs="list" to print the built-in studio speakers."""
import sys, json, os, time
import torch, soundfile as sf
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts

md = sys.argv[1]
torch.set_num_threads(int(sys.argv[4]) if len(sys.argv) > 4 else 4)
cfg = XttsConfig(); cfg.load_json(os.path.join(md, "config.json"))
m = Xtts.init_from_config(cfg)
m.load_checkpoint(cfg, checkpoint_dir=md, use_deepspeed=False)
m.eval()
if sys.argv[2] == "list":
    print(sorted(m.speaker_manager.speakers.keys())); sys.exit()
jobs, out = json.load(open(sys.argv[2])), sys.argv[3]
os.makedirs(out, exist_ok=True)
tf = os.path.join(out, "timing.json")
tim = json.load(open(tf)) if os.path.exists(tf) else {}
cache = {}
for j in jobs:
    dst = os.path.join(out, j["name"] + ".wav")
    if os.path.exists(dst):
        continue
    def cond(studio, ref):
        key = studio or json.dumps(ref)
        if key not in cache:
            if studio:
                s = m.speaker_manager.speakers[studio]; cache[key] = (s["gpt_cond_latent"], s["speaker_embedding"])
            else:
                refs = ref if isinstance(ref, list) else [ref]; cache[key] = m.get_conditioning_latents(audio_path=refs)
        return cache[key]
    g, e = cond(j.get("studio"), j.get("ref"))
    key = j.get("studio") or json.dumps(j.get("ref"))
    # estilo (entonação, emoção) de outra gravação, timbre da voz escolhida
    if j.get("style_ref"): g = cond(None, j["style_ref"])[0]
    if j.get("style_studio"): g = cond(j["style_studio"], None)[0]
    torch.manual_seed(j.get("seed", 1234))
    t = time.time()
    import re, numpy as np
    def say(txt):
        with torch.inference_mode():
            o = m.inference(txt, "pt", g, e, temperature=j.get("temperature", 0.7), repetition_penalty=j.get("rep", 10.0), top_p=j.get("top_p", 0.85),
                            speed=j.get("speed", 1.0), enable_text_splitting=False)
        w = o["wav"]; w = w.cpu().numpy() if hasattr(w, "cpu") else np.asarray(w)
        # corta silêncio nas pontas (o XTTS deixa respiro irregular)
        a = np.abs(w); thr = max(a.max() * 0.02, 1e-4); nz = np.where(a > thr)[0]
        return w[max(0, nz[0] - 600): nz[-1] + 1200] if len(nz) else w
    if j.get("split"):
        # frase por frase: a pontuação final de cada frase fica (pergunta soa como pergunta), sem ponto final no texto
        # (o XTTS às vezes lê "ponto"); as pausas entre frases são nossas, não do modelo
        parts = [p.strip() for p in re.findall(r'[^.!?…]+[.!?…]*', j["text"]) if p.strip()]
        gap = {'.': 0.34, '?': 0.30, '!': 0.32, '…': 0.55}
        chunks = []
        for k, p in enumerate(parts):
            end = p[-1] if p[-1] in '.!?…' else '.'
            txt = p.rstrip('.') if end == '.' else p
            chunks.append(say(txt))
            if k < len(parts) - 1: chunks.append(np.zeros(int(24000 * j.get("gaps", gap).get(end, 0.32))))
        w = np.concatenate(chunks)
    else:
        w = say(j["text"])
    dt = time.time() - t
    sf.write(dst, w, 24000)
    tim[j["name"]] = {"gen_s": round(dt, 1), "dur": round(len(w) / 24000, 2), "src": key}
    json.dump(tim, open(tf, "w"), indent=1)
    print(j["name"], tim[j["name"]], flush=True)
