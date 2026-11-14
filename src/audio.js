// Som ambiente, passos, música (faixas gravadas com silêncios entre elas) e vozes dubladas.
import { clamp, lerp, rr, angDiff, resolveURL } from './core.js';
import { LINES, speaker } from './story.js';

const P = 'a/snd/';
const N = (base, n) => Array.from({ length: n }, (_, i) => base + '0' + (i + 1));
const FILES = {
  ambDay: ['AMBForst_Forest_LOOP_01'], ambNight: ['AMBForst_Night_LOOP_01'], ambWind: ['WINDVege_LightWindTreesBirds_LOOP_01'], ambLake: ['AMBLake_LakeShore_LOOP_01'], ambRoom: ['AMBHome_RoomTone_LOOP_01'], ambLap: ['WATRLap_WaterLapping_LOOP_01'], chimes: ['MUSCChim_WindChimes_LOOP_01'],
  grassWalk: N('FEETHmn_ShoeGrassWalk_OS_', 5), grassRun: N('FEETHmn_ShoeGrassRun_OS_', 5), dirtWalk: N('FEETHmn_ShoeDirtWalk_OS_', 5), dirtRun: N('FEETHmn_ShoeDirtRun_OS_', 5), woodWalk: N('FEETHmn_ShoeWoodWalk_OS_', 5),
  doorOpen: ['DOORWood_FrontDoorOpen_OS_01'], doorClose: ['DOORWood_FrontDoorClose_OS_01'], anvil: ['METLImpt_HammerAnvil_OS_01'],
  cloth: ['CLOTHMvmt_MovementWithGear_OS_01'], bush: ['VEGELeaf_MovementThroughBushes_OS_01'], bark: ['ANMLDog_DogBark_OS_01', 'ANMLDog_DogBark_OS_02'],
};
const raw = {};
export function preloadSounds(track) { const all = new Set(Object.values(FILES).flat()); for (const f of all) raw[f] = track(fetch(resolveURL(P + f + '.mp3')).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null)); }

// impulso de reverberação sintético (ruído filtrado com decaimento exponencial)
function makeIR(c, secs, decay, bright = 0.5) {
  const n = Math.floor(c.sampleRate * secs); const b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n; const w = Math.random() * 2 - 1; lp = lp + (w - lp) * (bright * (1 - t) + 0.05); d[i] = lp * Math.pow(1 - t, decay) * (i < c.sampleRate * 0.012 ? i / (c.sampleRate * 0.012) : 1); } }
  return b;
}

