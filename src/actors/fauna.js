// Fauna nova: coelhos (modelados por metaballs, saltam e fogem), passarinhos que ciscam no chão e
// voam quando a gente chega perto, bandos no céu do vale, gaivotas planando sobre a praia, cardumes
// de peixes no mar (dá para ver do barco e do píer), peixes que pulam e borboletas nos campos de flores.
import { THREE, scene, camera, U, clamp, lerp, smooth, rand, rr, lerpAng, angDiff } from '../core.js';
import { groundH, normalY, WATER, forestDensity, sandAt, coastInfo, fromUV, HARBOR } from '../world/terrain.js';
import { depthAt, seaSurface } from '../world/ocean.js';
import { fishGeo } from '../world/village.js';
const lin = (v) => Math.pow(v, 2.2); // cores pensadas em sRGB -> linear (atributo de cor é linear)

// ------------------------------------------------------------------ coelho
function rabbitGeometry() {
  // coelho-europeu (~35 cm): volumes anatômicos sobrepostos, cor agouti com barriga clara e rabo branco
  const parts = []; const brown = [0.45, 0.38, 0.3], light = [0.8, 0.75, 0.66], white = [0.95, 0.94, 0.9];
  const el = (sx, sy, sz, x, y, z, rx = 0, c = brown, seg = 18) => { const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)); g.scale(sx, sy, sz); g.rotateX(rx); g.translate(x, y, z); const n = g.attributes.position.count; const col = new Float32Array(n * 3); g.computeVertexNormals();
    for (let i = 0; i < n; i++) { const ny = g.attributes.normal.getY(i), py = g.attributes.position.getY(i); const belly = c === brown ? clamp(-ny * 1.3 - 0.05, 0, 1) * clamp((0.16 - py) / 0.08, 0, 1) : 0; const back = c === brown ? clamp(ny, 0, 1) * 0.12 : 0; for (let j = 0; j < 3; j++) col[i * 3 + j] = lin(lerp(c[j] * (1 - back), light[j], belly)); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); parts.push(g.toNonIndexed()); };
  el(0.082, 0.088, 0.145, 0, 0.125, -0.025, -0.12); // tronco
  for (const s of [-1, 1]) el(0.058, 0.074, 0.084, s * 0.05, 0.105, -0.078, 0.2); // ancas
  el(0.064, 0.074, 0.066, 0, 0.12, 0.072, 0.25); // peito
  el(0.049, 0.053, 0.066, 0, 0.192, 0.135, 0.35); // cabeça
  for (const s of [-1, 1]) el(0.03, 0.03, 0.034, s * 0.022, 0.172, 0.172, 0); // bochechas
  el(0.024, 0.022, 0.026, 0, 0.176, 0.196, 0, [0.5, 0.39, 0.3]); // focinho
  el(0.009, 0.007, 0.006, 0, 0.181, 0.219, 0, [0.42, 0.25, 0.22], 8); // nariz
  el(0.03, 0.028, 0.028, 0, 0.145, -0.163, 0, white, 12); // rabo
  for (const s of [-1, 1]) { el(0.016, 0.042, 0.02, s * 0.032, 0.04, 0.115, 0.12); el(0.018, 0.012, 0.03, s * 0.032, 0.008, 0.13, 0, brown, 10); el(0.022, 0.02, 0.064, s * 0.052, 0.02, -0.045, 0, brown, 12); }
  let n = 0; for (const g of parts) n += g.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
