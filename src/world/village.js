import { THREE, loadTex, rand, rr, clamp, U } from '../core.js';
import { groundH, POI } from './terrain.js';
import { buildLandmarks } from './landmarks.js';

// ---------------- materiais ----------------
export const M = {};
export async function loadVillageMaterials(barkMat) {
  const L = (n, srgb = true) => loadTex('a/tex/' + n, { srgb });
  const [stoneC, stoneN, blockC, blockN, plasterC, plasterN, roofC, roofN, planksC, planksB, planksR, woodC, cobbleC] = await Promise.all([
    L('stone_c.jpg'), L('stone_n.jpg', false), L('block_c.jpg'), L('block_n.jpg', false), L('plaster_c.jpg'), L('plaster_n.jpg', false), L('roof_c.jpg'), L('roof_n.jpg', false),
    L('planks_c.jpg'), L('planks_b.jpg', false), L('planks_r.jpg', false), L('wood_c.jpg'), L('cobble_c.jpg'),
  ]);
  const S = (o) => new THREE.MeshStandardMaterial(o);
  M.stone = S({ map: stoneC, normalMap: stoneN, roughness: 0.92, color: 0xcfc8bd, normalScale: new THREE.Vector2(1.3, 1.3) });
  M.stoneWarm = S({ map: stoneC, normalMap: stoneN, roughness: 0.92, color: 0xe2cdb0, normalScale: new THREE.Vector2(1.3, 1.3) });
  M.block = S({ map: blockC, normalMap: blockN, roughness: 0.9, color: 0xd9d0c2 });
  M.ruin = S({ map: blockC, normalMap: blockN, roughness: 0.95, color: 0xc9c4b6 });
  const plaster = (c) => S({ map: plasterC, normalMap: plasterN, roughness: 0.95, color: c });
  M.plaster = plaster(0xf1e7d6); M.plasterOchre = plaster(0xf3d7a4); M.plasterBlue = plaster(0xc9d9e6); M.plasterRose = plaster(0xf0cfc2); M.plasterSage = plaster(0xd3dcc0);
  M.roof = S({ map: roofC, normalMap: roofN, roughness: 0.82, color: 0xd09a7e, normalScale: new THREE.Vector2(1.4, 1.4) });
  M.roofDark = S({ map: roofC, normalMap: roofN, roughness: 0.85, color: 0x7d8288, normalScale: new THREE.Vector2(1.4, 1.4) });
  M.roofMoss = S({ map: roofC, normalMap: roofN, roughness: 0.9, color: 0x8e9a72, normalScale: new THREE.Vector2(1.4, 1.4) });
  M.thatch = S({ map: woodC, roughness: 1, color: 0xb59358, normalMap: roofN, normalScale: new THREE.Vector2(2.2, 2.2) });
  M.planks = S({ map: planksC, bumpMap: planksB, bumpScale: 2, roughnessMap: planksR, roughness: 1, color: 0x9a8670 });
  M.timber = S({ map: planksC, bumpMap: planksB, bumpScale: 2, roughness: 0.9, color: 0x4d3b2c });
  M.oldWood = S({ map: woodC, roughness: 0.9, color: 0x7a6a5c });
  M.bark = barkMat ? barkMat.clone() : S({ color: 0x5a4636, roughness: 1 });
  M.bark.onBeforeCompile = () => { }; M.bark.customProgramCacheKey = () => 'barkprop';
  M.cobble = S({ map: cobbleC, roughness: 0.88, color: 0xb0aaa2 });
  M.iron = S({ color: 0x2c2c2e, roughness: 0.45, metalness: 0.85 });
  M.copper = S({ color: 0x6fa38e, roughness: 0.5, metalness: 0.55 });
  M.brass = S({ color: 0xb08a40, roughness: 0.35, metalness: 1 });
  M.glass = S({ color: 0x1a2226, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.6, emissive: 0xffa552, emissiveIntensity: 0, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  M.canvas = S({ map: plasterC, normalMap: plasterN, roughness: 1, color: 0xb9a888, side: THREE.DoubleSide });
  M.canvasRed = S({ map: plasterC, normalMap: plasterN, roughness: 1, color: 0x8e3a2c, side: THREE.DoubleSide });
  M.cloth = { blue: S({ map: plasterC, roughness: 1, color: 0x50729a, side: THREE.DoubleSide }), green: S({ map: plasterC, roughness: 1, color: 0x6f8a52, side: THREE.DoubleSide }), ochre: S({ map: plasterC, roughness: 1, color: 0xc8963c, side: THREE.DoubleSide }), white: S({ map: plasterC, roughness: 1, color: 0xeee6d8, side: THREE.DoubleSide }) };
  M.hay = S({ map: woodC, roughness: 1, color: 0xc8a75a });
  M.soot = S({ color: 0x141210, roughness: 1 });
  M.ember = S({ color: 0x220800, emissive: 0xff5a14, emissiveIntensity: 3.0, roughness: 1 });
  M.red = S({ color: 0x5c0f0a, roughness: 0.9 });
  M.lime = S({ map: plasterC, normalMap: plasterN, roughness: 0.95, color: 0xfff4e2 });
  M.floor = S({ map: planksC, bumpMap: planksB, bumpScale: 2, roughnessMap: planksR, roughness: 1, color: 0x7e6650 });
  M.candle = S({ color: 0xf2e6c8, emissive: 0xffa040, emissiveIntensity: 0.6, roughness: 0.6 });
  M.clay = S({ color: 0x9a5f3c, roughness: 0.8 });
  M.bread = S({ color: 0xb87a3c, roughness: 0.75 });
  M.book = [0x6a2a22, 0x2a4a6a, 0x3f5a2a, 0x6a5a2a, 0x4a2a5a].map(c => S({ color: c, roughness: 0.8 }));
  M.paint = { green: S({ map: planksC, roughness: 0.7, color: 0x4f7a55 }), blue: S({ map: planksC, roughness: 0.7, color: 0x4a6f96 }), red: S({ map: planksC, roughness: 0.7, color: 0x9a4436 }), ochre: S({ map: planksC, roughness: 0.7, color: 0xc89a48 }), wood: M.planks };
  M.flowers = [0xe8574a, 0xf2c94c, 0xf0f0f0, 0x9a6ad6, 0xf08fb0].map(c => S({ color: c, roughness: 0.7 }));
  M.leaf = S({ color: 0x4a6e2e, roughness: 0.85 });
  return M;
}

// --------------- utilitários (exportados para landmarks.js) ---------------
export function boxUV(geo, tile = 2, rot90 = false) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const p = geo.attributes.position, n = geo.attributes.normal; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    if (rot90) { const t = u; u = v; v = t; }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}
const parts = []; // {geo (mundo), mat, cast}
export function put(geo, mat, matrix, cast = true) { const g = geo.clone(); g.applyMatrix4(matrix); parts.push({ g, mat, cast }); }
export function box(w, h, d, mat, tile, matrix, cast = true) { put(boxUV(new THREE.BoxGeometry(w, h, d), tile), mat, matrix, cast); }
export function mtx(x, y, z, rx = 0, ry = 0, rz = 0, parent) { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)); return parent ? parent.clone().multiply(m) : m; }
export function cyl(rt, rb, h, seg, mat, tile, matrix, cast = true, open = false) { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); const nI = g.toNonIndexed(); const p = nI.attributes.position; const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); uv[i * 2] = a / (Math.PI * 2) * (2 * Math.PI * Math.max(rb, rt)) / tile; uv[i * 2 + 1] = p.getY(i) / tile; } nI.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); put(nI, mat, matrix, cast); }
export function cylUV(g, r) { g = g.toNonIndexed(); g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal; const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { if (Math.abs(n.getY(i)) > 0.7) { uv[i * 2] = p.getX(i) / 1.6; uv[i * 2 + 1] = p.getZ(i) / 1.6; } else { uv[i * 2] = Math.atan2(p.getZ(i), p.getX(i)) * r / 1.6; uv[i * 2 + 1] = p.getY(i) / 1.6; } } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; }

export const colliders = { boxes: [], circles: [] };
// caixas de colisão orientadas; y0/y1 limitam a altura (móveis de um andar não bloqueiam o outro)
export function addBox(x, z, hw, hd, rot, y0 = -1e9, y1 = 1e9) { colliders.boxes.push({ x, z, hw, hd, c: Math.cos(rot), s: Math.sin(rot), rad: Math.hypot(hw, hd), y0, y1 }); }
export function addCircle(x, z, r) { colliders.circles.push([x, z, r]); }

