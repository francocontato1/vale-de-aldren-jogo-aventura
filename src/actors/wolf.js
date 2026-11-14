import { THREE, clamp, lerp, rand, rr, Q, U, Simplex } from '../core.js';

// ---------------- anatomy (meters, +z forward, y up, +x = wolf's left) ----------------
const BONES = {
  hips: [null, 0, 0.78, -0.38], spine: ['hips', 0, 0.80, -0.06], chest: ['spine', 0, 0.80, 0.24], neck: ['chest', 0, 0.86, 0.40], head: ['neck', 0, 0.98, 0.60], jaw: ['head', 0, 0.925, 0.66],
  tail1: ['hips', 0, 0.80, -0.56], tail2: ['tail1', 0, 0.70, -0.76], tail3: ['tail2', 0, 0.56, -0.92],
};
for (const s of [1, -1]) {
  const L = s > 0 ? 'L' : 'R';
  Object.assign(BONES, {
    ['fs' + L]: ['chest', 0.115 * s, 0.70, 0.30], ['fe' + L]: ['fs' + L, 0.12 * s, 0.44, 0.24], ['fw' + L]: ['fe' + L, 0.12 * s, 0.13, 0.28], ['fp' + L]: ['fw' + L, 0.12 * s, 0.035, 0.31],
    ['hh' + L]: ['hips', 0.115 * s, 0.72, -0.42], ['hk' + L]: ['hh' + L, 0.125 * s, 0.47, -0.31], ['ha' + L]: ['hk' + L, 0.12 * s, 0.22, -0.47], ['hp' + L]: ['ha' + L, 0.12 * s, 0.035, -0.43],
  });
}
const P = (bone, kind, a, b, ra, rb) => ({ bone, kind, a: new THREE.Vector3(...a), b: b ? new THREE.Vector3(...b) : null, ra, rb });
const PRIMS = [
  P('chest', 'ell', [0, 0.75, 0.17], null, [0.155, 0.215, 0.27]),
  P('spine', 'ell', [0, 0.79, -0.13], null, [0.125, 0.135, 0.25]),
  P('hips', 'ell', [0, 0.785, -0.40], null, [0.135, 0.15, 0.15]),
  P('neck', 'cone', [0, 0.84, 0.30], [0, 0.95, 0.54], 0.13, 0.095),
  P('head', 'ell', [0, 0.99, 0.615], null, [0.098, 0.09, 0.115]),
  P('head', 'cone', [0, 0.97, 0.69], [0, 0.945, 0.9], 0.058, 0.026),
  P('jaw', 'cone', [0, 0.925, 0.69], [0, 0.915, 0.865], 0.04, 0.02),
  P('head', 'cone', [0.06, 1.045, 0.595], [0.085, 1.17, 0.575], 0.048, 0.004),
  P('head', 'cone', [-0.06, 1.045, 0.595], [-0.085, 1.17, 0.575], 0.048, 0.004),
  P('tail1', 'cone', [0, 0.80, -0.53], [0, 0.70, -0.76], 0.055, 0.07),
  P('tail2', 'cone', [0, 0.70, -0.76], [0, 0.56, -0.92], 0.07, 0.05),
  P('tail3', 'cone', [0, 0.56, -0.92], [0, 0.46, -1.0], 0.05, 0.022),
];
for (const s of [1, -1]) {
  const L = s > 0 ? 'L' : 'R'; const B = (n) => BONES[n + L].slice(1);
  PRIMS.push(
    P('fs' + L, 'cone', [0.1 * s, 0.72, 0.27], B('fe'), 0.056, 0.042), P('fe' + L, 'cone', B('fe'), B('fw'), 0.038, 0.027), P('fw' + L, 'cone', B('fw'), B('fp'), 0.026, 0.024),
    P('fp' + L, 'ell', [0.12 * s, 0.035, 0.33], null, [0.036, 0.03, 0.052]),
    P('hh' + L, 'cone', [0.1 * s, 0.74, -0.43], B('hk'), 0.082, 0.05), P('hk' + L, 'cone', B('hk'), B('ha'), 0.042, 0.028), P('ha' + L, 'cone', B('ha'), B('hp'), 0.026, 0.024),
    P('hp' + L, 'ell', [0.12 * s, 0.035, -0.41], null, [0.035, 0.03, 0.05]),
  );
}
const _p = new THREE.Vector3(), _ba = new THREE.Vector3(), _pa = new THREE.Vector3();
function primDist(pr, x, y, z) {
  if (pr.kind === 'ell') { const r = pr.ra; const dx = (x - pr.a.x) / r[0], dy = (y - pr.a.y) / r[1], dz = (z - pr.a.z) / r[2]; const k0 = Math.sqrt(dx * dx + dy * dy + dz * dz); const k1 = Math.sqrt(dx * dx / (r[0] * r[0]) + dy * dy / (r[1] * r[1]) + dz * dz / (r[2] * r[2])); return k1 > 1e-6 ? k0 * (k0 - 1) / k1 : -Math.min(r[0], r[1], r[2]); }
  _pa.set(x - pr.a.x, y - pr.a.y, z - pr.a.z); _ba.subVectors(pr.b, pr.a); const h = clamp(_pa.dot(_ba) / _ba.dot(_ba), 0, 1); _pa.addScaledVector(_ba, -h); return _pa.length() - lerp(pr.ra, pr.rb, h);
}
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); };
function sdf(x, y, z) { let d = 1e9; for (const pr of PRIMS) { const v = primDist(pr, x, y, z); d = d > 1e8 ? v : smin(d, v, 0.045); } return d; }

