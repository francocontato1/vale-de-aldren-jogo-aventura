import { THREE, loadTex, rand, rr, clamp, U } from '../core.js';
import { groundH, POI } from './terrain.js';

// ---------------- materials ----------------
export const M = {};
export async function loadVillageMaterials(barkMat) {
  const L = (n, srgb = true) => loadTex('a/tex/' + n, { srgb });
  const [stoneC, stoneN, blockC, blockN, plasterC, plasterN, roofC, roofN, planksC, planksB, planksR, woodC, cobbleC] = await Promise.all([
    L('stone_c.jpg'), L('stone_n.jpg', false), L('block_c.jpg'), L('block_n.jpg', false), L('plaster_c.jpg'), L('plaster_n.jpg', false), L('roof_c.jpg'), L('roof_n.jpg', false),
    L('planks_c.jpg'), L('planks_b.jpg', false), L('planks_r.jpg', false), L('wood_c.jpg'), L('cobble_c.jpg'),
  ]);
  const S = (o) => new THREE.MeshStandardMaterial(o);
  M.stone = S({ map: stoneC, normalMap: stoneN, roughness: 0.92, color: 0xcfc8bd, normalScale: new THREE.Vector2(1.3, 1.3) });
  M.block = S({ map: blockC, normalMap: blockN, roughness: 0.9, color: 0xd9d0c2 });
  M.plaster = S({ map: plasterC, normalMap: plasterN, roughness: 0.95, color: 0xf1e7d6 });
  M.roof = S({ map: roofC, normalMap: roofN, roughness: 0.82, color: 0xc9b8a8, normalScale: new THREE.Vector2(1.4, 1.4) });
  M.roofDark = S({ map: roofC, normalMap: roofN, roughness: 0.85, color: 0x8f8a86, normalScale: new THREE.Vector2(1.4, 1.4) });
  M.planks = S({ map: planksC, bumpMap: planksB, bumpScale: 2, roughnessMap: planksR, roughness: 1, color: 0x9a8670 });
  M.timber = S({ map: planksC, bumpMap: planksB, bumpScale: 2, roughness: 0.9, color: 0x4d3b2c });
  M.oldWood = S({ map: woodC, roughness: 0.9, color: 0x7a6a5c });
  M.bark = barkMat ? barkMat.clone() : S({ color: 0x5a4636, roughness: 1 });
  M.bark.onBeforeCompile = () => { }; M.bark.customProgramCacheKey = () => 'barkprop';
  M.cobble = S({ map: cobbleC, roughness: 0.88, color: 0xb0aaa2 });
  M.iron = S({ color: 0x2c2c2e, roughness: 0.45, metalness: 0.85 });
  M.glass = S({ color: 0x1a2226, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.6, emissive: 0xffa552, emissiveIntensity: 0, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  M.canvas = S({ map: plasterC, normalMap: plasterN, roughness: 1, color: 0xb9a888, side: THREE.DoubleSide });
  M.canvasRed = S({ map: plasterC, normalMap: plasterN, roughness: 1, color: 0x6e2a22, side: THREE.DoubleSide });
  M.hay = S({ map: woodC, roughness: 1, color: 0xc8a75a });
  M.soot = S({ color: 0x141210, roughness: 1 });
  M.ember = S({ color: 0x220800, emissive: 0xff5a14, emissiveIntensity: 3.0, roughness: 1 });
  M.red = S({ color: 0x5c0f0a, roughness: 0.9 });
  M.lime = S({ map: plasterC, normalMap: plasterN, roughness: 0.95, color: 0xfff4e2 });
  M.floor = S({ map: planksC, bumpMap: planksB, bumpScale: 2, roughnessMap: planksR, roughness: 1, color: 0x6e5a48 });
  M.candle = S({ color: 0xf2e6c8, emissive: 0xffa040, emissiveIntensity: 0.6, roughness: 0.6 });
  M.clay = S({ color: 0x8a5a3a, roughness: 0.8 });
  return M;
}

// --------------- helpers ---------------
// box projection UVs in local space (meters / tile)
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
const parts = []; // {geo (world), mat, cast}
function put(geo, mat, matrix, cast = true) { const g = geo.clone(); g.applyMatrix4(matrix); parts.push({ g, mat, cast }); }
function box(w, h, d, mat, tile, matrix, cast = true) { put(boxUV(new THREE.BoxGeometry(w, h, d), tile), mat, matrix, cast); }
function mtx(x, y, z, rx = 0, ry = 0, rz = 0, parent) { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)); return parent ? parent.clone().multiply(m) : m; }
function cyl(rt, rb, h, seg, mat, tile, matrix, cast = true, open = false) { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); const nI = g.toNonIndexed(); const p = nI.attributes.position; const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); uv[i * 2] = a / (Math.PI * 2) * (2 * Math.PI * rb) / tile; uv[i * 2 + 1] = p.getY(i) / tile; } nI.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); put(nI, mat, matrix, cast); }

export const colliders = { boxes: [], circles: [] };
export const HOUSES = [
  [-24, -16, 0.35, { w: 7.5, d: 5.5, floors: 2, lower: 'stone' }],
  [22, -22, -0.5, { w: 6.5, d: 5.2, floors: 1, lower: 'plaster', roof: 'roofDark' }],
  [-14, 32, 3.0, { w: 8.5, d: 6, floors: 2, lower: 'stone' }],
  [16, 30, -2.8, { w: 6.2, d: 5, floors: 1, lower: 'stone', roof: 'roofDark' }],
  [-32, -38, 0.6, { w: 7, d: 5.4, floors: 1, lower: 'plaster' }],
  [-44, 2, 1.57, { w: 6.4, d: 5, floors: 2, lower: 'stone', roof: 'roofDark' }],
  [40, -42, -0.9, { w: 6.4, d: 5, floors: 1, lower: 'stone' }],
  [-6, -24, 0.1, { w: 6.8, d: 5.2, floors: 2, lower: 'plaster' }],
  [36, 27, -1.2, { w: 5.8, d: 4.8, floors: 1, lower: 'stone', roof: 'roofDark' }],
];
export function villageDirt(x, z) {
  let d = 0; const r0 = Math.hypot(x - 0, z - 2); d = Math.max(d, 1 - Math.min(1, Math.max(0, (r0 - 9) / 8)));
  for (const h of HOUSES) { const c = Math.cos(h[2]), s = Math.sin(h[2]); const fx = h[0] + s * (h[3].d / 2 + 2), fz = h[1] + c * (h[3].d / 2 + 2); const r = Math.hypot(x - fx, z - fz); d = Math.max(d, 0.85 * (1 - Math.min(1, Math.max(0, (r - 1.5) / 3.5)))); }
  const rf = Math.hypot(x - 28, z - 4); d = Math.max(d, 1 - Math.min(1, Math.max(0, (rf - 3) / 4)));
  const rc = Math.hypot(x - POI.camp.x, z - POI.camp.z); d = Math.max(d, 0.9 * (1 - Math.min(1, Math.max(0, (rc - 9) / 9))));
  return d;
}
export function addBox(x, z, hw, hd, rot) { colliders.boxes.push({ x, z, hw, hd, c: Math.cos(rot), s: Math.sin(rot), rad: Math.hypot(hw, hd) }); }
export function addCircle(x, z, r) { colliders.circles.push([x, z, r]); }
export const lights = []; export const smokes = []; export const fires = []; export const interactPoints = [];