// superfícies caminháveis acima do terreno (andares, escadas, ruínas)
export const walk = [];
export function addWalk(B, lx0, lx1, lz0, lz1, y0, y1 = y0, axis = 'x') {
  const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const sc = new THREE.Vector3(); B.decompose(p, q, sc); const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  walk.push({ x: p.x, z: p.z, c: Math.cos(e.y), s: Math.sin(e.y), lx0, lx1, lz0, lz1, y0: p.y + y0, y1: p.y + y1, axis, rad: Math.hypot(Math.max(Math.abs(lx0), Math.abs(lx1)), Math.max(Math.abs(lz0), Math.abs(lz1))) });
}
// altura em que se pode ficar de pé em (x,z) vindo da altura y; block = existe um degrau alto demais aqui
export function probe(x, z, y) {
  let h = groundH(x, z), block = false;
  for (const w of walk) {
    const dx = x - w.x, dz = z - w.z; if (Math.abs(dx) > w.rad + 0.5 || Math.abs(dz) > w.rad + 0.5) continue;
    const lx = dx * w.c - dz * w.s, lz = dx * w.s + dz * w.c; if (lx < w.lx0 || lx > w.lx1 || lz < w.lz0 || lz > w.lz1) continue;
    const t = w.axis === 'x' ? (lx - w.lx0) / (w.lx1 - w.lx0) : (lz - w.lz0) / (w.lz1 - w.lz0); const top = w.y0 + (w.y1 - w.y0) * t;
    if (top <= y + 0.55) { if (top > h) h = top; } else if (top < y + 1.75) block = true;
  }
  return { h, block };
}

export const HOUSES = [
  // x, z, rot, opções
  [-24, -16, 0.35, { role: 'padaria', w: 8, d: 6, floors: 2, lower: 'stoneWarm', upper: 'plasterOchre', roof: 'roof', door: 'red', shutters: 'ochre', flowers: true, sign: 'pão' }],
  [22, -22, -0.5, { role: 'familia', w: 7, d: 5.6, floors: 2, lower: 'plasterBlue', upper: 'plasterBlue', frame: true, roof: 'roofDark', door: 'blue', shutters: 'blue', flowers: true }],
  [-14, 32, 3.0, { role: 'casagrande', w: 9, d: 6.2, floors: 2, lower: 'stone', upper: 'plaster', roof: 'roofMoss', door: 'wood', shutters: 'green', jetty: true }],
  [16, 30, -2.8, { role: 'irene', w: 6.4, d: 5.2, floors: 1, lower: 'plasterSage', frame: true, roof: 'thatch', door: 'green', shutters: 'green', flowers: true, herbs: true }],
  [-32, -38, 0.6, { role: 'vazia', w: 6.4, d: 5.2, floors: 1, lower: 'stone', roof: 'roofMoss', door: 'wood', shutters: null, ivy: true }],
  [-44, 2, 1.57, { role: 'torre', w: 6.2, d: 5.6, floors: 2, lower: 'block', upper: 'plasterRose', roof: 'roofDark', door: 'ochre', shutters: 'red', pitch: 0.95 }],
  [40, -42, -0.9, { role: 'familia2', w: 6.8, d: 5.4, floors: 1, lower: 'plasterRose', frame: true, roof: 'roof', door: 'blue', shutters: 'wood', flowers: true }],
  [-6, -24, 0.1, { role: 'livros', w: 7.2, d: 5.6, floors: 2, lower: 'block', upper: 'plaster', roof: 'roof', door: 'green', shutters: 'green' }],
  [36, 27, -1.2, { role: 'anselmo', w: 6, d: 5, floors: 1, lower: 'stone', roof: 'thatch', door: 'wood', shutters: 'wood' }],
];
export function villageDirt(x, z) {
  let d = 0; const r0 = Math.hypot(x - 0, z - 2); d = Math.max(d, 1 - Math.min(1, Math.max(0, (r0 - 9) / 8)));
  for (const h of HOUSES) { const c = Math.cos(h[2]), s = Math.sin(h[2]); const fx = h[0] + s * (h[3].d / 2 + 2), fz = h[1] + c * (h[3].d / 2 + 2); const r = Math.hypot(x - fx, z - fz); d = Math.max(d, 0.85 * (1 - Math.min(1, Math.max(0, (r - 1.5) / 3.5)))); }
  const rf = Math.hypot(x - 28, z - 4); d = Math.max(d, 1 - Math.min(1, Math.max(0, (rf - 3) / 4)));
  const rc = Math.hypot(x - POI.garden.x, z - POI.garden.z); d = Math.max(d, 0.5 * (1 - Math.min(1, Math.max(0, (rc - 3) / 3))));
  const ro = Math.hypot(x - POI.observatory.x, z - POI.observatory.z); d = Math.max(d, 0.8 * (1 - Math.min(1, Math.max(0, (ro - 7) / 4))));
  return d;
}
export const lights = []; export const smokes = []; export const fires = []; export const interactPoints = []; export const lamps = [];
export const storySpots = {};