// ---------------- surface nets ----------------
function surfaceNets(cell) {
  const min = [-0.3, -0.03, -1.08], max = [0.3, 1.25, 0.95];
  const nx = Math.ceil((max[0] - min[0]) / cell), ny = Math.ceil((max[1] - min[1]) / cell), nz = Math.ceil((max[2] - min[2]) / cell);
  const sx = nx + 1, sy = ny + 1; const F = new Float32Array(sx * sy * (nz + 1));
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[i + sx * (j + sy * k)] = sdf(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);
  const vid = new Int32Array(nx * ny * nz).fill(-1); const pos = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let mask = 0; for (let c = 0; c < 8; c++) { const o = corner[c]; v[c] = F[(i + o[0]) + sx * ((j + o[1]) + sy * (k + o[2]))]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let ax = 0, ay = 0, az = 0, n = 0;
    for (const [a, b] of edges) { if ((v[a] < 0) === (v[b] < 0)) continue; const t = v[a] / (v[a] - v[b]); const A = corner[a], B = corner[b]; ax += A[0] + (B[0] - A[0]) * t; ay += A[1] + (B[1] - A[1]) * t; az += A[2] + (B[2] - A[2]) * t; n++; }
    vid[i + nx * (j + ny * k)] = pos.length / 3; pos.push(min[0] + (i + ax / n) * cell, min[1] + (j + ay / n) * cell, min[2] + (k + az / n) * cell);
  }
  const idx = []; const C = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? -1 : vid[i + nx * (j + ny * k)];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const f0 = F[i + sx * (j + sy * k)] < 0;
    if (i < nx && j > 0 && k > 0) { const f1 = F[(i + 1) + sx * (j + sy * k)] < 0; if (f0 !== f1) quad(C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k), f0); }
    if (j < ny && i > 0 && k > 0) { const f1 = F[i + sx * ((j + 1) + sy * k)] < 0; if (f0 !== f1) quad(C(i - 1, j, k - 1), C(i - 1, j, k), C(i, j, k), C(i, j, k - 1), f0); }
    if (k < nz && i > 0 && j > 0) { const f1 = F[i + sx * (j + sy * (k + 1))] < 0; if (f0 !== f1) quad(C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k), f0); }
  }
  return { pos: new Float32Array(pos), idx };
}