function furMaterial(color) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, color });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 float rim = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.5); totalEmissiveRadiance += diffuseColor.rgb * rim * 0.22; // pelos contra a luz`); };
  m.customProgramCacheKey = () => 'fur'; return m;
}
let RAB = null;
function rabbitParts() {
  if (RAB) return RAB;
  const body = rabbitGeometry(); const ear = new THREE.SphereGeometry(1, 12, 10); ear.scale(0.021, 0.07, 0.008); ear.translate(0, 0.066, 0);
  const eye = new THREE.SphereGeometry(0.0095, 10, 8);
  RAB = { body, ear, eye, fur: furMaterial(0xffffff), earM: new THREE.MeshStandardMaterial({ color: 0x6e5240, roughness: 1 }), eyeM: new THREE.MeshStandardMaterial({ color: 0x0a0604, roughness: 0.1, envMapIntensity: 1.4 }) };
  return RAB;
}
class Rabbit {
  constructor(home, radius) {
    const P = rabbitParts(); this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    const b = new THREE.Mesh(P.body, P.fur); b.castShadow = true; b.receiveShadow = true; this.body.add(b);
    this.ears = []; for (const s of [-1, 1]) { const e = new THREE.Mesh(P.ear, P.earM); e.position.set(s * 0.018, 0.232, 0.122); e.rotation.set(-0.35, s * 0.3, s * 0.14); e.castShadow = true; this.body.add(e); this.ears.push(e); const ey = new THREE.Mesh(P.eye, P.eyeM); ey.position.set(s * 0.034, 0.203, 0.165); this.body.add(ey); }
    const sc = rr(0.9, 1.15); this.root.scale.setScalar(sc); scene.add(this.root);
    this.home = home; this.radius = radius; const a = rand() * 6.28, r = Math.sqrt(rand()) * radius; this.x = home.x + Math.cos(a) * r; this.z = home.z + Math.sin(a) * r; this.yaw = rand() * 6.28;
    this.state = 'graze'; this.t = rr(1, 6); this.hop = 0; this.hops = 0; this.y = groundH(this.x, this.z); this.twitch = 0; this.flee = 0;
  }
  update(dt, player) {
    const dp = Math.hypot(this.x - player.x, this.z - player.z); const camD = Math.hypot(this.x - camera.position.x, this.z - camera.position.z);
    this.root.visible = camD < 90; if (!this.root.visible) return;
    this.t -= dt; this.twitch = Math.max(0, this.twitch - dt * 3);
    if (dp < 7 && player.speed > 0.4 || dp < 3.2) { if (this.state !== 'flee') { this.state = 'flee'; this.t = rr(2.5, 4); this.yaw = Math.atan2(this.x - player.x, this.z - player.z) + rr(-0.5, 0.5); } }
    if (this.hop <= 0 && this.state !== 'idle' && this.state !== 'graze') {
      // decide o próximo salto
      if (this.state === 'flee') { this.hop = 0.32; this.hopLen = rr(1.1, 1.6); this.yaw += rr(-0.5, 0.5); if (this.t < 0) { this.state = 'idle'; this.t = rr(2, 5); } }
      else if (this.state === 'walk') { if (this.hops-- > 0) { this.hop = 0.42; this.hopLen = rr(0.35, 0.6); this.yaw += rr(-0.35, 0.35); } else { this.state = rand() < 0.6 ? 'graze' : 'idle'; this.t = rr(3, 9); } }
    }
    if (this.state === 'graze' || this.state === 'idle') { if (this.t < 0) { this.state = 'walk'; this.hops = (rr(2, 7)) | 0; const dh = Math.hypot(this.x - this.home.x, this.z - this.home.z); if (dh > this.radius) this.yaw = Math.atan2(this.home.x - this.x, this.home.z - this.z); } if (rand() < dt * 0.5) this.twitch = 1; }
    let lift = 0, pitch = 0, squash = 1;
    if (this.hop > 0) { const dur = this.state === 'flee' ? 0.32 : 0.42; const k = 1 - this.hop / dur; this.hop -= dt; const nx = this.x + Math.sin(this.yaw) * this.hopLen * dt / dur, nz = this.z + Math.cos(this.yaw) * this.hopLen * dt / dur; if (groundH(nx, nz) > WATER + 0.2 && normalY(nx, nz) > 0.7) { this.x = nx; this.z = nz; } else this.yaw += 1.2;
      lift = Math.sin(k * Math.PI) * this.hopLen * 0.32; pitch = Math.sin(k * Math.PI * 2) * 0.35; squash = 1 + Math.sin(k * Math.PI) * 0.12; }
    const gy = groundH(this.x, this.z); this.y = lerp(this.y, gy, clamp(dt * 12, 0, 1));
    this.root.position.set(this.x, this.y + lift, this.z); this.root.rotation.set(0, this.yaw, 0);
    const graze = this.state === 'graze' ? 1 : 0; this.gk = lerp(this.gk || 0, graze, clamp(dt * 3, 0, 1));
    this.body.rotation.x = pitch * 0.6 + this.gk * 0.28; this.body.scale.set(1 / Math.sqrt(squash), 1, squash);
    const alert = this.state === 'idle' ? 1 : 0; for (let i = 0; i < 2; i++) { const e = this.ears[i]; e.rotation.x = lerp(-0.35, -0.05, alert) - this.gk * 0.5 + (this.state === 'flee' ? -0.9 : 0) + Math.sin(this.twitch * 9 + i) * 0.15 * this.twitch; }
  }
}