export const Sound = {
  ctx: null, buf: {}, listener: { x: 0, z: 0, yaw: 0 }, loops: {}, ready: false, vol: { master: 0.9, music: 0.55, voice: 1.0, amb: 0.9 },
  async init() {
    if (this.ctx) return; try { const A = window.AudioContext || window.webkitAudioContext; this.ctx = new A(); } catch (e) { return; }
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 3; this.comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.setValueAtTime(0, c.currentTime); this.master.gain.linearRampToValueAtTime(this.vol.master, c.currentTime + 3); this.master.connect(this.comp);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.85; this.sfx.connect(this.master);
    this.amb = c.createGain(); this.amb.gain.value = this.vol.amb; this.amb.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = this.vol.music; this.mus.connect(this.master);
    this.vox = c.createGain(); this.vox.gain.value = this.vol.voice; this.vox.connect(this.master);
    // reverberação de "vale" para efeitos e de "lembrança" para as vozes dos ecos
    this.verb = c.createConvolver(); this.verb.buffer = makeIR(c, 2.6, 3.2, 0.35); const vg = c.createGain(); vg.gain.value = 0.5; this.verb.connect(vg).connect(this.master);
    this.dream = c.createConvolver(); this.dream.buffer = makeIR(c, 4.5, 2.2, 0.6); const dg = c.createGain(); dg.gain.value = 0.85; this.dream.connect(dg).connect(this.vox);
    await Promise.all(Object.entries(raw).map(async ([k, p]) => { try { const ab = await p; if (ab) this.buf[k] = await c.decodeAudioData(ab.slice(0)); } catch (e) { } }));
    for (const k of ['ambDay', 'ambNight', 'ambWind', 'ambLake', 'ambRoom', 'ambLap', 'chimes']) this.loop(k);
    // estalos da lareira/fogueira (ruído filtrado)
    const n = c.sampleRate * 2; const wb = c.createBuffer(1, n, c.sampleRate); const wd = wb.getChannelData(0); for (let i = 0; i < n; i++) wd[i] = Math.random() < 0.002 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.08; this.white = wb;
    const fs = c.createBufferSource(); fs.buffer = wb; fs.loop = true; const ff = c.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = 1800; ff.Q.value = 0.6; this.fireG = c.createGain(); this.fireG.gain.value = 0; fs.connect(ff).connect(this.fireG).connect(this.amb); fs.start();
    this.buildSurf();
    await Promise.all([Music.init(c, this.mus), Voice.init(c, this.vox, this.dream)]);
    this.ready = true;
  },
  // mar: arrebentação sintetizada (ruído marrom em ondas lentas + chiado da espuma voltando)
  buildSurf() {
    const c = this.ctx; const n = c.sampleRate * 4; const b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } }
    const mk = (type, f, q) => { const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; return fl; };
    const src = c.createBufferSource(); src.buffer = b; src.loop = true; const body = mk('lowpass', 500, 0.5); this.surfBody = body; this.surfAmp = c.createGain(); this.surfAmp.gain.value = 0;
    const src2 = c.createBufferSource(); src2.buffer = this.white || b; src2.loop = true; const hiss = mk('bandpass', 3200, 0.4); this.surfHissAmp = c.createGain(); this.surfHissAmp.gain.value = 0;
    this.surfG = c.createGain(); this.surfG.gain.value = 0; src.connect(body).connect(this.surfAmp).connect(this.surfG); src2.connect(hiss).connect(this.surfHissAmp).connect(this.surfG); this.surfG.connect(this.amb);
    src.start(); src2.start(0, 1.3); this.surfT = 0; this.surfP = 8;
  },
  updateSurf(dt, k) {
    if (!this.surfG) return; this.surfG.gain.value = lerp(this.surfG.gain.value, k * 0.8, clamp(dt * 1.5, 0, 1)); if (k < 0.01) return;
    this.surfT += dt; if (this.surfT > this.surfP) { this.surfT = 0; this.surfP = rr(6.5, 10.5); this.surfBig = rr(0.6, 1.0); }
    const t = this.surfT / this.surfP; // subida da onda, quebra, espuma voltando
    const swell = Math.pow(Math.sin(Math.min(1, t / 0.55) * Math.PI * 0.5), 3) * (t < 0.55 ? 1 : Math.exp(-(t - 0.55) * 6)) * (this.surfBig || 0.8);
    const wash = t > 0.5 ? Math.exp(-(t - 0.5) * 3.2) * (1 - Math.exp(-(t - 0.5) * 30)) : 0;
    this.surfAmp.gain.value = 0.25 + swell * 1.2; this.surfBody.frequency.value = 280 + swell * 900; this.surfHissAmp.gain.value = wash * 0.5 * (this.surfBig || 0.8);
  },
  loop(k) { const b = this.buf[FILES[k][0]]; if (!b) return; const s = this.ctx.createBufferSource(); s.buffer = b; s.loop = true; const g = this.ctx.createGain(); g.gain.value = 0; s.connect(g).connect(this.amb); s.start(0, Math.random() * b.duration); this.loops[k] = g; },
  setLoop(k, v, dt) { const g = this.loops[k]; if (!g) return; g.gain.value = lerp(g.gain.value, v, clamp(dt * 1.2, 0, 1)); },
  pan(x, z) { if (x === undefined) return { v: 1, p: 0, d: 0 }; const L = this.listener; const dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz); const rel = angDiff(Math.atan2(dx, dz), Math.atan2(-Math.sin(L.yaw), -Math.cos(L.yaw))); return { v: clamp(1 - d / 120, 0, 1) * Math.min(1, 4 / Math.max(4, d * 0.5 + 2)), p: clamp(Math.sin(-rel) * 0.7, -1, 1), d }; },
  out(node, x, z, verb = 0, bus) { const c = this.ctx; const s = this.pan(x, z); const g = c.createGain(); g.gain.value = s.v; let n = node.connect(g); if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = s.p; n = n.connect(p); } n.connect(bus || this.sfx); if (verb > 0) { const vg = c.createGain(); vg.gain.value = verb; n.connect(vg).connect(this.verb); } },
  play(k, o = {}) {
    if (!this.ctx) return; const list = FILES[k]; if (!list) return; const b = this.buf[list[(Math.random() * list.length) | 0]]; if (!b) return;
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = (o.rate || 1) * (o.vary === false ? 1 : rr(0.92, 1.08)); const g = c.createGain(); g.gain.value = o.vol ?? 1;
    let n = s.connect(g); if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; n = n.connect(f); }
    this.out(n, o.x, o.z, o.verb || 0); s.start(c.currentTime + (o.delay || 0)); return s;
  },
  tone(f0, f1, dur, vol, type = 'sine', opt = {}) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (opt.delay || 0); const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (opt.a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); this.out(g, opt.x, opt.z, opt.verb || 0); o.start(t); o.stop(t + dur + 0.1); },
  // passos: discretos, com timbre abafado e variação natural (antes eram altos demais)
  step(kind, vol = 1, x, z, run = false) {
    if (kind === 'water') { this.play('bush', { x, z, vol: 0.06 * vol, rate: rr(1.4, 1.8), lp: 900 }); return; }
    const k = kind === 'wood' ? 'woodWalk' : kind === 'dirt' || kind === 'stone' ? (run ? 'dirtRun' : 'dirtWalk') : (run ? 'grassRun' : 'grassWalk');
    const base = kind === 'wood' ? 0.13 : kind === 'grass' ? 0.11 : 0.12;
    this.play(k, { x, z, vol: base * vol * rr(0.75, 1.0), rate: rr(0.9, 1.06), lp: kind === 'grass' ? 2600 : 3800 });
  },
  // batida de asa da dragoa: sopro grave de ar empurrado
  flap(x, z, vol = 1) { if (!this.ctx || !this.white) return; const c = this.ctx, t = c.currentTime; const src = c.createBufferSource(); src.buffer = this.white; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(140, t + 0.6); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * vol, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75); src.connect(f).connect(g); this.out(g, x, z, 0.3); src.start(t, Math.random()); src.stop(t + 0.8); },
  door(open, x, z) { this.play(open ? 'doorOpen' : 'doorClose', { x, z, vol: 0.35 }); },
  clang(x, z) { this.play('anvil', { x, z, vol: 0.25, verb: 0.3 }); },
  rustle(x, z) { this.play('cloth', { x, z, vol: 0.18, rate: rr(0.9, 1.1) }); },
  bark(x, z) { this.play('bark', { x, z, vol: 0.25, verb: 0.4 }); },
  chime(k = 0) { const sets = [[523.25, 659.25, 783.99, 1046.5], [392, 493.88, 587.33, 783.99], [440, 554.37, 659.25, 880]]; sets[k % 3].forEach((f, i) => this.tone(f, f * 0.998, 2.6, 0.03, 'sine', { delay: i * 0.18, verb: 0.9 })); },
  click() { this.tone(660, 600, 0.05, 0.015, 'triangle'); },
  page() { this.play('cloth', { vol: 0.22, rate: 1.6 }); },
  update(dt, p) {
    if (!this.ctx || !this.ready) return; const L = this.listener; L.x = p.x; L.z = p.z; L.yaw = p.yaw;
    const inside = p.inside ? 1 : 0; const out = 1 - inside * 0.8;
    this.setLoop('ambDay', 0.42 * p.day * out * (0.45 + 0.55 * p.trees), dt);
    // vento: mais baixo e em rajadas (o chiado contínuo do loop parecia mar o tempo todo)
    this.setLoop('ambWind', (0.05 + 0.16 * Math.max(0, p.windStr - 0.55) + clamp((p.y - 30) / 60, 0, 1) * 0.32 + (p.flying || 0) * 0.5) * out * (1 - (p.sea || 0) * 0.5), dt);
    this.updateSurf(dt, (p.sea || 0) * out);
    this.setLoop('ambNight', 0.5 * p.night * out, dt);
    this.setLoop('ambLake', 0.55 * p.lake * out, dt);
    this.setLoop('ambLap', 0.4 * p.shore * out, dt);
    this.setLoop('ambRoom', 0.25 * inside, dt);
    this.setLoop('chimes', 0.05 * p.village * (1 - inside * 0.6), dt);
    this.fireG.gain.value = lerp(this.fireG.gain.value, clamp(p.fire * 0.5, 0, 0.5), clamp(dt * 3, 0, 1));
    // abaixa o ambiente enquanto alguém fala
    const duck = Voice.playing ? 0.55 : 1; this.amb.gain.value = lerp(this.amb.gain.value, this.vol.amb * duck, clamp(dt * 3, 0, 1));
    Music.update(dt, p);
  },
};