// --------------- casa ---------------
export const interiors = []; export const doors = [];
function wallO(len, H, T, mat, tile, openings, Mx, colRot, collide = true, cy0 = -1e9, cy1 = 1e9) {
  const ops = openings.slice().sort((a, b) => a.x - b.x); let cur = -len / 2;
  const piece = (x0, x1, y0, y1) => { if (x1 - x0 < 0.02 || y1 - y0 < 0.02) return; const m = mtx((x0 + x1) / 2, (y0 + y1) / 2 - H / 2, 0, 0, 0, 0, Mx); box(x1 - x0, y1 - y0, T, mat, tile, m);
    if (collide && y0 < 0.05) { const c = new THREE.Vector3().setFromMatrixPosition(m); addBox(c.x, c.z, (x1 - x0) / 2, T / 2 + 0.04, colRot, cy0, cy1); } };
  for (const op of ops) { piece(cur, op.x - op.w / 2, 0, H); piece(op.x - op.w / 2, op.x + op.w / 2, 0, op.y0); piece(op.x - op.w / 2, op.x + op.w / 2, op.y0 + op.h, H); cur = op.x + op.w / 2; }
  piece(cur, len / 2, 0, H);
}
const FH = 2.8, SLAB = 0.2;
function house(x, z, rot, o) {
  const w = o.w, d = o.d, floors = o.floors || 1, T = 0.3;
  let y0 = -1e9; for (const a of [-0.5, 0, 0.5]) for (const b of [-0.5, 0, 0.5]) { const c = Math.cos(rot), s2 = Math.sin(rot); const lx = a * w, lz = b * d; y0 = Math.max(y0, groundH(x + lx * c + lz * s2, z - lx * s2 + lz * c)); } y0 -= 0.35;
  const B = mtx(x, y0, z, 0, rot, 0); const L = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(B);
  const lower = M[o.lower] || M.stone, upper = M[o.upper] || lower; const base = 0.55; const iw = w - 2 * T, id = d - 2 * T;
  const tl = (m) => (m === M.stone || m === M.stoneWarm || m === M.block) ? 2.2 : 3;
  box(w + 0.35, 1.9, d + 0.35, M.stone, 1.6, mtx(0, -0.4, 0, 0, 0, 0, B), true);
  // degrau da porta e piso térreo como superfícies
  addWalk(B, -iw / 2, iw / 2, -id / 2, id / 2, base + 0.02);
  addWalk(B, -0.8, 0.8, d / 2 - 0.2, d / 2 + 0.78, 0.53);
  const dx = o.doorX || 0; const DW = 1.1, DH = 2.15; const winY0 = 0.95, WW = 0.9, WH = 1.05;
  const winsFront = [-w * 0.3]; if (w > 6.3) winsFront.push(w * 0.3);
  const ops0 = { front: [{ x: dx, y0: 0, w: DW, h: DH }, ...winsFront.map(px => ({ x: px, y0: winY0, w: WW, h: WH }))], back: floors > 1 ? [] : [{ x: -w * 0.2, y0: winY0, w: WW, h: WH }], right: [{ x: 0, y0: winY0, w: WW, h: WH }], left: floors > 1 ? [] : [{ x: 0, y0: winY0, w: WW, h: WH }] };
  const wallsAt = (yb, mat, ops, ow, od, colY0, colY1) => {
    wallO(ow, FH, T, mat, tl(mat), ops.front, mtx(0, yb + FH / 2, od / 2 - T / 2, 0, 0, 0, B), rot, true, colY0, colY1);
    wallO(ow, FH, T, mat, tl(mat), ops.back.map(o2 => ({ ...o2, x: -o2.x })), mtx(0, yb + FH / 2, -od / 2 + T / 2, 0, Math.PI, 0, B), rot, true, colY0, colY1);
    wallO(od - 2 * T, FH, T, mat, tl(mat), ops.right, mtx(ow / 2 - T / 2, yb + FH / 2, 0, 0, Math.PI / 2, 0, B), rot + Math.PI / 2, true, colY0, colY1);
    wallO(od - 2 * T, FH, T, mat, tl(mat), ops.left, mtx(-ow / 2 + T / 2, yb + FH / 2, 0, 0, -Math.PI / 2, 0, B), rot + Math.PI / 2, true, colY0, colY1);
    // reboco claro por dentro
    const LT = 0.025, li = T + LT / 2 + 0.005;
    wallO(ow - 2 * T, FH, LT, M.lime, 2.5, ops.front, mtx(0, yb + FH / 2, od / 2 - li, 0, 0, 0, B), rot, false);
    wallO(ow - 2 * T, FH, LT, M.lime, 2.5, ops.back.map(o2 => ({ ...o2, x: -o2.x })), mtx(0, yb + FH / 2, -od / 2 + li, 0, Math.PI, 0, B), rot, false);
    wallO(od - 2 * T - 0.06, FH, LT, M.lime, 2.5, ops.right, mtx(ow / 2 - li, yb + FH / 2, 0, 0, Math.PI / 2, 0, B), rot, false);
    wallO(od - 2 * T - 0.06, FH, LT, M.lime, 2.5, ops.left, mtx(-ow / 2 + li, yb + FH / 2, 0, 0, -Math.PI / 2, 0, B), rot, false);
  };
  wallsAt(base, lower, ops0, w, d);
  box(iw, 0.08, id, M.floor, 1.4, mtx(0, base - 0.02, 0, 0, 0, 0, B), false);
  const timberFrame = (yb, h, ow, od) => {
    const bw = 0.17;
    for (const s2 of [-1, 1]) { box(ow + 0.1, bw, bw, M.timber, 1.5, mtx(0, yb + bw / 2, s2 * (od / 2 + 0.02), 0, 0, 0, B)); box(ow + 0.1, bw, bw, M.timber, 1.5, mtx(0, yb + h - bw / 2, s2 * (od / 2 + 0.02), 0, 0, 0, B)); box(bw, bw, od + 0.1, M.timber, 1.5, mtx(s2 * (ow / 2 + 0.02), yb + bw / 2, 0, 0, 0, 0, B)); box(bw, bw, od + 0.1, M.timber, 1.5, mtx(s2 * (ow / 2 + 0.02), yb + h - bw / 2, 0, 0, 0, 0, B)); }
    for (const s2 of [-1, 1]) for (const px of [-ow / 2, ow / 2]) box(bw, h, bw, M.timber, 1.5, mtx(px, yb + h / 2, s2 * (od / 2 + 0.03), 0, 0, 0, B));
    for (let i = 0; i < 4; i++) { const a = -ow / 2 + ow * (i + 0.5) / 4; for (const s2 of [-1, 1]) { const Lb = Math.hypot(ow / 4, h * 0.45); box(0.12, Lb, 0.11, M.timber, 1.5, mtx(a, yb + h * 0.28, s2 * (od / 2 + 0.04), 0, 0, Math.atan2(ow / 4, h * 0.45) * (i % 2 ? 1 : -1), B)); } }
  };
  if (o.frame) timberFrame(base, FH, w, d);
  // ---- andares de cima, com escada de verdade ----
  const stairW = 0.95, rise = FH + SLAB, steps = Math.round(rise / 0.2), run = Math.min(0.28, (iw - 1.9) / steps), stairLen = steps * run;
  const sx0 = -iw / 2 + 0.05, szc = -id / 2 + stairW / 2 + 0.02;
  let top = base + FH; const outs = [];
  for (let f = 1; f < floors; f++) {
    const fy = base + f * FH + (f - 1) * SLAB; // nível do chão do andar (topo da laje anterior, antes da laje)
    const prev = fy - FH; // chão do andar de baixo
    // escada: degraus do andar de baixo até este
    for (let i = 0; i < steps; i++) { const h = (i + 1) * (rise / steps); box(run + 0.01, h, stairW, M.oldWood, 1.2, mtx(sx0 + (i + 0.5) * run, prev + h / 2, szc, 0, 0, 0, B), true); }
    addWalk(B, sx0, sx0 + stairLen, szc - stairW / 2, szc + stairW / 2, prev + 0.02, prev + rise, 'x');
    // laje com abertura sobre a escada
    const hx0 = sx0 + 0.9, hx1 = sx0 + stairLen + 0.05, hz1 = szc + stairW / 2 + 0.03;
    const slabY = fy + SLAB / 2;
    box(iw / 2 - hx1, SLAB, id, M.floor, 1.4, mtx((hx1 + iw / 2) / 2, slabY, 0, 0, 0, 0, B), true);
    box(hx1 - (-iw / 2), SLAB, id / 2 - hz1, M.floor, 1.4, mtx((hx1 - iw / 2) / 2, slabY, (hz1 + id / 2) / 2, 0, 0, 0, B), true);
    box(hx0 - (-iw / 2), SLAB, hz1 - (-id / 2), M.floor, 1.4, mtx((hx0 - iw / 2) / 2, slabY, (hz1 - id / 2) / 2, 0, 0, 0, B), true);
    const fl = fy + SLAB;
    addWalk(B, hx1, iw / 2, -id / 2, id / 2, fl); addWalk(B, -iw / 2, hx1, hz1, id / 2, fl); addWalk(B, -iw / 2, hx0, -id / 2, hz1, fl);
    // vigas aparentes no teto de baixo
    for (let i = 0; i < 4; i++) box(0.16, 0.18, id, M.timber, 1.5, mtx(-iw / 2 + iw * (i + 0.5) / 4, fy - 0.09, 0, 0, 0, 0, B), false);
    // guarda-corpo em volta da abertura
    box(hx1 - hx0, 0.06, 0.06, M.oldWood, 1, mtx((hx0 + hx1) / 2, fl + 0.95, hz1 + 0.03, 0, 0, 0, B)); for (let k = 0; k <= 6; k++) box(0.05, 0.95, 0.05, M.oldWood, 1, mtx(hx0 + (hx1 - hx0) * k / 6, fl + 0.47, hz1 + 0.03, 0, 0, 0, B));
    { const c = L((hx0 + hx1) / 2, 0, hz1 + 0.03); addBox(c.x, c.z, (hx1 - hx0) / 2, 0.06, rot, y0 + fl - 0.3, y0 + fl + 1.6); }
    // paredes do andar
    const ow = w + (o.jetty ? 0.4 : 0), od = d + (o.jetty ? 0.4 : 0);
    box(ow + 0.2, 0.22, od + 0.2, M.timber, 1.5, mtx(0, fy + 0.11, 0, 0, 0, 0, B));
    const opsU = { front: [-w * 0.25, w * 0.25].map(px => ({ x: px, y0: winY0, w: WW, h: WH })), back: [{ x: -w * 0.18, y0: winY0, w: WW, h: WH }], right: [{ x: 0.3, y0: winY0, w: WW, h: WH }], left: [{ x: 0, y0: winY0, w: WW, h: WH }] };
    wallsAt(fy + SLAB, upper, opsU, ow, od, y0 + fl - 0.3, 1e9);
    if (o.frame || upper === M.plaster || upper === M.plasterOchre || upper === M.plasterRose) timberFrame(fy + SLAB, FH, ow, od);
    outs.push({ fl, ow, od, ops: opsU, f });
    top = fy + SLAB + FH;
  }
  // ---- telhado ----
  const pitch = o.pitch || (o.roof === 'thatch' ? 0.85 : 0.72); const ow = (o.jetty && floors > 1 ? w + 0.4 : w), od = (o.jetty && floors > 1 ? d + 0.4 : d);
  const half = od / 2 + 0.55; const slab = half / Math.cos(pitch); const rh = Math.tan(pitch) * (od / 2);
  const roofMat = M[o.roof] || M.roof; const rt = o.roof === 'thatch' ? 0.42 : 0.16;
  for (const s2 of [-1, 1]) { const m = mtx(0, top + rh - (od / 4 + 0.275) * Math.tan(pitch) + 0.1 + (rt - 0.16) / 2, s2 * (od / 4 + 0.275), s2 * pitch, 0, 0, B); box(ow + (o.roof === 'thatch' ? 1.2 : 1.0), rt, slab, roofMat, 2.4, m); }
  box(ow + 1.05, 0.22, 0.32, o.roof === 'thatch' ? M.hay : M.timber, 1.5, mtx(0, top + rh + 0.18, 0, Math.PI / 4, 0, 0, B));
  const sh = new THREE.Shape(); sh.moveTo(-od / 2, 0); sh.lineTo(0, rh); sh.lineTo(od / 2, 0); sh.lineTo(-od / 2, 0);
  const gg = boxUV(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), 3);
  const gable = floors > 1 ? upper : lower;
  for (const s2 of [-1, 1]) put(gg, gable, mtx(s2 * (ow / 2 - T / 2), top, 0, 0, Math.PI / 2 * s2, 0, B).multiply(mtx(0, 0, -T / 2)));
  // forro do sótão (fecha o teto do último andar)
  box(ow - 2 * T, 0.08, od - 2 * T, M.planks, 1.4, mtx(0, top + 0.04, 0, 0, 0, 0, B), false);
  for (let i = 0; i < 4; i++) box(0.16, 0.18, od - 2 * T, M.timber, 1.5, mtx(-(ow - 2 * T) / 2 + (ow - 2 * T) * (i + 0.5) / 4, top - 0.09, 0, 0, 0, 0, B), false);
  // ---- lareira no canto do fundo à direita + chaminé ----
  const fx = iw / 2 - 0.85, fz = -id / 2 + 0.38, fb = base;
  box(1.5, 1.25, 0.2, M.stone, 1.4, mtx(fx, fb + 0.62, fz - 0.25, 0, 0, 0, B)); for (const s2 of [-1, 1]) box(0.32, 1.25, 0.7, M.stone, 1.4, mtx(fx + s2 * 0.59, fb + 0.62, fz, 0, 0, 0, B)); box(1.5, 0.42, 0.7, M.stone, 1.4, mtx(fx, fb + 1.04, fz, 0, 0, 0, B));
  box(0.86, 0.82, 0.04, M.soot, 1, mtx(fx, fb + 0.41, fz - 0.14, 0, 0, 0, B), false); box(0.86, 0.04, 0.5, M.soot, 1, mtx(fx, fb + 0.02, fz + 0.08, 0, 0, 0, B), false);
  box(1.7, 0.12, 0.85, M.timber, 1.5, mtx(fx, fb + 1.31, fz + 0.04, 0, 0, 0, B));
  box(0.5, 0.06, 0.3, M.ember, 1, mtx(fx, fb + 0.07, fz + 0.02, 0, 0, 0, B), false);
  for (let i = 0; i < 3; i++) cyl(0.055, 0.055, 0.5, 7, M.bark, 1, mtx(fx - 0.13 + i * 0.13, fb + 0.13, fz + 0.02, 0, 0.35 * (i - 1), Math.PI / 2, B));
  box(1.0, top - fb - 1.37, 0.55, M.stone, 1.4, mtx(fx, fb + 1.37 + (top - fb - 1.37) / 2, fz - 0.05, 0, 0, 0, B));
  { const c = L(fx, 0, fz); addBox(c.x, c.z, 0.8, 0.42, rot); }
  const chimZ = -od / 2 + T + 0.3;
  box(0.75, rh + 2.4, 0.75, M.stone, 1.6, mtx(fx, top + (rh + 2.4) / 2 - 0.2, chimZ, 0, 0, 0, B)); box(0.9, 0.12, 0.9, M.stone, 1.6, mtx(fx, top + rh + 2.2, chimZ, 0, 0, 0, B)); smokes.push(L(fx, top + rh + 2.3, chimZ));
  // ---- móveis ----
  const fl0 = base + 0.02; const furn = (fy) => ({ y0: y0 + fy - 0.3, y1: y0 + fy + 1.7 });
  const col = (lx, lz, hw, hd, r2 = 0, fy = fl0) => { const c = L(lx, 0, lz); const f = furn(fy); addBox(c.x, c.z, hw, hd, rot + r2, f.y0, f.y1); };
  const table = (tx, tz, tr, fy = fl0, items = true) => { const T2 = mtx(tx, fy, tz, 0, tr, 0, B); box(1.5, 0.07, 0.8, M.oldWood, 1, mtx(0, 0.76, 0, 0, 0, 0, T2)); for (const a of [-1, 1]) for (const b of [-1, 1]) box(0.08, 0.74, 0.08, M.oldWood, 1, mtx(a * 0.65, 0.37, b * 0.32, 0, 0, 0, T2)); for (const b of [-1, 1]) { box(1.4, 0.06, 0.3, M.oldWood, 1, mtx(0, 0.45, b * 0.7, 0, 0, 0, T2)); for (const a of [-1, 1]) box(0.06, 0.43, 0.26, M.oldWood, 1, mtx(a * 0.6, 0.22, b * 0.7, 0, 0, 0, T2)); }
    if (items) { cyl(0.03, 0.035, 0.12, 8, M.candle, 1, mtx(0.2, 0.86, 0.05, 0, 0, 0, T2), false); cyl(0.11, 0.09, 0.04, 12, M.iron, 1, mtx(-0.3, 0.81, -0.1, 0, 0, 0, T2)); cyl(0.05, 0.04, 0.13, 10, M.clay, 1, mtx(-0.05, 0.86, -0.15, 0, 0, 0, T2)); }
    col(tx, tz, 0.8, 0.85, tr, fy); return L(tx + 0.2, fy + 0.95, tz + 0.05); };
  const bed = (bx, bz, br, fy, blanket = M.canvasRed) => { const Bd = mtx(bx, fy, bz, 0, br, 0, B); box(1.0, 0.35, 2.0, M.oldWood, 1, mtx(0, 0.2, 0, 0, 0, 0, Bd)); box(0.92, 0.16, 1.9, M.canvas, 1, mtx(0, 0.44, 0, 0, 0, 0, Bd)); box(0.96, 0.08, 1.2, blanket, 1, mtx(0, 0.54, 0.3, 0, 0, 0, Bd)); box(0.6, 0.12, 0.35, M.cloth.white, 1, mtx(0, 0.58, -0.72, 0, 0, 0, Bd)); box(1.05, 0.9, 0.08, M.oldWood, 1, mtx(0, 0.45, -1.02, 0, 0, 0, Bd)); col(bx, bz, 0.55, 1.05, br, fy); };
  const shelf = (sx, sz, sr, fy, kind = 'pots') => { const S2 = mtx(sx, fy, sz, 0, sr, 0, B); for (const hy of [0.5, 1.0, 1.5]) box(1.2, 0.04, 0.3, M.oldWood, 1, mtx(0, hy, 0, 0, 0, 0, S2)); for (const a of [-1, 1]) box(0.05, 1.7, 0.3, M.oldWood, 1, mtx(a * 0.6, 0.85, 0, 0, 0, 0, S2));
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) { if (kind === 'books') { const bw2 = rr(0.05, 0.09), bh = rr(0.2, 0.3); box(bw2, bh, 0.2, M.book[(r * 4 + i) % 5], 1, mtx(-0.45 + i * 0.28 + rr(-0.03, 0.03), 0.52 + r * 0.5 + bh / 2, 0, 0, 0, rr(-0.1, 0.1), S2), false); box(bw2, bh * 0.9, 0.2, M.book[(r * 4 + i + 2) % 5], 1, mtx(-0.38 + i * 0.28, 0.52 + r * 0.5 + bh * 0.45, 0, 0, 0, 0, S2), false); }
      else if (kind === 'bread') { const sp = new THREE.SphereGeometry(0.11, 10, 6); sp.scale(1.4, 0.6, 1); put(boxUV(sp, 0.4), M.bread, mtx(-0.42 + i * 0.28, 0.56 + r * 0.5, 0, 0, rr(0, 3), 0, S2), false); }
      else cyl(0.06 + (i % 2) * 0.02, 0.05, 0.16 + (i % 3) * 0.05, 10, M.clay, 1, mtx(-0.42 + i * 0.28, 0.6 + r * 0.5, 0, 0, 0, 0, S2), false); }
    col(sx, sz, 0.62, 0.18, sr, fy); };
  const rug = (rx, rz, fy, mat = M.canvasRed, sz = [1.6, 1.0]) => box(sz[0], 0.012, sz[1], mat, 1, mtx(rx, fy + 0.01, rz, 0, 0, 0, B), false);
  const chest = (cx2, cz2, fy, r2 = 0) => { box(0.9, 0.5, 0.5, M.planks, 0.9, mtx(cx2, fy + 0.25, cz2, 0, r2, 0, B)); box(0.92, 0.04, 0.52, M.iron, 1, mtx(cx2, fy + 0.4, cz2, 0, r2, 0, B)); col(cx2, cz2, 0.45, 0.25, r2, fy); };
  // térreo por papel
  let candle;
  if (o.role === 'padaria') {
    box(2.6, 1.0, 0.7, M.oldWood, 1, mtx(-0.2, fl0 + 0.5, d * 0.12, 0, 0, 0, B)); col(-0.2, d * 0.12, 1.3, 0.35);
    for (let i = 0; i < 7; i++) { const sp = new THREE.SphereGeometry(0.12, 10, 6); sp.scale(1.5, 0.6, 1); put(boxUV(sp, 0.4), M.bread, mtx(-1.2 + i * 0.32, fl0 + 1.06, d * 0.12 + rr(-0.15, 0.15), 0, rr(0, 3), 0, B), false); }
    shelf(iw / 2 - 0.2, id / 2 - 0.85, Math.PI / 2, fl0, 'bread'); for (let i = 0; i < 3; i++) cyl(0.25, 0.28, 0.6, 10, M.canvas, 1, mtx(-iw / 2 + 0.4, fl0 + 0.3, id / 2 - 0.5 - i * 0.55, 0, 0, 0, B)); col(-iw / 2 + 0.4, id / 2 - 1.05, 0.3, 0.85);
    candle = L(-0.2, fl0 + 1.3, d * 0.12);
  } else if (o.role === 'irene') {
    table(-w * 0.1, d * 0.05, 0.1); bed(-iw / 2 + 0.55, -id / 2 + 1.15, 0, fl0, M.cloth.green); shelf(iw / 2 - 0.2, id / 2 - 0.85, Math.PI / 2, fl0);
    for (let i = 0; i < 9; i++) { const hx = -iw / 2 + 0.8 + i * (iw - 1.6) / 8; cyl(0.06, 0.02, 0.35, 6, M.leaf, 1, mtx(hx, base + FH - 0.45, rr(-0.8, 0.8), 0, 0, Math.PI, B), false); }
    { const E = mtx(0.9, fl0, -0.7, 0, -0.5, 0, B); for (const a of [-1, 1]) box(0.05, 1.6, 0.05, M.oldWood, 1, mtx(a * 0.35, 0.8, 0, 0.12, 0, a * -0.08, E)); box(0.8, 0.6, 0.03, M.cloth.white, 1, mtx(0, 1.15, 0.08, 0.12, 0, 0, E)); col(0.9, -0.7, 0.4, 0.3); }
    candle = L(-w * 0.1 + 0.2, fl0 + 0.95, d * 0.05);
  } else if (o.role === 'anselmo') {
    table(-w * 0.12, d * 0.08, 0); bed(-iw / 2 + 0.55, -id / 2 + 1.15, 0, fl0, M.cloth.blue); chest(-iw / 2 + 0.55, id / 2 - 0.6, fl0, Math.PI / 2);
    { const cx2 = iw / 2 - 0.7, cz2 = id / 2 - 0.9; box(0.55, 0.06, 0.55, M.oldWood, 1, mtx(cx2, fl0 + 0.45, cz2, 0, 0, 0, B)); box(0.55, 0.7, 0.06, M.oldWood, 1, mtx(cx2, fl0 + 0.8, cz2 - 0.27, -0.12, 0, 0, B)); for (const a of [-1, 1]) for (const b of [-1, 1]) box(0.05, 0.45, 0.05, M.oldWood, 1, mtx(cx2 + a * 0.24, fl0 + 0.22, cz2 + b * 0.24, 0, 0, 0, B)); }
    candle = L(-w * 0.12 + 0.2, fl0 + 0.95, d * 0.08);
  } else if (o.role === 'livros') {
    table(0.6, d * 0.05, 0); shelf(iw / 2 - 0.2, id / 2 - 0.85, Math.PI / 2, fl0, 'books'); shelf(-iw / 2 + 0.2, 0.8, -Math.PI / 2, fl0, 'books'); rug(0.6, d * 0.05 + 1.2, fl0, M.cloth.blue);
    candle = L(0.8, fl0 + 0.95, d * 0.05);
  } else if (o.role === 'vazia') {
    // uma casa vazia, mas não abandonada: alguém ainda varre o chão
    shelf(iw / 2 - 0.2, id / 2 - 0.85, Math.PI / 2, fl0); chest(-iw / 2 + 0.6, -id / 2 + 0.5, fl0); box(0.05, 1.3, 0.05, M.oldWood, 1, mtx(-iw / 2 + 0.35, fl0 + 0.65, id / 2 - 0.4, 0.15, 0, 0.1, B), false); box(0.3, 0.25, 0.08, M.hay, 1, mtx(-iw / 2 + 0.35, fl0 + 0.12, id / 2 - 0.45, 0.15, 0, 0.1, B), false);
    candle = null;
  } else {
    candle = table(-w * 0.1, d * 0.08, 0); shelf(iw / 2 - 0.2, id / 2 - 0.85, Math.PI / 2, fl0);
    if (floors === 1) bed(-iw / 2 + 0.55, -id / 2 + 1.15, 0, fl0);
    rug(-w * 0.1, d * 0.08 + 1.15, fl0);
  }
  // andares de cima: quartos
  for (const u of outs) {
    const fy = u.fl; rug(0.6, 0.3, fy, u.f === 1 ? M.cloth.ochre : M.cloth.blue, [1.8, 1.2]);
    bed(iw / 2 - 0.62, -id / 2 + 1.65, 0, fy, u.f === 1 ? M.canvasRed : M.cloth.blue);
    chest(0.4, id / 2 - 0.45, fy, 0);
    if (o.role === 'livros' || o.role === 'torre') shelf(-iw / 2 + 0.2, id / 2 - 1.2, -Math.PI / 2, fy, 'books');
    else { box(0.6, 0.6, 0.4, M.oldWood, 1, mtx(-iw / 2 + 0.45, fy + 0.3, id / 2 - 0.5, 0, 0, 0, B)); col(-iw / 2 + 0.45, id / 2 - 0.5, 0.3, 0.2, 0, fy); cyl(0.03, 0.035, 0.12, 8, M.candle, 1, mtx(-iw / 2 + 0.45, fy + 0.66, id / 2 - 0.5, 0, 0, 0, B), false); }
  }
  // ---- janelas (moldura, vidro, peitoril, venezianas e floreiras) ----
  const shutterMat = o.shutters ? M.paint[o.shutters] : null;
  const win = (lx, ly, lz, ry, flowers) => {
    const W = mtx(lx, ly, lz, 0, ry, 0, B);
    box(WW, WH, 0.03, M.glass, 1, mtx(0, 0, -T / 2, 0, 0, 0, W), false);
    box(1.08, 0.1, 0.16, M.timber, 1.5, mtx(0, 0.58, 0.04, 0, 0, 0, W)); box(1.18, 0.1, 0.28, M.block, 1, mtx(0, -0.58, 0.08, 0, 0, 0, W));
    for (const s2 of [-1, 1]) box(0.1, 1.15, 0.16, M.timber, 1.5, mtx(s2 * 0.5, 0, 0.04, 0, 0, 0, W));
    box(0.05, WH, 0.06, M.timber, 1.5, mtx(0, 0, -T / 2, 0, 0, 0, W)); box(WW, 0.05, 0.06, M.timber, 1.5, mtx(0, 0.05, -T / 2, 0, 0, 0, W));
    if (shutterMat) for (const s2 of [-1, 1]) box(0.48, 1.1, 0.05, shutterMat, 1.0, mtx(s2 * 0.78, 0, 0.18, 0, s2 * 0.35, 0, W));
    if (flowers) { box(0.95, 0.18, 0.22, M.oldWood, 1, mtx(0, -0.72, 0.2, 0, 0, 0, W)); for (let i = 0; i < 9; i++) { const sp = new THREE.IcosahedronGeometry(0.075, 0); put(sp, i % 3 === 2 ? M.leaf : M.flowers[(((i + (lx * 3 | 0)) % M.flowers.length) + M.flowers.length) % M.flowers.length], mtx(-0.4 + i * 0.1, -0.58 + rr(0, 0.06), 0.2 + rr(-0.05, 0.05), 0, 0, 0, W), false); } }
  };
  const wy = base + winY0 + WH / 2;
  for (const px of winsFront) win(px, wy, d / 2 + 0.02, 0, o.flowers);
  if (floors === 1) win(-w * 0.2, wy, -d / 2 - 0.02, Math.PI); win(w / 2 + 0.02, wy, 0, Math.PI / 2, o.flowers && floors === 1); if (floors === 1) win(-w / 2 - 0.02, wy, 0, -Math.PI / 2);
  for (const u of outs) { const uy = u.fl + winY0 + WH / 2; for (const op of u.ops.front) win(op.x, uy, u.od / 2 + 0.02, 0, o.flowers && u.f === 1); win(-w * 0.18, uy, -u.od / 2 - 0.02, Math.PI); win(u.ow / 2 + 0.02, uy, -0.3, Math.PI / 2); win(-u.ow / 2 - 0.02, uy, 0, -Math.PI / 2); }
  // ---- porta ----
  const dz = d / 2;
  box(1.45, 0.16, 0.36, M.timber, 1.5, mtx(dx, base + DH + 0.08, dz - 0.1, 0, 0, 0, B)); for (const s2 of [-1, 1]) box(0.14, DH + 0.1, 0.36, M.timber, 1.5, mtx(dx + s2 * (DW / 2 + 0.07), base + DH / 2, dz - 0.1, 0, 0, 0, B));
  box(1.6, 0.25, 0.7, M.block, 1.2, mtx(dx, 0.4, dz + 0.42, 0, 0, 0, B));
  const hinge = L(dx - DW / 2, base, dz - 0.05);
  const pivot = new THREE.Group(); pivot.position.copy(hinge); pivot.rotation.y = rot;
  const doorMat = M.paint[o.door] || M.planks;
  const leaf = new THREE.Mesh(boxUV(new THREE.BoxGeometry(DW - 0.04, DH - 0.03, 0.07), 1.3), doorMat); leaf.position.set(DW / 2, DH / 2, 0); leaf.castShadow = true; leaf.receiveShadow = true; pivot.add(leaf);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.brass); knob.position.set(DW - 0.16, DH * 0.48, 0.06); pivot.add(knob);
  for (const hy of [0.3, DH - 0.35]) { const st = new THREE.Mesh(new THREE.BoxGeometry(DW * 0.7, 0.05, 0.08), M.iron); st.position.set(DW * 0.36, hy, 0.01); pivot.add(st); }
  const door = { pivot, open: 0, target: 0, rot, p: L(dx, 0, dz + 0.4), was: false }; doors.push(door);
  // lampião ao lado da porta (acende à noite)
  { const lp = L(dx + DW / 2 + 0.45, base + DH + 0.05, dz + 0.22); box(0.06, 0.06, 0.32, M.iron, 1, mtx(dx + DW / 2 + 0.45, base + DH + 0.25, dz + 0.12, 0, 0, 0, B), false); lamps.push(lp); }
  // placa
  if (o.sign) { const S2 = mtx(dx + DW / 2 + 0.9, base + DH + 0.55, dz + 0.55, 0, 0, 0, B); box(0.06, 0.06, 0.7, M.iron, 1, mtx(0, 0.25, -0.2, 0, 0, 0, S2), false); box(0.7, 0.5, 0.05, M.oldWood, 1, mtx(0, 0, 0.12, 0, Math.PI / 2, 0, S2)); const sp = new THREE.SphereGeometry(0.16, 12, 6); sp.scale(1.6, 0.6, 0.5); put(boxUV(sp, 0.4), M.bread, mtx(0.04, 0, 0.12, 0, Math.PI / 2, 0, S2), false); }
  // hera
  if (o.ivy) for (let i = 0; i < 40; i++) { const sp = new THREE.IcosahedronGeometry(rr(0.12, 0.26), 0); put(sp, M.leaf, mtx(-w / 2 + rr(0, 1.6), rr(0.2, 3.2), d / 2 + 0.12, rr(0, 3), rr(0, 3), 0, B), false); }
  interiors.push({ x, z, rot, hw: w / 2 - T, hd: d / 2 - T, y: y0 + base, top: y0 + top, fire: L(fx, base + 0.2, fz + 0.02), candle, door, B, role: o.role, floors, win: L(winsFront[0], base + 1.6, d / 2 - 0.6) });
  return B;
}
export function insideHouse(px, pz) { for (const h of interiors) { const dx = px - h.x, dz = pz - h.z; const c = Math.cos(h.rot), s = Math.sin(h.rot); const lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < h.hw + 0.1 && Math.abs(lz) < h.hd + 0.1) return h; } return null; }
export function inFootprint(px, pz, m = 0.5) { for (const h of interiors) { const dx = px - h.x, dz = pz - h.z; const c = Math.cos(h.rot), s = Math.sin(h.rot); const lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < h.hw + 0.3 + m && Math.abs(lz) < h.hd + 0.3 + m) return true; } return false; }

