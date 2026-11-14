import { clamp, lerp, rr, angDiff, resolveURL } from './core.js';

const P = 'a/snd/';
const N = (base, n, pad = true) => Array.from({ length: n }, (_, i) => base + (pad ? '0' : '') + (i + 1));
const FILES = {
  ambDay: ['AMBForst_Forest_LOOP_01'], ambNight: ['AMBForst_Night_LOOP_01'], ambWind: ['WINDVege_LightWindTreesBirds_LOOP_01'], ambLake: ['AMBLake_LakeShore_LOOP_01'], ambRoom: ['AMBHome_RoomTone_LOOP_01'], ambLap: ['WATRLap_WaterLapping_LOOP_01'],
  grassWalk: N('FEETHmn_ShoeGrassWalk_OS_', 5), grassRun: N('FEETHmn_ShoeGrassRun_OS_', 5), dirtWalk: N('FEETHmn_ShoeDirtWalk_OS_', 5), dirtRun: N('FEETHmn_ShoeDirtRun_OS_', 5), woodWalk: N('FEETHmn_ShoeWoodWalk_OS_', 5),
  swing: ['SWSH_Swoosh_OS_01', 'SWSH_Swoosh_OS_02', 'SWSH_Swoosh_OS_03', 'WHSH_WhooshMedium_OS_01', 'WHSH_WhooshMedium_OS_02'], sword: ['WEAPSwrd_Sword_OS_01', 'WEAPSwrd_Sword_OS_02'], clash: ['WEAPSwrd_SwordClash_OS_01'],
  impact: N('FGHTImpt_PunchHarder_OS_', 3), gore: ['GORESqsh_BloodSquishSlimy_OS_01', 'GORESqsh_BloodSquishSlimy_OS_02'], bones: ['GOREBone_BonesBreaking_OS_01'], shell: ['BLLTShel_ShellCasingGrass_OS_01', 'BLLTShel_ShellCasingGrass_OS_02'],
  death1: ['VOXMale_Male01Death_OS_01', 'VOXMale_Male01Death_OS_02'], death2: ['VOXMale_Male02Death_OS_01', 'VOXMale_Male02Death_OS_03'], hurt1: ['VOXMale_Male01Hurt_OS_01', 'VOXMale_Male01Hurt_OS_02'], hurt2: ['VOXMale_Male02Hurt_OS_01', 'VOXMale_Male02Hurt_OS_02'],
  effort: ['VOXEfrt_Male01Effort_OS_01', 'VOXEfrt_Male02Effort_OS_01'], bark: ['ANMLDog_DogBark_OS_01', 'ANMLDog_DogBark_OS_02'], whine: ['ANMLDog_DogAttention_OS_01'],
  doorOpen: ['DOORWood_FrontDoorOpen_OS_01'], doorClose: ['DOORWood_FrontDoorClose_OS_01'], anvil: ['METLImpt_HammerAnvil_OS_01'], victory: ['MUSCStngr_VictoryOrchestral_OS_01'], loss: ['MUSCStngr_LossOrchestral_OS_01'], alert: ['DSGNImpt_ImpactCreepyReverb_OS_01'],
  gear: ['CLOTHMvmt_MovementWithGear_OS_01'], bush: ['VEGELeaf_MovementThroughBushes_OS_01'],
};
const raw = {}; // name -> ArrayBuffer promise
export function preloadSounds(track) { const all = new Set(Object.values(FILES).flat()); for (const f of all) raw[f] = track(fetch(resolveURL(P + f + '.mp3')).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null)); }

