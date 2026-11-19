// Os quatro gigantes: pedras de memória que cresceram com a forma de quem morreu sem paz.
// Cada estátua é esculpida a partir de um personagem da Quaternius (o mesmo esqueleto dos moradores):
// posamos os ossos, "assamos" a malha na pose, juntamos tudo numa malha estática e a envelhecemos:
// erosão de baixa frequência, lascas, uma base de rocha que brota do chão, oclusão ambiente e
// curvatura gravadas por vértice. O material faz o resto: rocha triplanar, musgo nas faces de cima e
// nas dobras, líquen, escorridos de chuva, rachaduras que acendem quando o gigante "acorda".
import { THREE, Simplex, clamp, lerp, U, mulberry32 } from '../core.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundH, WATER } from './terrain.js';
import { Human, CHARS, LIB } from '../actors/human.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Rocky primitives -----------------------------------------------------------
const nz = (x, y, z) => Simplex(x * 0.9 + z * 0.37, y * 0.9 - z * 0.21) * 0.6 + Simplex(x * 2.3 - y * 0.4, z * 2.3 + y * 0.7) * 0.3 + Simplex(x * 6.1, z * 6.1 + y) * 0.1;
function rocky(geo, amt, seed) {
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo, 1e-3);
  geo.computeVertexNormals(); const p = geo.attributes.position; const n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const d = nz(x * 0.35 + seed, y * 0.35, z * 0.35 - seed) * amt; p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d); }
  geo.computeVertexNormals(); return geo;
}
function blob(c, r, sx = 1, sy = 1, sz = 1, seed = 0, rough = 0.3, detail = 2) { const g = new THREE.IcosahedronGeometry(r, detail); g.scale(sx, sy, sz); const out = rocky(g, r * rough, seed); out.translate(c[0], c[1], c[2]); return out; }
function limb(a, b, r1, r2, seed = 0) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const len = A.distanceTo(B);
  const g = new THREE.BoxGeometry((r1 + r2) * 0.95, len, (r1 + r2) * 0.85, 3, 7, 3); const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const t = pp.getY(i) / len + 0.5; const k = lerp(r1, r2, t) / ((r1 + r2) / 2); pp.setX(i, pp.getX(i) * k); pp.setZ(i, pp.getZ(i) * k); } const geo = rocky(g, (r1 + r2) * 0.16, seed);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  geo.applyQuaternion(q); const mid = A.clone().add(B).multiplyScalar(0.5); geo.translate(mid.x, mid.y, mid.z);
  return [geo, blob([B.x, B.y, B.z], r2 * 1.05, 1, 1, 1, seed + 1, 0.12), blob([A.x, A.y, A.z], r1 * 1.02, 1, 1, 1, seed + 2, 0.12)];
}
const posOnly = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k); return g; };

// 3D value noise (determinística, sem tocar no rand compartilhado) ----------------------------------
function hash3(x, y, z) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = lerp(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), fx), b = lerp(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), fx);
  const c = lerp(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), fx), d = lerp(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), fx);
  return lerp(lerp(a, b, fy), lerp(c, d, fy), fz) * 2 - 1;
}
const fbm3 = (x, y, z) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.03 + 17, y * 2.03, z * 2.03) * 0.3 + vnoise(x * 4.1, y * 4.1 + 31, z * 4.1) * 0.15;

// Posing kit: tudo em espaço de mundo, com o boneco na origem, olhando para +Z ------------------------
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const wp = (b) => b.getWorldPosition(V3());
function setWorldQuat(bone, q) { bone.parent.getWorldQuaternion(_q2); bone.quaternion.copy(_q2.invert().multiply(q)); bone.updateMatrixWorld(true); }
function rotW(bone, q) { const wq = bone.getWorldQuaternion(new THREE.Quaternion()); setWorldQuat(bone, q.clone().multiply(wq)); }
function kit(h) {
  const B = (n) => h.bones[n];
  const K = {
    B, wp: (n) => wp(B(n)),
    side: (s) => Math.sign(wp(B('upperarm_' + s)).x) || (s === 'r' ? -1 : 1),
    // gira o osso (em torno de um eixo do mundo)
    rot(n, axis, ang) { rotW(B(n), new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), ang)); },
    // aponta o osso n para que o filho c fique na direção dir
    aim(n, c, dir) { const cur = wp(B(c)).sub(wp(B(n))).normalize(); rotW(B(n), new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize())); },
    // gira o osso em torno do próprio eixo (n -> c) até que a direção a1 -> a2 fique o mais perto possível de want
    roll(n, c, a1, a2, want) {
      const ax = wp(B(c)).sub(wp(B(n))).normalize(); const s = wp(B(a2)).sub(wp(B(a1))); s.addScaledVector(ax, -s.dot(ax)).normalize();
      const w = want.clone(); w.addScaledVector(ax, -w.dot(ax)).normalize(); const ang = Math.atan2(ax.dot(s.clone().cross(w)), s.dot(w));
      rotW(B(n), new THREE.Quaternion().setFromAxisAngle(ax, ang));
    },
    // IK de dois ossos (braço ou perna): a ponta vai até target, o cotovelo/joelho aponta para pole
    ik(a, b, c, target, pole) {
      const s = K.wp(a), e = K.wp(b), w = K.wp(c); const la = s.distanceTo(e), lb = e.distanceTo(w);
      const d = target.clone().sub(s); const len = clamp(d.length(), Math.abs(la - lb) + 1e-3, la + lb - 1e-3); d.normalize();
      const cosA = clamp((la * la + len * len - lb * lb) / (2 * la * len), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
      const pl = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
      const elbow = s.clone().addScaledVector(d, la * cosA).addScaledVector(pl, la * sinA);
      K.aim(a, b, elbow.clone().sub(s)); K.aim(b, c, s.clone().addScaledVector(d, len).sub(K.wp(b)));
    },
    arm(side, target, pole) { K.ik('upperarm_' + side, 'lowerarm_' + side, 'hand_' + side, target, pole); },
    leg(side, target, pole) { K.ik('thigh_' + side, 'calf_' + side, 'foot_' + side, target, pole); },
    // mão: dedos para fingers, e a linha indicador -> mindinho para across
    hand(side, fingers, across) { K.aim('hand_' + side, 'middle_01_' + side, fingers); K.roll('hand_' + side, 'middle_01_' + side, 'index_01_' + side, 'pinky_01_' + side, across); },
    // dedos esticados (curl > 0 dobra cada junta um pouco na direção da palma)
    straighten(side, curl = 0) {
      const hd = K.wp('middle_01_' + side).sub(K.wp('hand_' + side)).normalize();
      const palm = K.wp('middle_03_' + side).sub(K.wp('middle_01_' + side)); palm.addScaledVector(hd, -palm.dot(hd));
      if (palm.lengthSq() < 1e-8) palm.copy(K.wp('thumb_01_' + side).sub(K.wp('hand_' + side)).addScaledVector(hd, -1).cross(hd)); palm.normalize();
      for (const f of ['index', 'middle', 'ring', 'pinky']) for (let j = 1; j <= 3; j++) {
        const a = curl * j; K.aim(`${f}_0${j}_${side}`, `${f}_0${j + 1}${j === 3 ? '_leaf' : ''}_${side}`, hd.clone().multiplyScalar(Math.cos(a)).addScaledVector(palm, Math.sin(a)));
      }
    },
  };
  return K;
}
const X = V3(1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, 1);