export function fenceLine(pts, opts = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1]; const len = Math.hypot(x2 - x1, z2 - z1); const n = Math.max(1, Math.round(len / 2.4));
    for (let k = 0; k <= n; k++) { const x = x1 + (x2 - x1) * k / n, z = z1 + (z2 - z1) * k / n; cyl(0.07, 0.09, 1.3, 7, M.bark, 1, mtx(x, groundH(x, z) + 0.55, z, rr(-0.05, 0.05), 0, rr(-0.05, 0.05))); addCircle(x, z, 0.2); }
    for (let k = 0; k < n; k++) { const xa = x1 + (x2 - x1) * k / n, za = z1 + (z2 - z1) * k / n, xb = x1 + (x2 - x1) * (k + 1) / n, zb = z1 + (z2 - z1) * (k + 1) / n; const mx = (xa + xb) / 2, mz = (za + zb) / 2, my = (groundH(xa, za) + groundH(xb, zb)) / 2; const Lh = Math.hypot(xb - xa, zb - za); const ang = -Math.atan2(zb - za, xb - xa); const dy = groundH(xb, zb) - groundH(xa, za); const tilt = Math.atan2(dy, Lh);
      for (const hh of [0.5, 0.95]) cyl(0.05, 0.055, Lh + 0.15, 6, M.bark, 1, mtx(mx, my + hh, mz, 0, ang, Math.PI / 2 + tilt), true); }
  }
}
function woodpile(x, z, rot) { const B = mtx(x, groundH(x, z), z, 0, rot, 0); for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) cyl(0.16, 0.16, 1.4, 8, M.bark, 1, mtx(-1.1 + i * 0.36 + r * 0.18, 0.17 + r * 0.29, 0, Math.PI / 2, 0, 0, B)); addBox(x, z, 1.2, 0.8, rot); }
export function barrel(x, z) { const y = groundH(x, z); const g = new THREE.CylinderGeometry(0.36, 0.36, 0.95, 16, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i); const k = 1 + 0.12 * (1 - Math.pow(yy / 0.475, 2)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); const nI = g.toNonIndexed(); const pp = nI.attributes.position; const uv = new Float32Array(pp.count * 2); for (let i = 0; i < pp.count; i++) { uv[i * 2] = Math.atan2(pp.getZ(i), pp.getX(i)) / 6.283 * 2; uv[i * 2 + 1] = pp.getY(i) / 1.2; } nI.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); put(nI, M.planks, mtx(x, y + 0.48, z, 0, rand() * 6, 0)); for (const hy of [-0.32, 0.32]) cyl(0.39, 0.39, 0.05, 16, M.iron, 1, mtx(x, y + 0.48 + hy, z)); addCircle(x, z, 0.42); }
export function crate(x, z, s = 0.85) { const y = groundH(x, z); box(s, s, s, M.planks, 0.9, mtx(x, y + s / 2, z, 0, rand() * 6, 0)); addCircle(x, z, s * 0.6); }
function hay(x, z) { const y = groundH(x, z); cyl(0.7, 0.7, 1.2, 18, M.hay, 1.5, mtx(x, y + 0.7, z, Math.PI / 2, rand() * 6, 0)); addCircle(x, z, 0.75); }
function cart(x, z, rot) { const y = groundH(x, z); const B = mtx(x, y, z, 0, rot, 0); box(2.6, 0.1, 1.3, M.planks, 1.2, mtx(0, 0.85, 0, 0, 0, 0, B)); for (const s of [-1, 1]) box(2.6, 0.45, 0.07, M.planks, 1.2, mtx(0, 1.1, s * 0.62, 0, 0, 0, B)); for (const s of [-1, 1]) { cyl(0.55, 0.55, 0.08, 18, M.oldWood, 1, mtx(0.3, 0.55, s * 0.75, Math.PI / 2, 0, 0, B)); cyl(0.57, 0.57, 0.05, 18, M.iron, 1, mtx(0.3, 0.55, s * 0.78, Math.PI / 2, 0, 0, B)); } for (const s of [-1, 1]) cyl(0.04, 0.05, 2.2, 6, M.oldWood, 1, mtx(-2.2, 0.55, s * 0.4, 0, 0, Math.PI / 2 - 0.25, B)); addBox(x, z, 1.5, 0.9, rot); }
export function bench(x, z, ry) { const y = groundH(x, z); const B = mtx(x, y, z, 0, ry, 0); box(1.8, 0.1, 0.42, M.oldWood, 1, mtx(0, 0.45, 0, 0, 0, 0, B)); box(1.8, 0.35, 0.06, M.oldWood, 1, mtx(0, 0.75, -0.2, -0.15, 0, 0, B)); for (const s2 of [-1, 1]) box(0.12, 0.45, 0.38, M.oldWood, 1, mtx(s2 * 0.75, 0.22, 0, 0, 0, 0, B)); addBox(x, z, 0.9, 0.25, ry); return new THREE.Vector3(x, y, z); }