// --------------- house ---------------
export const interiors = []; export const doors = [];
function wallO(len, H, T, mat, tile, openings, M, colRot, collide = true) {
  const ops = openings.slice().sort((a, b) => a.x - b.x); let cur = -len / 2;
  const piece = (x0, x1, y0, y1) => { if (x1 - x0 < 0.02 || y1 - y0 < 0.02) return; const m = mtx((x0 + x1) / 2, (y0 + y1) / 2 - H / 2, 0, 0, 0, 0, M); box(x1 - x0, y1 - y0, T, mat, tile, m);
    if (collide && y0 < 0.05) { const c = new THREE.Vector3().setFromMatrixPosition(m); addBox(c.x, c.z, (x1 - x0) / 2, T / 2 + 0.04, colRot); } };
  for (const op of ops) { piece(cur, op.x - op.w / 2, 0, H); piece(op.x - op.w / 2, op.x + op.w / 2, 0, op.y0); piece(op.x - op.w / 2, op.x + op.w / 2, op.y0 + op.h, H); cur = op.x + op.w / 2; }
  piece(cur, len / 2, 0, H);
}
function house(x, z, rot, o) {
  const w = o.w, d = o.d, floors = o.floors || 1, fh = 2.9;
  let y0 = -1e9; for (const a of [-0.5, 0, 0.5]) for (const b of [-0.5, 0, 0.5]) { const c = Math.cos(rot), s2 = Math.sin(rot); const lx = a * w, lz = b * d; y0 = Math.max(y0, groundH(x + lx * c + lz * s2, z - lx * s2 + lz * c)); } y0 -= 0.35;
  const B = mtx(x, y0, z, 0, rot, 0);
  const T = 0.3; const lower = o.lower || M.stone, upper = o.upper || M.plaster; const base = 0.55;
  const L = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(B);
  box(w + 0.35, 1.9, d + 0.35, M.stone, 1.6, mtx(0, -0.4, 0, 0, 0, 0, B), true);
  const dx = o.doorX || 0; const DW = 1.1, DH = 2.15;
  const winY0 = 0.95, WW = 0.9, WH = 1.05;
  const frontOps = [{ x: dx, y0: 0, w: DW, h: DH }, { x: -w * 0.3, y0: winY0, w: WW, h: WH }]; if (w > 6) frontOps.push({ x: w * 0.3, y0: winY0, w: WW, h: WH });
  const backOps = [{ x: -w * 0.15, y0: winY0, w: WW, h: WH }];
  const sideOps = [{ x: 0, y0: winY0, w: WW, h: WH }];
  const tl = lower === M.plaster ? 3 : 2.2;
  // exterior walls (with real openings)
  wallO(w, fh, T, lower, tl, frontOps, mtx(0, base + fh / 2, d / 2 - T / 2, 0, 0, 0, B), rot);
  wallO(w, fh, T, lower, tl, backOps.map(o2 => ({ ...o2, x: -o2.x })), mtx(0, base + fh / 2, -d / 2 + T / 2, 0, Math.PI, 0, B), rot);
  wallO(d - 2 * T, fh, T, lower, tl, sideOps, mtx(w / 2 - T / 2, base + fh / 2, 0, 0, Math.PI / 2, 0, B), rot + Math.PI / 2);
  wallO(d - 2 * T, fh, T, lower, tl, [], mtx(-w / 2 + T / 2, base + fh / 2, 0, 0, -Math.PI / 2, 0, B), rot + Math.PI / 2);
  // whitewashed interior lining
  const LT = 0.025, li = T + LT / 2 + 0.005;
  wallO(w - 2 * T, fh, LT, M.lime, 2.5, frontOps, mtx(0, base + fh / 2, d / 2 - li, 0, 0, 0, B), rot, false);
  wallO(w - 2 * T, fh, LT, M.lime, 2.5, backOps.map(o2 => ({ ...o2, x: -o2.x })), mtx(0, base + fh / 2, -d / 2 + li, 0, Math.PI, 0, B), rot, false);
  wallO(d - 2 * T - 0.06, fh, LT, M.lime, 2.5, sideOps, mtx(w / 2 - li, base + fh / 2, 0, 0, Math.PI / 2, 0, B), rot, false);
  wallO(d - 2 * T - 0.06, fh, LT, M.lime, 2.5, [], mtx(-w / 2 + li, base + fh / 2, 0, 0, -Math.PI / 2, 0, B), rot, false);
  // floor & ceiling
  const iw = w - 2 * T, id = d - 2 * T;
  box(iw, 0.08, id, M.floor, 1.4, mtx(0, base - 0.02, 0, 0, 0, 0, B), false);
  box(iw, 0.1, id, M.planks, 1.4, mtx(0, base + fh - 0.05, 0, 0, 0, 0, B));
  for (let i = 0; i < 4; i++) box(0.18, 0.2, id, M.timber, 1.5, mtx(-iw / 2 + iw * (i + 0.5) / 4, base + fh - 0.2, 0, 0, 0, 0, B), false);
  let top = base + fh;
  const timberFrame = (yb, h, ow, od) => {
    const bw = 0.17;
    for (const s2 of [-1, 1]) { box(ow + 0.1, bw, bw, M.timber, 1.5, mtx(0, yb + bw / 2, s2 * (od / 2 + 0.02), 0, 0, 0, B)); box(ow + 0.1, bw, bw, M.timber, 1.5, mtx(0, yb + h - bw / 2, s2 * (od / 2 + 0.02), 0, 0, 0, B)); box(bw, bw, od + 0.1, M.timber, 1.5, mtx(s2 * (ow / 2 + 0.02), yb + bw / 2, 0, 0, 0, 0, B)); box(bw, bw, od + 0.1, M.timber, 1.5, mtx(s2 * (ow / 2 + 0.02), yb + h - bw / 2, 0, 0, 0, 0, B)); }
    const nz = Math.max(2, Math.round(od / 1.3)); for (let i = 0; i <= nz; i++) { const pz = -od / 2 + od * i / nz; for (const s2 of [-1, 1]) box(bw, h, bw, M.timber, 1.5, mtx(s2 * (ow / 2 + 0.03), yb + h / 2, pz, 0, 0, 0, B)); }
    for (const s2 of [-1, 1]) for (const px of [-ow / 2, -ow / 4, ow / 4, ow / 2]) box(bw, h, bw, M.timber, 1.5, mtx(px, yb + h / 2, s2 * (od / 2 + 0.03), 0, 0, 0, B));
  };
  if (lower === M.plaster) timberFrame(base, fh, w, d);
  if (floors > 1) {
    const ow = w + 0.4, od = d + 0.4;
    box(ow + 0.2, 0.22, od + 0.2, M.timber, 1.5, mtx(0, top + 0.11, 0, 0, 0, 0, B));
    const wall = (len, mat, mm) => box(len, fh, T, mat, 3, mm);
    wall(ow, upper, mtx(0, top + 0.22 + fh / 2, od / 2 - T / 2, 0, 0, 0, B)); wall(ow, upper, mtx(0, top + 0.22 + fh / 2, -od / 2 + T / 2, 0, 0, 0, B));
    wall(od - 2 * T, upper, mtx(ow / 2 - T / 2, top + 0.22 + fh / 2, 0, 0, Math.PI / 2, 0, B)); wall(od - 2 * T, upper, mtx(-ow / 2 + T / 2, top + 0.22 + fh / 2, 0, 0, Math.PI / 2, 0, B));
    timberFrame(top + 0.22, fh, ow, od);
    for (let i = 0; i < 6; i++) { const a = -ow / 2 + ow * (i + 0.5) / 6; if (i % 2 === 0) for (const s2 of [-1, 1]) { const Lb = Math.hypot(ow / 6, fh); box(0.13, Lb, 0.12, M.timber, 1.5, mtx(a, top + 0.22 + fh / 2, s2 * (od / 2 + 0.04), 0, 0, Math.atan2(ow / 6, fh) * (i % 4 === 0 ? 1 : -1), B)); } }
    top += 0.22 + fh;
  }
  const pitch = o.pitch || 0.72; const ow = (floors > 1 ? w + 0.4 : w), od = (floors > 1 ? d + 0.4 : d);
  const half = od / 2 + 0.55; const slab = half / Math.cos(pitch); const rh = Math.tan(pitch) * (od / 2);
  const roofMat = o.roof || M.roof;
  for (const s2 of [-1, 1]) { const m = mtx(0, top + rh - (od / 4 + 0.275) * Math.tan(pitch) + 0.1, s2 * (od / 4 + 0.275), s2 * pitch, 0, 0, B); box(ow + 1.0, 0.16, slab, roofMat, 2.4, m); }
  box(ow + 1.05, 0.22, 0.32, M.timber, 1.5, mtx(0, top + rh + 0.18, 0, Math.PI / 4, 0, 0, B));
  const sh = new THREE.Shape(); sh.moveTo(-od / 2, 0); sh.lineTo(0, rh); sh.lineTo(od / 2, 0); sh.lineTo(-od / 2, 0);
  const gg = boxUV(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), 3);
  for (const s2 of [-1, 1]) put(gg, upper, mtx(s2 * (ow / 2 - T / 2), top, 0, 0, Math.PI / 2 * s2, 0, B).multiply(mtx(0, 0, -T / 2)));
  // fireplace + chimney (back wall, right side)
  const fx = Math.min(w * 0.26, w / 2 - T - 0.9), fz = -d / 2 + T + 0.35;
  box(1.5, 1.25, 0.2, M.stone, 1.4, mtx(fx, base + 0.62, fz - 0.25, 0, 0, 0, B)); for (const s2 of [-1, 1]) box(0.32, 1.25, 0.7, M.stone, 1.4, mtx(fx + s2 * 0.59, base + 0.62, fz, 0, 0, 0, B)); box(1.5, 0.42, 0.7, M.stone, 1.4, mtx(fx, base + 1.04, fz, 0, 0, 0, B));
  box(0.86, 0.82, 0.04, M.soot, 1, mtx(fx, base + 0.41, fz - 0.14, 0, 0, 0, B), false); box(0.86, 0.04, 0.5, M.soot, 1, mtx(fx, base + 0.02, fz + 0.08, 0, 0, 0, B), false);
  box(1.7, 0.12, 0.85, M.timber, 1.5, mtx(fx, base + 1.31, fz + 0.04, 0, 0, 0, B));
  box(1.05, fh - 1.37, 0.55, M.stone, 1.4, mtx(fx, base + 1.37 + (fh - 1.37) / 2, fz - 0.05, 0, 0, 0, B));
  box(0.5, 0.06, 0.3, M.ember, 1, mtx(fx, base + 0.07, fz + 0.02, 0, 0, 0, B), false);
  for (let i = 0; i < 3; i++) cyl(0.055, 0.055, 0.5, 7, M.bark, 1, mtx(fx - 0.13 + i * 0.13, base + 0.13, fz + 0.02, 0, 0.35 * (i - 1), Math.PI / 2, B));
  addBox(L(fx, 0, fz).x, L(fx, 0, fz).z, 0.8, 0.4, rot);
  const chimX = fx, chimZ = -od / 2 + T + 0.3;
  if (o.chimney !== false) { box(0.75, rh + 2.4, 0.75, M.stone, 1.6, mtx(chimX, top + (rh + 2.4) / 2 - 0.2, chimZ, 0, 0, 0, B)); box(0.9, 0.12, 0.9, M.stone, 1.6, mtx(chimX, top + rh + 2.2, chimZ, 0, 0, 0, B)); smokes.push(L(chimX, top + rh + 2.3, chimZ)); }
  // furniture
  const fl = base + 0.02;
  const table = (tx, tz, tr) => { const T2 = mtx(tx, fl, tz, 0, tr, 0, B); box(1.5, 0.07, 0.8, M.oldWood, 1, mtx(0, 0.76, 0, 0, 0, 0, T2)); for (const a of [-1, 1]) for (const b of [-1, 1]) box(0.08, 0.74, 0.08, M.oldWood, 1, mtx(a * 0.65, 0.37, b * 0.32, 0, 0, 0, T2)); for (const b of [-1, 1]) { box(1.4, 0.06, 0.3, M.oldWood, 1, mtx(0, 0.45, b * 0.7, 0, 0, 0, T2)); for (const a of [-1, 1]) box(0.06, 0.43, 0.26, M.oldWood, 1, mtx(a * 0.6, 0.22, b * 0.7, 0, 0, 0, T2)); }
    cyl(0.03, 0.035, 0.12, 8, M.candle, 1, mtx(0.2, 0.86, 0.05, 0, 0, 0, T2), false); cyl(0.11, 0.09, 0.04, 12, M.iron, 1, mtx(-0.3, 0.81, -0.1, 0, 0, 0, T2)); cyl(0.05, 0.04, 0.13, 10, M.clay, 1, mtx(-0.05, 0.86, -0.15, 0, 0, 0, T2));
    const c = L(tx, 0, tz); addBox(c.x, c.z, 0.8, 0.85, rot + tr); return L(tx + 0.2, fl + 0.95, tz + 0.05); };
  const candle = table(-w * 0.12, d * 0.05, 0);
  const bx = -w / 2 + T + 0.55, bz = -d / 2 + T + 1.15;
  if (iw > 4.5) { const Bd = mtx(bx, fl, bz, 0, 0, 0, B); box(1.0, 0.35, 2.0, M.oldWood, 1, mtx(0, 0.2, 0, 0, 0, 0, Bd)); box(0.92, 0.16, 1.9, M.canvas, 1, mtx(0, 0.44, 0, 0, 0, 0, Bd)); box(0.96, 0.08, 1.2, M.canvasRed, 1, mtx(0, 0.54, 0.3, 0, 0, 0, Bd)); box(0.6, 0.12, 0.35, M.canvas, 1, mtx(0, 0.58, -0.72, 0, 0, 0, Bd)); box(1.05, 0.9, 0.08, M.oldWood, 1, mtx(0, 0.45, -1.02, 0, 0, 0, Bd)); const c = L(bx, 0, bz); addBox(c.x, c.z, 0.55, 1.05, rot);
    box(0.9, 0.5, 0.5, M.planks, 0.9, mtx(bx, fl + 0.25, bz + 1.45, 0, 0, 0, B)); const c2 = L(bx, 0, bz + 1.45); addBox(c2.x, c2.z, 0.45, 0.25, rot); }
  { const sx = w / 2 - T - 0.2, sz = d * 0.18; for (const hy of [1.1, 1.6]) box(0.3, 0.04, 1.4, M.oldWood, 1, mtx(sx, fl + hy, sz, 0, 0, 0, B)); for (let i = 0; i < 4; i++) cyl(0.06 + (i % 2) * 0.02, 0.05, 0.16 + (i % 3) * 0.05, 10, M.clay, 1, mtx(sx, fl + 1.2 + (i % 3) * 0.03, sz - 0.5 + i * 0.33, 0, 0, 0, B), false); }
  box(1.6, 0.012, 1.0, M.canvasRed, 1, mtx(-w * 0.12, fl + 0.01, d * 0.05 + 1.1, 0, 0, 0, B), false);
  // windows (outer frame, glass in the opening, inner sill)
  const win = (lx, ly, lz, ry) => {
    const W = mtx(lx, ly, lz, 0, ry, 0, B);
    box(WW, WH, 0.03, M.glass, 1, mtx(0, 0, -T / 2, 0, 0, 0, W), false);
    box(1.08, 0.1, 0.16, M.timber, 1.5, mtx(0, 0.58, 0.04, 0, 0, 0, W)); box(1.18, 0.1, 0.28, M.block, 1, mtx(0, -0.58, 0.08, 0, 0, 0, W));
    for (const s2 of [-1, 1]) box(0.1, 1.15, 0.16, M.timber, 1.5, mtx(s2 * 0.5, 0, 0.04, 0, 0, 0, W));
    box(0.05, WH, 0.06, M.timber, 1.5, mtx(0, 0, -T / 2, 0, 0, 0, W)); box(WW, 0.05, 0.06, M.timber, 1.5, mtx(0, 0.05, -T / 2, 0, 0, 0, W));
    box(1.0, 0.06, 0.2, M.oldWood, 1, mtx(0, -0.55, -T - 0.08, 0, 0, 0, W));
    if (rand() < 0.75) for (const s2 of [-1, 1]) box(0.48, 1.1, 0.05, M.planks, 1.0, mtx(s2 * 0.78, 0, 0.18, 0, s2 * 0.35, 0, W));
  };
  const wy = base + winY0 + WH / 2;
  win(-w * 0.3, wy, d / 2 + 0.02, 0); if (w > 6) win(w * 0.3, wy, d / 2 + 0.02, 0);
  win(-w * 0.15, wy, -d / 2 - 0.02, Math.PI); win(w / 2 + 0.02, wy, 0, Math.PI / 2);
  if (floors > 1) { const uy = top - fh / 2 - 0.1; const ex = (lx, lz, ry) => { const W = mtx(lx, uy, lz, 0, ry, 0, B); box(0.9, 1.05, 0.06, M.glass, 1, mtx(0, 0, 0, 0, 0, 0, W), false); box(1.08, 0.1, 0.16, M.timber, 1.5, mtx(0, 0.55, 0.04, 0, 0, 0, W)); for (const s2 of [-1, 1]) box(0.1, 1.15, 0.16, M.timber, 1.5, mtx(s2 * 0.5, 0, 0.04, 0, 0, 0, W)); box(1.18, 0.1, 0.2, M.timber, 1, mtx(0, -0.56, 0.06, 0, 0, 0, W)); }; ex(-w * 0.25, d / 2 + 0.22, 0); ex(w * 0.25, d / 2 + 0.22, 0); ex(0, -d / 2 - 0.22, Math.PI); }
  // door frame + step; the door leaf is a live object that swings open
  const dz = d / 2;
  box(1.45, 0.16, 0.36, M.timber, 1.5, mtx(dx, base + DH + 0.08, dz - 0.1, 0, 0, 0, B)); for (const s2 of [-1, 1]) box(0.14, DH + 0.1, 0.36, M.timber, 1.5, mtx(dx + s2 * (DW / 2 + 0.07), base + DH / 2, dz - 0.1, 0, 0, 0, B));
  box(1.6, 0.25, 0.7, M.block, 1.2, mtx(dx, 0.4, dz + 0.42, 0, 0, 0, B));
  const hinge = L(dx - DW / 2, base, dz - 0.05);
  const pivot = new THREE.Group(); pivot.position.copy(hinge); pivot.rotation.y = rot;
  const leaf = new THREE.Mesh(boxUV(new THREE.BoxGeometry(DW - 0.04, DH - 0.03, 0.07), 1.3), M.planks); leaf.position.set(DW / 2, DH / 2, 0); leaf.castShadow = true; leaf.receiveShadow = true; pivot.add(leaf);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.iron); knob.position.set(DW - 0.16, DH * 0.48, 0.06); pivot.add(knob);
  for (const hy of [0.3, DH - 0.35]) { const st = new THREE.Mesh(new THREE.BoxGeometry(DW * 0.7, 0.05, 0.08), M.iron); st.position.set(DW * 0.36, hy, 0.01); pivot.add(st); }
  const door = { pivot, open: 0, target: 0, rot, p: L(dx, 0, dz + 0.4), was: false }; doors.push(door);
  interiors.push({ x, z, rot, hw: w / 2 - T, hd: d / 2 - T, y: y0 + base, fire: L(fx, base + 0.2, fz + 0.02), candle, door, B });
  return B;
}
export function insideHouse(px, pz) { for (const h of interiors) { const dx = px - h.x, dz = pz - h.z; const c = Math.cos(h.rot), s = Math.sin(h.rot); const lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < h.hw + 0.1 && Math.abs(lz) < h.hd + 0.1) return h; } return null; }
export function inFootprint(px, pz, m = 0.5) { for (const h of interiors) { const dx = px - h.x, dz = pz - h.z; const c = Math.cos(h.rot), s = Math.sin(h.rot); const lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < h.hw + 0.3 + m && Math.abs(lz) < h.hd + 0.3 + m) return true; } return false; }