// ---------------- música: faixas com silêncios longos entre elas ----------------
export const Music = {
  ctx: null, bus: null, man: null, cur: null, silence: 8, t: 0, history: [], forced: null,
  async init(c, bus) { this.ctx = c; this.bus = bus; try { const r = await fetch(resolveURL('a/music/manifest.json')); if (r.ok) this.man = await r.json(); } catch (e) { } },
  has(cue) { return !!(this.man && this.man[cue]); },
  play(cue, { fade = 3, vol = 1 } = {}) {
    if (!this.ctx || !this.has(cue)) return false; this.stop(fade);
    const el = new Audio(); el.src = resolveURL(this.man[cue].file || ('a/music/' + cue + '.mp3')); el.crossOrigin = 'anonymous'; el.preload = 'auto';
    const src = this.ctx.createMediaElementSource(el); const g = this.ctx.createGain(); g.gain.value = 0; src.connect(g).connect(this.bus);
    const t = this.ctx.currentTime; g.gain.linearRampToValueAtTime(vol, t + fade);
    el.play().catch(() => { }); const it = { cue, el, g, vol }; this.cur = it; this.history.push(cue); if (this.history.length > 4) this.history.shift();
    el.onended = () => { if (this.cur === it) { this.cur = null; this.silence = rr(14, 38); } };
    return true;
  },
  stop(fade = 3) { const it = this.cur; if (!it) return; this.cur = null; const t = this.ctx.currentTime; it.g.gain.cancelScheduledValues(t); it.g.gain.setValueAtTime(it.g.gain.value, t); it.g.gain.linearRampToValueAtTime(0, t + fade); setTimeout(() => { try { it.el.pause(); } catch (e) { } }, fade * 1000 + 100); },
  stinger(cue) { if (!this.has(cue)) return; const el = new Audio(resolveURL(this.man[cue].file)); el.crossOrigin = 'anonymous'; const src = this.ctx.createMediaElementSource(el); const g = this.ctx.createGain(); g.gain.value = 0.9; src.connect(g).connect(this.bus); el.play().catch(() => { }); },
  pick(p) {
    const h = p.hour; const opts = [];
    if (p.ruins) opts.push('ruins');
    if (h >= 5 && h < 10) opts.push('morning', 'title'); else if (h >= 10 && h < 16.5) opts.push('afternoon', 'morning'); else if (h >= 16.5 && h < 19.6) opts.push('dusk', 'title'); else { opts.push('night'); if (p.village > 0.5) opts.push('village_night'); else opts.push('dusk'); }
    if (p.flying) opts.unshift('title', 'discover');
    // evita repetir as duas últimas; se não houver alternativa, repete mesmo (melhor que silêncio longo)
    const ok = opts.filter(o => this.has(o)); const fresh = ok.filter(o => !this.history.slice(-2).includes(o)); const pool = fresh.length ? fresh : ok; return pool[(Math.random() * pool.length) | 0] || null;
  },
  update(dt, p) {
    if (!this.ctx || !this.man) return;
    if (this.cur) { const duck = Voice.playing ? 0.45 : 1; this.cur.g.gain.value = lerp(this.cur.g.gain.value, this.cur.vol * duck, clamp(dt * 2, 0, 1)); return; }
    if (p.cinematic) return;
    this.silence -= dt; if (this.silence > 0) return;
    const cue = this.pick(p); if (cue) this.play(cue, { fade: 6, vol: 0.9 }); else this.silence = 12;
  },
};

