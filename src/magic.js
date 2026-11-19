// Lumes (lembranças de luz), o espírito que acompanha a Lia, vaga-lumes e pólen.
import { THREE, scene, camera, U, clamp, lerp, rand, rr, VLight } from './core.js';
import { groundH } from './world/terrain.js';
import { Human } from './actors/human.js';
import { Voice } from './audio.js';
import { LINES, CAST } from './story.js';

function glowTex(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,236,200,0.45)', outer = 'rgba(255,220,170,0)') { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.2, mid); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export const GLOW = glowTex();

// ---------- figuras da lembrança: luz dourada, translúcida ----------
export function lumeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffd9a0, emissiveIntensity: 0.55, roughness: 0.7, transparent: true, opacity: 0, depthWrite: false });
  m.onBeforeCompile = (s) => {
    s.uniforms.uT = U.time;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.0);
 totalEmissiveRadiance += vec3(1.0,0.86,0.62) * fr * 1.6;
 float shimmer = 0.88 + 0.12*sin(gl_FragCoord.y*0.12 + uT*2.0);
 diffuseColor.a *= (0.28 + fr*0.72) * shimmer;`);
  };
  m.customProgramCacheKey = () => 'lume';
  return m;
}
const ANIM = { throw: 'throw', sit: 'sit', lie: 'lie', idle: 'idle', idleOld: 'idle', reach: 'interact', kneel: 'kneel', work: 'kneel', run: 'run', walk: 'walk' };
const MODEL = { torre: { eco_m: 'eco_old' }, relogios: { eco_m: 'eco_old' } };

// lanternas de papel subindo devagar, balançando
function makeLanterns(spot) {
  const g = new THREE.Group(); const L = []; const cy = groundH(spot.x, spot.z);
  for (let i = 0; i < 16; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffb060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); const a = rand() * 6.28, r = rr(1.5, 6); sp.position.set(spot.x + Math.cos(a) * r, cy + rr(0.6, 2), spot.z + Math.sin(a) * r); sp.scale.setScalar(rr(0.45, 0.7)); g.add(sp); L.push({ sp, v: rr(0.25, 0.5), ph: rand() * 6, delay: i * 0.9 + rr(0, 0.8) }); }
  scene.add(g); let t = 0;
  return { update(dt, fade) { t += dt; for (const l of L) { if (t < l.delay) continue; l.sp.position.y += l.v * dt; l.sp.position.x += Math.sin(t * 0.7 + l.ph) * dt * 0.15; l.sp.material.opacity = fade * Math.min(1, (t - l.delay) / 1.5) * (0.75 + 0.25 * Math.sin(t * 5 + l.ph)) * Math.max(0, 1 - (l.sp.position.y - cy) / 26); } },
    dispose() { scene.remove(g); for (const l of L) l.sp.material.dispose(); } };
}
// chuva em volta da câmera e relâmpagos de vez em quando
function makeRain() {
  const n = 900; const pos = new Float32Array(n * 6); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xbfd2e6, transparent: true, opacity: 0, depthWrite: false }); const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; scene.add(lines);
  const drops = Array.from({ length: n }, () => [rr(-14, 14), rr(0, 16), rr(-14, 14), rr(16, 22)]); let t = 0, flash = 0, next = 3;
  return { update(dt, fade, light) { t += dt; const c = camera.position; for (let i = 0; i < n; i++) { const d = drops[i]; d[1] -= d[3] * dt; if (d[1] < -4) { d[1] = rr(10, 16); d[0] = rr(-14, 14); d[2] = rr(-14, 14); } const x = c.x + d[0], y = c.y + d[1], z = c.z + d[2]; pos.set([x, y, z, x - 0.05, y + 0.55, z - 0.02], i * 6); } geo.attributes.position.needsUpdate = true; mat.opacity = fade * 0.42;
      next -= dt; if (next <= 0) { flash = 1; next = rr(4, 9); } flash = Math.max(0, flash - dt * 3.5); if (light && flash > 0) light.intensity += flash * 40 * fade; },
    dispose() { scene.remove(lines); geo.dispose(); mat.dispose(); } };
}

export class Lume {
  constructor(place, spot, opts, onDone) {
    this.def = place; this.onDone = onDone; this.t = 0; this.fade = 0; this.line = -1; this.done = false; this.ending = false; this.speaking = false; this.lineT = 0;
    this.mat = lumeMaterial(); this.figs = []; this.props = [];
    const yaw0 = opts.yaw ?? 0;
    for (const f of place.figures) {
      const key = f.model || (MODEL[place.id] && MODEL[place.id][f.who]) || f.who; const h = new Human(key);
      for (const m of h.meshes) { m.material = this.mat; m.castShadow = false; m.receiveShadow = false; }
      const c = Math.cos(yaw0), s = Math.sin(yaw0); let x = spot.x + f.dx * c + f.dz * s, z = spot.z - f.dx * s + f.dz * c;
      if (opts.at && opts.at[f.who]) { x = opts.at[f.who].x; z = opts.at[f.who].z; }
      // nunca dentro de uma pedra, parede ou pilar: procura o lugar livre mais perto
      if (opts.blocked && opts.blocked(x, z, 0.35)) { let best = null; for (let r = 0.3; r < 3.2 && !best; r += 0.25) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r; if (!opts.blocked(nx, nz, 0.35)) { best = [nx, nz]; break; } } if (best) { x = best[0]; z = best[1]; } }
      let y = groundH(x, z);
      if (f.top && opts.top) { x = opts.top.x; z = opts.top.z; y = opts.top.y; }
      h.root.position.set(x, y + (opts.lift || 0), z); h.root.rotation.y = (opts.at && opts.at[f.who] && opts.at[f.who].yaw !== undefined) ? opts.at[f.who].yaw : yaw0 + (f.yaw || 0);
      const an = ANIM[f.anim] || 'idle'; h.play(an, 0); if (an === 'lie') { h.current.timeScale = 0; h.current.time = 0.02; }
      h.mixer.update(rand() * 2); scene.add(h.root); if (f.hidden) h.root.visible = false; this.figs.push({ h, who: f.who, anim: an, x, y, z, t: rr(0, 3), def: f });
      // quem senta no chão ganha uma pedra de luz para sentar (faz parte da lembrança)
      if (an === 'sit' && !(f.top && opts.top)) { const ry = h.root.rotation.y; const g = new THREE.IcosahedronGeometry(0.42, 1); g.scale(1.25, 0.62, 1.0); const rock = new THREE.Mesh(g, this.mat); rock.position.set(x - Math.sin(ry) * 0.12, y + 0.2, z - Math.cos(ry) * 0.12); rock.rotation.y = ry; scene.add(rock); this.props.push(rock); }
    }
    this.yaw0 = yaw0;
    // lanternas de papel subindo (o círculo) e a tempestade (a escada)
    if (place.lanterns) this.lanterns = makeLanterns(spot); if (place.rain) this.rain = makeRain();
    // poeira de luz em volta
    const n = 90; const geo = new THREE.BufferGeometry(); this.dp = new Float32Array(n * 3); this.ds = Array.from({ length: n }, () => [rr(-3, 3), rr(0, 2.6), rr(-3, 3), rr(0, 6)]); geo.setAttribute('position', new THREE.BufferAttribute(this.dp, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({ map: GLOW, size: 0.09, color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); this.dust.frustumCulled = false; scene.add(this.dust);
    this.center = new THREE.Vector3(spot.x, groundH(spot.x, spot.z), spot.z);
    this.light = new VLight(0xffd9a8, 0, 12, 1.6, 20); this.light.position.copy(this.center).add(new THREE.Vector3(0, 2.2, 0));
    this.sub = document.getElementById('memory'); this.sub.hidden = false; document.getElementById('memTime').textContent = place.time || '';
    document.getElementById('memName').textContent = ''; document.getElementById('memText').textContent = '';
    this.lines = place.lines.slice(); this.reflect = opts.reflect || place.reflect; this.onPeak = opts.onPeak; this.peaked = false;
    Voice.prefetch([...this.lines, this.reflect]);
  }
  // o que muda quando uma fala começa: pose nova, andar até um ponto, ir embora, aparecer
  beat(f, b) {
    if (b.show) f.h.root.visible = true; if (b.hide) { f.h.root.visible = false; return; }
    const mv = b.walk || b.leave;
    if (mv) { const c = Math.cos(this.yaw0), s = Math.sin(this.yaw0); const x1 = f.x + mv[0] * c + mv[1] * s, z1 = f.z - mv[0] * s + mv[1] * c; f.move = { x0: f.x, z0: f.z, x1, z1, t: 0, d: mv[2] || 2, leave: !!b.leave, then: b.anim ? (ANIM[b.anim] || b.anim) : 'idle' }; f.h.play(f.anim === 'run' || b.leave ? 'walk' : 'walk', 0.3); return; }
    if (b.anim) { const an = ANIM[b.anim] || b.anim; f.anim = an; f.h.play(an, 0.4); if (an === 'lie') { f.h.current.timeScale = 0; f.h.current.time = 0.02; } }
  }
  skip() { Voice.stop(); this.speaking = false; this.lineT = 99; }
  nextLine() {
    this.line++;
    const id = this.line < this.lines.length ? this.lines[this.line] : (this.line === this.lines.length ? this.reflect : null);
    if (!id) { this.ending = true; return; }
    const b = this.def.beats && this.def.beats[id]; if (b) for (const w in b) { const f = this.figs.find(o => o.who === w); if (f) this.beat(f, b[w]); }
    const [who, text] = LINES[id]; const isLia = who === 'lia';
    document.getElementById('memName').textContent = isLia ? 'Lia, em pensamento' : (CAST[who] ? CAST[who].name : '');
    document.getElementById('memText').textContent = text; this.sub.classList.toggle('thought', isLia); this.sub.classList.remove('show'); void this.sub.offsetWidth; this.sub.classList.add('show');
    this.speaking = true; this.lineT = 0; this.lineMax = 2.5 + text.length * 0.075; this.who = who;
    if (isLia) this.fadeOut = true;
    Voice.say(id, { eco: !isLia, onEnd: () => { this.speaking = false; } });
  }
  update(dt, lookAt) {
    this.t += dt;
    if (this.fadeOut || this.ending) this.fade = Math.max(0, this.fade - dt / 2.5); else this.fade = Math.min(1, this.fade + dt / 2.0);
    this.mat.opacity = this.fade * 0.9; this.light.intensity = this.fade * 5; this.dust.material.opacity = this.fade * 0.8;
    const lvl = Voice.update();
    for (const f of this.figs) {
      f.t += dt; f.h.talking = (this.speaking && f.who === this.who) ? lvl : 0;
      if (f.move) { const m = f.move; m.t += dt; const k = Math.min(1, m.t / m.d); f.x = lerp(m.x0, m.x1, k); f.z = lerp(m.z0, m.z1, k); f.y = groundH(f.x, f.z); f.h.root.position.set(f.x, f.y, f.z); f.h.root.rotation.y = Math.atan2(m.x1 - m.x0, m.z1 - m.z0);
        if (k >= 1) { f.move = null; if (m.leave) f.h.root.visible = false; else { f.anim = m.then; f.h.play(m.then, 0.4); } } }
      if ((f.anim === 'throw' || f.anim === 'interact') && f.h.done() && f.t > 3) { f.t = 0; f.h.current.reset().play(); }
      f.h.update(dt); const sp = this.figs.find(o => o !== f && o.who === this.who), other = sp || this.figs.find(o => o !== f); f.h.lookAtPoint(other ? other.h.headPos : lookAt, 0.8);
    }
    for (let i = 0; i < this.ds.length; i++) { const s = this.ds[i]; this.dp[i * 3] = this.center.x + s[0] + Math.sin(this.t * 0.3 + s[3]) * 0.4; this.dp[i * 3 + 1] = this.center.y + ((s[1] + this.t * 0.18) % 2.8); this.dp[i * 3 + 2] = this.center.z + s[2] + Math.cos(this.t * 0.27 + s[3]) * 0.4; }
    this.dust.geometry.attributes.position.needsUpdate = true;
    if (this.lanterns) this.lanterns.update(dt, this.fade); if (this.rain) this.rain.update(dt, this.fade, this.light);
    // o esboço do caderno é tirado no auge da lembrança, com as figuras bem visíveis
    if (!this.peaked && this.onPeak && this.fade > 0.97 && this.line >= Math.floor(this.lines.length * 0.55)) { this.peaked = true; this.onPeak(); }
    if (this.t > 1.6 && this.line < 0) this.nextLine();
    else if (this.line >= 0 && !this.ending) { this.lineT += dt; if ((!this.speaking && this.lineT > 1.2) || this.lineT > this.lineMax + 3) this.nextLine(); }
    if (this.ending && this.fade <= 0 && !this.done) { this.done = true; this.dispose(); this.onDone && this.onDone(); }
  }
  dispose() { for (const f of this.figs) scene.remove(f.h.root); for (const m of this.props) { scene.remove(m); m.geometry.dispose(); } scene.remove(this.dust); this.light.dispose(); if (this.lanterns) this.lanterns.dispose(); if (this.rain) this.rain.dispose(); this.sub.classList.remove('show'); this.sub.hidden = true; Voice.stop(); }
}

// ---------- o espírito companheiro (uma luzinha curiosa) ----------
const spiritMat = new THREE.SpriteMaterial({ map: GLOW, color: 0xfff1d6, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
function makeSpirit(size = 1) {
  const g = new THREE.Group(); const halo = new THREE.Sprite(spiritMat.clone()); halo.scale.setScalar(0.8 * size); g.add(halo);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.05 * size, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfffaf0 })); g.add(core);
  g.userData = { halo, core, ph: rand() * 10 }; return g;
}
export const spirits = { list: [], companion: null };
export function initSpirits() {
  const c = makeSpirit(0.55); scene.add(c); const l = new VLight(0xffe2b8, 0.6, 6, 1.8).attach(c); spirits.companion = { g: c, light: l, pos: new THREE.Vector3(), idleT: 0 };
}
export function addSiteSpirits(center, count = 10, radius = 8, height = 3) { for (let i = 0; i < count; i++) { const s = makeSpirit(rr(0.5, 0.9)); scene.add(s); spirits.list.push({ g: s, c: center.clone(), r: rr(radius * 0.3, radius), h: rr(0.5, height), a: rand() * 6.28, sp: rr(0.1, 0.3) * (rand() < 0.5 ? -1 : 1), born: 0 }); } }
export function updateSpirits(dt, t, player, target, nightF, moving) {
  const C = spirits.companion; if (!C) return;
  const base = new THREE.Vector3(player.x - Math.cos(player.h) * 0.6, player.y + 1.9 + Math.sin(t * 1.7) * 0.12, player.z + Math.sin(player.h) * 0.6);
  if (moving) C.idleT = 0; else C.idleT += dt;
  let goal = base;
  // parada, a luzinha vai mostrar o caminho do próximo lugar e volta
  if (target && C.idleT > 5) { const d = new THREE.Vector3(target.x - player.x, 0, target.z - player.z); const dist = d.length(); if (dist > 8) { d.normalize(); const k = 0.5 - 0.5 * Math.cos(Math.min((C.idleT - 5) / 3, 1) * Math.PI); const swing = Math.sin((C.idleT - 5) * 0.7) * 0.5 + 0.5; goal = base.clone().addScaledVector(d, 5 * k * swing); goal.y = groundH(goal.x, goal.z) + 1.6; } }
  if (C.pos.lengthSq() === 0) C.pos.copy(base);
  C.pos.lerp(goal, 1 - Math.exp(-dt * 2)); C.g.position.copy(C.pos).add(new THREE.Vector3(Math.sin(t * 2.3) * 0.08, Math.sin(t * 3.1) * 0.06, Math.cos(t * 1.9) * 0.08));
  const pulse = 0.85 + 0.15 * Math.sin(t * 3); C.g.userData.halo.material.opacity = (0.12 + nightF * 0.6) * pulse; C.g.userData.core.visible = nightF > 0.15; C.light.intensity = (0.2 + nightF * 1.0) * pulse;
  for (const s of spirits.list) {
    s.born = Math.min(1, s.born + dt * 0.3); s.a += s.sp * dt; const x = s.c.x + Math.cos(s.a) * s.r, z = s.c.z + Math.sin(s.a) * s.r;
    s.g.position.set(x, Math.max(groundH(x, z), s.c.y) + s.h + Math.sin(t * 1.1 + s.a * 3) * 0.3, z);
    s.g.userData.halo.material.opacity = s.born * (0.15 + nightF * 0.7) * (0.7 + 0.3 * Math.sin(t * 2 + s.a * 5));
    s.g.visible = s.g.position.distanceTo(camera.position) < 140;
  }
}

// ---------- pólen dourado de dia, vaga-lumes à noite ----------
export class Motes {
  constructor(n = 260) {
    this.n = n; const geo = new THREE.BufferGeometry(); this.p = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    this.seed = Array.from({ length: n }, () => [rr(-26, 26), rr(-26, 26), rr(0.3, 4.0), rand() * 10, rand()]);
    this.mat = new THREE.PointsMaterial({ map: GLOW, size: 0.08, color: 0xffe8a8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 });
    this.pts = new THREE.Points(geo, this.mat); this.pts.frustumCulled = false; this.pts.layers.set(1); scene.add(this.pts);
  }
  update(t, px, pz, dayF, nightF, wind) {
    const cx = Math.round(px / 52) * 52, cz = Math.round(pz / 52) * 52;
    for (let i = 0; i < this.n; i++) { const s = this.seed[i]; const x = cx + s[0] + Math.sin(t * 0.21 + s[3]) * 2.5 + wind.x * ((t * 0.3 + s[3]) % 6), z = cz + s[1] + Math.cos(t * 0.17 + s[3] * 1.3) * 2.5 + wind.y * ((t * 0.3 + s[3]) % 6); const blink = nightF > 0.3 ? Math.max(0, Math.sin(t * (0.8 + s[4]) + s[3] * 7)) : 1; this.p[i * 3] = x; this.p[i * 3 + 1] = groundH(x, z) + s[2] * (nightF > 0.3 ? 0.5 : 1) + Math.sin(t * 0.7 + s[3]) * 0.4 - (blink < 0.05 ? 500 : 0); this.p[i * 3 + 2] = z; }
    this.pts.geometry.attributes.position.needsUpdate = true;
    this.mat.color.setRGB(lerp(1.0, 0.8, nightF), lerp(0.92, 1.0, nightF), lerp(0.7, 0.42, nightF)); this.mat.size = lerp(0.06, 0.14, nightF);
    this.mat.opacity = (0.3 * dayF + 0.95 * nightF) * (0.85 + 0.15 * Math.sin(t * 2));
  }
}

// ---------- a Chuva de Lumes: lanternas de luz subindo de todo o vale ----------
export class LumeRain {
  constructor(center, n = 420) {
    const geo = new THREE.BufferGeometry(); this.p = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); this.n = n; this.t = 0;
    this.s = Array.from({ length: n }, () => { const a = rand() * 6.28, r = Math.sqrt(rand()) * 260; const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r; return [x, groundH(x, z) + rr(0, 2), z, rr(0, 14), rr(0.6, 1.4), rand() * 6]; });
    this.mat = new THREE.PointsMaterial({ map: GLOW, size: 1.1, color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false });
    this.pts = new THREE.Points(geo, this.mat); this.pts.frustumCulled = false; scene.add(this.pts);
  }
  update(dt) { this.t += dt; this.mat.opacity = Math.min(1, this.t / 6) * 0.95; for (let i = 0; i < this.n; i++) { const s = this.s[i]; const k = Math.max(0, this.t - s[3]); this.p[i * 3] = s[0] + Math.sin(k * 0.4 + s[5]) * 2; this.p[i * 3 + 1] = s[1] + k * k * 0.12 * s[4] + k * 0.8; this.p[i * 3 + 2] = s[2] + Math.cos(k * 0.35 + s[5]) * 2; } this.pts.geometry.attributes.position.needsUpdate = true; }
}