// As quatro estátuas -------------------------------------------------------------------------------
// S: metros de gigante por metro de gente. base: rochas que crescem do chão (em metros de gente,
// depois da pose). rune: osso onde fica a runa do peito.
const STATUES = {
  // Teo, o pai, no lago: de pé, com água pela cintura, o braço erguido segurando a pedra chata
  lago: {
    char: { sex: 'm', outfit: 'm_peasant', hair: ['Hair_SimpleParted', 'Hair_Beard'], hairCol: [0.5, 0.5, 0.5], skin: [1, 1, 1], height: 1 },
    S: 11.5, armFirst: 'r', seed: 11, rune: 'spine_03', lift: 0, growH: 0,
    pose(K) {
      const s = K.side('r'); K.rot('spine_01', X, 0.04);
      K.arm('r', K.wp('upperarm_r').add(V3(s * 0.1, 0.58, 0.14)), V3(s, -0.2, -0.6));
      K.hand('r', V3(s * 0.05, 1, 0.25), V3(-s, 0, 0)); K.straighten('r', 0.18);
      K.arm('l', K.wp('upperarm_l').add(V3(-s * 0.06, -0.5, 0.1)), V3(-s * 0.3, 0, -1)); K.hand('l', V3(0, -1, 0.15), V3(0, 0, -1)); K.straighten('l', 0.3);
      K.rot('neck_01', X, -0.12); K.rot('Head', X, -0.18); K.rot('Head', Y, s * 0.12);
    },
    // a pedra de quicar, entre o polegar e os dedos
    extra(K, add) { const p = K.wp('thumb_03_r').lerp(K.wp('index_02_r'), 0.5).add(V3(0, 0.03, 0.035)); add(blob([p.x, p.y, p.z], 0.085, 1.2, 1.0, 0.3, 5, 0.1, 2)); },
    base: [], rubble: 0,
  },
  // Aldren, o avô, no círculo de pedras: ajoelhado, mãos juntas, cabeça baixa
  circulo: {
    char: { sex: 'm', outfit: 'm_wizard', hair: ['Hair_Balding', 'Hair_Beard'], hairCol: [0.8, 0.8, 0.8], skin: [1, 1, 1], height: 1 },
    S: 11, seed: 23, rune: 'spine_02', lift: 0.02,
    pose(K) {
      const s = K.side('r');
      for (const sd of ['l', 'r']) { const sg = K.side(sd); const hp = K.wp('thigh_' + sd);
        K.aim('thigh_' + sd, 'calf_' + sd, V3(sg * 0.04, -1, 0.12)); K.aim('calf_' + sd, 'foot_' + sd, V3(0, -0.1, -1)); K.aim('foot_' + sd, 'ball_' + sd, V3(0, -0.35, -1)); hp; }
      K.rot('spine_01', X, 0.1); K.rot('spine_02', X, 0.06); K.rot('spine_03', X, 0.04);
      K.rot('neck_01', X, 0.3); K.rot('Head', X, 0.42);
      const c = K.wp('spine_03'); const fw = V3(0, -0.08, 1).normalize();
      for (const sd of ['r', 'l']) { const sg = K.side(sd);
        const t = c.clone().addScaledVector(fw, 0.27).add(V3(sg * 0.012, -0.06, 0));
        K.arm(sd, t, V3(sg * 0.7, -1, -0.4)); K.hand(sd, V3(-sg * 0.08, 1, 0.45), V3(0, -0.4, 1)); K.straighten(sd, 0.02); }
      s;
    },
    base: [[0, -0.08, -0.12, 0.42, 1.25, 0.5, 1.35], [0.2, -0.14, 0.18, 0.22, 1.2, 0.7, 1.0], [-0.22, -0.13, -0.32, 0.2, 1.1, 0.75, 1.2]], rubble: 9,
  },
  // Auren, o curandeiro velho, na torre: deitado de costas, as mãos cruzadas no peito
  torre: {
    char: { sex: 'm', outfit: 'm_wizard', hair: ['Hair_Ponytail', 'Hair_Beard'], hairCol: [0.8, 0.8, 0.8], skin: [1, 1, 1], height: 1 },
    S: 11, seed: 37, rune: 'spine_03', lift: 0.075, lie: true,
    pose(K) {
      const s = K.side('r'); const c = K.wp('spine_02');
      K.arm('r', c.clone().add(V3(-s * 0.07, 0.1, 0.17)), V3(s, -0.6, -0.3)); K.hand('r', V3(-s, 0.25, 0), V3(0, -1, 0.2)); K.straighten('r', 0.1);
      K.arm('l', c.clone().add(V3(s * 0.05, -0.04, 0.17)), V3(-s, -0.6, -0.3)); K.hand('l', V3(s, 0.3, 0), V3(0, -1, 0.2)); K.straighten('l', 0.1);
      for (const sd of ['l', 'r']) { const sg = K.side(sd); K.aim('thigh_' + sd, 'calf_' + sd, V3(sg * 0.05, -1, 0)); K.aim('calf_' + sd, 'foot_' + sd, V3(sg * 0.02, -1, 0)); K.aim('foot_' + sd, 'ball_' + sd, V3(sg * 0.2, -0.2, 1)); }
    },
    // a cama de pedra (no espaço já deitado: cabeça em +z, rosto para cima)
    slab: [0.62, 0.6, 2.0, 0.1], base: [], rubble: 10,
  },
  // Ilsa, a mãe ("a Moça"), no alto do monte: de pé, de costas para a vila, as mãos juntas na frente
  monte: {
    char: { sex: 'f', outfit: 'f_peasant', hair: 'Hair_Long', hairCol: [0.5, 0.5, 0.5], skin: [1, 1, 1], height: 1 },
    S: 11, seed: 51, rune: 'spine_03', lift: -0.01, turn: Math.PI,
    pose(K) {
      const s = K.side('r'); const p = K.wp('pelvis');
      K.arm('r', p.clone().add(V3(-s * 0.01, 0.06, 0.2)), V3(s, -0.3, -0.5)); K.hand('r', V3(-s * 0.7, -0.5, 0.2), V3(0, -0.2, 1)); K.straighten('r', 0.2);
      K.arm('l', p.clone().add(V3(s * 0.03, 0.03, 0.21)), V3(-s, -0.3, -0.5)); K.hand('l', V3(s * 0.7, -0.5, 0.2), V3(0, 0.2, 1)); K.straighten('l', 0.25);
      K.rot('Head', X, -0.14); K.rot('neck_01', X, -0.05);
    },
    // a saia longa (a roupa de camponesa tem calças): um sino de pano pesado, com pregas, até o chão
    extra(K, add) {
      const top = K.wp('pelvis').add(V3(0, 0.1, 0.0)); const fl = K.wp('foot_l'), fr = K.wp('foot_r'); const bot = fl.clone().add(fr).multiplyScalar(0.5).setY(-0.03); bot.z -= 0.01; const deep = -0.3; // a barra continua para dentro da rocha
      const N = 44, R = 18, pos = [], idx = [];
      for (let j = 0; j <= R; j++) { const t = j / R, e = Math.pow(t, 0.8); const c = top.clone().lerp(bot, t); const rx = lerp(0.165, 0.34, e), rz = lerp(0.125, 0.32, e);
        for (let i = 0; i <= N; i++) { const th = i / N * Math.PI * 2; const fold = 1 + (0.015 + 0.075 * t) * Math.sin(th * 9 + 1.3 * Math.sin(th * 3) + t * 1.5) + 0.03 * t * Math.sin(th * 4 + 2); pos.push(c.x + Math.cos(th) * rx * fold, c.y, c.z + Math.sin(th) * rz * fold); } }
      for (let i = 0; i <= N; i++) { const k = R * (N + 1) + i; pos.push(pos[k * 3] * 1.0, deep, pos[k * 3 + 2]); }
      for (let j = 0; j < R + 1; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c2 = a + N + 1, d = c2 + 1; idx.push(a, b, c2, b, d, c2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); add(g);
    },
    base: [[0, -0.12, 0.02, 0.34, 1.3, 0.55, 1.2], [0.18, -0.14, -0.15, 0.2, 1.2, 0.7, 1.1], [-0.2, -0.15, 0.12, 0.18, 1.1, 0.8, 1.2]], rubble: 8,
  },
};

// Bake ---------------------------------------------------------------------------------------------
function bakeHuman(def, opts = {}) {
  const key = '__statue'; CHARS[key] = def.char; const h = new Human(key, { still: true }); delete CHARS[key];
  h.root.scale.setScalar(1); h.pose(def.clip || 'idle', def.t || 0, 0); h.mixer.update(0); h.root.updateMatrixWorld(true);
  const K = kit(h); if (def.pose) def.pose(K); h.root.updateMatrixWorld(true);
  const parts = []; const v = V3(); let eyes = [];
  for (const m of h.meshes) {
    if (!m.visible || /Eyebrow/.test(m.name) || (opts.filter && !opts.filter(m))) continue;
    m.skeleton.update(); const src = m.geometry; const pos = src.attributes.position; const out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(out, 3)); if (src.index) g.setIndex(src.index.clone());
    if (/Eyes/.test(m.name)) { const hx = K.wp('Head').x; const acc = [[V3(), 0], [V3(), 0]]; for (let i = 0; i < pos.count; i++) { const p = V3(out[i * 3], out[i * 3 + 1], out[i * 3 + 2]); const k = p.x > hx ? 0 : 1; acc[k][0].add(p); acc[k][1]++; } eyes = acc.filter(a => a[1]).map(a => a[0].multiplyScalar(1 / a[1])); }
    parts.push(posOnly(g));
  }
  const extra = []; if (def.extra) def.extra(K, (g) => extra.push(posOnly(g)));
  const bones = {}; for (const n of ['pelvis', 'spine_02', 'spine_03', 'neck_01', 'Head', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r']) bones[n] = K.wp(n);
  const fwd = V3(0, 0, 1).applyQuaternion(h.bones.spine_03.getWorldQuaternion(new THREE.Quaternion())); // aproximado; o chamador refaz
  return { geo: mergeGeometries([...parts, ...extra]), bones, eyes, fwd };
}

// mesh processing ----------------------------------------------------------------------------------
function neighbors(geo) {
  const n = geo.attributes.position.count, idx = geo.index.array; const sets = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; sets[a].add(b).add(c); sets[b].add(a).add(c); sets[c].add(a).add(b); }
  const off = new Uint32Array(n + 1); for (let i = 0; i < n; i++) off[i + 1] = off[i] + sets[i].size;
  const list = new Uint32Array(off[n]); for (let i = 0; i < n; i++) { let k = off[i]; for (const j of sets[i]) list[k++] = j; }
  return { off, list };
}
function smoothTaubin(geo, nb, iters, lam = 0.5, mu = -0.53, weight = null) {
  const p = geo.attributes.position.array, n = p.length / 3; const tmp = new Float32Array(p.length);
  for (let it = 0; it < iters * 2; it++) {
    const f = it % 2 ? mu : lam;
    for (let i = 0; i < n; i++) {
      const a = nb.off[i], b = nb.off[i + 1]; if (b === a) { tmp[i * 3] = p[i * 3]; tmp[i * 3 + 1] = p[i * 3 + 1]; tmp[i * 3 + 2] = p[i * 3 + 2]; continue; }
      let x = 0, y = 0, z = 0; for (let k = a; k < b; k++) { const j = nb.list[k]; x += p[j * 3]; y += p[j * 3 + 1]; z += p[j * 3 + 2]; }
      const inv = 1 / (b - a), w = f * (weight ? weight[i] : 1);
      tmp[i * 3] = p[i * 3] + (x * inv - p[i * 3]) * w; tmp[i * 3 + 1] = p[i * 3 + 1] + (y * inv - p[i * 3 + 1]) * w; tmp[i * 3 + 2] = p[i * 3 + 2] + (z * inv - p[i * 3 + 2]) * w;
    }
    p.set(tmp);
  }
}

// Oclusão ambiente (raios numa grade de ocupação), curvatura e altura sobre o chão -> atributo aGW
const DIRS = (() => { const out = []; const N = 18; for (let i = 0; i < N; i++) { const y = 1 - (i + 0.5) / N * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996; out.push(V3(Math.cos(a) * r, y, Math.sin(a) * r)); } return out; })();
export function weather(geo, o = {}) {
  geo.computeVertexNormals(); geo.computeBoundingBox();
  const P = geo.attributes.position.array, N = geo.attributes.normal.array, n = P.length / 3; const bb = geo.boundingBox;
  const cell = o.cell || 0.35, reach = o.reach || 4.5; const pad = 2;
  const nx = Math.ceil((bb.max.x - bb.min.x) / cell) + pad * 2, ny = Math.ceil((bb.max.y - bb.min.y) / cell) + pad * 2, nz2 = Math.ceil((bb.max.z - bb.min.z) / cell) + pad * 2;
  const ox = bb.min.x - pad * cell, oy = bb.min.y - pad * cell, oz = bb.min.z - pad * cell;
  const occ = new Uint8Array(nx * ny * nz2); const mark = (x, y, z) => { const i = Math.floor((x - ox) / cell), j = Math.floor((y - oy) / cell), k = Math.floor((z - oz) / cell); if (i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz2) occ[(k * ny + j) * nx + i] = 1; };
  const idx = geo.index ? geo.index.array : null; const tri = idx ? idx.length / 3 : n / 3;
  for (let t = 0; t < tri; t++) {
    const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2;
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], bx = P[b * 3], by = P[b * 3 + 1], bz = P[b * 3 + 2], cx = P[c * 3], cy = P[c * 3 + 1], cz = P[c * 3 + 2];
    const e = Math.max(Math.hypot(bx - ax, by - ay, bz - az), Math.hypot(cx - ax, cy - ay, cz - az), Math.hypot(cx - bx, cy - by, cz - bz));
    const s = Math.max(1, Math.ceil(e / (cell * 0.6)));
    for (let i = 0; i <= s; i++) for (let j = 0; j <= s - i; j++) { const u = i / s, w = j / s, q = 1 - u - w; mark(ax * q + bx * u + cx * w, ay * q + by * u + cy * w, az * q + bz * u + cz * w); }
  }
  const ground = o.ground || ((x, z) => -1e9); const ao = new Float32Array(n); const step = cell * 0.7, steps = Math.ceil(reach / step);
  for (let v = 0; v < n; v++) {
    const px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2], qx = N[v * 3], qy = N[v * 3 + 1], qz = N[v * 3 + 2];
    let occl = 0, wsum = 0; const gy = ground(px, pz);
    for (const d of DIRS) {
      const cs = d.x * qx + d.y * qy + d.z * qz; if (cs < 0.12) continue; wsum += cs;
      let x = px + qx * cell * 1.6, y = py + qy * cell * 1.6, z = pz + qz * cell * 1.6;
      for (let s = 0; s < steps; s++) {
        x += d.x * step; y += d.y * step; z += d.z * step;
        if (y < gy - 0.3 && d.y < 0) { occl += cs * (1 - s / steps * 0.5); break; }
        const i = Math.floor((x - ox) / cell), j = Math.floor((y - oy) / cell), k = Math.floor((z - oz) / cell);
        if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz2) { if (d.y < 0 && y < gy + 0.2) { occl += cs * 0.5; } break; }
        if (occ[(k * ny + j) * nx + i]) { occl += cs * (1 - s / steps * 0.6); break; }
      }
    }
    ao[v] = wsum ? 1 - occl / wsum : 1;
  }
  // curvatura: média de n·(p - pj)/|p - pj| nos vizinhos (positivo = quina, negativo = dobra)
  const curv = new Float32Array(n); const nb = geo.index ? neighbors(geo) : null;
  if (nb) {
    for (let v = 0; v < n; v++) { let c = 0; const a = nb.off[v], b = nb.off[v + 1]; for (let k = a; k < b; k++) { const j = nb.list[k]; const dx = P[v * 3] - P[j * 3], dy = P[v * 3 + 1] - P[j * 3 + 1], dz = P[v * 3 + 2] - P[j * 3 + 2]; const l = Math.hypot(dx, dy, dz) || 1; c += (dx * N[v * 3] + dy * N[v * 3 + 1] + dz * N[v * 3 + 2]) / l; } curv[v] = b > a ? c / (b - a) : 0; }
    // suaviza AO e curvatura uma vez
    const tA = new Float32Array(n), tC = new Float32Array(n);
    for (let v = 0; v < n; v++) { let sa = ao[v], sc = curv[v]; const a = nb.off[v], b = nb.off[v + 1]; for (let k = a; k < b; k++) { sa += ao[nb.list[k]]; sc += curv[nb.list[k]]; } tA[v] = sa / (b - a + 1); tC[v] = sc / (b - a + 1); }
    ao.set(tA); curv.set(tC);
  }
  const out = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) { const gy = ground(P[v * 3], P[v * 3 + 2]); out[v * 3] = ao[v]; out[v * 3 + 1] = clamp(curv[v] * (o.curvK || 3), -1, 1); out[v * 3 + 2] = gy < -1e8 ? 1 : clamp((P[v * 3 + 1] - gy) / (o.mossH || 9), 0, 1); }
  geo.setAttribute('aGW', new THREE.BufferAttribute(out, 3)); return geo;
}