// ------------------------------------------------------------------ pássaros (malha única instanciada, asas batendo no shader)
function birdGeometry(kind) {
  // corpo fusiforme + cabeça + bico + cauda + duas asas (atributo 'span': 0 no ombro, ±1 na ponta)
  const parts = []; const push = (g, span = 0, col = [1, 1, 1]) => { g = g.toNonIndexed(); const n = g.attributes.position.count; const sp = new Float32Array(n).fill(0); const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { if (span) sp[i] = g.attributes.position.getX(i) / span; c.set(col.map(lin), i * 3); } g.setAttribute('span', new THREE.BufferAttribute(sp, 1)); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); parts.push(g); };
  const gull = kind === 'gull'; const L = gull ? 0.42 : 0.14, WS = gull ? 0.62 : 0.13;
  const bodyC = gull ? [0.95, 0.95, 0.93] : [0.36, 0.28, 0.22], wingC = gull ? [0.62, 0.65, 0.68] : [0.3, 0.24, 0.19], tipC = gull ? [0.08, 0.08, 0.09] : [0.18, 0.14, 0.12];
  const body = new THREE.SphereGeometry(1, 10, 8); body.scale(L * 0.22, L * 0.2, L * 0.5); push(body, 0, bodyC);
  const head = new THREE.SphereGeometry(L * 0.16, 8, 6); head.translate(0, L * 0.07, L * 0.48); push(head, 0, bodyC);
  const beak = new THREE.ConeGeometry(L * 0.04, L * 0.18, 5); beak.rotateX(Math.PI / 2); beak.translate(0, L * 0.05, L * 0.66); push(beak, 0, gull ? [0.95, 0.75, 0.2] : [0.3, 0.25, 0.15]);
  const tail = new THREE.BufferGeometry(); tail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -L * 0.3, -L * 0.18, 0, -L * 0.75, L * 0.18, 0, -L * 0.75], 3)); push(tail, 0, gull ? bodyC : wingC);
  for (const s of [-1, 1]) { // asa com perfil afilado; a ponta é escura
    const g = new THREE.BufferGeometry(); const p = []; const c = []; const seg = 5;
    for (let i = 0; i < seg; i++) { const a = i / seg, b = (i + 1) / seg; const ch = (t) => L * (0.42 - 0.3 * t * t); const x0 = s * WS * a, x1 = s * WS * b; const sw0 = -a * a * L * 0.25, sw1 = -b * b * L * 0.25; p.push(x0, 0, sw0 + ch(a) * 0.4, x1, 0, sw1 + ch(b) * 0.4, x0, 0, sw0 - ch(a) * 0.6, x1, 0, sw1 + ch(b) * 0.4, x1, 0, sw1 - ch(b) * 0.6, x0, 0, sw0 - ch(a) * 0.6); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); g.translate(0, L * 0.06, 0);
    const n = g.attributes.position.count; const sp = new Float32Array(n), cc = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const t = g.attributes.position.getX(i) / WS * s; sp[i] = t * s; const k = smooth(0.72, 0.9, t); for (let j = 0; j < 3; j++) cc[i * 3 + j] = lin(lerp(wingC[j], tipC[j], k)); }
    g.setAttribute('span', new THREE.BufferAttribute(sp, 1)); g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); parts.push(g);
  }
  let n = 0; for (const g of parts) n += g.attributes.position.count; const pos = new Float32Array(n * 3), span = new Float32Array(n), col = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); span.set(g.attributes.span.array, o); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('span', new THREE.BufferAttribute(span, 1)); out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.computeVertexNormals(); return out;
}
function birdMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.time; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float span; attribute vec2 aFlap; uniform float uTime;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
 float fl = sin(uTime * aFlap.x + float(gl_InstanceID) * 1.7) * aFlap.y; float a = fl * abs(span) * 1.1 + abs(span) * 0.12 * (1.0 - aFlap.y);
 float sx = sign(span); vec2 r = vec2(cos(a), sin(a)); transformed.xy = vec2(transformed.x * r.x - sx * 0.0, abs(transformed.x) * r.y + transformed.y);
 transformed.y -= fl * 0.02;`); };
  m.customProgramCacheKey = () => 'bird'; return m;
}
class Flock {
  constructor(kind, n, center, opts) {
    this.kind = kind; this.n = n; this.c = center; this.o = opts; const g = birdGeometry(kind); this.flap = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); g.setAttribute('aFlap', this.flap);
    this.im = new THREE.InstancedMesh(g, birdMaterial(), n); this.im.castShadow = kind === 'gull'; this.im.frustumCulled = false; scene.add(this.im);
    this.b = Array.from({ length: n }, (_, i) => ({ ph: rand() * 6.28, r: rr(opts.r * 0.5, opts.r), h: rr(opts.h[0], opts.h[1]), sp: rr(0.8, 1.2) * (rand() < 0.5 ? 1 : -1) * opts.speed / opts.r, glide: 0, wob: rand() * 6, off: [rr(-6, 6), rr(-3, 3), rr(-6, 6)] }));
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(0, 0, 0, 'YXZ');
  }
  update(dt, t) {
    const o = this.o; const dc = Math.hypot(this.c.x - camera.position.x, this.c.z - camera.position.z); this.im.visible = dc < o.r + 700 && (!o.day || o.dayF > 0.05); if (!this.im.visible) return;
    // o centro do bando passeia devagar
    const cx = this.c.x + Math.sin(t * o.drift) * o.wander, cz = this.c.z + Math.cos(t * o.drift * 0.7) * o.wander;
    for (let i = 0; i < this.n; i++) { const b = this.b[i]; const flock = o.tight ? 1 : 0; const a = b.ph + t * (o.tight ? o.speed / o.r : b.sp); const rad = o.tight ? o.r : b.r;
      const x = cx + Math.cos(a) * rad + b.off[0] * flock, z = cz + Math.sin(a) * rad + b.off[2] * flock; const y = Math.max(groundH(x, z), WATER) + b.h + Math.sin(t * 0.4 + b.wob) * 2 + b.off[1] * flock;
      const dir = (o.tight ? 1 : Math.sign(b.sp)); const yaw = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir); const bank = -0.35 * dir * (o.tight ? 0.6 : 1);
      // planar ou bater asas: gaivotas planam quase sempre
      const glideCycle = Math.sin(t * 0.25 + b.wob) > (o.kind === 'gull' ? -0.3 : 0.55); b.glide = lerp(b.glide, glideCycle ? 1 : 0, clamp(dt * 2, 0, 1));
      this.flap.array[i * 2] = o.kind === 'gull' ? 5.5 : 15 + (i % 3); this.flap.array[i * 2 + 1] = lerp(o.kind === 'gull' ? 0.55 : 0.75, 0.04, b.glide);
      this.e.set(0, yaw, bank); this.q.setFromEuler(this.e); this.m4.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(1, 1, 1)); this.im.setMatrixAt(i, this.m4); }
    this.im.instanceMatrix.needsUpdate = true; this.flap.needsUpdate = true;
  }
}
// passarinhos no chão: ciscam e voam quando a jogadora chega perto
class GroundBirds {
  constructor(center, n) {
    const g = birdGeometry('small'); this.flap = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); g.setAttribute('aFlap', this.flap);
    this.im = new THREE.InstancedMesh(g, birdMaterial(), n); this.im.castShadow = true; this.im.frustumCulled = false; scene.add(this.im);
    this.c = center; this.n = n; this.b = Array.from({ length: n }, () => this.spawn({})); this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(0, 0, 0, 'YXZ');
  }
  spawn(b) { const a = rand() * 6.28, r = rr(0, 4); b.x = this.c.x + Math.cos(a) * r; b.z = this.c.z + Math.sin(a) * r; b.y = groundH(b.x, b.z); b.yaw = rand() * 6.28; b.state = 'peck'; b.t = rr(0.3, 2); b.hopT = 0; b.vx = b.vy = b.vz = 0; b.gone = false; return b; }
  update(dt, t, player) {
    const dc = Math.hypot(this.c.x - camera.position.x, this.c.z - camera.position.z); this.im.visible = dc < 80; if (!this.im.visible) return;
    let away = 0;
    for (let i = 0; i < this.n; i++) { const b = this.b[i]; const dp = Math.hypot(b.x - player.x, b.z - player.z);
      if (b.state !== 'fly' && dp < (player.speed > 2.5 ? 7 : 4.2)) { b.state = 'fly'; const a = Math.atan2(b.x - player.x, b.z - player.z) + rr(-0.6, 0.6); b.vx = Math.sin(a) * rr(4, 6); b.vz = Math.cos(a) * rr(4, 6); b.vy = rr(2.5, 4); b.yaw = a; b.t = rr(4, 7); }
      b.t -= dt;
      if (b.state === 'fly') { b.vy = lerp(b.vy, 2.2, dt); b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; this.flap.array[i * 2] = 18; this.flap.array[i * 2 + 1] = 0.85; if (b.t < 0) { b.gone = true; away++; } }
      else { this.flap.array[i * 2] = 0; this.flap.array[i * 2 + 1] = 0; if (b.t < 0) { b.t = rr(0.4, 2.2); if (rand() < 0.5) { b.hopT = 0.18; b.yaw += rr(-1.2, 1.2); } } if (b.hopT > 0) { b.hopT -= dt; b.x += Math.sin(b.yaw) * dt * 1.4; b.z += Math.cos(b.yaw) * dt * 1.4; } b.y = groundH(b.x, b.z) + (b.hopT > 0 ? Math.sin(b.hopT / 0.18 * Math.PI) * 0.05 : 0); }
      const peck = b.state === 'peck' ? Math.max(0, Math.sin(t * 9 + i * 2.1)) * 0.5 : 0;
      this.e.set(b.state === 'fly' ? -0.2 : 0.25 + peck, b.yaw, 0); this.q.setFromEuler(this.e); this.m4.compose(new THREE.Vector3(b.x, b.y + (b.state === 'fly' ? 0 : 0.03), b.z), this.q, new THREE.Vector3(1, 1, 1)); this.im.setMatrixAt(i, b.gone ? this.m4.makeScale(0, 0, 0) : this.m4); }
    // depois que todos foram embora e a jogadora se afastou, o bando volta
    if (this.b.every(b => b.gone) && Math.hypot(this.c.x - player.x, this.c.z - player.z) > 25) for (const b of this.b) this.spawn(b);
    this.im.instanceMatrix.needsUpdate = true; this.flap.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ peixes
class School {
  constructor(center, n, color, len) {
    const g = fishGeo(len); g.computeVertexNormals(); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
    m.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.time; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
 float wag = sin(uTime * 9.0 + float(gl_InstanceID) * 2.3 - transformed.x * 18.0) * 0.06 * smoothstep(0.1, -${(len * 0.6).toFixed(3)}, transformed.x); transformed.z += wag;`); };
    m.customProgramCacheKey = () => 'fish' + len;
    this.im = new THREE.InstancedMesh(g, m, n); this.im.frustumCulled = false; scene.add(this.im); this.c = center; this.n = n;
    this.f = Array.from({ length: n }, () => ({ o: [rr(-3, 3), rr(-0.6, 0.6), rr(-3, 3)], ph: rand() * 6.28 })); this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.a = rand() * 6;
  }
  update(dt, t) {
    // cardumes do mar se reposicionam perto de quem está olhando (do barco ou da margem), sempre em água funda
    let dc = Math.hypot(this.c.x - camera.position.x, this.c.z - camera.position.z);
    if (this.roam && dc > 110 && (this.relocT = (this.relocT || 0) - dt) < 0) { this.relocT = 2; for (let k = 0; k < 8; k++) { const a = rand() * 6.28, r = rr(14, 45); const x = camera.position.x + Math.cos(a) * r, z = camera.position.z + Math.sin(a) * r; if (depthAt(x, z) > 2.5 && Math.abs(x) < 760 && Math.abs(z) < 760) { this.c = { x, z }; dc = r; break; } } }
    this.im.visible = dc < 80; if (!this.im.visible) return;
    this.a += dt * 0.09; const R = 9; const cx = this.c.x + Math.cos(this.a) * R, cz = this.c.z + Math.sin(this.a) * R; const yaw = -this.a - Math.PI / 2;
    for (let i = 0; i < this.n; i++) { const f = this.f[i]; const x = cx + f.o[0] + Math.sin(t * 0.7 + f.ph) * 0.6, z = cz + f.o[2] + Math.cos(t * 0.6 + f.ph) * 0.6; const dep = depthAt(x, z); const y = WATER - clamp(dep * 0.45, 0.35, 2.2) + f.o[1] * 0.3;
      this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.sin(t + f.ph) * 0.15); this.m4.compose(new THREE.Vector3(x, dep > 0.5 ? y : -50, z), this.q, new THREE.Vector3(1, 1, 1)); this.im.setMatrixAt(i, this.m4); }
    this.im.instanceMatrix.needsUpdate = true;
  }
}
// um peixe que salta de vez em quando, perto de quem está olhando o mar
class Jumper {
  constructor() { this.mesh = new THREE.Mesh(fishGeo(0.5), new THREE.MeshStandardMaterial({ color: 0x9fb2ba, roughness: 0.3, metalness: 0.6 })); this.mesh.visible = false; this.mesh.castShadow = true; scene.add(this.mesh); this.t = rr(4, 9); this.k = -1; }
  update(dt, emit) {
    if (this.k < 0) { this.t -= dt; if (this.t > 0) return; const a = rand() * 6.28, r = rr(8, 26); const x = camera.position.x + Math.cos(a) * r, z = camera.position.z + Math.sin(a) * r; if (depthAt(x, z) < 1.5) { this.t = 2; return; } this.p = new THREE.Vector3(x, WATER, z); this.dir = rand() * 6.28; this.k = 0; this.dur = rr(0.7, 1.0); this.mesh.visible = true; emit && emit(x, z, 0.8); }
    this.k += dt / this.dur; const k = this.k; const h = Math.sin(k * Math.PI) * 0.9; const d = (k - 0.5) * 1.6;
    this.mesh.position.set(this.p.x + Math.sin(this.dir) * d, WATER + h - 0.1, this.p.z + Math.cos(this.dir) * d); this.mesh.rotation.set(0, this.dir - Math.PI / 2, -Math.cos(k * Math.PI) * 1.1);
    if (k >= 1) { this.k = -1; this.t = rr(4, 10); this.mesh.visible = false; emit && emit(this.mesh.position.x, this.mesh.position.z, 1.1); }
  }
}