function fenceLine(pts, opts = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1]; const len = Math.hypot(x2 - x1, z2 - z1); const n = Math.max(1, Math.round(len / 2.4));
    for (let k = 0; k <= n; k++) { const x = x1 + (x2 - x1) * k / n, z = z1 + (z2 - z1) * k / n; cyl(0.07, 0.09, 1.3, 7, M.bark, 1, mtx(x, groundH(x, z) + 0.55, z, rr(-0.05, 0.05), 0, rr(-0.05, 0.05))); addCircle(x, z, 0.2); }
    for (let k = 0; k < n; k++) { const xa = x1 + (x2 - x1) * k / n, za = z1 + (z2 - z1) * k / n, xb = x1 + (x2 - x1) * (k + 1) / n, zb = z1 + (z2 - z1) * (k + 1) / n; const mx = (xa + xb) / 2, mz = (za + zb) / 2, my = (groundH(xa, za) + groundH(xb, zb)) / 2; const L = Math.hypot(xb - xa, zb - za); const ang = -Math.atan2(zb - za, xb - xa); const dy = groundH(xb, zb) - groundH(xa, za); const tilt = Math.atan2(dy, L);
      for (const hh of [0.5, 0.95]) cyl(0.05, 0.055, L + 0.15, 6, M.bark, 1, mtx(mx, my + hh, mz, 0, ang, Math.PI / 2 + tilt), true); }
  }
}
function woodpile(x, z, rot) { const B = mtx(x, groundH(x, z), z, 0, rot, 0); for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) cyl(0.16, 0.16, 1.4, 8, M.bark, 1, mtx(-1.1 + i * 0.36 + r * 0.18, 0.17 + r * 0.29, 0, Math.PI / 2, 0, 0, B)); addBox(x, z, 1.2, 0.8, rot); }
function barrel(x, z) { const y = groundH(x, z); const g = new THREE.CylinderGeometry(0.36, 0.36, 0.95, 16, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i); const k = 1 + 0.12 * (1 - Math.pow(yy / 0.475, 2)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); const nI = g.toNonIndexed(); const pp = nI.attributes.position; const uv = new Float32Array(pp.count * 2); for (let i = 0; i < pp.count; i++) { uv[i * 2] = Math.atan2(pp.getZ(i), pp.getX(i)) / 6.283 * 2; uv[i * 2 + 1] = pp.getY(i) / 1.2; } nI.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); put(nI, M.planks, mtx(x, y + 0.48, z, 0, rand() * 6, 0)); for (const hy of [-0.32, 0.32]) cyl(0.39, 0.39, 0.05, 16, M.iron, 1, mtx(x, y + 0.48 + hy, z)); addCircle(x, z, 0.42); }
function crate(x, z, s = 0.85) { const y = groundH(x, z); box(s, s, s, M.planks, 0.9, mtx(x, y + s / 2, z, 0, rand() * 6, 0)); addCircle(x, z, s * 0.6); }
function hay(x, z) { const y = groundH(x, z); cyl(0.7, 0.7, 1.2, 18, M.hay, 1.5, mtx(x, y + 0.7, z, Math.PI / 2, rand() * 6, 0)); addCircle(x, z, 0.75); }
function cart(x, z, rot) { const y = groundH(x, z); const B = mtx(x, y, z, 0, rot, 0); box(2.6, 0.1, 1.3, M.planks, 1.2, mtx(0, 0.85, 0, 0, 0, 0, B)); for (const s of [-1, 1]) box(2.6, 0.45, 0.07, M.planks, 1.2, mtx(0, 1.1, s * 0.62, 0, 0, 0, B)); for (const s of [-1, 1]) { cyl(0.55, 0.55, 0.08, 18, M.oldWood, 1, mtx(0.3, 0.55, s * 0.75, Math.PI / 2, 0, 0, B)); cyl(0.57, 0.57, 0.05, 18, M.iron, 1, mtx(0.3, 0.55, s * 0.78, Math.PI / 2, 0, 0, B)); } for (const s of [-1, 1]) cyl(0.04, 0.05, 2.2, 6, M.oldWood, 1, mtx(-2.2, 0.55, s * 0.4, 0, 0, Math.PI / 2 - 0.25, B)); addBox(x, z, 1.5, 0.9, rot); }