// ---------------- vozes ----------------
const FEM = new Set(['lia', 'odessa', 'celeste', 'irene', 'eco_f']);
export const Voice = {
  ctx: null, bus: null, dream: null, cache: new Map(), playing: null, level: 0, man: null, analyser: null, data: null, enabled: true,
  async init(c, bus, dream) { this.ctx = c; this.bus = bus; this.dream = dream; this.analyser = c.createAnalyser(); this.analyser.fftSize = 512; this.data = new Uint8Array(this.analyser.fftSize); try { const r = await fetch(resolveURL('a/vox/manifest.json')); if (r.ok) this.man = await r.json(); } catch (e) { } },
  load(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const p = (this.man && !this.man[id]) ? Promise.resolve(null) : fetch(resolveURL('a/vox/' + id + '.mp3')).then(r => r.ok ? r.arrayBuffer() : null).then(ab => ab && this.ctx ? this.ctx.decodeAudioData(ab) : null).catch(() => null);
    this.cache.set(id, p); return p;
  },
  prefetch(ids) { if (!this.ctx) return; for (const id of ids) this.load(id); },
  stop() { if (this.playing) { const p = this.playing; this.playing = null; try { p.src.onended = null; p.src.stop(); } catch (e) { } } Speech.stop(); },
  // toca uma fala; onEnd é chamado quando ela termina (ou após um tempo estimado, sem áudio)
  async say(id, { onStart, onEnd, eco = false } = {}) {
    this.stop(); const token = (this.token = (this.token || 0) + 1);
    const text = LINES[id] ? LINES[id][1] : id; const who = speaker(id);
    const buf = this.enabled && this.ctx ? await this.load(id) : null; if (token !== this.token) return;
    // falas novas ainda sem dublagem: só legenda (a voz sintética do navegador destoaria das vozes gravadas)
    if (!buf) { const silent = this.man && !this.man[id]; Speech.speak(text, who, onStart, onEnd, this.enabled && !silent); return; }
    const c = this.ctx; const src = c.createBufferSource(); src.buffer = buf; const g = c.createGain(); g.gain.value = eco ? 0.85 : 1;
    src.connect(g); g.connect(this.analyser);
    if (eco) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 160; g.connect(hp).connect(lp).connect(this.bus); const send = c.createGain(); send.gain.value = 0.7; g.connect(send).connect(this.dream); }
    else g.connect(this.bus);
    const it = { src, id }; this.playing = it; onStart && onStart();
    // 'ended' às vezes não chega (abas em segundo plano, alguns navegadores): um relógio garante o fim
    let fin = false; const done = () => { if (fin) return; fin = true; if (this.playing === it) this.playing = null; onEnd && onEnd(); };
    src.onended = done; setTimeout(() => { if (!fin && this.playing === it) { try { src.stop(); } catch (e) { } done(); } }, buf.duration * 1000 + 600);
    src.start();
  },
  // amplitude atual (0..1) para animar a fala dos personagens
  update() { if (!this.analyser || !this.playing) { this.level = Math.max(0, this.level - 0.08); return this.level; } this.analyser.getByteTimeDomainData(this.data); let s = 0; for (let i = 0; i < this.data.length; i++) { const v = (this.data[i] - 128) / 128; s += v * v; } const rms = Math.sqrt(s / this.data.length); this.level = lerp(this.level, clamp(rms * 5, 0, 1), 0.5); return this.level; },
};