const BONE_NAMES = Object.keys(BONES);
function buildGeometry(cell, shells) {
  const { pos, idx } = surfaceNets(cell); const nv = pos.length / 3;
  const nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), fur = new Float32Array(nv), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
  const e = 0.004; const dist = new Float32Array(PRIMS.length);
  for (let i = 0; i < nv; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e); const gl = Math.hypot(gx, gy, gz) || 1;
    nor[i * 3] = gx / gl; nor[i * 3 + 1] = gy / gl; nor[i * 3 + 2] = gz / gl;
    // skin weights
    const bw = {}; let dmin = 1e9; PRIMS.forEach((pr, k) => { dist[k] = primDist(pr, x, y, z); if (dist[k] < dmin) dmin = dist[k]; });
    PRIMS.forEach((pr, k) => { const w = Math.exp(-(dist[k] - dmin) * 60); if (w > 0.01) bw[pr.bone] = (bw[pr.bone] || 0) + w; });
    const top = Object.entries(bw).sort((a, b) => b[1] - a[1]).slice(0, 4); let tot = 0; top.forEach(t => tot += t[1]);
    for (let k = 0; k < 4; k++) { si[i * 4 + k] = top[k] ? BONE_NAMES.indexOf(top[k][0]) : 0; sw[i * 4 + k] = top[k] ? top[k][1] / tot : 0; }
    // pattern & fur length
    const ny = nor[i * 3 + 1]; const side = Math.abs(nor[i * 3]);
    const mott = 0.5 + 0.5 * Simplex(x * 18 + z * 3, y * 18 - z * 11);
    const back = clamp((ny - 0.2) * 1.5, 0, 1) * (y > 0.6 ? 1 : 0);
    let c = [0.38, 0.31, 0.23];
    c = c.map((v, j) => lerp(v, [0.13, 0.115, 0.1][j], clamp(back * 1.3 - 0.1, 0, 1)));
    const belly = clamp((-ny - 0.1) * 2, 0, 1) * (y > 0.45 ? 1 : 0.3); const throat = (z > 0.3 && y < 0.93 && ny < 0.2 && y > 0.7) ? clamp(1 - side * 1.4, 0, 1) : 0;
    const legInner = (y < 0.6 && ((x > 0 && nor[i * 3] < -0.3) || (x < 0 && nor[i * 3] > 0.3))) ? 0.8 : 0;
    const cheek = (z > 0.6 && y < 0.98 && side > 0.4) ? 0.7 : 0;
    const cream = Math.max(belly, throat, legInner, cheek);
    c = c.map((v, j) => lerp(v, [0.64, 0.56, 0.44][j], cream));
    if (y < 0.5 && cream < 0.5) c = c.map((v, j) => lerp(v, [0.44, 0.35, 0.25][j], 0.6));
    if (z > 0.72 && y > 0.94) c = c.map((v, j) => lerp(v, [0.48, 0.38, 0.28][j], 0.7));
    if (z < -0.88) c = c.map((v, j) => lerp(v, [0.08, 0.07, 0.065][j], smooth01((-0.88 - z) / 0.08)));
    if (y > 1.07) c = c.map((v, j) => lerp(v, [0.16, 0.14, 0.12][j], 0.6));
    if (z > 0.875) c = [0.06, 0.055, 0.05];
    if (z > 0.66 && y < 0.93 && y > 0.9) c = c.map(v => v * 0.45);
    const m = 0.82 + 0.36 * mott; c = c.map(v => v * m);
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    let fl = 0.03;
    if (z > 0.15 && z < 0.55 && y > 0.7) fl = 0.055; // ruff
    if (z < -0.5) fl = 0.07 * (z < -0.9 ? 0.7 : 1); // tail
    if (y < 0.5) fl = 0.012 + 0.02 * smooth01((y - 0.1) / 0.4);
    if (z > 0.58) fl = (z > 0.72) ? 0.006 : 0.016;
    if (y > 1.06) fl = 0.012;
    fur[i] = fl;
  }
  // base mesh + shells (bit-reversed order so any prefix covers the full length)
  const order = []; for (let s = 0; s < shells; s++) order.push(s);
  const br = (n, bits) => { let r = 0; for (let b = 0; b < bits; b++) { r = (r << 1) | (n & 1); n >>= 1; } return r; }; const bits = Math.ceil(Math.log2(Math.max(shells, 2)));
  const ord = []; for (let s = 0; s < (1 << bits); s++) { const v = br(s, bits); if (v < shells) ord.push(v); }
  const layers = [0].concat(ord.map(v => (v + 1) / shells));
  const L = layers.length; const P2 = new Float32Array(nv * 3 * L), N2 = new Float32Array(nv * 3 * L), C2 = new Float32Array(nv * 3 * L), F2 = new Float32Array(nv * L), S2 = new Float32Array(nv * L), SI = new Uint16Array(nv * 4 * L), SW = new Float32Array(nv * 4 * L);
  const I2 = new Uint32Array(idx.length * L);
  for (let l = 0; l < L; l++) { P2.set(pos, l * nv * 3); N2.set(nor, l * nv * 3); C2.set(col, l * nv * 3); F2.set(fur, l * nv); S2.fill(layers[l], l * nv, (l + 1) * nv); SI.set(si, l * nv * 4); SW.set(sw, l * nv * 4); for (let t = 0; t < idx.length; t++) I2[l * idx.length + t] = idx[t] + l * nv; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P2, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N2, 3)); g.setAttribute('color', new THREE.BufferAttribute(C2, 3));
  g.setAttribute('furLen', new THREE.BufferAttribute(F2, 1)); g.setAttribute('shell', new THREE.BufferAttribute(S2, 1)); g.setAttribute('rest', new THREE.BufferAttribute(P2.slice(), 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  g.setIndex(new THREE.BufferAttribute(I2, 1)); g.computeBoundingSphere();
  g.userData.trisPerLayer = idx.length; g.userData.layers = L;
  return g;
}
const smooth01 = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

function furMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: THREE.FrontSide, envMapIntensity: 0.25 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time; s.uniforms.uSunDir = U.sunDir; s.uniforms.uSunCol = U.sunColor;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float furLen; attribute float shell; attribute vec3 rest; varying float vShell; varying vec3 vRest; varying float vFur; uniform float uTime;')
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>
 vec3 nn = normalize(objectNormal);
 float L = furLen * 1.3 * shell;
 vec3 comb = normalize(vec3(0.0, -0.45, -0.85));
 transformed += nn * L + (comb - nn*dot(comb,nn)) * L * shell * 0.9 + vec3(0.,-1.,0.)*L*shell*0.25;
 vShell = shell; vRest = rest; vFur = furLen;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying float vShell; varying vec3 vRest; varying float vFur; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uTime;
float fh(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
 vec4 diffuseColor = vec4( diffuse, opacity );
 if (vShell > 0.0) {
   float dens = 280.0 + 260.0*(1.0 - clamp(vFur*20.0,0.,1.));
   vec3 p = vRest * dens; vec3 c = floor(p); vec3 f = fract(p) - 0.5;
   float h = fh(c); vec3 o = vec3(fh(c+1.3), fh(c+2.7), fh(c+5.1)) - 0.5;
   float r = length(f - o*0.5);
   float len = 0.55 + 0.45*h;
   if (vShell > len) discard;
   if (r > 0.08 + 0.78*(1.0 - pow(vShell/len, 1.4))) discard;
 }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
 float sh = fract(sin(dot(floor(vRest*(280.0 + 260.0*(1.0 - clamp(vFur*20.0,0.,1.)))), vec3(12.9,78.2,37.7)))*4375.5);
 float band = (smoothstep(0.5,0.62,vShell) - smoothstep(0.78,0.9,vShell));
 diffuseColor.rgb *= mix(0.42, 1.2, smoothstep(0.0, 1.0, vShell)) * (0.75 + 0.5*sh);
 diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*0.4, band*0.65);
 diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.15,1.12,1.08), smoothstep(0.9,1.0,vShell)*0.6);
 diffuseColor.rgb = diffuseColor.rgb*0.09 + vec3(0.012,0.012,0.025);
 diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.12,1.05,0.95), smoothstep(0.7,1.0,vShell));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 vec3 sunV = normalize((viewMatrix*vec4(uSunDir,0.)).xyz); float rim = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
 totalEmissiveRadiance += vec3(0.25,0.45,0.95) * rim * (0.35 + vShell*0.9) * (0.75 + 0.25*sin(uTime*2.0 + vRest.z*9.0));`);
  };
  m.customProgramCacheKey = () => 'wolffur';
  return m;
}

let TEMPLATE = null;
export function buildWolfTemplate() {
  const shells = Q().fur;
  const geo = buildGeometry(0.017, shells);
  const mat = furMaterial();
  TEMPLATE = { geo, mat, shells };
  return TEMPLATE;
}

const _q = new THREE.Quaternion(), _e = new THREE.Euler();
export class Wolf {
  constructor(scale = 1, tint = 1) {
    if (!TEMPLATE) buildWolfTemplate();
    this.root = new THREE.Group(); const bones = {}; const list = [];
    for (const n of BONE_NAMES) { const b = new THREE.Bone(); b.name = n; bones[n] = b; list.push(b); }
    for (const n of BONE_NAMES) { const [par, x, y, z] = BONES[n]; const b = bones[n]; if (par) { const pp = BONES[par]; b.position.set(x - pp[1], y - pp[2], z - pp[3]); bones[par].add(b); } else { b.position.set(x, y, z); } }
    const tg = TEMPLATE.geo; const g2 = new THREE.BufferGeometry(); g2.index = tg.index; for (const k in tg.attributes) g2.setAttribute(k, tg.attributes[k]); g2.boundingSphere = tg.boundingSphere; g2.userData = tg.userData;
    this.mesh = new THREE.SkinnedMesh(g2, TEMPLATE.mat); this.mesh.add(bones.hips); this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(list)); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.root.add(this.mesh); this.root.scale.setScalar(scale);
    this.bones = bones; this.rest = {}; for (const n of BONE_NAMES) this.rest[n] = bones[n].quaternion.clone();
    this.restPos = {}; for (const n of BONE_NAMES) this.restPos[n] = bones[n].position.clone();
    // eyes & nose
    const eyeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, '#050302'); gr.addColorStop(0.28, '#0a0603'); gr.addColorStop(0.32, '#a8701c'); gr.addColorStop(0.75, '#c99a3a'); gr.addColorStop(0.92, '#3a2810'); gr.addColorStop(1, '#120c06'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const eyeMat = new THREE.MeshStandardMaterial({ map: eyeTex, roughness: 0.05, metalness: 0, emissive: 0x9fe8ff, emissiveIntensity: 3.5 }); this.eyeMat = eyeMat;
    for (const s of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 14, 10), eyeMat); e.position.set(0.05 * s, 1.006 - 0.98, 0.692 - 0.6); e.rotation.y = s * 0.55; e.scale.set(1, 0.72, 0.6); bones.head.add(e); }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshStandardMaterial({ color: 0x0c0a0a, roughness: 0.25 })); nose.position.set(0, 0.955 - 0.98, 0.902 - 0.6); nose.scale.set(1.2, 0.85, 1); bones.head.add(nose);
    this.phase = rand() * 10; this.speed = 0; this.gait = 0; this.state = 'idle'; this.t = 0; this.dead = false; this.deadT = 0; this.aggro = 0; this.jaw = 0; this.lookYaw = 0; this.breath = rand() * 10; this.sniff = 0;
  }
  setShellLOD(dist) { const g = this.mesh.geometry; const L = g.userData.layers; const want = dist < 18 ? L : dist < 40 ? Math.ceil(L * 0.7) : dist < 70 ? Math.ceil(L * 0.45) : Math.ceil(L * 0.3); this.mesh.geometry.setDrawRange(0, g.userData.trisPerLayer * Math.min(L, want)); }
  rot(n, x, y, z) { _e.set(x, y, z); _q.setFromEuler(_e); this.bones[n].quaternion.copy(this.rest[n]).multiply(_q); }
  update(dt, o = {}) {
    const B = this.bones; const v = this.speed;
    if (this.dead) { this.deadT += dt; const k = smooth01(this.deadT / 0.7); this.mesh.rotation.z = k * 1.5; this.mesh.position.y = 0.12 * k; this.mesh.position.x = -0.15 * k; for (const L of ['L', 'R']) { this.rot('fs' + L, 0.3 * k, 0, 0); this.rot('hh' + L, -0.4 * k, 0, 0); this.rot('fe' + L, -0.3 * k, 0, 0); } this.rot('neck', 0.3 * k, 0, 0); this.rot('head', 0.2 * k, 0, 0); this.rot('jaw', 0.25 * k, 0, 0); this.rot('tail1', -0.6 * k, 0, 0); return; }
    // gait selection: 0 walk, 1 trot, 2 gallop
    const target = v < 1.8 ? 0 : v < 5.2 ? 1 : 2; this.gait = lerp(this.gait, target, clamp(dt * 3, 0, 1));
    const freq = v < 0.05 ? 0 : (this.gait < 0.5 ? 0.62 * v + 0.4 : this.gait < 1.5 ? 0.42 * v + 0.6 : 0.26 * v + 1.0);
    this.phase += dt * freq;
    const p = this.phase * Math.PI * 2; const amp = clamp(v / 1.4, 0, 1);
    const g = this.gait; const offs = g < 1.5 ? { fsL: lerp(0.25, 0.0, clamp(g, 0, 1)), fsR: lerp(0.75, 0.5, clamp(g, 0, 1)), hhL: lerp(0.0, 0.5, clamp(g, 0, 1)), hhR: lerp(0.5, 0.0, clamp(g, 0, 1)) } : { fsL: 0.55, fsR: 0.65, hhL: 0.0, hhR: 0.1 };
    const sw = g < 1.5 ? 0.42 : 0.75; const lift = g < 1.5 ? 0.7 : 1.1;
    for (const L of ['L', 'R']) {
      const pf = p + offs['fs' + L] * Math.PI * 2, ph = p + offs['hh' + L] * Math.PI * 2;
      this.rot('fs' + L, Math.sin(pf) * sw * amp, 0, 0); this.rot('fe' + L, -Math.max(0, Math.sin(pf - 1.4)) * lift * amp, 0, 0); this.rot('fw' + L, Math.max(0, Math.sin(pf - 1.9)) * 0.9 * amp, 0, 0);
      this.rot('hh' + L, -Math.sin(ph) * sw * amp * 0.9, 0, 0); this.rot('hk' + L, Math.max(0, Math.sin(ph + 1.2)) * lift * 0.6 * amp, 0, 0); this.rot('ha' + L, -Math.max(0, Math.sin(ph + 0.9)) * 0.8 * amp, 0, 0);
    }
    // spine flex (gallop), body bob
    const gal = clamp(g - 1, 0, 1); const flex = Math.sin(p) * 0.18 * gal * amp;
    this.rot('spine', flex, 0, 0); this.rot('chest', -flex * 0.6, 0, 0);
    const bob = (g < 1.5 ? Math.abs(Math.sin(p * 2)) * 0.02 : Math.sin(p) * 0.05) * amp;
    // posture: aggression lowers the head; attack crouch / lunge
    this.breath += dt * (1.2 + v * 0.4); const br = Math.sin(this.breath) * 0.012;
    let headP = 0.05 + this.aggro * 0.35 - amp * 0.12 * (1 - gal), neckP = -0.1 + this.aggro * 0.25, hipDrop = 0, jaw = this.aggro * 0.08;
    if (o.windup) { headP += 0.3; neckP += 0.25; hipDrop = 0.06; jaw = 0.15; }
    if (o.strike) { headP -= 0.25; neckP -= 0.35; jaw = 0.55; }
    if (o.sniff) { headP += 0.55; neckP += 0.45; }
    this.jaw = lerp(this.jaw, jaw, clamp(dt * 12, 0, 1));
    this.lookYaw = lerp(this.lookYaw, clamp(o.lookYaw || 0, -0.9, 0.9), clamp(dt * 4, 0, 1));
    this.rot('neck', neckP + Math.sin(p * 2) * 0.05 * amp, this.lookYaw * 0.45, 0); this.rot('head', headP - Math.sin(p * 2) * 0.05 * amp, this.lookYaw * 0.55, 0); this.rot('jaw', this.jaw, 0, 0);
    const tailUp = o.tailUp ?? (this.aggro > 0.5 ? 0.25 : -0.1);
    this.rot('tail1', -tailUp + Math.sin(p) * 0.08 * amp, Math.sin(this.breath * 0.7 + p) * (0.15 + 0.2 * amp), 0); this.rot('tail2', 0.1, Math.sin(this.breath * 0.7 + p - 0.6) * 0.2, 0); this.rot('tail3', 0.08, Math.sin(this.breath * 0.7 + p - 1.2) * 0.2, 0);
    B.hips.position.copy(this.restPos.hips); B.hips.position.y += bob - hipDrop + br * 0.3;
    B.chest.scale.setScalar(1 + br);
  }
}