export function buildVillage(scene) {
  parts.length = 0;
  // houses
  for (const h of HOUSES) house(h[0], h[1], h[2], Object.assign({}, h[3], { lower: M[h[3].lower], roof: h[3].roof ? M[h[3].roof] : undefined }));
  // well
  { const y = groundH(0, 0); const R = 1.25; const n = 14; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; box(0.62, 0.95, 0.35, M.block, 1.2, mtx(Math.cos(a) * R, y + 0.47, Math.sin(a) * R, 0, -a + Math.PI / 2, 0)); }
    for (const s of [-1, 1]) box(0.2, 2.5, 0.2, M.timber, 1.5, mtx(s * 1.15, y + 1.25, 0)); cyl(0.09, 0.09, 2.5, 8, M.oldWood, 1, mtx(0, y + 2.1, 0, 0, 0, Math.PI / 2));
    for (const s of [-1, 1]) box(2.9, 0.08, 1.25, M.roof, 2.2, mtx(0, y + 2.68, s * 0.52, s * 0.62, 0, 0)); cyl(0.22, 0.18, 0.32, 10, M.planks, 0.8, mtx(0.2, y + 1.55, 0)); addCircle(0, 0, 1.6);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), new THREE.MeshStandardMaterial({ color: 0x05090a, roughness: 0.05 })); water.rotation.x = -Math.PI / 2; water.position.set(0, y + 0.55, 0); scene.add(water); }
  // forge (open shed) with furnace and anvil
  { const fx = 28, fz = 4, y = groundH(fx, fz) - 0.05; const B = mtx(fx, y, fz, 0, -Math.PI / 2, 0);
    box(5.6, 0.25, 4.6, M.cobble, 1.4, mtx(0, 0.0, 0, 0, 0, 0, B));
    for (const [a, b] of [[-2.4, -1.9], [2.4, -1.9], [-2.4, 1.9], [2.4, 1.9]]) box(0.25, 3.2, 0.25, M.timber, 1.5, mtx(a, 1.6, b, 0, 0, 0, B));
    for (const s of [-1, 1]) box(5.4, 0.2, 0.22, M.timber, 1.5, mtx(0, 3.2, s * 1.9, 0, 0, 0, B));
    box(6.2, 0.14, 5.4, M.roofDark, 2.4, mtx(0, 3.5, 0, 0.12, 0, 0, B));
    box(1.8, 1.6, 1.6, M.stone, 1.6, mtx(-1.4, 0.8, -1.1, 0, 0, 0, B)); box(0.8, 3.6, 0.8, M.stone, 1.6, mtx(-1.4, 2.4, -1.4, 0, 0, 0, B));
    box(0.7, 0.45, 0.1, M.ember, 1, mtx(-1.4, 0.75, -0.28, 0, 0, 0, B), false); smokes.push(new THREE.Vector3(-1.4, 4.3, -1.4).applyMatrix4(B));
    cyl(0.28, 0.34, 0.65, 10, M.bark, 1, mtx(1.0, 0.33, 0.6, 0, 0, 0, B)); box(0.62, 0.22, 0.24, M.iron, 1, mtx(1.0, 0.76, 0.6, 0, 0, 0, B)); box(0.25, 0.12, 0.18, M.iron, 1, mtx(1.38, 0.8, 0.6, 0, 0, 0, B));
    box(1.6, 0.9, 0.7, M.planks, 1, mtx(1.6, 0.45, -1.4, 0, 0, 0, B));
    fires.push({ p: new THREE.Vector3(-1.4, 1.0, -0.1).applyMatrix4(B), forge: true });
    addBox(fx, fz, 2.4, 2.9, 0); interactPoints.push({ type: 'ammo', p: new THREE.Vector3(1.6, 0, -0.6).applyMatrix4(B) }); }
  // garden fence + props
  fenceLine([[32, 38], [56, 38], [58, 58], [36, 60], [32, 46]]);
  woodpile(-20, -10.5, 0.35); woodpile(-38, 5, 1.57);
  [[31, 10], [32, 9.0], [-19, -11.5], [12, 25], [-40, -4]].forEach(([x, z]) => barrel(x, z));
  [[-27, -11.5], [19, -17], [-38, -34]].forEach(([x, z]) => crate(x, z));
  hay(48, 52); hay(50, 48); hay(44, 55);
  cart(8, 18, 0.6);
  // hunter rack near Iago
  { const x = -8, z = -46, y = groundH(x, z); for (const s of [-1, 1]) cyl(0.07, 0.08, 2.0, 7, M.bark, 1, mtx(x + s * 0.9, y + 1.0, z)); cyl(0.06, 0.06, 2.0, 7, M.bark, 1, mtx(x, y + 1.9, z, 0, 0, Math.PI / 2)); addCircle(x, z, 1.0); }
  // village fire pit
  { const x = -7, z = 10, y = groundH(x, z); for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283; const g = new THREE.DodecahedronGeometry(0.2, 1); put(boxUV(g, 0.6), M.stone, mtx(x + Math.cos(a) * 0.7, y + 0.08, z + Math.sin(a) * 0.7, rand(), rand(), rand())); }
    for (let i = 0; i < 4; i++) cyl(0.07, 0.08, 1.0, 7, M.bark, 1, mtx(x + Math.cos(i * 1.57) * 0.15, y + 0.25, z + Math.sin(i * 1.57) * 0.15, 0, i * 1.57, 1.0)); fires.push({ p: new THREE.Vector3(x, y + 0.5, z) }); addCircle(x, z, 0.8);
    for (const [bx, bz, br] of [[-9.5, 11.5, 0.6], [-4.8, 12, -0.5]]) { box(1.8, 0.12, 0.4, M.planks, 1, mtx(bx, groundH(bx, bz) + 0.45, bz, 0, br, 0)); for (const s of [-1, 1]) box(0.12, 0.45, 0.35, M.planks, 1, mtx(bx + Math.cos(br) * s * 0.7, groundH(bx, bz) + 0.22, bz - Math.sin(br) * s * 0.7, 0, br, 0)); } }
  buildTower(); buildCamp(); buildStones(); buildStoryProps();
  return bake(scene);
}