// --------------- moinho de vento ---------------
export const windmills = [];
function windmill(x, z, ry) {
  const y = groundH(x, z) - 0.3; const B = mtx(x, y, z, 0, ry, 0);
  const g = new THREE.CylinderGeometry(2.4, 3.3, 9, 16, 1, false); put(cylUV(g, 3), M.plaster, B.clone().multiply(mtx(0, 4.5, 0)));
  const cap = new THREE.ConeGeometry(2.9, 3.0, 16); put(boxUV(cap, 2), M.thatch, B.clone().multiply(mtx(0, 10.4, 0)));
  box(1.0, 1.9, 0.3, M.paint.blue, 1, mtx(0, 1.0, 3.18, -0.09, 0, 0, B)); box(0.8, 0.8, 0.2, M.glass, 1, mtx(0, 5.6, 2.7, -0.1, 0, 0, B), false);
  addCircle(x, z, 3.2);
  const hub = new THREE.Group(); hub.position.copy(new THREE.Vector3(0, 9.4, 3.1).applyMatrix4(B)); hub.rotation.y = ry;
  const sails = new THREE.Group(); hub.add(sails);
  for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; sails.add(arm);
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.2, 0.12), M.oldWood); spar.position.y = 3.1; arm.add(spar);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 4.6), M.canvas); cloth.position.set(0.75, 3.7, 0.05); arm.add(cloth);
    for (let k = 0; k < 5; k++) { const lat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.05), M.oldWood); lat.position.set(0.7, 1.6 + k * 1.0, 0.06); arm.add(lat); } }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 10), M.oldWood); axle.rotation.x = Math.PI / 2; hub.add(axle);
  hub.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  windmills.push({ hub, sails }); return hub;
}