// ------------------------------------------------------------------ borboletas
function wingTex(kind) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const cols = [['#e8892a', '#2a1a10'], ['#f4f1e6', '#7a7a70'], ['#4f7fd8', '#14203a'], ['#f2d64a', '#3a2a10']][kind]; g.fillStyle = cols[1]; g.beginPath(); g.ellipse(32, 26, 30, 22, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(26, 48, 18, 14, 0.4, 0, 7); g.fill(); g.fillStyle = cols[0]; g.beginPath(); g.ellipse(32, 26, 25, 17, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(27, 47, 13, 9, 0.4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(50 - i * 4, 12 + i * 5, 1.6, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
class Butterflies {
  constructor(zones) {
    this.list = []; const geo = new THREE.PlaneGeometry(0.06, 0.06); geo.translate(0.03, 0, 0); geo.rotateX(-Math.PI / 2);
    for (const [x, z, r, n] of zones) for (let i = 0; i < n; i++) { const kind = (rand() * 4) | 0; const m = new THREE.MeshStandardMaterial({ map: wingTex(kind), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }); const g = new THREE.Group(); const L = new THREE.Mesh(geo, m), Rw = new THREE.Mesh(geo, m); Rw.scale.x = -1; g.add(L, Rw); scene.add(g); this.list.push({ g, L, R: Rw, c: { x, z }, r, ph: rand() * 30, sp: rr(0.25, 0.45), h: rr(0.4, 1.3) }); }
  }
  update(dt, t, dayF) {
    for (const b of this.list) { const vis = dayF > 0.25 && Math.hypot(b.c.x - camera.position.x, b.c.z - camera.position.z) < 60; b.g.visible = vis; if (!vis) continue;
      const a = t * b.sp + b.ph; const x = b.c.x + Math.sin(a * 1.3) * b.r * 0.6 + Math.sin(a * 3.1) * 1.2, z = b.c.z + Math.cos(a) * b.r * 0.6 + Math.cos(a * 2.7) * 1.2; const y = groundH(x, z) + b.h + Math.sin(a * 7) * 0.25;
      const px = b.g.position.x, pz = b.g.position.z; b.g.position.set(x, y, z); b.g.rotation.y = Math.atan2(x - px, z - pz) + Math.PI / 2;
      const f = Math.sin(t * 22 + b.ph) * 0.9 + 0.35; b.L.rotation.z = f; b.R.rotation.z = -f; }
  }
}

// ------------------------------------------------------------------ montagem
export const F = { rabbits: [], flocks: [], ground: [], schools: [], jumper: null, butterflies: null };
export function spawnFauna(flowerZones) {
  // coelhos: campos abertos na orla das matas
  let tries = 0; const homes = []; while (homes.length < 9 && tries++ < 4000) { const x = rr(-380, 380), z = rr(-380, 380); if (Math.hypot(x, z) < 70) continue; const h = groundH(x, z); if (h < 1.5 || h > 45 || normalY(x, z) < 0.9 || sandAt(x, z) > 0.2) continue; const fd = forestDensity(x, z); if (fd < -0.1 || fd > 0.2) continue; if (homes.some(p => Math.hypot(p.x - x, p.z - z) < 70)) continue; homes.push({ x, z }); }
  homes.push({ x: 30, z: 62 }, { x: -60, z: 70 });
  for (const h of homes) for (let i = 0; i < 3; i++) F.rabbits.push(new Rabbit(h, 10));
  // bandos no céu do vale e gaivotas sobre a enseada
  F.flocks.push(new Flock('small', 16, { x: -40, z: -20 }, { r: 60, h: [28, 45], speed: 11, drift: 0.01, wander: 120, tight: true, kind: 'small' }));
  F.flocks.push(new Flock('small', 12, { x: 120, z: -150 }, { r: 45, h: [22, 38], speed: 10, drift: 0.013, wander: 90, tight: true, kind: 'small' }));
  const [hx, hz] = fromUV(HARBOR.u + 40, HARBOR.v); F.flocks.push(new Flock('gull', 9, { x: hx, z: hz }, { r: 45, h: [9, 26], speed: 7, drift: 0.02, wander: 35, tight: false, kind: 'gull' }));
  const [lx, lz] = fromUV(HARBOR.u + 70, HARBOR.v + 120); F.flocks.push(new Flock('gull', 5, { x: lx, z: lz }, { r: 35, h: [12, 30], speed: 6.5, drift: 0.02, wander: 30, tight: false, kind: 'gull' }));
  // passarinhos ciscando na vila, no pasto, na praça da Maré e em clareiras
  for (const c of [{ x: 6, z: 14 }, { x: -20, z: -4 }, { x: 46, z: 30 }, { x: -60, z: 40 }, { x: 90, z: -70 }, { x: -110, z: -20 }, (([x, z]) => ({ x, z }))(fromUV(HARBOR.u + 10, HARBOR.v + 4))]) F.ground.push(new GroundBirds(c, 6));
  // cardumes perto da praia e do píer
  for (const [du, dv, col, n, len] of [[96, 2, 0x8899a0, 40, 0.32], [110, -30, 0x7d8f86, 30, 0.42], [118, 40, 0x9aa6ae, 44, 0.28], [104, 75, 0xa49480, 22, 0.55], [140, -8, 0x6f8a95, 36, 0.36], [160, 30, 0x8899a0, 46, 0.3], [130, 60, 0x9a8f78, 18, 0.7], [150, -50, 0x7f9aa6, 40, 0.34], [180, 0, 0x8a9fa8, 50, 0.26], [120, 10, 0x6d7f74, 24, 0.5]]) { const [x, z] = fromUV(HARBOR.u + du, HARBOR.v + dv); const sc = new School({ x, z }, n, col, len); sc.roam = true; F.schools.push(sc); }
  // peixes nos lagos (onde há profundidade)
  for (const [lx, lz, n] of [[-170, 120, 4], [56, 144, 1], [-226, -180, 2], [214, -175, 1]]) for (let i = 0; i < n; i++) { for (let k = 0; k < 30; k++) { const x = lx + rr(-45, 45), z = lz + rr(-35, 35); if (depthAt(x, z) > 1.6) { F.schools.push(new School({ x, z }, 16 + ((rand() * 12) | 0), [0x7a7d5a, 0x8a7a5a, 0x6a7a6a][i % 3], rr(0.25, 0.45))); break; } } }
  F.jumper = new Jumper(); F.jumper2 = new Jumper();
  F.butterflies = new Butterflies(flowerZones.map(([x, z, r]) => [x, z, r, 6]));
}
export function updateFauna(dt, t, player, dayF, emitSplash) {
  for (const r of F.rabbits) r.update(dt, player);
  for (const f of F.flocks) { f.o.dayF = dayF; if (dayF < 0.08) { f.im.visible = false; continue; } f.update(dt, t); }
  for (const g of F.ground) { if (dayF < 0.1) { g.im.visible = false; continue; } g.update(dt, t, player); }
  for (const s of F.schools) s.update(dt, t);
  if (F.jumper) F.jumper.update(dt, emitSplash); if (F.jumper2) F.jumper2.update(dt, emitSplash); if (F.butterflies) F.butterflies.update(dt, t, dayF);
}