function buildTower() {
  const { x, z } = POI.tower; const y = groundH(x, z) - 0.4;
  const ring = (r0, r1, h, y0, arc, start) => { const sh = new THREE.Shape(); sh.absarc(0, 0, r1, start, start + arc, false); sh.absarc(0, 0, r0, start + arc, start, true); const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 28 }); g.rotateX(-Math.PI / 2); put(cylUV(g, r1), M.stone, mtx(x, y + y0, z)); };
  ring(3.0, 4.0, 7.5, 0, Math.PI * 2 * 0.9, 0.3); ring(3.0, 4.0, 4.0, 7.5, Math.PI * 1.25, 1.1); ring(3.0, 4.0, 2.6, 11.5, Math.PI * 0.65, 1.6);
  for (let i = 0; i < 14; i++) { const a = rr(0, 6.283), dd = rr(4.5, 10); const g = boxUV(new THREE.BoxGeometry(rr(0.5, 1.1), rr(0.35, 0.7), rr(0.5, 1.0)), 1.6); put(g, M.stone, mtx(x + Math.cos(a) * dd, groundH(x + Math.cos(a) * dd, z + Math.sin(a) * dd) + 0.15, z + Math.sin(a) * dd, rand(), rand(), rand())); }
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283; if (a < 0.3) continue; addCircle(x + Math.cos(a) * 3.5, z - Math.sin(a) * 3.5, 0.7); }
  // marked stone + old fire
  const px = x + 5, pz = z + 4; const py = groundH(px, pz);
  box(1.5, 1.1, 0.4, M.block, 1.2, mtx(px, py + 0.5, pz, 0, 0.5, 0.05));
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.clearRect(0, 0, 256, 256); c.fillStyle = 'rgba(110,18,12,0.92)';
  c.beginPath(); c.moveTo(30, 150); c.quadraticCurveTo(120, 40, 220, 120); c.quadraticCurveTo(170, 122, 150, 180); c.lineTo(126, 140); c.quadraticCurveTo(80, 150, 30, 150); c.fill(); c.beginPath(); c.arc(168, 104, 9, 0, 7); c.fillStyle = 'rgba(30,6,4,0.9)'; c.fill();
  for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(110,18,12,' + (Math.random() * 0.5) + ')'; c.fillRect(30 + Math.random() * 190, 60 + Math.random() * 120, 2, 2 + Math.random() * 10); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.95), new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.position.set(px, py + 0.55, pz); decal.rotation.set(0, 0.5, 0.05); decal.translateZ(0.205); decal.userData.keep = true;
  addCircle(px, pz, 0.9);
  fires.push({ p: new THREE.Vector3(x + 2, groundH(x + 2, z + 7.5) + 0.1, z + 7.5), dead: true });
}
export const storySpots = {};
function textTex(lines, w = 512, h = 512, font = 'Cormorant Garamond, Georgia, serif') { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(30,26,20,0.82)'; g.textAlign = 'center'; lines.forEach((l, i) => { g.font = l[1]; g.fillText(l[0], w / 2, l[2]); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const carved = [];
function carve(px, py, pz, ry, lines, wSize = 0.8, hSize = 0.8) { const m = new THREE.Mesh(new THREE.PlaneGeometry(wSize, hSize), new THREE.MeshStandardMaterial({ map: textTex(lines), transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 })); m.position.set(px, py, pz); m.rotation.y = ry; carved.push(m); }
function buildStoryProps() {
  // graves of the Four on a quiet hill, with Elowen's newer stone
  { const cx = 22, cz = -58; storySpots.graves = new THREE.Vector3(cx, groundH(cx, cz), cz + 2.5);
    const names = [['Teodor', 'Contou as chaminés'], ['Iara', 'Olhava para cima'], ['Brás', 'Ria primeiro'], ['Elowen', 'Voltou para casa']];
    names.forEach(([n, ep], i) => { const gx = cx - 3.3 + i * 2.2, gz = cz + (i === 3 ? 0.4 : 0); const gy = groundH(gx, gz); const newer = i === 3; const sh = new THREE.Shape(); sh.moveTo(-0.38, 0); sh.lineTo(0.38, 0); sh.lineTo(0.38, 0.85); sh.absarc(0, 0.85, 0.38, 0, Math.PI, false); sh.lineTo(-0.38, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }); put(boxUV(g, 1.2), newer ? M.block : M.stone, mtx(gx, gy - 0.12, gz - 0.08, newer ? 0 : rr(-0.08, 0.06), rr(-0.08, 0.08), newer ? 0 : rr(-0.06, 0.06)));
      carve(gx, gy + 0.62, gz + 0.105, 0, [[n, 'bold 92px Cormorant Garamond, Georgia, serif', 220], [ep, 'italic 52px Cormorant Garamond, Georgia, serif', 300]], 0.7, 0.7);
      box(0.7, 0.05, 1.5, M.soot, 1, mtx(gx, gy - 0.01, gz + 0.85), false); addCircle(gx, gz, 0.35); });
    box(1.8, 0.1, 0.42, M.oldWood, 1, mtx(cx + 0.2, groundH(cx, cz + 4.2) + 0.45, cz + 4.2)); for (const s2 of [-1, 1]) box(0.12, 0.45, 0.38, M.oldWood, 1, mtx(cx + 0.2 + s2 * 0.75, groundH(cx, cz + 4.2) + 0.22, cz + 4.2));
    storySpots.bench = new THREE.Vector3(cx + 0.2, groundH(cx, cz + 4.2), cz + 4.2); }
  // the swing Teodor tied for little Bento
  { const sx = -42, sz = 27, sy = groundH(sx, sz); storySpots.swing = new THREE.Vector3(sx + 1.5, sy, sz + 1.2);
    for (const s2 of [-1, 1]) { cyl(0.09, 0.12, 3.3, 7, M.bark, 1, mtx(sx + s2 * 1.3, sy + 1.55, sz - 0.5, 0.22, 0, 0)); cyl(0.09, 0.12, 3.3, 7, M.bark, 1, mtx(sx + s2 * 1.3, sy + 1.55, sz + 0.5, -0.22, 0, 0)); addCircle(sx + s2 * 1.3, sz, 0.3); }
    cyl(0.1, 0.1, 2.9, 7, M.bark, 1, mtx(sx, sy + 3.1, sz, 0, 0, Math.PI / 2));
    for (const s2 of [-1, 1]) cyl(0.012, 0.012, 2.3, 4, M.oldWood, 1, mtx(sx + s2 * 0.3, sy + 1.95, sz + 0.08, 0.04, 0, 0), false);
    box(0.75, 0.05, 0.28, M.oldWood, 1, mtx(sx, sy + 0.8, sz + 0.12, 0.04, 0, 0)); }
  // a sword nobody pulled out, on a rise above the lake
  { const wx = -98, wz = 72, wy = groundH(wx, wz); storySpots.sword = new THREE.Vector3(wx + 1.2, wy, wz + 0.8);
    const rk = new THREE.DodecahedronGeometry(0.9, 1); rk.scale(1.3, 0.6, 1.1); put(boxUV(rk, 1.2), M.stone, mtx(wx, wy + 0.15, wz, 0.1, 0.4, 0)); addCircle(wx, wz, 1.0);
    box(0.06, 1.1, 0.012, M.iron, 1, mtx(wx, wy + 0.95, wz, 0.08, 0.3, 0.06)); box(0.34, 0.05, 0.06, M.iron, 1, mtx(wx - 0.04, wy + 1.5, wz, 0.08, 0.3, 0.06)); cyl(0.022, 0.022, 0.24, 6, M.timber, 1, mtx(wx - 0.05, wy + 1.66, wz, 0.08, 0.3, 0.06)); }
  // the wishing tree: ribbons tied by generations
  { const tx = -152, tz = -80, ty = groundH(tx, tz); storySpots.tree = new THREE.Vector3(tx + 1.8, ty, tz + 1.2); storySpots.treeRoot = new THREE.Vector3(tx, ty, tz);
    const cols = [M.canvasRed, M.canvas, M.red, M.lime]; for (let i = 0; i < 26; i++) { const a = rr(0, 6.28), r = rr(1.6, 3.6), h = rr(2.6, 4.2); const rb = new THREE.PlaneGeometry(0.05, rr(0.35, 0.7)); put(boxUV(rb, 1), cols[i % 4], mtx(tx + Math.cos(a) * r, ty + h, tz + Math.sin(a) * r, rr(-0.2, 0.2), rand() * 6, rr(-0.15, 0.15)), false); } }
  // the old campsite page, head fragment & lake page anchors
  storySpots.camp = new THREE.Vector3(POI.camp.x + 1.4, groundH(POI.camp.x + 1.4, POI.camp.z - 1.6), POI.camp.z - 1.6);
  storySpots.head = new THREE.Vector3(108, groundH(108, 22), 22);
  storySpots.peakpath = new THREE.Vector3(-46, groundH(-46, -360), -360);
}
function cylUV(g, r) { g = g.toNonIndexed(); g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal; const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { if (Math.abs(n.getY(i)) > 0.7) { uv[i * 2] = p.getX(i) / 1.6; uv[i * 2 + 1] = p.getZ(i) / 1.6; } else { uv[i * 2] = Math.atan2(p.getZ(i), p.getX(i)) * r / 1.6; uv[i * 2 + 1] = p.getY(i) / 1.6; } } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; }
function tent(x, z, rot, mat) { const y = groundH(x, z); const B = mtx(x, y, z, 0, rot, 0); const L = 3.2, W = 2.6, H = 1.9; const a = Math.atan2(H, W / 2); const s = Math.hypot(H, W / 2);
  for (const sd of [-1, 1]) { const g = new THREE.PlaneGeometry(L, s, 6, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / L + 0.5) * Math.PI) * 0.06 * (1 - Math.abs(p.getY(i)) / s)); g.computeVertexNormals(); put(boxUV(g, 2.4), mat, mtx(0, H / 2, sd * W / 4, sd * (Math.PI / 2 - a), 0, 0, B).multiply(mtx(0, 0, 0, sd < 0 ? Math.PI : 0, 0, 0)).multiply(mtx(0, 0, 0, -Math.PI / 2 * 0, 0, 0))); }
  for (const s2 of [-1, 1]) cyl(0.04, 0.05, H + 0.2, 6, M.oldWood, 1, mtx(s2 * L / 2, (H + 0.2) / 2, 0, 0, 0, 0, B)); cyl(0.035, 0.035, L + 0.3, 6, M.oldWood, 1, mtx(0, H + 0.02, 0, 0, 0, Math.PI / 2, B)); addBox(x, z, L / 2 + 0.2, W / 2 + 0.1, rot); }