export function buildVillage(scene) {
  parts.length = 0;
  for (const h of HOUSES) house(h[0], h[1], h[2], h[3]);
  // poço
  { const y = groundH(0, 0); const R = 1.25; const n = 14; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; box(0.62, 0.95, 0.35, M.block, 1.2, mtx(Math.cos(a) * R, y + 0.47, Math.sin(a) * R, 0, -a + Math.PI / 2, 0)); }
    for (const s of [-1, 1]) box(0.2, 2.5, 0.2, M.timber, 1.5, mtx(s * 1.15, y + 1.25, 0)); cyl(0.09, 0.09, 2.5, 8, M.oldWood, 1, mtx(0, y + 2.1, 0, 0, 0, Math.PI / 2));
    for (const s of [-1, 1]) box(2.9, 0.08, 1.25, M.roof, 2.2, mtx(0, y + 2.68, s * 0.52, s * 0.62, 0, 0)); cyl(0.22, 0.18, 0.32, 10, M.planks, 0.8, mtx(0.2, y + 1.55, 0)); addCircle(0, 0, 1.6);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), new THREE.MeshStandardMaterial({ color: 0x05090a, roughness: 0.03, envMapIntensity: 1.5 })); water.rotation.x = -Math.PI / 2; water.position.set(0, y + 0.55, 0); scene.add(water);
    storySpots.poco = new THREE.Vector3(0, y, 1.9); }
  // oficina do Bastião (galpão aberto com bancada e forja)
  { const fx = 28, fz = 4, y = groundH(fx, fz) - 0.05; const B = mtx(fx, y, fz, 0, -Math.PI / 2, 0);
    box(5.6, 0.25, 4.6, M.cobble, 1.4, mtx(0, 0.0, 0, 0, 0, 0, B));
    for (const [a, b] of [[-2.4, -1.9], [2.4, -1.9], [-2.4, 1.9], [2.4, 1.9]]) box(0.25, 3.2, 0.25, M.timber, 1.5, mtx(a, 1.6, b, 0, 0, 0, B));
    for (const s of [-1, 1]) box(5.4, 0.2, 0.22, M.timber, 1.5, mtx(0, 3.2, s * 1.9, 0, 0, 0, B));
    box(6.2, 0.14, 5.4, M.roofDark, 2.4, mtx(0, 3.5, 0, 0.12, 0, 0, B));
    box(1.8, 1.6, 1.6, M.stone, 1.6, mtx(-1.4, 0.8, -1.1, 0, 0, 0, B)); box(0.8, 3.6, 0.8, M.stone, 1.6, mtx(-1.4, 2.4, -1.4, 0, 0, 0, B));
    box(0.7, 0.45, 0.1, M.ember, 1, mtx(-1.4, 0.75, -0.28, 0, 0, 0, B), false); smokes.push(new THREE.Vector3(-1.4, 4.3, -1.4).applyMatrix4(B));
    box(2.2, 0.12, 0.8, M.oldWood, 1, mtx(1.2, 0.9, -1.4, 0, 0, 0, B)); for (const a of [-1, 1]) for (const b of [-1, 1]) box(0.1, 0.85, 0.1, M.oldWood, 1, mtx(1.2 + a * 1.0, 0.45, -1.4 + b * 0.32, 0, 0, 0, B));
    for (let i = 0; i < 6; i++) box(2.4, 0.05, 0.22, M.planks, 1, mtx(1.4, 0.1 + i * 0.06, 1.4, 0, rr(-0.05, 0.05), 0, B), false);
    fires.push({ p: new THREE.Vector3(-1.4, 1.0, -0.1).applyMatrix4(B), forge: true });
    addBox(fx, fz, 2.4, 2.9, 0); }
  // pasto do Seu Anselmo
  fenceLine([[32, 38], [56, 38], [58, 58], [36, 60], [32, 46]]);
  woodpile(-31, -7.5, 0.35); woodpile(-38, 5, 1.57);
  [[31, 10], [32, 9.0], [-17.5, -13.5], [12, 25], [-40, -4]].forEach(([x, z]) => barrel(x, z));
  [[-27, -11.5], [19, -17], [-38, -34]].forEach(([x, z]) => crate(x, z));
  hay(48, 52); hay(50, 48); hay(44, 55);
  cart(8, 18, 0.6);
  // forno de pão da Celeste, do lado de fora
  { const ox = -18.5, oz = -11.5 + 3.5, y = groundH(ox, oz); const dome = new THREE.SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2); put(boxUV(dome, 1.2), M.stoneWarm, mtx(ox, y + 0.7, oz)); box(2.4, 0.7, 2.4, M.stone, 1.4, mtx(ox, y + 0.35, oz)); box(0.5, 0.45, 0.05, M.soot, 1, mtx(ox, y + 0.95, oz + 1.08), false); addCircle(ox, oz, 1.3); smokes.push(new THREE.Vector3(ox, y + 1.9, oz)); }
  // fogueira da vila com bancos
  { const x = -7, z = 10, y = groundH(x, z); for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283; const g = new THREE.DodecahedronGeometry(0.2, 1); put(boxUV(g, 0.6), M.stone, mtx(x + Math.cos(a) * 0.7, y + 0.08, z + Math.sin(a) * 0.7, rand(), rand(), rand())); }
    for (let i = 0; i < 4; i++) cyl(0.07, 0.08, 1.0, 7, M.bark, 1, mtx(x + Math.cos(i * 1.57) * 0.15, y + 0.25, z + Math.sin(i * 1.57) * 0.15, 0, i * 1.57, 1.0)); fires.push({ p: new THREE.Vector3(x, y + 0.5, z) }); addCircle(x, z, 0.8);
    storySpots.fogueira = bench(-9.5, 12.2, 0.6); bench(-4.4, 12.5, -0.5); }
  // varal com roupas coloridas
  { const a = [12, -30], b = [17, -31.5]; for (const p of [a, b]) cyl(0.05, 0.06, 2.2, 6, M.oldWood, 1, mtx(p[0], groundH(p[0], p[1]) + 1.1, p[1])); const n = 6; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t; const cm = [M.cloth.blue, M.cloth.white, M.cloth.ochre, M.cloth.green][i % 4]; const g = new THREE.PlaneGeometry(0.5, 0.65, 2, 3); put(boxUV(g, 1), cm, mtx(px, groundH(px, pz) + 1.7, pz, 0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0), false); } }
  windmill(-74, -34, 0.9);
  buildTower(); buildStones(); buildStoryProps(); buildLandmarks();
  return bake(scene);
}

