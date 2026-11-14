import { THREE, scene, camera, U, clamp, lerp, rand, rr, lerpAng } from './core.js';
import { groundH } from './world/terrain.js';
import { Human } from './actors/human.js';
import { Speech } from './speech.js';

// ---------- shared textures ----------
function glowTex(inner = 'rgba(255,255,255,1)', mid = 'rgba(190,240,255,0.5)') { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.18, mid); gr.addColorStop(1, 'rgba(120,200,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const GLOW = glowTex();

// ---------- ghost (memory) figures ----------
const OUTFIT = { elowen: 'iago', teodor: 'bento', iara: 'tomas', bras: 'mateus', kid: 'tomas' };
function ghostify(h, mat) {
  for (const m of h.meshes) { if (m.name === 'Wolf3D_Headwear' && h.ghostNoHat) { m.visible = false; continue; } m.material = mat; m.castShadow = false; m.receiveShadow = false; }
  if (h.rifle) h.rifle.visible = false;
}
function ghostMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0x9fd2ff, emissive: 0x5cb8ff, emissiveIntensity: 0.6, roughness: 0.6, transparent: true, opacity: 0, depthWrite: false, side: THREE.FrontSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uT = U.time;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.2);
 totalEmissiveRadiance += vec3(0.55,0.85,1.0) * fr * 1.8;
 float scan = 0.85 + 0.15*sin(gl_FragCoord.y*0.35 + uT*6.0);
 diffuseColor.a *= (0.35 + fr*0.65) * scan;`);
  };
  m.customProgramCacheKey = () => 'ghost';
  return m;
}

let sharedEchoLight = null;
export function setEchoLight(l) { sharedEchoLight = l; }
export class Echo {
  constructor(def, center, yawFaceTargets, onDone) {
    this.def = def; this.center = center; this.onDone = onDone; this.t = 0; this.fade = 0; this.line = -1; this.lineT = 0; this.done = false; this.speaking = false;
    this.mat = ghostMaterial(); this.figs = [];
    for (const f of def.figures) {
      const h = new Human(OUTFIT[f.who] || 'tomas'); h.ghostNoHat = f.who !== 'iara'; if (f.who === 'kid') h.root.scale.setScalar(0.64);
      ghostify(h, this.mat); const x = center.x + f.dx, z = center.z + f.dz; h.root.position.set(x, groundH(x, z), z);
      const tgt = yawFaceTargets(f.face, x, z); h.root.rotation.y = Math.atan2(tgt.x - x, tgt.z - z);
      if (f.anim) h.play(f.anim, 0); scene.add(h.root); this.figs.push({ h, who: f.who, x, z });
    }
    this.light = sharedEchoLight || new THREE.PointLight(0x8fd0ff, 0, 14, 1.6); this.light.color.set(0x8fd0ff); this.light.distance = 14; this.light.decay = 1.6; if (!this.light.parent) scene.add(this.light); this.light.position.set(center.x, groundH(center.x, center.z) + 2.2, center.z); scene.add(this.light);
    this.sub = document.getElementById('memory'); this.sub.hidden = false; document.getElementById('memTime').textContent = def.time || '';
    document.getElementById('memName').textContent = ''; document.getElementById('memText').textContent = '';
  }
  skip() { Speech.stop(); this.lineT = 99; }
  nextLine() {
    this.line++; const L = this.def.lines[this.line];
    if (!L) { this.ending = true; return; }
    const [name, who, text] = L; document.getElementById('memName').textContent = name; document.getElementById('memText').textContent = text; this.sub.classList.remove('show'); void this.sub.offsetWidth; this.sub.classList.add('show');
    const fig = this.figs.find(f => f.who === who); this.speaking = true; this.lineT = 0; this.lineMax = 2.5 + text.length * 0.075;
    for (const f of this.figs) { f.h.talking = 0; }
    if (fig) { fig.h.talking = 1; fig.h.play(['talk1', 'talk2', 'talk3'][this.line % 3], 0.4); }
    Speech.speak(text, who === 'kid' ? 'kid' : who, null, () => { this.speaking = false; });
  }
  update(dt, lookAt) {
    this.t += dt;
    if (!this.ending) this.fade = Math.min(1, this.fade + dt / 1.6); else this.fade = Math.max(0, this.fade - dt / 2.2);
    this.mat.opacity = this.fade * 0.85; this.light.intensity = this.fade * 6;
    for (const f of this.figs) { f.h.update(dt); f.h.lookAtPoint(lookAt, 0.8); if (!f.h.talking && f.h.currentName && /talk/.test(f.h.currentName)) f.h.play('idle', 0.5); }
    if (this.t > 1.4 && this.line < 0) this.nextLine();
    else if (this.line >= 0 && !this.ending) { this.lineT += dt; if ((!this.speaking && this.lineT > 1.4) || this.lineT > this.lineMax + 2.5) this.nextLine(); }
    if (this.ending && this.fade <= 0 && !this.done) { this.done = true; this.dispose(); this.onDone && this.onDone(); }
    return this.figs;
  }
  dispose() { for (const f of this.figs) scene.remove(f.h.root); this.light.intensity = 0; if (this.light !== sharedEchoLight) scene.remove(this.light); this.sub.classList.remove('show'); this.sub.hidden = true; Speech.stop(); }
}

// ---------- spirits ----------
const spiritMat = new THREE.SpriteMaterial({ map: GLOW, color: 0xbff0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const coreMat = new THREE.MeshBasicMaterial({ color: 0xe8fbff });
function makeSpirit(size = 1) {
  const g = new THREE.Group(); const halo = new THREE.Sprite(spiritMat.clone()); halo.scale.setScalar(0.9 * size); g.add(halo);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.06 * size, 10, 8), coreMat); g.add(core);
  // tiny face: two dark eyes, like a forest spirit
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.011 * size, 6, 4), new THREE.MeshBasicMaterial({ color: 0x203040 })); e.position.set(0.022 * s * size, 0.01 * size, 0.055 * size); core.add(e); }
  g.userData = { halo, core, ph: rand() * 10 };
  return g;
}
export const spirits = { list: [], companion: null, trail: null };
export function initSpirits() {
  const c = makeSpirit(1.25); scene.add(c); const l = new THREE.PointLight(0xa8e4ff, 1.2, 7, 1.8); c.add(l); spirits.companion = { g: c, light: l, pos: new THREE.Vector3(), idleT: 0, guideT: 0 };
  // sparkle trail
  const n = 60; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('a', new THREE.BufferAttribute(new Float32Array(n), 1));
  const mat = new THREE.PointsMaterial({ map: GLOW, size: 0.12, color: 0xcff4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts); spirits.trail = { pts, n, i: 0, age: new Float32Array(n).fill(9) };
}
export function addSiteSpirits(center, count = 10, radius = 8, height = 3) { for (let i = 0; i < count; i++) { const s = makeSpirit(rr(0.6, 1)); scene.add(s); spirits.list.push({ g: s, c: center.clone(), r: rr(radius * 0.3, radius), h: rr(0.5, height), a: rand() * 6.28, sp: rr(0.15, 0.4) * (rand() < 0.5 ? -1 : 1), born: 0 }); } }
export function updateSpirits(dt, t, player, target, nightF, moving) {
  const C = spirits.companion; if (!C) return;
  // companion: floats near the shoulder; when you stand still it drifts toward the next goal and back
  const base = new THREE.Vector3(player.x - Math.cos(player.h) * 0.7, player.y + 2.0 + Math.sin(t * 1.7) * 0.15, player.z + Math.sin(player.h) * 0.7);
  if (moving) C.idleT = 0; else C.idleT += dt;
  let goal = base;
  if (target && C.idleT > 3.5) { const d = new THREE.Vector3(target.x - player.x, 0, target.z - player.z); const dist = d.length(); if (dist > 6) { d.normalize(); const k = 0.5 - 0.5 * Math.cos(Math.min((C.idleT - 3.5) / 2.5, 1) * Math.PI); const swing = Math.sin((C.idleT - 3.5) * 0.9) * 0.5 + 0.5; goal = base.clone().addScaledVector(d, 6 * k * swing); goal.y = groundH(goal.x, goal.z) + 1.6; } }
  if (C.pos.lengthSq() === 0) C.pos.copy(base);
  C.pos.lerp(goal, 1 - Math.exp(-dt * 2.2)); C.g.position.copy(C.pos).add(new THREE.Vector3(Math.sin(t * 2.3) * 0.08, Math.sin(t * 3.1) * 0.06, Math.cos(t * 1.9) * 0.08));
  C.g.lookAt(camera.position); const pulse = 0.85 + 0.15 * Math.sin(t * 3); C.g.userData.halo.material.opacity = (0.55 + nightF * 0.45) * pulse; C.light.intensity = (0.4 + nightF * 1.6) * pulse;
  const T = spirits.trail; if (T) { const p = T.pts.geometry.attributes.position.array; T.i = (T.i + 1) % T.n; p[T.i * 3] = C.g.position.x + rr(-0.05, 0.05); p[T.i * 3 + 1] = C.g.position.y + rr(-0.05, 0.05); p[T.i * 3 + 2] = C.g.position.z + rr(-0.05, 0.05); for (let i = 0; i < T.n; i++) p[i * 3 + 1] -= dt * 0.12; T.pts.geometry.attributes.position.needsUpdate = true; T.pts.material.opacity = 0.35 + nightF * 0.5; }
  for (const s of spirits.list) {
    s.born = Math.min(1, s.born + dt * 0.4); s.a += s.sp * dt; const y = groundH(s.c.x + Math.cos(s.a) * s.r, s.c.z + Math.sin(s.a) * s.r);
    s.g.position.set(s.c.x + Math.cos(s.a) * s.r, Math.max(y, s.c.y) + s.h + Math.sin(t * 1.3 + s.a * 3) * 0.3, s.c.z + Math.sin(s.a) * s.r); s.g.lookAt(camera.position);
    s.g.userData.halo.material.opacity = s.born * (0.35 + nightF * 0.6) * (0.7 + 0.3 * Math.sin(t * 2 + s.a * 5));
    s.g.visible = s.g.position.distanceTo(camera.position) < 160;
  }
}

// ---------- floating motes: golden pollen by day, fireflies at night ----------
export class Motes {
  constructor(n = 220) {
    this.n = n; const geo = new THREE.BufferGeometry(); this.p = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    this.seed = Array.from({ length: n }, () => [rr(-22, 22), rr(-22, 22), rr(0.3, 4.5), rand() * 10]);
    this.mat = new THREE.PointsMaterial({ map: GLOW, size: 0.09, color: 0xffe8a8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 });
    this.pts = new THREE.Points(geo, this.mat); this.pts.frustumCulled = false; scene.add(this.pts);
  }
  update(t, px, pz, dayF, nightF, wind) {
    const cx = Math.round(px / 44) * 44, cz = Math.round(pz / 44) * 44;
    this.seed.forEach((s, i) => { let x = cx + s[0] + Math.sin(t * 0.21 + s[3]) * 2.5 + wind.x * ((t * 0.3 + s[3]) % 6), z = cz + s[1] + Math.cos(t * 0.17 + s[3] * 1.3) * 2.5 + wind.y * ((t * 0.3 + s[3]) % 6); this.p[i * 3] = x; this.p[i * 3 + 1] = groundH(x, z) + s[2] + Math.sin(t * 0.7 + s[3]) * 0.4; this.p[i * 3 + 2] = z; });
    this.pts.geometry.attributes.position.needsUpdate = true;
    this.mat.color.setRGB(lerp(1.0, 0.75, nightF), lerp(0.9, 1.0, nightF), lerp(0.62, 0.45, nightF)); this.mat.size = lerp(0.07, 0.13, nightF);
    this.mat.opacity = (0.35 * dayF + 0.95 * nightF) * (0.8 + 0.2 * Math.sin(t * 2));
  }
}