function buildCamp() {
  const { x, z } = POI.camp;
  tent(x - 8, z - 5, 0.4, M.canvas); tent(x + 7, z - 8, -0.6, M.canvasRed); tent(x - 6, z + 8, 2.4, M.canvas); tent(x + 9, z + 6, -2.2, M.canvas);
  for (let i = 0; i < 52; i++) { const a = i / 52 * 6.283; if (a > 2.6 && a < 3.3) continue; const px = x + Math.cos(a) * 17, pz = z + Math.sin(a) * 17; const h = rr(2.3, 3.0); cyl(0.15, 0.18, h, 7, M.bark, 1, mtx(px, groundH(px, pz) + h / 2 - 0.2, pz, rr(-0.06, 0.06), 0, rr(-0.06, 0.06))); addCircle(px, pz, 0.28); }
  fires.push({ p: new THREE.Vector3(x, groundH(x, z) + 0.2, z), dead: true });
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; put(boxUV(new THREE.DodecahedronGeometry(0.22, 1), 0.6), M.stone, mtx(x + Math.cos(a) * 0.85, groundH(x, z) + 0.08, z + Math.sin(a) * 0.85, rand(), rand(), rand())); } addCircle(x, z, 1.0);
  [[x + 4, z + 2], [x + 4.6, z + 1.2], [x - 3, z - 2.5]].forEach(([a, b]) => crate(a, b)); barrel(x - 3.8, z - 1.6); woodpile(x - 2, z + 4.5, 0.2);
  // four bedrolls around the cold fire, a pot, a lute nobody came back for
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; const bx = x + Math.cos(a) * 2.6, bz = z + Math.sin(a) * 2.6; box(0.8, 0.12, 1.9, i % 2 ? M.canvasRed : M.canvas, 1, mtx(bx, groundH(bx, bz) + 0.06, bz, 0, -a + Math.PI / 2, 0)); }
  cyl(0.22, 0.18, 0.28, 12, M.iron, 1, mtx(x + 0.9, groundH(x + 0.9, z) + 0.15, z + 0.2));
  { const lx = x - 1.6, lz = z + 1.4, ly = groundH(lx, lz); const sb = new THREE.SphereGeometry(0.22, 12, 8); sb.scale(1, 0.4, 1.2); put(boxUV(sb, 0.5), M.oldWood, mtx(lx, ly + 0.08, lz, 0, 0.6, 0)); box(0.06, 0.03, 0.6, M.timber, 1, mtx(lx + 0.12, ly + 0.1, lz + 0.42, 0, 0.6, 0)); }
}
function buildStones() {
  const { x, z } = POI.stones; const y = groundH(x, z);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const px = x + Math.cos(a) * 9, pz = z + Math.sin(a) * 9; const h = rr(3, 4.4); const g = new THREE.BoxGeometry(1.2, h, 0.75, 2, 6, 2); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const yy = p.getY(k); p.setX(k, p.getX(k) * (1 - 0.2 * Math.max(0, yy / h)) * (1 + 0.08 * Math.sin(yy * 3 + k))); p.setZ(k, p.getZ(k) * (1 + 0.1 * Math.cos(yy * 2.3 + k))); } g.computeVertexNormals(); put(boxUV(g, 1.8), M.block, mtx(px, groundH(px, pz) + h / 2 - 0.3, pz, rr(-0.07, 0.07), -a, rr(-0.07, 0.07))); addCircle(px, pz, 0.75); }
  cyl(1.1, 1.35, 0.95, 12, M.block, 1.6, mtx(x, y + 0.35, z)); addCircle(x, z, 1.4);
  interactPoints.push({ type: 'stones', p: new THREE.Vector3(x, y, z) });
}

function bake(scene) {
  const groups = new Map();
  for (const pt of parts) { const key = pt.mat.uuid + (pt.cast ? 'c' : 'n'); if (!groups.has(key)) groups.set(key, { mat: pt.mat, cast: pt.cast, geos: [] }); const g = pt.g.index ? pt.g.toNonIndexed() : pt.g; if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); groups.get(key).geos.push(g); }
  const meshes = [];
  for (const g of groups.values()) {
    // split by region (150m cells) for culling
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
  for (const d of carved) scene.add(d);
  parts.length = 0; return meshes;
}