function buildTower() {
  const { x, z } = POI.tower; const y = groundH(x, z) - 0.4;
  const ring = (r0, r1, h, y0, arc, start) => { const sh = new THREE.Shape(); sh.absarc(0, 0, r1, start, start + arc, false); sh.absarc(0, 0, r0, start + arc, start, true); const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 28 }); g.rotateX(-Math.PI / 2); put(cylUV(g, r1), M.stone, mtx(x, y + y0, z)); };
  ring(3.0, 4.0, 7.5, 0, Math.PI * 2 * 0.9, 0.3); ring(3.0, 4.0, 4.0, 7.5, Math.PI * 1.25, 1.1); ring(3.0, 4.0, 2.6, 11.5, Math.PI * 0.65, 1.6);
  for (let i = 0; i < 14; i++) { const a = rr(0, 6.283), dd = rr(4.5, 10); const g = boxUV(new THREE.BoxGeometry(rr(0.5, 1.1), rr(0.35, 0.7), rr(0.5, 1.0)), 1.6); put(g, M.stone, mtx(x + Math.cos(a) * dd, groundH(x + Math.cos(a) * dd, z + Math.sin(a) * dd) + 0.15, z + Math.sin(a) * dd, rand(), rand(), rand())); }
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283; if (a < 0.3) continue; addCircle(x + Math.cos(a) * 3.5, z - Math.sin(a) * 3.5, 0.7); }
  storySpots.tower = new THREE.Vector3(x + 5.5, groundH(x + 5.5, z + 6), z + 6);
}
function buildStoryProps() {
  // banco virado para o poente
  { const cx = 22, cz = -58; storySpots.banco = bench(cx, cz, -Math.PI / 2); }
  // o balanço
  { const sx = -42, sz = 27, sy = groundH(sx, sz); storySpots.balanco = new THREE.Vector3(sx + 1.5, sy, sz + 1.2);
    for (const s2 of [-1, 1]) { cyl(0.09, 0.12, 3.3, 7, M.bark, 1, mtx(sx + s2 * 1.3, sy + 1.55, sz - 0.5, 0.22, 0, 0)); cyl(0.09, 0.12, 3.3, 7, M.bark, 1, mtx(sx + s2 * 1.3, sy + 1.55, sz + 0.5, -0.22, 0, 0)); addCircle(sx + s2 * 1.3, sz, 0.3); }
    cyl(0.1, 0.1, 2.9, 7, M.bark, 1, mtx(sx, sy + 3.1, sz, 0, 0, Math.PI / 2)); }
  // a espada na pedra, acima do lago
  { const wx = -98, wz = 72, wy = groundH(wx, wz); storySpots.espada = new THREE.Vector3(wx + 1.2, wy, wz + 0.8);
    const rk = new THREE.DodecahedronGeometry(0.9, 1); rk.scale(1.3, 0.6, 1.1); put(boxUV(rk, 1.2), M.stone, mtx(wx, wy + 0.15, wz, 0.1, 0.4, 0)); addCircle(wx, wz, 1.0);
    box(0.06, 1.1, 0.012, M.iron, 1, mtx(wx, wy + 0.95, wz, 0.08, 0.3, 0.06)); box(0.34, 0.05, 0.06, M.iron, 1, mtx(wx - 0.04, wy + 1.5, wz, 0.08, 0.3, 0.06)); cyl(0.022, 0.022, 0.24, 6, M.timber, 1, mtx(wx - 0.05, wy + 1.66, wz, 0.08, 0.3, 0.06)); }
  // a árvore das fitas
  { const tx = -152, tz = -80, ty = groundH(tx, tz); storySpots.tree = new THREE.Vector3(tx + 2.4, ty, tz + 1.6); storySpots.treeRoot = new THREE.Vector3(tx, ty, tz);
    const cols = [M.canvasRed, M.cloth.white, M.cloth.blue, M.cloth.ochre, M.cloth.green]; for (let i = 0; i < 46; i++) { const a = rr(0, 6.28), r = rr(1.6, 3.8), h = rr(2.4, 4.4); const rb = new THREE.PlaneGeometry(0.05, rr(0.35, 0.8)); put(boxUV(rb, 1), cols[i % 5], mtx(tx + Math.cos(a) * r, ty + h, tz + Math.sin(a) * r, rr(-0.2, 0.2), rand() * 6, rr(-0.15, 0.15)), false); } }
  storySpots.head = new THREE.Vector3(POI.head.x - 3.5, groundH(POI.head.x - 3.5, POI.head.z + 4), POI.head.z + 4);
}
function buildStones() {
  const { x, z } = POI.stones; const y = groundH(x, z);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const px = x + Math.cos(a) * 9, pz = z + Math.sin(a) * 9; const h = rr(3, 4.4); const g = new THREE.BoxGeometry(1.2, h, 0.75, 2, 6, 2); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const yy = p.getY(k); p.setX(k, p.getX(k) * (1 - 0.2 * Math.max(0, yy / h)) * (1 + 0.08 * Math.sin(yy * 3 + k))); p.setZ(k, p.getZ(k) * (1 + 0.1 * Math.cos(yy * 2.3 + k))); } g.computeVertexNormals(); put(boxUV(g, 1.8), M.block, mtx(px, groundH(px, pz) + h / 2 - 0.3, pz, rr(-0.07, 0.07), -a, rr(-0.07, 0.07))); addCircle(px, pz, 0.75); }
  // pedra de deitar no centro, gasta
  box(2.2, 0.45, 1.2, M.block, 1.6, mtx(x, y + 0.12, z, 0, 0.3, 0)); addWalk(mtx(x, y, z, 0, 0.3, 0), -1.1, 1.1, -0.6, 0.6, 0.35);
  storySpots.stones = new THREE.Vector3(x + 2.2, y, z + 1.5);
}

