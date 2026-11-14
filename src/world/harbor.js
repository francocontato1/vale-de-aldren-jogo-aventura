// Vila da Maré: o píer de madeira entrando no mar, barcos atracados e na areia, redes e peixe
// secando, o galpão do Joca (barqueiro) com um casco em construção, e o farol no promontório oeste.
import { THREE, rand, rr, clamp } from '../core.js';
import { groundH, normalY, fromUV, HARBOR, SEA_ROT, SEA_DIR, coastInfo, WATER } from './terrain.js';
import { M, put, box, mtx, cyl, boxUV, addBox, addCircle, addWalk, storySpots, lamps, barrel, crate, house, fishGeo, fires, seats } from './village.js';
import { makeBoat, hullGeometry } from '../actors/boat.js';
import { seaSurface } from './ocean.js';

export const harbor = { moored: [], pier: null, light: null };
const W = (du, dv) => fromUV(HARBOR.u + du, HARBOR.v + dv);

function netTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.clearRect(0, 0, 128, 128); g.strokeStyle = 'rgba(230,220,200,1)'; g.lineWidth = 2;
  for (let i = -128; i < 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 3); return t;
}

export function buildHarbor() {
  M.net.map = netTexture(); M.net.color.setHex(0x8a7556);
  // ---------- píer ----------
  const pv = HARBOR.v + 6; let u0 = HARBOR.u + 20; for (; u0 < HARBOR.u + 120; u0 += 0.5) { const [x, z] = fromUV(u0, pv); if (groundH(x, z) < 1.25) break; }
  const PL = 52, PW = 2.6, deckY = 1.6; const [sx, sz] = fromUV(u0 - 2, pv); const B = mtx(sx, 0, sz, 0, SEA_ROT, 0); // eixo +z do píer = em direção ao mar
  for (let k = 0; k < PL / 0.28; k++) box(PW, 0.07, 0.25, M.planks, 1, mtx(rr(-0.02, 0.02), deckY - 0.035, k * 0.28 + 0.14, 0, rr(-0.01, 0.01), 0, B));
  for (const s of [-1, 1]) box(0.14, 0.22, PL, M.timber, 1.5, mtx(s * (PW / 2 - 0.12), deckY - 0.18, PL / 2, 0, 0, 0, B));
  for (let k = 0; k <= PL / 3; k++) { const zz = k * 3; for (const s of [-1, 1]) { const w = new THREE.Vector3(s * (PW / 2 - 0.05), 0, zz).applyMatrix4(B); const gy = groundH(w.x, w.z); const h = deckY + 0.55 - gy + 0.4; cyl(0.13, 0.15, h, 8, M.bark, 1, mtx(s * (PW / 2 - 0.05), gy - 0.4 + h / 2, zz, 0, 0, 0, B)); }
    if (k % 2 === 0) box(PW + 0.2, 0.16, 0.16, M.timber, 1, mtx(0, deckY - 0.5, zz, 0, 0, 0, B)); }
  // guarda-corpo baixo de corda dos dois lados, cabeços de amarração
  for (const s of [-1, 1]) { const c = new THREE.Vector3(s * (PW / 2 + 0.02), 0, PL / 2).applyMatrix4(B); addBox(c.x, c.z, 0.08, PL / 2, SEA_ROT, deckY - 0.6, deckY + 1.6); cyl(0.02, 0.02, PL, 5, M.hay, 1, mtx(s * (PW / 2 - 0.05), deckY + 0.5, PL / 2, Math.PI / 2, 0, 0, B), false); }
  for (const zz of [8, 20, 32, 44, PL - 0.5]) for (const s of [-1, 1]) cyl(0.11, 0.13, 0.5, 8, M.dark || M.timber, 1, mtx(s * (PW / 2 - 0.2), deckY + 0.25, zz, 0, 0, 0, B));
  addWalk(B, -PW / 2, PW / 2, 0, PL, deckY);
  // rampa de tábuas da areia até o píer
  { const [rx, rz] = fromUV(u0 - 5, pv); const gy = groundH(rx, rz); const R2 = mtx(sx, 0, sz, 0, SEA_ROT, 0); const L = 3.2; const a = Math.atan2(deckY - gy, L); box(PW, 0.07, Math.hypot(L, deckY - gy), M.planks, 1, mtx(0, (deckY + gy) / 2 - 0.04, -L / 2, a, 0, 0, R2)); addWalk(R2, -PW / 2, PW / 2, -L, 0, gy - 0.02, deckY, 'z'); }
  // lampiões
  for (const zz of [1, PL / 2, PL - 1]) { const lp = new THREE.Vector3(PW / 2 - 0.15, deckY + 1.9, zz).applyMatrix4(B); cyl(0.04, 0.05, 1.9, 6, M.timber, 1, mtx(PW / 2 - 0.15, deckY + 0.95, zz, 0, 0, 0, B)); lamps.push(lp); }
  harbor.pier = { B, PL, PW, deckY, end: new THREE.Vector3(0, deckY, PL - 1.5).applyMatrix4(B) };
  storySpots.pierEnd = new THREE.Vector3(-0.6, 0, PL - 2).applyMatrix4(B); storySpots.pierEnd.y = deckY;
  storySpots.tiao = new THREE.Vector3(PW / 2 - 0.55, 0, PL * 0.62).applyMatrix4(B); storySpots.tiao.y = deckY; storySpots.tiaoYaw = SEA_ROT + Math.PI / 2;
  // banquinho e vara de pescar do Tião, na beirada do píer
  { const zz = PL * 0.62; const S2 = mtx(PW / 2 - 0.55, deckY, zz, 0, Math.PI / 2, 0, B); box(0.42, 0.06, 0.42, M.oldWood, 1, mtx(0, 0.45, 0, 0, 0, 0, S2)); for (const a of [-1, 1]) for (const b of [-1, 1]) box(0.05, 0.43, 0.05, M.oldWood, 1, mtx(a * 0.17, 0.21, b * 0.17, 0, 0, 0, S2));
    const sp = new THREE.Vector3(0, 0.48, 0).applyMatrix4(S2); const seat = { x: sp.x, y: sp.y, z: sp.z, yaw: SEA_ROT + Math.PI / 2, kind: 'chair', exit: -0.6, npcOnly: true }; seats.push(seat); harbor.tiaoSeat = seat;
    const h0 = new THREE.Vector3(PW / 2 - 0.12, deckY + 0.05, zz + 0.45).applyMatrix4(B); const tip = new THREE.Vector3(PW / 2 + 3.2, deckY + 2.6, zz + 1.2).applyMatrix4(B); const d = tip.clone().sub(h0); const rod = new THREE.CylinderGeometry(0.008, 0.022, d.length(), 5); rod.translate(0, d.length() / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); put(rod, M.timber, new THREE.Matrix4().compose(h0, q, new THREE.Vector3(1, 1, 1)), false);
    cyl(0.03, 0.03, 0.5, 5, M.oldWood, 1, mtx(PW / 2 - 0.12, deckY + 0.25, zz + 0.45, 0, 0, 0, B), false);
    const wy = 0.05; const ln = new THREE.CylinderGeometry(0.002, 0.002, tip.y - wy, 3); put(ln, M.rope || M.hay, mtx(tip.x, (tip.y + wy) / 2, tip.z), false);
    harbor.bobber = new THREE.Vector3(tip.x, 0, tip.z); }
  // o barco da Lia, atracado no fim do píer (lado esquerdo)
  { const p = new THREE.Vector3(-PW / 2 - 1.5, 0, PL - 4).applyMatrix4(B); harbor.sailDock = { x: p.x, z: p.z, yaw: SEA_ROT }; storySpots.barco = new THREE.Vector3(-PW / 2 + 0.4, 0, PL - 4).applyMatrix4(B); storySpots.barco.y = deckY; }
  // dois barcos de pesca atracados (balançam nas ondas)
  for (const [zz, s, col] of [[PL * 0.45, 1, [0x8a3b2a, 0xe8e2d4, 0xd8cfb8, 0x5a3e28, 0x2a2018]], [PL * 0.8, 1, [0x2e6b4f, 0xe8e2d4, 0xe8e2d4, 0x5a3e28, 0x2a2018]]]) { const p = new THREE.Vector3(s * (PW / 2 + 1.25), 0, zz).applyMatrix4(B); const b = makeBoat({ L: 4.4, B: 1.6, D: 0.7, sail: false, colors: col }); harbor.moored.push({ b, x: p.x, z: p.z, yaw: SEA_ROT + rr(-0.2, 0.2), ph: rand() * 6 }); }
  // ---------- praia: barcos virados na areia, redes, peixe secando ----------
  const sandBoat = (du, dv, rot, flip) => { const [x, z] = W(du, dv); const g = hullGeometry({ L: 3.8, B: 1.4, D: 0.6, colors: [0x40618a, 0xd8d0c0, 0xd8d0c0, 0x6b4a2e, 0x3a2a20] }); const y = groundH(x, z); put(g, M.boatHull || M.planks, mtx(x, y + (flip ? 0.55 : 0.22), z, flip ? Math.PI : 0.08, rot, flip ? 0 : 0.12)); addBox(x, z, 1.9, 0.75, rot + Math.PI / 2); };
  sandBoat(30, -6, SEA_ROT + 1.2, true); sandBoat(34, 14, SEA_ROT + 1.9, false); sandBoat(24, 26, SEA_ROT + 0.4, true);
  // varais de rede
  for (const [du, dv] of [[12, -10], [10, 22]]) { const [x, z] = W(du, dv); const y = groundH(x, z); const R = mtx(x, y, z, 0, SEA_ROT + Math.PI / 2, 0); for (const s of [-1, 1]) { cyl(0.06, 0.07, 2.3, 6, M.bark, 1, mtx(s * 2.2, 1.15, 0, 0, 0, s * 0.04, R)); const c = new THREE.Vector3(s * 2.2, 0, 0).applyMatrix4(R); addCircle(c.x, c.z, 0.15); } cyl(0.035, 0.035, 4.6, 5, M.bark, 1, mtx(0, 2.2, 0, 0, 0, Math.PI / 2, R));
    const g = new THREE.PlaneGeometry(4.2, 1.9, 12, 6); const pp = g.attributes.position; for (let k = 0; k < pp.count; k++) { const xx = pp.getX(k), yy = pp.getY(k); pp.setZ(k, Math.sin(xx * 1.4) * 0.08 + (0.95 - yy) * 0.04); pp.setY(k, yy - Math.cos(xx / 2.1 * Math.PI / 2) * 0.25 * (yy + 0.95) / 1.9); } g.computeVertexNormals(); put(g, M.net, mtx(0, 1.25, 0.02, 0, 0, 0, R), false); }
  // peixe secando ao sol
  { const [x, z] = W(6, 8); const y = groundH(x, z); const R = mtx(x, y, z, 0, SEA_ROT, 0); for (const s of [-1, 1]) { cyl(0.05, 0.06, 1.9, 6, M.bark, 1, mtx(s * 1.1, 0.95, 0, 0, 0, 0, R)); } cyl(0.03, 0.03, 2.3, 5, M.bark, 1, mtx(0, 1.8, 0, 0, 0, Math.PI / 2, R)); for (let i = 0; i < 9; i++) put(fishGeo(rr(0.3, 0.42)), M.fishSkin, mtx(-0.95 + i * 0.24, 1.55, 0, 0, 0, -Math.PI / 2 + rr(-0.1, 0.1), R), false); addCircle(x, z, 0.4); }
  // caixotes, barris, armadilhas de lagosta e uma âncora
  for (const [du, dv] of [[8, -3], [9, -2], [16, 3], [-2, 9]]) { const [x, z] = W(du, dv); crate(x, z, rr(0.6, 0.85)); }
  for (const [du, dv] of [[7, 3], [8, 4.2]]) { const [x, z] = W(du, dv); barrel(x, z); }
  for (const [du, dv] of [[18, -2], [18.8, -1.2], [18.2, -0.4]]) { const [x, z] = W(du, dv); const y = groundH(x, z); const g = new THREE.CylinderGeometry(0.32, 0.36, 0.5, 10, 2, true); put(g, M.net, mtx(x, y + 0.25, z, Math.PI / 2, rand() * 3, 0), false); cyl(0.36, 0.36, 0.03, 10, M.oldWood, 1, mtx(x, y + 0.25, z, Math.PI / 2, rand() * 3, 0), false); }
  { const [x, z] = W(14, 6); const y = groundH(x, z); cyl(0.05, 0.05, 1.2, 6, M.iron, 1, mtx(x, y + 0.3, z, 1.2, 0.4, 0)); cyl(0.04, 0.04, 0.9, 6, M.iron, 1, mtx(x + 0.2, y + 0.1, z, 0, 0.4, Math.PI / 2)); addCircle(x, z, 0.4); }
  // ---------- galpão do Joca, com um casco sobre cavaletes ----------
  { const [x, z] = W(10, -30); const y = groundH(x, z) - 0.05; const R = mtx(x, y, z, 0, SEA_ROT + Math.PI / 2, 0);
    box(7.4, 0.2, 5.0, M.planks, 1.2, mtx(0, 0.0, 0, 0, 0, 0, R));
    for (const [a, b] of [[-3.4, -2.2], [3.4, -2.2], [-3.4, 2.2], [3.4, 2.2], [0, -2.2], [0, 2.2]]) { box(0.22, 3.3, 0.22, M.timber, 1.5, mtx(a, 1.65, b, 0, 0, 0, R)); const c = new THREE.Vector3(a, 0, b).applyMatrix4(R); addCircle(c.x, c.z, 0.2); }
    for (const s of [-1, 1]) box(7.2, 0.2, 0.22, M.timber, 1.5, mtx(0, 3.3, s * 2.2, 0, 0, 0, R)); box(8.0, 0.14, 6.0, M.thatch, 2.4, mtx(0, 3.6, 0, 0.1, 0, 0, R));
    const hg = hullGeometry({ L: 5.4, B: 1.9, D: 0.8, colors: [0xb59a76, 0xa88b66, 0x9a7d5a, 0x8c6f4e, 0x7e6244] }); put(hg, M.boatHull || M.planks, mtx(0, 1.35, 0, 0, 0, 0, R));
    for (const a of [-1.6, 1.6]) { for (const s of [-1, 1]) box(0.1, 0.9, 0.1, M.oldWood, 1, mtx(a, 0.45, s * 0.5, 0, 0, s * 0.2, R)); box(0.12, 0.1, 1.3, M.oldWood, 1, mtx(a, 0.9, 0, 0, 0, 0, R)); }
    for (let i = 0; i < 6; i++) box(3.2, 0.05, 0.22, M.planks, 1, mtx(1.8, 0.12 + i * 0.06, -1.7, 0, rr(-0.04, 0.04), 0, R), false);
    storySpots.joca = new THREE.Vector3(-1.8, 0, 1.2).applyMatrix4(R); storySpots.joca.y = groundH(storySpots.joca.x, storySpots.joca.z); storySpots.jocaYaw = SEA_ROT + Math.PI / 2;
    const c = new THREE.Vector3(0, 0, 0).applyMatrix4(R); addBox(c.x, c.z, 2.8, 1.0, SEA_ROT + Math.PI / 2); }
  // banca de peixe na frente da taberna
  { const [x, z] = W(7, -4); const y = groundH(x, z); const R = mtx(x, y, z, 0, SEA_ROT + Math.PI, 0); box(2.0, 0.9, 0.8, M.oldWood, 1, mtx(0, 0.45, 0, 0, 0, 0, R)); box(2.1, 0.06, 0.9, M.timber, 1, mtx(0, 0.92, 0, 0, 0, 0, R)); for (let i = 0; i < 7; i++) put(fishGeo(rr(0.3, 0.48)), M.fishSkin, mtx(-0.8 + i * 0.27, 0.98, rr(-0.2, 0.2), 0, rr(-0.4, 0.4), Math.PI / 2, R), false);
    for (const s of [-1, 1]) cyl(0.04, 0.04, 2.2, 5, M.timber, 1, mtx(s * 1.0, 1.1, 0.4, 0, 0, 0, R)); { const g = new THREE.PlaneGeometry(2.4, 1.3, 6, 3); const pp = g.attributes.position; for (let k = 0; k < pp.count; k++) pp.setZ(k, Math.sin(pp.getX(k) * 2.6) * 0.06); g.computeVertexNormals(); put(g, M.canvasRed, mtx(0, 2.15, 0.1, -1.25, 0, 0, R), false); }
    addBox(x, z, 1.0, 0.45, SEA_ROT + Math.PI); storySpots.marta = new THREE.Vector3(0, 0, -0.95).applyMatrix4(R); storySpots.marta.y = y; storySpots.martaYaw = SEA_ROT; }
  // fogueira da vila, com bancos de tronco
  { const [x, z] = W(14, 10); const y = groundH(x, z); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; const g = new THREE.DodecahedronGeometry(0.2, 1); put(boxUV(g, 0.6), M.stone, mtx(x + Math.cos(a) * 0.65, y + 0.08, z + Math.sin(a) * 0.65, rand(), rand(), rand())); } for (let i = 0; i < 4; i++) cyl(0.07, 0.08, 0.9, 7, M.bark, 1, mtx(x + Math.cos(i * 1.57) * 0.12, y + 0.22, z + Math.sin(i * 1.57) * 0.12, 0, i * 1.57, 1.0)); fires.push({ p: new THREE.Vector3(x, y + 0.45, z) }); addCircle(x, z, 0.75); }
  // ---------- farol no promontório oeste, com a casa do faroleiro ----------
  let best = null; for (let v = -255; v > -380; v -= 5) for (let du = 40; du < 220; du += 5) { const u = HARBOR.u + du; const [x, z] = fromUV(u, v); const h = groundH(x, z); if (h < 7 || h > 26 || normalY(x, z) < 0.86) continue; const c = coastInfo(x, z); const sc = -Math.abs(c.s - 10) * 0.1 + du * 0.05 - Math.abs(h - 14) * 0.2; if (!best || sc > best.sc) best = { x, z, h, sc, u, v }; }
  if (best) { const { x, z } = best; const y = groundH(x, z) - 0.2; const R = mtx(x, y, z, 0, SEA_ROT, 0); const H = 16;
    cyl(2.6, 3.0, 1.2, 24, M.stone, 1.6, mtx(0, 0.5, 0, 0, 0, 0, R));
    const tw = new THREE.CylinderGeometry(1.55, 2.25, H, 24, 1); put(tw, M.plasterWhite, mtx(0, 1.0 + H / 2, 0, 0, 0, 0, R));
    for (const yy of [5, 10]) cyl(1.55 + (1 - yy / H) * 0.7 + 0.03, 1.55 + (1 - (yy - 1.6) / H) * 0.7 + 0.03, 1.6, 24, M.canvasRed, 1, mtx(0, 1.0 + yy - 0.8, 0, 0, 0, 0, R));
    cyl(2.1, 2.1, 0.25, 24, M.stone, 1, mtx(0, 1.1 + H, 0, 0, 0, 0, R)); for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; cyl(0.03, 0.03, 0.9, 4, M.iron, 1, mtx(Math.cos(a) * 2.0, 1.6 + H, Math.sin(a) * 2.0, 0, 0, 0, R), false); } cyl(2.02, 2.02, 0.05, 24, M.iron, 1, mtx(0, 2.05 + H, 0, 0, 0, 0, R), false);
    cyl(1.2, 1.2, 1.9, 16, M.glass, 1, mtx(0, 2.2 + H, 0, 0, 0, 0, R), false); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; box(0.06, 1.9, 0.06, M.iron, 1, mtx(Math.cos(a) * 1.2, 2.2 + H, Math.sin(a) * 1.2, 0, 0, 0, R)); }
    { const dome = new THREE.SphereGeometry(1.35, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2); put(dome, M.canvasRed, mtx(0, 3.15 + H, 0, 0, 0, 0, R)); cyl(0.05, 0.12, 0.6, 6, M.iron, 1, mtx(0, 4.7 + H, 0, 0, 0, 0, R)); }
    box(1.0, 2.1, 0.3, M.paint.blue, 1, mtx(0, 1.95, 2.05, 0, 0, 0, R)); addCircle(x, z, 2.4);
    const top = new THREE.Vector3(0, 2.3 + H, 0).applyMatrix4(R); harbor.light = { top, x, z, h: y + H };
    storySpots.farol = new THREE.Vector3(0, 0, 3.6).applyMatrix4(R); storySpots.farol.y = groundH(storySpots.farol.x, storySpots.farol.z); storySpots.davi = new THREE.Vector3(2.8, 0, 3.0).applyMatrix4(R); storySpots.davi.y = groundH(storySpots.davi.x, storySpots.davi.z); storySpots.daviYaw = SEA_ROT;
    // casa do faroleiro ao lado
    const [hx, hz] = fromUV(best.u - 9, best.v + 8); house(hx, hz, SEA_ROT + 0.3, { role: 'faroleiro', w: 6.2, d: 5, floors: 1, lower: 'plasterWhite', roof: 'roofDark', door: 'blue', shutters: 'blue' });
  }
}

// barcos atracados balançam nas ondas
export function updateHarbor(dt, t, scene) {
  for (const m of harbor.moored) {
    if (!m.added) { scene.add(m.b.root); m.added = true; }
    const s = seaSurface(m.x, m.z, t); const s2 = seaSurface(m.x + Math.sin(m.yaw) * 1.6, m.z + Math.cos(m.yaw) * 1.6, t);
    const r = m.b.root; r.position.set(m.x + Math.sin(t * 0.3 + m.ph) * 0.15, s.y + 0.05, m.z); r.rotation.set(0, 0, 0); r.rotateY(m.yaw - Math.PI / 2 + Math.sin(t * 0.2 + m.ph) * 0.06); r.rotateZ(Math.atan2(s2.y - s.y, 1.6)); r.rotateX(Math.sin(t * 0.9 + m.ph) * 0.05 + s.nx * 0.3);
  }
}
