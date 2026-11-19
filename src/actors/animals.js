// Animais do vale: ovelhas no pasto do Seu Anselmo, cervos na orla da floresta, uma raposa curiosa.
// Modelos CC0 da Quaternius. Comportamento simples e calmo: pastam, andam, e os cervos fogem se você chega perto.
import { THREE, loadGLTF, scene, camera, clamp, lerp, rand, rr, lerpAng, angDiff, Q } from '../core.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { groundH, WATER } from '../world/terrain.js';

const KINDS = {
  sheep: { file: 'sheep', h: 0.95, walk: 'Walk', run: 'Run', graze: 'Idle_Eating', idle: 'Idle', speed: 0.7, runSpeed: 2.6, shy: 0, turn: 2 },
  deer: { file: 'deer', h: 1.55, walk: 'Walk', run: 'Gallop', graze: 'Eating', idle: 'Idle', idle2: 'Idle_Headlow', speed: 1.0, runSpeed: 7.5, shy: 11, turn: 3 },
  fox: { file: 'fox', h: 0.55, walk: 'Walk', run: 'Gallop', graze: 'Eating', idle: 'Idle_2', idle2: 'Idle', speed: 1.1, runSpeed: 6, shy: 6, turn: 4 },
};
const LIB = {};
export const animals = [];
export async function loadAnimals() {
  const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
  const { gltfLoader } = await import('../core.js'); gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  await Promise.all(Object.entries(KINDS).map(async ([k, d]) => {
    const g = await loadGLTF(`a/animals/${d.file}.glb.wasm`);
    const box = new THREE.Box3().setFromObject(g.scene); const s = d.h / Math.max(0.01, box.max.y - box.min.y);
    g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.material) { o.material.metalness = 0; o.material.roughness = Math.max(o.material.roughness ?? 1, 0.8); } } });
    LIB[k] = { g, s, minY: box.min.y * s, clips: Object.fromEntries(g.animations.map(c => [c.name, c])) };
  }));
}
class Animal {
  constructor(kind, home, radius, inside) {
    const d = KINDS[kind], L = LIB[kind]; this.d = d; this.kind = kind; this.home = home; this.radius = radius; this.inside = inside;
    this.root = new THREE.Group(); const m = SkeletonUtils.clone(L.g.scene); m.scale.setScalar(L.s * rr(0.9, 1.1)); m.position.y = -L.minY; this.root.add(m); scene.add(this.root);
    this.mixer = new THREE.AnimationMixer(m); this.clips = L.clips; this.cur = null;
    const a = rand() * 6.28, r = Math.sqrt(rand()) * radius; this.x = home.x + Math.cos(a) * r; this.z = home.z + Math.sin(a) * r; this.yaw = rand() * 6.28;
    this.state = 'graze'; this.t = rr(2, 10); this.tx = this.x; this.tz = this.z; this.speed = 0; this.play(d.graze); this.mixer.update(rand() * 4);
  }
  play(name, fade = 0.4) { const c = this.clips[name]; if (!c) return; const a = this.mixer.clipAction(c); if (this.cur === a) return; a.reset().play(); if (this.cur) a.crossFadeFrom(this.cur, fade, true); this.cur = a; }
  pickTarget() { for (let i = 0; i < 12; i++) { const a = rand() * 6.28, r = Math.sqrt(rand()) * this.radius; const x = this.home.x + Math.cos(a) * r, z = this.home.z + Math.sin(a) * r; if (groundH(x, z) > WATER + 0.5 && (!this.inside || this.inside(x, z))) { this.tx = x; this.tz = z; return; } } this.tx = this.home.x; this.tz = this.home.z; }
  update(dt, player, nightF) {
    const dpx = this.x - player.x, dpz = this.z - player.z, dp = Math.hypot(dpx, dpz);
    const camD = Math.hypot(this.x - camera.position.x, this.z - camera.position.z); this.root.visible = camD < 130; if (!this.root.visible) return;
    // só projeta sombra dentro da área coberta pelo mapa de sombras (sem recorte por câmera, eles eram desenhados no mapa mesmo longe dele)
    const cast = camD < Q().shadowR + 8; if (cast !== this.cast) { this.cast = cast; this.root.traverse(o => { if (o.isMesh) o.castShadow = cast; }); }
    const d = this.d; this.t -= dt; let want = 0;
    if (d.shy && dp < d.shy && this.state !== 'flee') { this.state = 'flee'; this.t = rr(3, 5); }
    switch (this.state) {
      case 'graze': this.play(rand() < 0.5 || !d.idle2 ? d.graze : d.graze); if (this.t < 0) { if (rand() < 0.55) { this.state = 'walk'; this.pickTarget(); this.t = 20; } else { this.state = 'idle'; this.t = rr(3, 8); } } break;
      case 'idle': this.play(d.idle); if (this.t < 0) { this.state = 'graze'; this.t = rr(6, 16); } break;
      case 'walk': { this.play(d.walk); want = d.speed; const dx = this.tx - this.x, dz = this.tz - this.z; if (Math.hypot(dx, dz) < 0.6 || this.t < 0) { this.state = 'graze'; this.t = rr(6, 18); want = 0; } else this.yaw = lerpAng(this.yaw, Math.atan2(dx, dz), dt * d.turn); break; }
      case 'flee': { this.play(d.run, 0.2); want = d.runSpeed; this.yaw = lerpAng(this.yaw, Math.atan2(dpx, dpz), dt * 5); if (this.t < 0 && dp > d.shy * 1.8) { this.state = 'walk'; this.tx = this.home.x + rr(-6, 6); this.tz = this.home.z + rr(-6, 6); this.t = 30; } break; }
    }
    this.speed = lerp(this.speed, want, clamp(dt * 3, 0, 1));
    if (this.speed > 0.01) { const nx = this.x + Math.sin(this.yaw) * this.speed * dt, nz = this.z + Math.cos(this.yaw) * this.speed * dt; if (groundH(nx, nz) > WATER + 0.3 && (!this.inside || this.inside(nx, nz))) { this.x = nx; this.z = nz; } else { this.yaw += Math.PI * 0.5; } }
    if (this.cur) this.cur.timeScale = this.state === 'walk' ? clamp(this.speed / d.speed, 0.4, 1.4) : 1;
    // inclina o corpo conforme o terreno
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); const h0 = groundH(this.x, this.z), hf = groundH(this.x + fx * 0.6, this.z + fz * 0.6), hb = groundH(this.x - fx * 0.6, this.z - fz * 0.6);
    this.root.position.set(this.x, h0, this.z); this.root.rotation.set(0, this.yaw, 0); this.root.rotateX(-Math.atan2(hf - hb, 1.2) * 0.8);
    this.mixer.update(camD < 70 ? dt : dt * (rand() < 0.3 ? 3 : 0));
  }
}
function inPoly(poly) { return (x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }; }
export function spawnAnimals() {
  const pasture = inPoly([[33, 39], [55, 39], [57, 57], [37, 59], [33, 46]]);
  for (let i = 0; i < 7; i++) animals.push(new Animal('sheep', { x: 45, z: 49 }, 9, pasture));
  for (const [x, z, n] of [[-70, -95, 3], [112, -78, 2], [-192, 40, 3], [208, 62, 2], [-30, -190, 2]]) for (let i = 0; i < n; i++) animals.push(new Animal('deer', { x, z }, 14));
  animals.push(new Animal('fox', { x: -40, z: 70 }, 22)); animals.push(new Animal('fox', { x: 90, z: -20 }, 18));
}
export function updateAnimals(dt, player, nightF) { for (const a of animals) a.update(dt, player, nightF); }