function bake(scene) {
  const groups = new Map();
  for (const pt of parts) { const key = pt.mat.uuid + (pt.cast ? 'c' : 'n'); if (!groups.has(key)) groups.set(key, { mat: pt.mat, cast: pt.cast, geos: [] }); const g = pt.g.index ? pt.g.toNonIndexed() : pt.g; if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); groups.get(key).geos.push(g); }
  const meshes = [];
  for (const g of groups.values()) {
    const cells = new Map();
    for (const geo of g.geos) { geo.computeBoundingBox(); const c = geo.boundingBox.getCenter(new THREE.Vector3()); const k = Math.floor(c.x / 150) + ',' + Math.floor(c.z / 150); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(geo); }
    for (const list of cells.values()) {
      let n = 0; for (const x of list) n += x.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      for (const x of list) { pos.set(x.attributes.position.array, o * 3); nor.set(x.attributes.normal.array, o * 3); uv.set(x.attributes.uv.array, o * 2); o += x.attributes.position.count; }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); bg.computeBoundingSphere();
      const mesh = new THREE.Mesh(bg, g.mat); mesh.castShadow = g.cast; mesh.receiveShadow = true; scene.add(mesh); meshes.push(mesh);
    }
  }
  for (const w of windmills) scene.add(w.hub);
  parts.length = 0; return meshes;
}