// Textura de rachaduras / líquen (canvas, repetível) ----------------------------------------------------
let crackTex = null;
function makeCrackTexture() {
  if (crackTex) return crackTex;
  const S = 512, r = mulberry32(99); const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const layer = (draw) => { g.fillStyle = '#000'; g.fillRect(0, 0, S, S); for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(dx, dy); draw(); g.restore(); } return g.getImageData(0, 0, S, S).data; };
  // R: rachaduras ramificadas (com halo largo e fraco + núcleo fino)
  const cracks = []; for (let i = 0; i < 14; i++) { const pts = []; let x = r() * S, y = r() * S, a = r() * 6.28; const n = 8 + (r() * 14 | 0); for (let k = 0; k < n; k++) { pts.push([x, y]); a += (r() - 0.5) * 1.1; const l = 6 + r() * 16; x += Math.cos(a) * l; y += Math.sin(a) * l; } cracks.push({ pts, w: 0.7 + r() * 1.6 }); if (r() < 0.6) { const b = pts[(pts.length / 2) | 0]; const p2 = []; let bx = b[0], by = b[1], ba = a + (r() - 0.5) * 2.5; for (let k = 0; k < 6; k++) { p2.push([bx, by]); ba += (r() - 0.5) * 1.2; bx += Math.cos(ba) * 9; by += Math.sin(ba) * 9; } cracks.push({ pts: p2, w: 0.6 }); } }
  const R = layer(() => { g.lineCap = 'round'; g.lineJoin = 'round'; for (const pass of [[5, 0.18], [2.2, 0.5], [1, 1]]) for (const k of cracks) { g.strokeStyle = `rgba(255,255,255,${pass[1]})`; g.lineWidth = k.w * pass[0]; g.beginPath(); k.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); } });
  // G: manchas de líquen (rosetas)
  const lich = []; for (let i = 0; i < 70; i++) lich.push([r() * S, r() * S, 3 + r() * r() * 22, 0.4 + r() * 0.6]);
  const G = layer(() => { for (const [x, y, rad, a] of lich) { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(255,255,255,${a * 0.7})`); gr.addColorStop(0.7, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); } });
  // B: poros / picado fino
  const Bc = (() => { g.fillStyle = '#000'; g.fillRect(0, 0, S, S); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); } return g.getImageData(0, 0, S, S).data; })();
  const data = new Uint8Array(S * S * 4); for (let i = 0; i < S * S; i++) { data[i * 4] = R[i * 4]; data[i * 4 + 1] = G[i * 4]; data[i * 4 + 2] = Bc[i * 4]; data[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(data, S, S); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return crackTex = t;
}

// Material de pedra -----------------------------------------------------------------------------------
const STONE_VERT_HEAD = `
attribute vec3 aGW; varying vec3 vGW; varying vec3 vGN; varying vec3 vAW;`;
const STONE_FRAG_HEAD = `
uniform sampler2D tMacro; uniform sampler2D tRock; uniform sampler2D tRockN; uniform sampler2D tCrack; uniform float uAwake; uniform float uWater; uniform float uTime;
varying vec3 vGW; varying vec3 vGN; varying vec3 vAW;`;
const STONE_FRAG_MAP = `
  vec3 gN = normalize(vGN);
  vec3 tw = pow(abs(gN), vec3(4.0)); tw /= (tw.x + tw.y + tw.z);
  vec3 gp = vGW * 0.3;
  vec3 rock = texture2D(tRock, gp.zy).rgb * tw.x + texture2D(tRock, gp.xz).rgb * tw.y + texture2D(tRock, gp.xy).rgb * tw.z;
  vec3 kp = vGW * 0.085 + vec3(0.37, 0.11, 0.73);
  vec3 ck = texture2D(tCrack, kp.zy).rgb * tw.x + texture2D(tCrack, kp.xz).rgb * tw.y + texture2D(tCrack, kp.xy).rgb * tw.z;
  vec4 mc = texture2D(tMacro, vGW.xz * 0.045 + vGW.y * 0.031);
  float gAO = vAW.x, gCv = vAW.y, gH = vAW.z;
  // a textura de rocha é escura (média ~0.047): normaliza e usa só o desenho, sobre um cinza claro de pedra velha
  vec3 rn = rock / vec3(0.048, 0.046, 0.027);
  float rl = dot(rn, vec3(0.3, 0.59, 0.11));
  vec3 stone = vec3(0.27, 0.258, 0.232) * mix(1.0, rl, 0.55) * mix(vec3(1.0), rn / max(rl, 0.05), 0.18) * mix(vec3(1.04, 1.0, 0.94), vec3(0.9, 0.93, 0.98), mc.r);
  vec4 st = texture2D(tMacro, vGW.xz * 0.013 + vGW.y * 0.017 + 0.3);
  stone *= mix(0.68, 1.12, st.r); stone = mix(stone, stone * vec3(1.1, 0.95, 0.72), smoothstep(0.55, 0.8, st.g) * 0.6);   // manchas grandes (ocre, cinza)
  stone *= 1.0 + 0.3 * smoothstep(0.05, 0.45, gCv);                 // quinas gastas, mais claras
  stone *= mix(0.5, 1.0, smoothstep(-0.55, -0.05, gCv));            // dobras escuras
  float vert = 1.0 - abs(gN.y);
  float streak = texture2D(tMacro, vec2(dot(vGW.xz, vec2(0.11, 0.07)), vGW.y * 0.007)).g;
  stone *= 1.0 - 0.32 * vert * smoothstep(0.45, 0.72, streak) * smoothstep(0.2, 0.6, gH + 0.2);   // escorridos de chuva
  stone *= 1.0 - 0.18 * ck.b;
  // líquen nas faces verticais
  float lich = smoothstep(0.42, 0.7, ck.g) * (0.35 + 0.65 * vert) * smoothstep(0.35, 0.7, gAO);
  vec3 lichC = mix(vec3(0.42, 0.43, 0.33), vec3(0.5, 0.34, 0.15), smoothstep(0.58, 0.78, mc.b));
  stone = mix(stone, lichC * (0.8 + 0.2 * rl), lich * 0.7);
  // musgo: faces de cima, dobras úmidas e a base (sobe do chão)
  float up = gN.y;
  float mossM = smoothstep(0.42, 0.85, up + (mc.g - 0.5) * 0.7) * smoothstep(0.25, 0.55, mc.b + 0.2);
  mossM = max(mossM, smoothstep(0.62, 0.2, gAO) * smoothstep(-0.35, 0.3, up) * 0.85);
  mossM = max(mossM, (1.0 - smoothstep(0.0, 0.08 + mc.r * 0.14, gH)) * smoothstep(-0.6, 0.2, up + mc.g - 0.5) * smoothstep(0.3, 0.55, mc.g + ck.g * 0.3));
  mossM *= smoothstep(0.25, 0.5, mc.g + rl * 0.2 + ck.b * 0.2);
  mossM = clamp(mossM * 1.15 - (1.0 - rl) * 0.35 * (1.0 - gH), 0.0, 1.0);
  vec3 mossC = mix(vec3(0.07, 0.11, 0.03), vec3(0.2, 0.24, 0.07), mc.b);
  mossC *= 0.55 + 0.45 * rl + 0.35 * ck.b;                                         // tufos: o musgo pega o relevo da pedra
  mossC = mix(mossC, vec3(0.3, 0.3, 0.12), smoothstep(0.6, 0.85, ck.g) * 0.5);      // musgo seco, amarelado
  float crack = ck.r * (0.55 + 0.45 * smoothstep(0.3, 0.7, mc.g));
  stone *= 1.0 - crack * 0.7;
  vec3 col = mix(stone, mossC, mossM * 0.93);
  // linha d'água (Teo): pedra molhada e lodo logo acima e abaixo da superfície
  float wet = smoothstep(uWater + 0.9, uWater - 0.05, vGW.y);
  col = mix(col, col * vec3(0.42, 0.48, 0.4), wet);
  diffuseColor.rgb = col * mix(0.6, 1.0, gAO);
  float gMoss = mossM;`;
const STONE_FRAG_NORMAL = `
  {
    vec3 tX = texture2D(tRockN, gp.zy).xyz * 2.0 - 1.0, tY = texture2D(tRockN, gp.xz).xyz * 2.0 - 1.0, tZ = texture2D(tRockN, gp.xy).xyz * 2.0 - 1.0;
    float ns = 1.25 * (1.0 - gMoss * 0.6); tX.xy *= ns; tY.xy *= ns; tZ.xy *= ns;
    tX = vec3(tX.xy + gN.zy, abs(tX.z) * gN.x); tY = vec3(tY.xy + gN.xz, abs(tY.z) * gN.y); tZ = vec3(tZ.xy + gN.xy, abs(tZ.z) * gN.z);
    vec3 nW = normalize(tX.zyx * tw.x + tY.xzy * tw.y + tZ.xyz * tw.z);
    normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
  }`;
const STONE_FRAG_EMIT = `#include <emissivemap_fragment>
  {
    float pulse = 0.8 + 0.2 * sin(uTime * 1.7 + vGW.x * 0.3 + vGW.y * 0.2);
    float glowM = crack * crack * 2.2 + smoothstep(0.45, 0.05, gAO) * 0.25;
    totalEmissiveRadiance += vec3(1.0, 0.68, 0.32) * glowM * uAwake * pulse * 2.4;
  }`;
const STONE_FRAG_AO = `
  float ambientOcclusion = mix(1.0, gAO * gAO, 0.85) * (1.0 - crack * 0.4);
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  reflectedLight.indirectSpecular *= ambientOcclusion;`;
export function stoneMaterial(rockMaps, uAwake = { value: 0 }) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.93, color: 0xffffff, envMapIntensity: 1.1 });
  const tRock = { value: rockMaps.map }, tRockN = { value: rockMaps.normalMap }, tCrack = { value: makeCrackTexture() }, uWater = { value: WATER };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { tMacro: U.macro, tRock, tRockN, tCrack, uAwake, uWater, uTime: U.time });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>' + STONE_VERT_HEAD)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vGW = (modelMatrix * vec4(transformed, 1.0)).xyz; vGN = normalize(mat3(modelMatrix) * objectNormal); vAW = aGW;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>' + STONE_FRAG_HEAD)
      .replace('#include <map_fragment>', STONE_FRAG_MAP)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 1.0, gMoss); roughnessFactor = mix(roughnessFactor, 0.35, smoothstep(uWater + 0.5, uWater, vGW.y));')
      .replace('#include <normal_fragment_maps>', STONE_FRAG_NORMAL)
      .replace('#include <emissivemap_fragment>', STONE_FRAG_EMIT)
      .replace('#include <aomap_fragment>', STONE_FRAG_AO);
  };
  m.customProgramCacheKey = () => 'giantstone2';
  return m;
}

// Uma estátua completa -------------------------------------------------------------------------------
const PROF = {}; export const giantProfile = PROF; const tick = (k, t0) => { PROF[k] = (PROF[k] || 0) + performance.now() - t0; return performance.now(); };
function sculpt(id, def, o) {
  let T = performance.now();
  const S = def.S; const rnd = mulberry32(def.seed * 7919 + 13);
  const bk = bakeHuman(def); T = tick('bake', T);
  let geo = mergeVertices(bk.geo, 1.5e-3); T = tick('weld', T);
  // pós-pose: deitar (cabeça para +z, rosto para cima), escalar, apoiar no chão
  const post = new THREE.Matrix4();
  if (def.lie) post.makeRotationY(Math.PI).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  if (def.lie) post.premultiply(new THREE.Matrix4().makeTranslation(0, 0, -0.85));
  geo.applyMatrix4(post); const bones = {}; for (const k in bk.bones) bones[k] = bk.bones[k].clone().applyMatrix4(post);
  const eyes = bk.eyes.map(e => e.clone().applyMatrix4(post));
  // o rosto do Teo (e de todos) envelhece menos: a erosão poupa a cabeça e as mãos
  geo.computeBoundingBox(); const minY = geo.boundingBox.min.y;
  const nb = neighbors(geo); const pa = geo.attributes.position.array; const nv = pa.length / 3;
  const protect = new Float32Array(nv); const keep = [[bones.Head, 0.2, 1], [bones.hand_l, 0.12, 0.8], [bones.hand_r, 0.12, 0.8]];
  for (let i = 0; i < nv; i++) { const p = V3(pa[i * 3], pa[i * 3 + 1], pa[i * 3 + 2]); let k = 0; for (const [c, r, w] of keep) k = Math.max(k, w * clamp(1.5 - p.distanceTo(c) / r, 0, 1)); protect[i] = k; }
  // amacia as arestas de "boneco de jogo" (séculos de chuva)
  const sw = new Float32Array(nv); for (let i = 0; i < nv; i++) sw[i] = 1 - protect[i] * 0.75;
  smoothTaubin(geo, nb, 3, 0.55, -0.58, sw); T = tick('smooth', T);
  // escala e assenta: o ponto mais baixo fica um pouco abaixo da origem
  const lift = (def.lift || 0) - minY; geo.translate(0, lift, 0); geo.scale(S, S, S);
  for (const k in bones) bones[k].add(V3(0, lift, 0)).multiplyScalar(S); for (const e of eyes) e.add(V3(0, lift, 0)).multiplyScalar(S);
  geo.computeVertexNormals();
  // erosão: grandes ondulações + sulcos verticais de chuva, mais forte longe do rosto
  { const p = geo.attributes.position, n = geo.attributes.normal; const sd = def.seed * 3.1;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const pr = 1 - protect[i] * 0.85;
      const big = fbm3(x * 0.22 + sd, y * 0.22, z * 0.22) * 0.28;
      const runnel = (Math.abs(vnoise(x * 0.9 + sd, y * 0.12, z * 0.9)) - 0.25) * 0.14 * (1 - Math.abs(n.getY(i)));
      const pit = Math.min(0, fbm3(x * 0.9, y * 0.9 + sd, z * 0.9) + 0.25) * 0.22;
      // perto do chão a pedra "brota": os pés e a barra da roupa incham e viram rocha
      const grow = def.lie || def.growH === 0 ? 0 : clamp(1 - y / (S * (def.growH || 0.16)), 0, 1); const gr = grow * grow * (0.35 + 0.65 * (fbm3(x * 0.35, y * 0.2 + sd, z * 0.35) * 0.5 + 0.5)) * S * 0.06;
      const d = (big + runnel + pit) * pr + gr; p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
    } }
  // lascas: algumas facetas planas onde um pedaço se soltou
  { const p = geo.attributes.position; const n = geo.attributes.normal; const cuts = def.chips ?? 7;
    for (let c = 0; c < cuts; c++) {
      let vi = 0; for (let t = 0; t < 30; t++) { vi = (rnd() * p.count) | 0; if (protect[vi] < 0.05 && p.getY(vi) > S * 0.25) break; }
      const c0 = V3(p.getX(vi), p.getY(vi), p.getZ(vi)); const pn = V3(n.getX(vi), n.getY(vi), n.getZ(vi)).add(V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.8)).normalize();
      const depth = 0.18 + rnd() * 0.3, rad = 0.9 + rnd() * 1.1; const pp = c0.clone().addScaledVector(pn, -depth);
      for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)); const dd = v.distanceTo(c0); if (dd > rad || protect[i] > 0.3) continue; const h = v.clone().sub(pp).dot(pn); if (h > 0) { v.addScaledVector(pn, -h * clamp((rad - dd) / (rad * 0.25), 0, 1)); p.setXYZ(i, v.x, v.y, v.z); } }
    } }
  T = tick('erode', T);
  // base de rocha que brota do chão e entulho em volta
  const extra = [];
  const gl = o.groundLocal || (() => 0);
  if (def.slab) { const [w, h, l, top] = def.slab; let g = new THREE.BoxGeometry(w * S, h * S, l * S, 8, 4, 16); g = rocky(g, S * 0.1, def.seed + 9); g.translate(0, (top - h / 2) * S, 0); extra.push(posOnly(g)); }
  (def.base || []).forEach((b, i) => { const [x, y, z, r, sx, sy, sz] = b; const g = blob([x * S, Math.min(gl(x * S, z * S), 0.5 * S) + y * S, z * S], r * S, sx, sy, sz, def.seed + i * 3, 0.38, 3); extra.push(posOnly(g)); });
  for (let i = 0; i < (def.rubble || 0); i++) { const a = rnd() * 6.283, d = S * (0.5 + rnd() * 0.5), r = S * (0.025 + rnd() * rnd() * 0.06); const x = Math.cos(a) * d, z = Math.sin(a) * d * (def.lie ? 1.5 : 1); const g0 = gl(x, z); if (Math.max(Math.abs(gl(x + r, z) - g0), Math.abs(gl(x - r, z) - g0), Math.abs(gl(x, z + r) - g0), Math.abs(gl(x, z - r) - g0)) > r * 0.5) continue; extra.push(posOnly(blob([x, g0 - r * 0.2, z], r, 1 + rnd() * 0.5, 0.65 + rnd() * 0.3, 1 + rnd() * 0.4, def.seed + 40 + i, 0.35, 1))); }
  geo.deleteAttribute('normal');
  if (extra.length) { const base = mergeGeometries([geo.index ? geo : geo, ...extra.map(g => mergeVertices(g, 1e-4))].map(g => { if (g.attributes.normal) g.deleteAttribute('normal'); return g; })); geo = base; }
  tick('base', T);
  return { geo, bones, eyes, S };
}

let stoneMat = null;
function giantMaterial(rockMaps) { return stoneMat || (stoneMat = stoneMaterial(rockMaps)); }

export const giants = [];
export function buildGiant(scene, rockMaps, o) {
  const def = STATUES[o.id];
  if (!def || !LIB.gltf.m_peasant) return buildBlockGiant(scene, rockMaps, o);
  const root = new THREE.Group(); root.position.set(o.x, o.y, o.z); root.rotation.y = (o.rot || 0) + (def.turn || 0); scene.add(root); root.updateMatrixWorld(true);
  if (def.lie) { // deitado acompanha a encosta (inclinação do chão sob o corpo)
    const L = def.S * 0.9, W = def.S * 0.3; const at = (lx, lz) => { const w = V3(lx, 0, lz).applyMatrix4(root.matrixWorld); return V3(w.x, groundH(w.x, w.z), w.z); };
    const n = at(0, L).sub(at(0, -L)).cross(at(W, 0).sub(at(-W, 0))).normalize(); if (n.y < 0) n.negate();
    root.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(Y, n.lerp(Y, 0.15).normalize())); root.updateMatrixWorld(true); }
  const groundLocal = (lx, lz) => { const w = root.localToWorld(V3(lx, 0, lz)); w.y = groundH(w.x, w.z); return root.worldToLocal(w).y; };
  const st = sculpt(o.id, def, { groundLocal }); const S = st.S; const geo = st.geo;
  geo.applyMatrix4(root.matrixWorld);
  const gH = (x, z) => o.id === 'lago' ? Math.max(groundH(x, z), WATER - 0.4) : groundH(x, z);
  let T = performance.now(); weather(geo, { ground: gH, cell: 0.5, reach: 4.5, mossH: 7, curvK: 3.5 }); geo.deleteAttribute('normal'); geo.computeVertexNormals(); geo.computeBoundingSphere(); T = tick('weather', T);
  const uAwake = { value: 0 }; const mat = stoneMaterial(rockMaps, uAwake);
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.giant = o.id; scene.add(mesh);
  // P: pontos do corpo em coordenadas locais do gigante, sem escala (makeLakeShot usa P.arms[0][2] * S)
  const L = (v) => v.toArray().map(c => c / S); const b = st.bones; const first = def.armFirst || 'l', second = first === 'l' ? 'r' : 'l';
  const P = { hips: L(b.pelvis), chest: L(b.spine_03), neck: L(b.neck_01), head: L(b.Head),
    arms: [first, second].map(s => [L(b['upperarm_' + s]), L(b['lowerarm_' + s]), L(b['hand_' + s].clone().lerp(b['lowerarm_' + s], -0.25))]),
    legs: ['l', 'r'].map(s => [L(b['thigh_' + s]), L(b['calf_' + s]), L(b['foot_' + s])]) };
  // olhos que acendem (pequenos, dentro das órbitas) e a runa do peito, colada na pedra
  const glow = new THREE.MeshStandardMaterial({ color: 0x2a2824, emissive: 0xffcf8a, emissiveIntensity: 0, roughness: 0.6 });
  const eyes = st.eyes.map(e => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.022 * S, 10, 8), glow); m.position.copy(e); m.visible = false; root.add(m); return m; });
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: makeRuneTexture(o.runeIdx || 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffd7a0, opacity: 0.0, fog: false }));
  { const c = b[def.rune || 'spine_03'].clone(); const fwd = def.lie ? V3(0, 1, 0) : V3(0, 0.1, 1).normalize(); const wc = root.localToWorld(c.clone()); const wf = fwd.clone().transformDirection(root.matrixWorld);
    // o ponto da superfície mais à frente perto da reta (sem Raycaster: um laço simples nos vértices)
    const pa = geo.attributes.position, na = geo.attributes.normal; let best = -1e9, hit = null; const tol = 0.06 * S, v = V3();
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).sub(wc); const along = v.dot(wf); if (along < 0 || along > S * 0.6) continue; if (v.addScaledVector(wf, -along).lengthSq() > tol * tol) continue; if (along > best) { best = along; hit = { point: wc.clone().addScaledVector(wf, along), face: { normal: V3().fromBufferAttribute(na, i) } }; } }
    const hp = hit ? hit.point : wc.clone().addScaledVector(wf, S * 0.12); const hn = hit && hit.face ? hit.face.normal.clone() : wf;
    root.add(rune); rune.position.copy(root.worldToLocal(hp.clone().addScaledVector(hn, 0.08))); rune.lookAt(hp.clone().addScaledVector(hn, 2)); rune.scale.setScalar(S * 0.16); }
  const light = new THREE.Object3D(); light.intensity = 0;
  // colisores: o que encosta no chão (ou na água), em células de ~2,6 m
  const cols = []; { const p = geo.attributes.position; const cell = 2.6; const map = new Map();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > Math.max(groundH(x, z), WATER) + 2.6) continue; const k = Math.floor(x / cell) + ',' + Math.floor(z / cell); let c = map.get(k); if (!c) map.set(k, c = [0, 0, 0, []]); c[0] += x; c[1] += z; c[2]++; c[3].push(x, z); }
    for (const c of map.values()) { if (c[2] < 4) continue; const cx = c[0] / c[2], cz = c[1] / c[2]; let r = 0; for (let i = 0; i < c[3].length; i += 2) r = Math.max(r, Math.hypot(c[3][i] - cx, c[3][i + 1] - cz)); cols.push([cx, cz, Math.min(r * 0.85 + 0.3, cell * 0.95)]); } }
  tick('rest', T);
  const g = Object.assign({ root, mesh, glow, rune, light, eyes, awake: 0, target: 0, cols, S, P, uAwake }, o); giants.push(g);
  return g;
}

// gigante antigo, de blocos (só se a biblioteca de personagens ainda não tiver chegado)
const POSES = {
  kneel: { hips: [0, 4.2, 0], chest: [0, 7.4, 0.7], neck: [0, 9.2, 1.4], head: [0, 10.3, 2.2], headTilt: 0.5, arms: [[[2.5, 8.5, 0.7], [2.9, 6.3, 2.6], [0.55, 5.4, 3.7]], [[-2.5, 8.5, 0.7], [-2.9, 6.3, 2.6], [-0.55, 5.4, 3.7]]], legs: [[[1.3, 3.8, 0.2], [1.5, 0.9, 2.8], [1.5, 0.5, -1.4]], [[-1.3, 3.8, 0.2], [-1.5, 4.0, 3.4], [-1.5, 0.4, 3.6]]] },
  sit: { hips: [0, 3.0, 0], chest: [0, 6.3, -0.3], neck: [0, 8.3, -0.1], head: [0, 9.5, 0.4], headTilt: 0.25, arms: [[[2.5, 7.5, -0.3], [3.1, 5.0, 1.4], [2.0, 3.6, 3.8]], [[-2.5, 7.5, -0.3], [-3.1, 5.0, 1.4], [-2.0, 3.6, 3.8]]], legs: [[[1.4, 3.0, 0.4], [1.6, 3.2, 4.1], [1.7, 0.3, 4.8]], [[-1.4, 3.0, 0.4], [-1.6, 3.2, 4.1], [-1.7, 0.3, 4.8]]] },
  reach: { hips: [0, 3.0, 0], chest: [0, 6.3, 0.2], neck: [0, 8.3, 0.6], head: [0, 9.5, 1.0], headTilt: -0.35, arms: [[[2.5, 7.6, 0.2], [3.6, 9.8, 1.4], [3.4, 12.6, 2.4]], [[-2.5, 7.5, 0.2], [-3.2, 5.2, 1.6], [-2.2, 3.4, 3.4]]], legs: [[[1.4, 3.0, 0.4], [1.6, 3.2, 4.1], [1.7, 0.3, 4.8]], [[-1.4, 3.0, 0.4], [-1.6, 3.2, 4.1], [-1.7, 0.3, 4.8]]] },
  lie: { hips: [0, 1.4, 0], chest: [0, 1.9, 3.3], neck: [0, 1.8, 5.3], head: [0, 2.0, 6.5], headTilt: -1.35, headTurn: 0.5, arms: [[[2.6, 1.9, 4.0], [4.2, 5.0, 5.6], [6.0, 0.6, 7.6]], [[-2.6, 1.8, 4.0], [-3.4, 0.9, 1.6], [-3.5, 0.6, -0.8]]], legs: [[[1.3, 1.4, -0.6], [1.6, 3.4, -3.8], [1.6, 0.5, -6.6]], [[-1.3, 1.3, -0.6], [-1.5, 1.0, -4.4], [-1.6, 0.6, -8.0]]] },
};
function blockHead() { const headG = rocky(new THREE.BoxGeometry(2.1, 2.4, 2.2, 4, 4, 4), 0.28, 7); const brow = rocky(new THREE.BoxGeometry(0.45, 0.9, 0.5, 2, 3, 2), 0.06, 8); brow.translate(0, -0.05, 1.15); const jaw = rocky(new THREE.BoxGeometry(1.7, 0.8, 1.6, 3, 2, 3), 0.15, 9); jaw.translate(0, -1.2, 0.3); return mergeGeometries([headG, brow, jaw].map(posOnly)); }
function buildBlockGiant(scene, rockMaps, o) {
  const P = POSES[o.pose] || POSES.sit; const S = o.scale || 1.6; const parts = []; let seed = o.seed || 1;
  parts.push(blob(P.hips, 2.0, 1.25, 0.9, 1.0, seed++)); parts.push(...limb(P.hips, P.chest, 1.9, 2.4, seed++)); parts.push(blob(P.chest, 2.5, 1.35, 1.0, 0.95, seed++)); parts.push(...limb(P.chest, P.neck, 1.1, 0.8, seed++));
  const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.headTilt || 0, P.headTurn || 0, 0)); const head = blockHead(); head.applyQuaternion(hq); head.translate(...P.head); parts.push(head);
  for (const arm of P.arms) { parts.push(blob(arm[0], 1.15, 1, 1, 1, seed++)); parts.push(...limb(arm[0], arm[1], 0.95, 0.75, seed++)); parts.push(...limb(arm[1], arm[2], 0.75, 0.62, seed++)); parts.push(blob(arm[2], 0.75, 1.0, 0.7, 1.2, seed++, 0.12)); }
  for (const leg of P.legs) { parts.push(...limb(leg[0], leg[1], 1.25, 0.95, seed++)); parts.push(...limb(leg[1], leg[2], 0.95, 0.75, seed++)); parts.push(blob(leg[2], 0.9, 1.0, 0.55, 1.5, seed++, 0.1)); }
  const geo = mergeGeometries(parts.map(posOnly)); geo.scale(S, S, S);
  const root = new THREE.Group(); root.position.set(o.x, o.y, o.z); root.rotation.y = o.rot || 0; scene.add(root); root.updateMatrixWorld(true);
  geo.applyMatrix4(root.matrixWorld); weather(geo, { ground: groundH }); geo.computeBoundingSphere();
  const uAwake = { value: 0 }; const mesh = new THREE.Mesh(geo, stoneMaterial(rockMaps, uAwake)); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  const glow = new THREE.MeshStandardMaterial({ color: 0x0a1418, emissive: 0xffcf8a, emissiveIntensity: 0, roughness: 0.4 }); const eyes = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), glow); e.position.copy(new THREE.Vector3(0.48 * s, 0.35, 1.12).applyQuaternion(hq).add(new THREE.Vector3(...P.head)).multiplyScalar(S)); root.add(e); eyes.push(e); }
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: makeRuneTexture(o.runeIdx || 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffd7a0, opacity: 0.0, fog: false }));
  const cp = new THREE.Vector3(...P.chest).multiplyScalar(S); rune.position.copy(cp).add(new THREE.Vector3(0, 0.3, 2.3).multiplyScalar(S)); rune.scale.setScalar(S); root.add(rune);
  const light = new THREE.Object3D(); light.intensity = 0;
  const cols = []; const addC = (pt, r) => { const w = new THREE.Vector3(...pt).multiplyScalar(S).applyMatrix4(root.matrixWorld); if (pt[1] * S + o.y < groundH(w.x, w.z) + 4) cols.push([w.x, w.z, r * S]); };
  addC(P.hips, 2.0); addC(P.chest, 2.2); for (const l of P.legs) { addC(l[0], 1.2); addC(l[1], 1.0); addC(l[2], 1.0); } for (const a of P.arms) addC(a[2], 0.8);
  const g = Object.assign({ root, mesh, glow, rune, light, eyes, awake: 0, target: 0, cols, S, P, uAwake }, o); giants.push(g); return g;
}

function makeRuneTexture(k) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128); g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#bff'; g.shadowBlur = 14;
  g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 96, 0, Math.PI * 2); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 80, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 9; const shapes = [
    () => { g.moveTo(0, -60); g.lineTo(0, 60); g.moveTo(-40, -20); g.lineTo(0, -60); g.lineTo(40, -20); g.moveTo(-30, 30); g.lineTo(30, 30); },
    () => { g.moveTo(-45, -45); g.lineTo(45, 45); g.moveTo(45, -45); g.lineTo(-45, 45); g.moveTo(0, -60); g.lineTo(0, -20); },
    () => { g.arc(0, -10, 34, Math.PI, 0); g.moveTo(-34, -10); g.lineTo(-34, 50); g.moveTo(34, -10); g.lineTo(34, 50); g.moveTo(-50, 50); g.lineTo(50, 50); },
    () => { g.moveTo(0, -62); g.lineTo(-48, 40); g.lineTo(48, 40); g.closePath(); g.moveTo(0, -10); g.lineTo(0, 24); },
  ];
  g.beginPath(); shapes[k % 4](); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = '#fff'; g.beginPath(); g.arc(Math.cos(a) * 88, Math.sin(a) * 88, 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function updateGiants(dt, time) {
  for (const g of giants) {
    g.awake = lerp(g.awake, g.target, 1 - Math.exp(-dt * 0.6));
    const pulse = 0.75 + 0.25 * Math.sin(time * 1.3 + g.x);
    g.glow.emissiveIntensity = g.awake * 3 * pulse; for (const e of g.eyes) e.visible = g.awake > 0.02; g.rune.material.opacity = g.awake * 0.4 * pulse;
    g.light.intensity = g.awake * 22 * pulse; g.uAwake.value = g.awake;
  }
}

// a carved stele at the giant's feet where its name can be returned
export const nameStones = [];
export function buildNameStone(scene, rockMaps, x, z, rot, runeIdx) {
  const y = groundH(x, z) - 0.3;
  const g = posOnly(rocky(new THREE.BoxGeometry(1.1, 2.6, 0.55, 3, 6, 2), 0.06, x * 0.1));
  g.translate(0, 1.3, 0); const root = new THREE.Group(); root.position.set(x, y, z); root.rotation.y = rot; scene.add(root); root.updateMatrixWorld(true);
  g.applyMatrix4(root.matrixWorld); const gm = mergeVertices(g, 1e-4); weather(gm, { ground: groundH, cell: 0.12, reach: 1, mossH: 1.5 });
  const mesh = new THREE.Mesh(gm, giantMaterial(rockMaps)); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshBasicMaterial({ map: makeRuneTexture(runeIdx), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x9fe6ff, opacity: 0.25, fog: false }));
  rune.position.set(0, 1.75, 0.3); root.add(rune);
  const s = { x, z, y: y + 0.3, rot, rune, root, lit: 0 }; nameStones.push(s); return s;
}
// o rosto de Ilsa que o Teo esculpiu entre as flores: a cabeça da estátua dela, meio enterrada
export function buildHeadFragment(scene, rockMaps, x, z, rot, S = 2.2) {
  let geo;
  if (LIB.gltf.f_peasant) {
    const pose = (K) => { K.rot('Head', X, -0.1); };
    const head = bakeHuman({ char: STATUES.monte.char, pose }, { filter: (m) => /Regular|Eyes/.test(m.name) });
    const hair = bakeHuman({ char: STATUES.monte.char, pose }, { filter: (m) => /Hair/.test(m.name) });
    const hc = head.bones.Head.clone().add(V3(0, 0.08, 0)); const cutY = (v) => hc.y - 0.13 + (v.z - hc.z) * 0.3; const k = 20 * S / 2.2;
    // o pescoço vira uma quebra plana; do cabelo, só fica o que está acima da quebra
    const hg = mergeVertices(head.geo, 1.5e-3); { const p = hg.attributes.position; for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)); v.y = Math.max(v.y, cutY(v)); p.setXYZ(i, v.x, v.y, v.z); } }
    let rg = mergeVertices(hair.geo, 1.5e-3); { const p = rg.attributes.position, idx = rg.index.array, keep = []; for (let t = 0; t < idx.length; t += 3) { let ok = true; for (let j = 0; j < 3; j++) { const v = V3(p.getX(idx[t + j]), p.getY(idx[t + j]), p.getZ(idx[t + j])); if (v.y < hc.y + 0.035 + Math.max(0, v.z - hc.z) * 0.6) ok = false; } if (ok) keep.push(idx[t], idx[t + 1], idx[t + 2]); } rg.setIndex(keep); }
    let g = mergeGeometries([hg, rg]); { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)).sub(hc).multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z); } }
    const nb = neighbors(g); smoothTaubin(g, nb, 2, 0.5, -0.53); g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { const x0 = p.getX(i), y0 = p.getY(i), z0 = p.getZ(i); const d = fbm3(x0 * 0.6 + 3, y0 * 0.6, z0 * 0.6) * 0.07 * S; p.setXYZ(i, x0 + n.getX(i) * d, y0 + n.getY(i) * d, z0 + n.getZ(i) * d); }
    g.deleteAttribute('normal'); geo = g;
  } else geo = blockHead().scale(S, S, S);
  const root = new THREE.Group(); root.position.set(x, groundH(x, z) + (LIB.gltf.f_peasant ? -0.55 * S : 0.6), z); root.rotation.set(LIB.gltf.f_peasant ? -0.75 : 0.35, rot, LIB.gltf.f_peasant ? 0.35 : 0.6); scene.add(root); root.updateMatrixWorld(true); geo.applyMatrix4(root.matrixWorld);
  if (!geo.index) geo = mergeVertices(geo, 1e-4);
  weather(geo, { ground: groundH, cell: 0.18, reach: 2, mossH: 2.5 }); geo.deleteAttribute('normal'); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, giantMaterial(rockMaps)); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  return [x, z, 2.4 * S];
}
export function updateNameStones(dt, t) { for (const s of nameStones) { const target = s.lit ? 0.95 : 0.18 + 0.1 * Math.sin(t * 1.5 + s.x); s.rune.material.opacity = lerp(s.rune.material.opacity, target, 1 - Math.exp(-dt * 2)); } }