// reserva: síntese do navegador, escolhendo vozes femininas/masculinas por personagem
const PROFILE = { lia: [1.05, 0.95], odessa: [0.92, 0.85], anselmo: [0.75, 0.82], celeste: [1.1, 1.05], tome: [1.5, 1.08], irene: [1.15, 0.92], bastiao: [0.7, 0.9], eco_m: [0.85, 0.88], eco_f: [1.05, 0.88], narrador: [0.85, 0.9] };
export const Speech = {
  ok: typeof window !== 'undefined' && 'speechSynthesis' in window, vf: null, vm: null,
  init() {
    if (!this.ok) return;
    const pick = () => { const vs = speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang)); if (!vs.length) return; const br = vs.filter(v => /BR/i.test(v.lang)); const pool = br.length ? br : vs; const nat = (v) => /natural|online|neural/i.test(v.name) ? 2 : /google/i.test(v.name) ? 1 : 0;
      const fem = /francisca|thalita|maria|luciana|vit[oó]ria|fernanda|camila|leticia|let[ií]cia|female|google/i, mas = /antonio|ant[oô]nio|daniel|felipe|donato|fabio|humberto|julio|nicolau|valerio|male/i;
      this.vf = pool.filter(v => fem.test(v.name)).sort((a, b) => nat(b) - nat(a))[0] || pool[0]; this.vm = pool.filter(v => mas.test(v.name) && !/female/i.test(v.name)).sort((a, b) => nat(b) - nat(a))[0] || pool[0]; };
    pick(); speechSynthesis.onvoiceschanged = pick;
  },
  speak(text, who, onStart, onEnd, enabled = true) {
    this.stop();
    if (!this.ok || !enabled) { onStart && onStart(); onEnd && setTimeout(onEnd, Math.min(9000, 900 + text.length * 55)); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/\.\.\./g, ','));
    const v = FEM.has(who) ? this.vf : this.vm; const p = PROFILE[who] || [1, 1]; if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'pt-BR'; u.pitch = p[0]; u.rate = p[1];
    // tempo mínimo de leitura, mesmo que a voz do navegador falhe ou termine cedo
    const minEnd = performance.now() + 900 + text.length * 50; let ended = false;
    const done = () => { if (ended) return; ended = true; const wait = Math.max(0, minEnd - performance.now()); setTimeout(() => onEnd && onEnd(), wait); };
    u.onstart = () => onStart && onStart(); u.onend = done; u.onerror = done; speechSynthesis.speak(u); setTimeout(done, 1500 + text.length * 90);
  },
  stop() { if (this.ok) { try { speechSynthesis.cancel(); } catch (e) { } } },
};