export const Sound = {
  ctx: null, buf: {}, listener: { x: 0, z: 0, yaw: 0 }, loops: {}, ready: false,
  async init() {
    if (this.ctx) return; try { const A = window.AudioContext || window.webkitAudioContext; this.ctx = new A(); } catch (e) { return; }
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4; this.comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.setValueAtTime(0, c.currentTime); this.master.gain.linearRampToValueAtTime(0.85, c.currentTime + 3); this.master.connect(this.comp);
    this.sfx = c.createGain(); this.sfx.connect(this.master); this.amb = c.createGain(); this.amb.gain.value = 0.9; this.amb.connect(this.master); this.mus = c.createGain(); this.mus.gain.value = 0.6; this.mus.connect(this.master);
    // valley echo: multi-tap delay with lowpass (cheap, no convolution)
    this.verb = c.createGain(); const taps = [[0.19, 0.32], [0.41, 0.24], [0.77, 0.15], [1.3, 0.08]];
    for (const [t, g] of taps) { const d = c.createDelay(2); d.delayTime.value = t; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const gg = c.createGain(); gg.gain.value = g; this.verb.connect(d).connect(lp).connect(gg).connect(this.sfx); }
    const n = c.sampleRate * 2; const wb = c.createBuffer(1, n, c.sampleRate); const wd = wb.getChannelData(0); for (let i = 0; i < n; i++) wd[i] = Math.random() * 2 - 1; this.white = wb;
    const bb = c.createBuffer(1, n, c.sampleRate); const bd = bb.getChannelData(0); let b = 0; for (let i = 0; i < n; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = b * 3.5; } this.brown = bb;
    // decode samples
    await Promise.all(Object.entries(raw).map(async ([k, p]) => { try { const ab = await p; if (ab) this.buf[k] = await c.decodeAudioData(ab.slice(0)); } catch (e) { } }));
    for (const k of ['ambDay', 'ambNight', 'ambWind', 'ambLake', 'ambRoom', 'ambLap']) this.loop(k);
    // fire bed (synth crackle)
    const fs = c.createBufferSource(); fs.buffer = wb; fs.loop = true; const ff = c.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = 1500; ff.Q.value = 0.7; this.fireG = c.createGain(); this.fireG.gain.value = 0; fs.connect(ff).connect(this.fireG).connect(this.amb); fs.start();
    this.startMusic(); this.ready = true;
  },
  loop(k) { const b = this.buf[FILES[k][0]]; if (!b) return; const s = this.ctx.createBufferSource(); s.buffer = b; s.loop = true; const g = this.ctx.createGain(); g.gain.value = 0; s.connect(g).connect(this.amb); s.start(0, Math.random() * b.duration); this.loops[k] = g; },
  setLoop(k, v, dt) { const g = this.loops[k]; if (!g) return; g.gain.value = lerp(g.gain.value, v, clamp(dt * 1.5, 0, 1)); },
  pan(x, z) { if (x === undefined) return { v: 1, p: 0, d: 0 }; const L = this.listener; const dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz); const rel = angDiff(Math.atan2(dx, dz), Math.atan2(-Math.sin(L.yaw), -Math.cos(L.yaw))); return { v: clamp(1 - d / 160, 0, 1) * Math.min(1, 4 / Math.max(4, d * 0.5 + 2)), p: clamp(Math.sin(-rel) * 0.8, -1, 1), d }; },
  out(node, x, z, verb = 0, bus) { const c = this.ctx; const s = this.pan(x, z); const g = c.createGain(); g.gain.value = s.v; let n = node.connect(g); if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = s.p; n = n.connect(p); } n.connect(bus || this.sfx); if (verb > 0) { const vg = c.createGain(); vg.gain.value = verb * clamp(0.5 + s.d / 50, 0.5, 1.6); n.connect(vg).connect(this.verb); } },
  play(k, o = {}) {
    if (!this.ctx) return; const list = FILES[k]; if (!list) return; const b = this.buf[list[(Math.random() * list.length) | 0]]; if (!b) return;
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = (o.rate || 1) * (o.vary === false ? 1 : rr(0.94, 1.06)); const g = c.createGain(); g.gain.value = o.vol ?? 1;
    let n = s.connect(g); if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; n = n.connect(f); }
    this.out(n, o.x, o.z, o.verb || 0, o.bus === 'mus' ? this.mus : undefined); s.start(c.currentTime + (o.delay || 0)); return s;
  },
  noise(dur, freq, type, vol, opt = {}) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (opt.delay || 0); const s = c.createBufferSource(); s.buffer = opt.brown ? this.brown : this.white; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (opt.q) f.Q.value = opt.q; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + (opt.a || 0.002)); g.gain.exponentialRampToValueAtTime(0.0001, t + (opt.a || 0.002) + dur); s.connect(f).connect(g); this.out(g, opt.x, opt.z, opt.verb || 0); s.start(t, Math.random()); s.stop(t + dur + 0.3); if (opt.sweep) { f.frequency.setValueAtTime(opt.sweep[0], t); f.frequency.exponentialRampToValueAtTime(opt.sweep[1], t + dur); } },
  tone(f0, f1, dur, vol, type = 'sine', opt = {}) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (opt.delay || 0); const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (opt.a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); let n = o.connect(g); if (opt.filter) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = opt.filter; f.Q.value = opt.q || 3; n = n.connect(f); } this.out(n, opt.x, opt.z, opt.verb || 0); o.start(t); o.stop(t + dur + 0.1); },
  // ---------- weapons ----------
  rifle(x, z, near = false) {
    const v = near ? 1 : 0.75;
    this.noise(0.012, 6000, 'highpass', 0.9 * v, { x, z });                 // supersonic crack
    this.noise(0.22, 1800, 'lowpass', 0.8 * v, { x, z, verb: 1.3 });          // muzzle blast
    this.noise(0.6, 140, 'lowpass', 1.0 * v, { x, z, brown: true, verb: 1.0 });// body
    this.tone(90, 38, 0.3, 0.6 * v, 'sine', { x, z });
    if (near) { setTimeout(() => this.lever(), 360); this.play('shell', { delay: 0.75, vol: 0.5 }); }
  },
  lever() { this.noise(0.04, 2800, 'bandpass', 0.22, { q: 4 }); this.noise(0.05, 1900, 'bandpass', 0.25, { q: 5, delay: 0.16 }); this.tone(1400, 1200, 0.04, 0.05, 'square', { delay: 0.18 }); },
  reload() { this.noise(0.035, 3800, 'bandpass', 0.18, { q: 6 }); this.tone(2400, 2200, 0.03, 0.04, 'triangle'); },
  dry() { this.noise(0.03, 3500, 'bandpass', 0.15, { q: 8 }); },
  swing() { this.play('swing', { vol: 0.75, rate: rr(1.05, 1.2) }); },
  slash(x, z) { this.play('sword', { x, z, vol: 0.55 }); this.play('impact', { x, z, vol: 0.9 }); this.play('gore', { x, z, vol: 0.55, delay: 0.02 }); },
  clash(x, z) { this.play('clash', { x, z, vol: 0.8 }); },
  effort() { this.play('effort', { vol: 0.5 }); },
  equip(w) { this.play('gear', { vol: 0.6 }); if (w === 'sword') this.play('sword', { vol: 0.25, rate: 1.3 }); else this.lever(); },
  hitFlesh(x, z) { this.play('impact', { x, z, vol: 0.8 }); this.play('gore', { x, z, vol: 0.35 }); },
  ricochet(x, z) { this.tone(2600, 800, 0.28, 0.07, 'sine', { x, z, verb: 0.6 }); this.noise(0.06, 3000, 'bandpass', 0.15, { x, z, q: 2 }); },
  hurt() { this.play('hurt1', { vol: 0.8, lp: 3500 }); },
  manHurt(x, z, v) { this.play(v === 2 ? 'hurt2' : 'hurt1', { x, z, vol: 0.9, rate: rr(0.92, 1.0) }); },
  manDie(x, z, v) { this.play(v === 2 ? 'death2' : 'death1', { x, z, vol: 1, verb: 0.4 }); },
  bodyFall(x, z, k = 1) { this.play('impact', { x, z, vol: 0.7 * k, rate: 0.55, lp: 900 }); this.noise(0.25, 180, 'lowpass', 0.5 * k, { x, z, brown: true }); this.play('bush', { x, z, vol: 0.4 * k, delay: 0.05 }); },
  // ---------- wolves ----------
  growl(x, z) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = rr(62, 78); const am = c.createOscillator(); am.frequency.value = rr(22, 30); const ag = c.createGain(); ag.gain.value = 0.5; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.15); g.gain.setValueAtTime(0.35, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    const mod = c.createGain(); mod.gain.value = 0.5; am.connect(ag).connect(mod.gain); const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 420; f1.Q.value = 1.6; const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 900;
    o.connect(mod).connect(f1).connect(f2).connect(g); this.out(g, x, z, 0.2); o.start(t); am.start(t); o.stop(t + 1.2); am.stop(t + 1.2); this.noise(0.9, 300, 'lowpass', 0.15, { x, z, brown: true, a: 0.1 }); },
  bite(x, z) { this.play('bark', { x, z, vol: 0.9, rate: 0.72 }); this.noise(0.06, 1200, 'bandpass', 0.3, { x, z, q: 2, delay: 0.05 }); },
  wolfHurt(x, z) { this.play('whine', { x, z, vol: 0.8, rate: rr(0.82, 0.92) }); },
  wolfDie(x, z) { this.play('whine', { x, z, vol: 0.9, rate: 0.72, verb: 0.3 }); this.play('bark', { x, z, vol: 0.4, rate: 0.6, lp: 1200 }); },
  howl(x, z) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime; const f0 = rr(360, 440); const out = c.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.16, t + 0.6); out.gain.setValueAtTime(0.16, t + 2.6); out.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    for (const [mul, vol] of [[1, 1], [2, 0.25], [3, 0.08]]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0 * 0.72 * mul, t); o.frequency.linearRampToValueAtTime(f0 * mul, t + 0.7); o.frequency.linearRampToValueAtTime(f0 * 1.04 * mul, t + 2.4); o.frequency.linearRampToValueAtTime(f0 * 0.7 * mul, t + 3.7); const lfo = c.createOscillator(); lfo.frequency.value = 4.8; const lg = c.createGain(); lg.gain.value = 5 * mul; lfo.connect(lg).connect(o.frequency); const g = c.createGain(); g.gain.value = vol; o.connect(g).connect(out); o.start(t); lfo.start(t); o.stop(t + 3.9); lfo.stop(t + 3.9); }
    this.out(out, x, z, 1.6); },
  // ---------- world ----------
  step(kind, vol = 1, x, z, run = false) { if (kind === 'water') { this.noise(0.25, 650, 'lowpass', 0.1 * vol, { x, z }); this.noise(0.12, 2500, 'bandpass', 0.05 * vol, { x, z, q: 1 }); return; } const k = kind === 'wood' ? 'woodWalk' : kind === 'dirt' || kind === 'stone' ? (run ? 'dirtRun' : 'dirtWalk') : (run ? 'grassRun' : 'grassWalk'); this.play(k, { x, z, vol: 0.45 * vol }); },
  splash(x, z, k = 1) { this.noise(0.4, 900, 'lowpass', 0.25 * k, { x, z }); this.noise(0.2, 3000, 'bandpass', 0.12 * k, { x, z, q: 0.8, delay: 0.03 }); },
  door(open, x, z) { this.play(open ? 'doorOpen' : 'doorClose', { x, z, vol: 0.7 }); },
  shout(x, z) { this.play('effort', { x, z, vol: 0.8, rate: 0.9 }); },
  alert() { this.play('alert', { vol: 0.35, bus: 'mus' }); },
  victory() { this.play('victory', { vol: 0.55, bus: 'mus', vary: false }); },
  loss() { this.play('loss', { vol: 0.6, bus: 'mus', vary: false }); },
  clang(x, z) { this.play('anvil', { x, z, vol: 0.5 }); },
  pickup() { this.play('gear', { vol: 0.5, rate: 1.2 }); },
  chime() { [392, 523, 659].forEach((f, i) => this.tone(f, f, 2.0, 0.05, 'sine', { delay: i * 0.25, verb: 0.6 })); },
  click() { this.tone(500, 420, 0.04, 0.025, 'triangle'); },
  // ---------- generative ambient score ----------
  startMusic() {
    const c = this.ctx; this.musicG = c.createGain(); this.musicG.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; this.musicG.connect(lp).connect(this.mus);
    const chords = [[146.8, 220, 293.7, 349.2], [116.5, 174.6, 233.1, 293.7], [130.8, 196, 261.6, 329.6], [110, 164.8, 220, 277.2]]; let ci = 0;
    const playChord = () => { if (!this.ctx) return; const t = c.currentTime; const ch = chords[ci++ % chords.length];
      ch.forEach((f, i) => { for (const det of [-3, 3]) { const o = c.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = det; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 / (i + 1.5), t + 4); g.gain.linearRampToValueAtTime(0.0001, t + 11); o.connect(g).connect(this.musicG); o.start(t); o.stop(t + 11.5); } });
      if (Math.random() < 0.7) { const notes = ch.map(f => f * 2); for (let k = 0; k < 3; k++) { const f = notes[(Math.random() * notes.length) | 0]; const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = c.createGain(); const tt = t + 2 + k * rr(1.5, 2.5); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.025, tt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tt + 3); o.connect(g).connect(this.musicG); this.verb && g.connect(this.verb); o.start(tt); o.stop(tt + 3.2); } }
    };
    playChord(); this.musicTimer = setInterval(playChord, 9000);
  },
  update(dt, p) {
    if (!this.ctx || !this.ready) return; const L = this.listener; L.x = p.x; L.z = p.z; L.yaw = p.yaw;
    const inside = p.inside ? 1 : 0; const out = 1 - inside * 0.85;
    this.setLoop('ambDay', 0.5 * p.day * out * (0.5 + 0.5 * p.trees), dt);
    this.setLoop('ambWind', (0.25 + 0.25 * p.windStr + clamp((p.y - 30) / 60, 0, 1) * 0.3) * out, dt);
    this.setLoop('ambNight', 0.6 * p.night * out, dt);
    this.setLoop('ambLake', 0.7 * p.lake * out, dt);
    this.setLoop('ambLap', 0.5 * p.shore * out, dt);
    this.setLoop('ambRoom', 0.35 * inside, dt);
    this.fireG.gain.value = clamp(p.fire * 0.03 * (0.5 + 0.5 * Math.random()), 0, 0.03);
    if (this.musicG) this.musicG.gain.value = lerp(this.musicG.gain.value, p.combat ? 0.15 : 0.5, dt * 0.5);
  },
};
