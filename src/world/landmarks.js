// Ruínas e lugares dos Veladores: observatório da Odessa, jardim dos relógios de sol, escada para o céu,
// aqueduto, ponte partida sobre o riacho seco e o santuário da floresta.
import { THREE, rand, rr } from '../core.js';
import { groundH, POI, CREEK, TRAIL } from './terrain.js';
import { M, put, box, mtx, cyl, cylUV, boxUV, addBox, addCircle, addWalk, storySpots, bench, lamps, fires } from './village.js';

const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

function observatory() {
  const { x, z } = POI.observatory; const y = groundH(x, z); const ry = face(x, z, 0, 0); const B = mtx(x, y, z, 0, ry, 0);
  // terraço circular de pedra
  const terr = new THREE.CylinderGeometry(9, 9.3, 0.5, 40); put(cylUV(terr, 9), M.cobble, mtx(x, y - 0.12, z)); addWalk(mtx(x, y, z), -8.9, 8.9, -8.9, 8.9, 0.13); // aproximação quadrada (o terreno é plano aqui)
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; if (Math.abs(Math.sin(a / 2 - 0.0)) < 0.2) continue; const px = Math.sin(a) * 9.1, pz = Math.cos(a) * 9.1; box(1.9, 0.6, 0.45, M.block, 1.2, mtx(px, 0.3, pz, 0, a, 0, B)); const c = new THREE.Vector3(px, 0, pz).applyMatrix4(B); addCircle(c.x, c.z, 0.5); }
  // torre do observatório
  const R = 3.4, H = 7.2; const t = new THREE.CylinderGeometry(R, R + 0.2, H, 28, 1); put(cylUV(t, R), M.stoneWarm, mtx(0, H / 2, -3.2, 0, 0, 0, B)); { const c = new THREE.Vector3(0, 0, -3.2).applyMatrix4(B); addCircle(c.x, c.z, R + 0.2); }
  for (const yy of [0.15, H - 0.2]) cyl(R + 0.3, R + 0.3, 0.3, 28, M.block, 1.4, mtx(0, yy, -3.2, 0, 0, 0, B));
  const dome = new THREE.SphereGeometry(R + 0.1, 28, 12, 0, Math.PI * 1.85, 0, Math.PI / 2); put(boxUV(dome, 2), M.copper, mtx(0, H, -3.2, 0, 2.1, 0, B));
  box(0.9, 2.2, 0.4, M.paint.blue, 1, mtx(0, 1.1, -3.2 + R + 0.05, 0, 0, 0, B)); box(1.3, 0.25, 0.6, M.block, 1, mtx(0, 2.35, -3.2 + R + 0.1, 0, 0, 0, B));
  for (const a of [-0.7, 0.7]) { const px = Math.sin(a) * (R + 0.05), pz = -3.2 + Math.cos(a) * (R + 0.05); box(0.6, 0.9, 0.12, M.glass, 1, mtx(px, 4.4, pz, 0, a, 0, B), false); box(0.75, 1.05, 0.08, M.timber, 1, mtx(px * 1.01, 4.4, -3.2 + (pz + 3.2) * 1.01, 0, a, 0, B)); }
  lamps.push(new THREE.Vector3(1.0, 2.3, -3.2 + R + 0.35).applyMatrix4(B));
  // luneta de latão num tripé
  { const T = mtx(3.2, 0.13, 2.2, 0, -0.6, 0, B); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; cyl(0.025, 0.025, 1.45, 6, M.oldWood, 1, mtx(Math.cos(a) * 0.32, 0.68, Math.sin(a) * 0.32, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25, T)); }
    cyl(0.07, 0.05, 1.3, 12, M.brass, 1, mtx(0, 1.5, 0.2, -0.95, 0, 0, T)); cyl(0.09, 0.09, 0.12, 12, M.brass, 1, mtx(0, 1.82, 0.72, -0.95, 0, 0, T)); const c = new THREE.Vector3(3.2, 0, 2.2).applyMatrix4(B); addCircle(c.x, c.z, 0.45); }
  // mesa de estudo com livros e uma xícara (o chá está sempre morno)
  { const T = mtx(-3.4, 0.13, 1.6, 0, 0.4, 0, B); box(1.4, 0.07, 0.75, M.oldWood, 1, mtx(0, 0.76, 0, 0, 0, 0, T)); for (const a of [-1, 1]) for (const b of [-1, 1]) box(0.07, 0.74, 0.07, M.oldWood, 1, mtx(a * 0.6, 0.37, b * 0.3, 0, 0, 0, T));
    for (let i = 0; i < 4; i++) box(0.32, 0.06, 0.24, M.book[i % 5], 1, mtx(-0.35, 0.83 + i * 0.06, 0, 0, rr(-0.3, 0.3), 0, T), false); cyl(0.045, 0.04, 0.08, 10, M.lime, 1, mtx(0.3, 0.84, 0.1, 0, 0, 0, T), false);
    const c = new THREE.Vector3(-3.4, 0, 1.6).applyMatrix4(B); addCircle(c.x, c.z, 0.75); }
  storySpots.odessa = new THREE.Vector3(2.0, 0.13, 3.2).applyMatrix4(B);
  storySpots.finale = new THREE.Vector3(0, 0.13, 5.0).applyMatrix4(B);
  storySpots.obsBench1 = bench(...[new THREE.Vector3(-4.6, 0, 5.4).applyMatrix4(B)].map(v => [v.x, v.z])[0], ry + Math.PI);
  bench(...[new THREE.Vector3(4.8, 0, 5.2).applyMatrix4(B)].map(v => [v.x, v.z])[0], ry + Math.PI);
}

function garden() {
  const { x, z } = POI.garden; const y = groundH(x, z);
  // muro baixo em anel, com falhas, e um portal virado para a vila
  const gate = face(x, z, 0, 0);
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; const da = Math.atan2(Math.sin(a - gate), Math.cos(a - gate)); if (Math.abs(da) < 0.14) continue; if (rand() < 0.18) continue; const px = x + Math.sin(a) * 15, pz = z + Math.cos(a) * 15; const h = rr(0.45, 1.0); box(2.1, h, 0.55, M.ruin, 1.3, mtx(px, groundH(px, pz) + h / 2 - 0.1, pz, rr(-0.04, 0.04), a, rr(-0.04, 0.04))); addCircle(px, pz, 0.7); }
  { const gx = x + Math.sin(gate) * 15, gz = z + Math.cos(gate) * 15; const G = mtx(gx, groundH(gx, gz), gz, 0, gate, 0); for (const s of [-1, 1]) box(0.7, 3.6, 0.7, M.ruin, 1.3, mtx(s * 1.6, 1.8, 0, 0, 0, 0, G)); const sh = new THREE.Shape(); sh.moveTo(-2.0, 0); sh.lineTo(2.0, 0); sh.lineTo(2.0, 1.4); sh.lineTo(-2.0, 1.4); sh.lineTo(-2.0, 0); const hole = new THREE.Path(); hole.absarc(0, 0, 1.25, 0, Math.PI, false); sh.holes.push(hole); const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false, curveSegments: 16 }); ag.translate(0, 0, -0.35); put(boxUV(ag, 1.3), M.ruin, mtx(0, 3.6 - 0.25, 0, 0, 0, 0, G)); for (const s of [-1, 1]) { const c = new THREE.Vector3(s * 1.6, 0, 0).applyMatrix4(G); addCircle(c.x, c.z, 0.5); } }
  // relógios de sol em espiral, cada um marcando uma hora diferente
  const dials = [];
  for (let i = 0; i < 13; i++) { const a = i * 2.4, r = 3 + i * 0.75; const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; const py = groundH(px, pz); const D = mtx(px, py, pz, 0, rr(0, 6.28), 0);
    cyl(0.28, 0.36, 0.95, 10, M.ruin, 1, mtx(0, 0.47, 0, 0, 0, 0, D)); cyl(0.5, 0.5, 0.06, 20, M.brass, 1, mtx(0, 0.98, 0, 0, 0, 0, D));
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.42, 0); sh.lineTo(0, 0.32); sh.lineTo(0, 0); const gn = new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false }); gn.translate(-0.21, 0, -0.012); put(gn, M.brass, mtx(0, 1.01, 0, 0, 0, 0, D));
    for (let k = 0; k < 12; k++) { const ka = k / 12 * Math.PI * 2; box(0.02, 0.012, 0.09, M.iron, 1, mtx(Math.cos(ka) * 0.4, 1.015, Math.sin(ka) * 0.4, 0, -ka, 0, D), false); }
    addCircle(px, pz, 0.42); dials.push([px, pz]); }
  storySpots.relogios = new THREE.Vector3(x + 1.5, y, z - 1.2);
  // bancos de pedra
  for (const a of [0.8, 2.6, 4.4]) { const px = x + Math.cos(a) * 11, pz = z + Math.sin(a) * 11; const ry = face(px, pz, x, z); box(1.8, 0.5, 0.55, M.ruin, 1.2, mtx(px, groundH(px, pz) + 0.2, pz, 0, ry, 0)); addBox(px, pz, 0.9, 0.3, ry); }
}

function stairs() {
  const { x, z } = POI.stairs; const ry = face(x, z, 60, 30) + Math.PI; const y = groundH(x, z) - 0.15; const B = mtx(x, y, z, 0, ry, 0);
  const W = 3.2, rise = 0.26, run = 0.48, n = 34; const L = n * run, Ht = n * rise;
  // corpo maciço e degraus (a escada sobe em -z local)
  for (let i = 0; i < n; i++) { const h = (i + 1) * rise; const zc = L / 2 - (i + 0.5) * run; box(W, h, run + 0.01, M.ruin, 1.3, mtx(0, h / 2, zc, 0, 0, 0, B)); }
  addWalk(B, -W / 2, W / 2, -L / 2, L / 2, Ht, 0.02, 'z');
  // patamar no topo, quebrado
  box(W + 0.4, Ht, 2.4, M.ruin, 1.3, mtx(0, Ht / 2, -L / 2 - 1.2, 0, 0, 0, B)); addWalk(B, -W / 2 - 0.2, W / 2 + 0.2, -L / 2 - 2.4, -L / 2, Ht);
  { const c = new THREE.Vector3(0, 0, -L / 2 - 1.2).applyMatrix4(B); addBox(c.x, c.z, W / 2 + 0.2, 1.2, ry, -1e9, y + Ht - 0.6); }
  // parapeitos laterais, cada vez mais desfeitos para cima
  for (const s of [-1, 1]) for (let i = 0; i < n; i += 2) { if (i > n * 0.55 && rand() < 0.55) continue; const h = (i + 1) * rise; const zc = L / 2 - (i + 1) * run; box(0.35, 0.8, run * 2, M.ruin, 1.3, mtx(s * (W / 2 + 0.17), h + 0.4, zc, 0, 0, 0, B)); const c = new THREE.Vector3(s * (W / 2 + 0.17), 0, zc).applyMatrix4(B); addBox(c.x, c.z, 0.18, run, ry, y + h - 0.4, y + h + 1.4); }
  // uma coluna partida no topo, apontando para o céu
  cyl(0.38, 0.42, 3.2, 14, M.ruin, 1.3, mtx(0.6, Ht + 1.6, -L / 2 - 1.6, 0, 0, 0.05, B)); { const c = new THREE.Vector3(0.6, 0, -L / 2 - 1.6).applyMatrix4(B); addBox(c.x, c.z, 0.42, 0.42, 0, y + Ht - 0.5, y + Ht + 3.4); }
  for (let i = 0; i < 10; i++) { const g = boxUV(new THREE.BoxGeometry(rr(0.4, 1.0), rr(0.3, 0.6), rr(0.4, 0.9)), 1.3); const px = rr(-6, 6), pz = rr(-L / 2, L / 2); const w = new THREE.Vector3(px, 0, pz).applyMatrix4(B); if (Math.abs(px) < W / 2 + 0.6) continue; put(g, M.ruin, mtx(w.x, groundH(w.x, w.z) + 0.1, w.z, rand(), rand(), rand())); }
  storySpots.escada = new THREE.Vector3(0, 0, L / 2 + 1.6).applyMatrix4(B); storySpots.escada.y = groundH(storySpots.escada.x, storySpots.escada.z);
  storySpots.escadaTop = new THREE.Vector3(0, Ht, -L / 2 - 1.0).applyMatrix4(B);
  storySpots.escadaRot = ry;
}

function aqueduct() {
  const A = [-104, 18], Bp = [-44, 112]; const dx = Bp[0] - A[0], dz = Bp[1] - A[1]; const len = Math.hypot(dx, dz); const ry = Math.atan2(dx, dz) + Math.PI / 2;
  const span = 6.5, n = Math.floor(len / span); let topY = -1e9; for (let i = 0; i <= n; i++) { const t = i / n; topY = Math.max(topY, groundH(A[0] + dx * t, A[1] + dz * t)); } topY += 7.5;
  const broken = new Set([4, 5, 11]);
  for (let i = 0; i <= n; i++) {
    const t = i / n; const px = A[0] + dx * t, pz = A[1] + dz * t; const gy = groundH(px, pz) - 0.4; const h = topY - gy;
    if (!broken.has(i) || i === 4) { box(1.3, h, 1.7, M.ruin, 1.4, mtx(px, gy + h / 2, pz, 0, ry, 0)); addBox(px, pz, 0.65, 0.85, ry); }
    if (i < n && !broken.has(i) && !broken.has(i + 1)) {
      const mx = px + dx / n / 2, mz = pz + dz / n / 2; const sh = new THREE.Shape(); const s2 = span / 2; sh.moveTo(-s2, 0); sh.lineTo(s2, 0); sh.lineTo(s2, 2.4); sh.lineTo(-s2, 2.4); sh.lineTo(-s2, 0); const hole = new THREE.Path(); hole.absarc(0, 0, s2 - 0.65, 0, Math.PI, false); sh.holes.push(hole);
      const ag = new THREE.ExtrudeGeometry(sh, { depth: 1.7, bevelEnabled: false, curveSegments: 14 }); ag.translate(0, 0, -0.85); put(boxUV(ag, 1.4), M.ruin, mtx(mx, topY - 2.4, mz, 0, ry, 0));
      box(span + 0.02, 0.5, 1.9, M.block, 1.4, mtx(mx, topY + 0.25, mz, 0, ry, 0)); for (const s of [-1, 1]) box(span + 0.02, 0.45, 0.25, M.ruin, 1.4, mtx(mx, topY + 0.7, mz, 0, ry, 0).multiply(mtx(0, 0, s * 0.82)));
    }
    if (broken.has(i)) for (let k = 0; k < 7; k++) { const g = boxUV(new THREE.BoxGeometry(rr(0.6, 1.4), rr(0.4, 0.8), rr(0.6, 1.2)), 1.4); const rx = px + rr(-3, 3), rz = pz + rr(-3, 3); put(g, M.ruin, mtx(rx, groundH(rx, rz) + 0.2, rz, rand(), rand(), rand())); addCircle(rx, rz, 0.5); }
  }
  const mid = 0.38; storySpots.aqueduto = new THREE.Vector3(A[0] + dx * mid + 3, 0, A[1] + dz * mid - 2); storySpots.aqueduto.y = groundH(storySpots.aqueduto.x, storySpots.aqueduto.z);
}

// Ponte de arco de pedra dos Veladores sobre o riacho seco. O fecho do arco caiu há trezentos anos: o
// vão do meio desabou e as aduelas estão espalhadas no leito. O Bastião montou embaixo um cimbre de
// madeira (a armação em arco que serve de molde para reassentar as pedras) e uma passarela de tábuas.
function bridge() {
  const { x, z } = POI.bridge; const i = 3; const cdx = CREEK[i][0] - CREEK[i - 1][0], cdz = CREEK[i][1] - CREEK[i - 1][1]; const ry = Math.atan2(cdx, cdz) + Math.PI / 2; // eixo da ponte atravessa o riacho
  const ax = Math.sin(ry), az = Math.cos(ry);
  // altura do tabuleiro e comprimento de cada lado: a ponte vai até onde o barranco alcança o tabuleiro
  const deck = Math.max(groundH(x + ax * 11, z + az * 11), groundH(x - ax * 11, z - az * 11)) + 0.25;
  const reach = (sg) => { for (let d = 6; d < 24; d += 0.25) if (groundH(x + ax * d * sg, z + az * d * sg) >= deck - 0.15) return d + 0.6; return 24; };
  const Lp = reach(1), Ln = reach(-1);
  const B = mtx(x, deck, z, 0, ry, 0); const W = 3.4, gap = 1.7;
  const toW = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(B);
  // arco: intradorso circular, nascentes em z=±S
  const S = 7.4, bed = Math.min(groundH(x, z), groundH(x + ax * 3, z + az * 3), groundH(x - ax * 3, z - az * 3)) - deck; const ys = Math.max(bed + 0.6, -4.9), rise = Math.min(3.6, -ys - 1.0);
  const R = (S * S + rise * rise) / (2 * rise), cy = ys + rise - R, phi = Math.asin(S / R), ring = 0.62;
  const broken = (zz, yy) => Math.abs(zz) < gap + (yy > -0.9 ? 0.55 * hash(zz * 3.1) : 0) + Math.max(0, (yy + 2.2)) * 0.18;
  function hash(v) { const t = Math.sin(v * 91.7) * 43758.5; return t - Math.floor(t); }
  // aduelas (pedras do arco), cada uma um pouco diferente, com junta de argamassa
  const nV = 31;
  for (let k = 0; k < nV; k++) {
    const a = -phi + (k + 0.5) / nV * 2 * phi; const zz = Math.sin(a) * (R + ring / 2), yy = cy + Math.cos(a) * (R + ring / 2);
    if (broken(zz, yy)) continue;
    const len = 2 * phi / nV * R * 0.96;
    for (const sx of [-1, 0, 1]) { const g = boxUV(new THREE.BoxGeometry(W / 3 - 0.04, ring * rr(0.96, 1.05), len), 0.9); put(g, M.ruin, mtx(sx * W / 3, yy + rr(-0.02, 0.02), zz, a + rr(-0.012, 0.012), 0, 0, B)); }
  }
  // tímpanos (paredes de pedra entre o arco e o tabuleiro) e encontros enterrados no barranco
  for (const sg of [-1, 1]) {
    const L = sg > 0 ? Lp : Ln; const sh = new THREE.Shape(); const pts = [];
    const z0 = sg * L, zIn = sg * (gap + 0.35);
    pts.push([zIn, -0.08]); pts.push([z0, -0.08]); pts.push([z0, -7.5]); pts.push([sg * S, -7.5]); pts.push([sg * S, ys]);
    for (let k = 1; k <= 24; k++) { const a = sg * phi * (1 - k / 24); const zz = Math.sin(a) * (R + ring), yy = cy + Math.cos(a) * (R + ring); if (Math.abs(zz) < Math.abs(zIn) + 0.4) break; pts.push([zz, yy]); }
    // borda partida irregular, em degraus de pedra
    { const [za, ya] = pts[pts.length - 1]; const nB = 7; for (let k = 1; k < nB; k++) { const t = k / nB; const zz = sg * Math.max(gap + 0.05, Math.abs(za + (zIn - za) * t) + rr(-0.28, 0.32)); const yy = ya + (-0.08 - ya) * t + rr(-0.18, 0.12); pts.push([zz, yy]); } }
    pts.forEach(([a, b], k) => k ? sh.lineTo(a, b) : sh.moveTo(a, b));
    for (const side of [-1, 1]) { const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.55, bevelEnabled: false }); eg.rotateY(-Math.PI / 2); eg.translate(side * (W / 2 - 0.02) + (side > 0 ? 0 : 0.55), 0, 0); put(boxUV(eg, 1.25), M.ruin, B.clone().multiply(mtx(0, 0, 0)).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0)), true); }
    // enchimento entre as paredes (invisível de fora, segura o tabuleiro)
    const fl = Math.abs(z0) - Math.abs(zIn); box(W - 1.1, 0.5, fl, M.ruin, 1.3, mtx(0, -0.33, (z0 + zIn) / 2, 0, 0, 0, B));
    // tabuleiro de pedra (calçamento) e parapeitos
    box(W - 0.9, 0.1, fl, M.cobble, 1.1, mtx(0, -0.04, (z0 + zIn) / 2, 0, 0, 0, B), false);
    addWalk(B, -W / 2 + 0.55, W / 2 - 0.55, Math.min(z0, zIn), Math.max(z0, zIn), 0);
    for (const side of [-1, 1]) {
      const n = Math.round(fl / 0.9); for (let k = 0; k < n; k++) { const zc = zIn + sg * (k + 0.5) * fl / n; if (k === 0 && hash(sg * 7 + side) < 0.7) continue; const h = k < 2 ? rr(0.3, 0.55) : 0.62; box(0.36, h, fl / n - 0.03, M.ruin, 1.2, mtx(side * (W / 2 - 0.3), h / 2 - 0.05, zc, 0, rr(-0.02, 0.02), 0, B)); if (h > 0.6) box(0.44, 0.1, fl / n - 0.02, M.block, 1, mtx(side * (W / 2 - 0.3), h - 0.02, zc, 0, 0, 0, B)); }
      const c = toW(side * (W / 2 - 0.3), 0, (z0 + zIn) / 2); addBox(c.x, c.z, 0.18, fl / 2, ry, deck - 0.5, deck + 1.2);
    }
    // cunhas e musgo na pedra exposta da quebra
    for (let k = 0; k < 5; k++) { const g = boxUV(new THREE.BoxGeometry(rr(0.4, 0.8), rr(0.3, 0.5), rr(0.3, 0.6)), 1.2); put(g, M.ruin, mtx(rr(-1.2, 1.2), -0.15, zIn + sg * rr(0.1, 0.5), rand(), rand(), rand(), B)); }
  }
  // pedras caídas no leito do riacho, debaixo do vão
  for (let k = 0; k < 38; k++) { const lx = rr(-3.2, 3.2), lz = rr(-gap - 2.5, gap + 2.5); const w = toW(lx, 0, lz); const gy = groundH(w.x, w.z); const sz = rr(0.35, 0.85);
    const g = k % 3 ? boxUV(new THREE.BoxGeometry(sz * 1.3, sz * 0.8, sz), 1) : boxUV(new THREE.DodecahedronGeometry(sz * 0.6, 0), 1); put(g, k % 3 === 0 ? M.ruinMoss : M.ruin, mtx(w.x, gy + sz * 0.25, w.z, rr(-0.5, 0.5), rand() * 6, rr(-0.5, 0.5))); if (sz > 0.6) addCircle(w.x, w.z, sz * 0.5); }
  // cimbre do Bastião: duas costelas de madeira seguindo o intradorso, escoradas no leito
  const ribA = Math.asin(Math.min(1, (gap + 1.2) / R));
  for (const sx of [-1.05, 1.05]) {
    const nS = 9; for (let k = 0; k < nS; k++) { const a0 = -ribA + k / nS * 2 * ribA, a1 = -ribA + (k + 1) / nS * 2 * ribA; const z0 = Math.sin(a0) * (R - 0.08), y0 = cy + Math.cos(a0) * (R - 0.08), z1 = Math.sin(a1) * (R - 0.08), y1 = cy + Math.cos(a1) * (R - 0.08); const L = Math.hypot(z1 - z0, y1 - y0); box(0.16, 0.22, L + 0.02, M.oldWood, 1, mtx(sx, (y0 + y1) / 2 - 0.11, (z0 + z1) / 2, -Math.atan2(y1 - y0, z1 - z0), 0, 0, B)); }
    // escoras verticais até o leito
    for (const zz of [-gap - 0.9, -gap * 0.35, gap * 0.35, gap + 0.9]) { const a = Math.asin(zz / R); const yTop = cy + Math.cos(a) * (R - 0.08) - 0.2; const w = toW(sx, 0, zz); const gyL = groundH(w.x, w.z) - deck; const h = yTop - gyL; if (h > 0.2) cyl(0.085, 0.1, h + 0.3, 7, M.oldWood, 1, mtx(sx, gyL - 0.3 + (h + 0.3) / 2, zz, 0, 0, 0, B)); }
  }
  // travessas ligando as costelas e tábuas sobre o cimbre
  for (const zz of [-gap - 0.9, 0, gap + 0.9]) { const a = Math.asin(zz / R); const yy = cy + Math.cos(a) * (R - 0.08) - 0.2; box(2.4, 0.12, 0.12, M.oldWood, 1, mtx(0, yy, zz, 0, 0, 0, B)); }
  // passarela de tábuas no vão, com corda de corrimão
  for (let k = 0; k < 7; k++) box(0.24, 0.05, gap * 2 + 1.0, M.planks, 1, mtx(-0.75 + k * 0.25, 0.03, 0, 0, rr(-0.015, 0.015), 0, B));
  for (const zz of [-gap - 0.3, gap + 0.3]) box(1.8, 0.1, 0.14, M.oldWood, 1, mtx(0, -0.02, zz, 0, 0, 0, B));
  addWalk(B, -0.9, 0.9, -gap - 0.6, gap + 0.6, 0.06);
  for (const side of [-1, 1]) { for (const zz of [-gap - 0.3, 0, gap + 0.3]) cyl(0.04, 0.045, 1.05, 6, M.oldWood, 1, mtx(side * 0.95, 0.55, zz, 0, 0, 0, B));
    cyl(0.018, 0.018, gap * 2 + 0.6, 5, M.hay, 1, mtx(side * 0.95, 0.98, 0, Math.PI / 2, 0, 0, B), false); cyl(0.014, 0.014, gap * 2 + 0.6, 5, M.hay, 1, mtx(side * 0.95, 0.6, 0, Math.PI / 2, 0, 0, B), false);
    const c = toW(side * 0.95, 0, 0); addBox(c.x, c.z, 0.05, gap + 0.3, ry, deck - 0.5, deck + 1.2); }
  // bancada, pedras novas já talhadas esperando e ferramentas na margem
  const hL = Lp;
  { const w = toW(2.8, 0, hL + 2.2); const gy = groundH(w.x, w.z); const T = mtx(w.x, gy, w.z, 0, ry, 0); box(1.8, 0.1, 0.7, M.oldWood, 1, mtx(0, 0.85, 0, 0, 0, 0, T)); for (const a of [-1, 1]) for (const b of [-1, 1]) box(0.09, 0.85, 0.09, M.oldWood, 1, mtx(a * 0.8, 0.42, b * 0.28, 0, 0, 0, T)); for (let k = 0; k < 5; k++) box(2.2, 0.06, 0.25, M.planks, 1, mtx(0.3, 0.06 + k * 0.07, 1.0, 0, 0.1, 0, T), false);
    // malho e esquadro sobre a bancada
    box(0.3, 0.1, 0.12, M.iron, 1, mtx(-0.4, 0.95, 0.1, 0, 0.6, 0, T), false); cyl(0.018, 0.018, 0.42, 6, M.timber, 1, mtx(-0.25, 0.92, 0.05, Math.PI / 2, 0.6, 0, T), false); box(0.4, 0.015, 0.04, M.iron, 1, mtx(0.3, 0.91, -0.1, 0, 0.2, 0, T), false); box(0.04, 0.015, 0.3, M.iron, 1, mtx(0.48, 0.91, 0.03, 0, 0.2, 0, T), false);
    addBox(w.x, w.z, 0.95, 0.4, ry); storySpots.bastiao = toW(1.6, 0, hL + 1.4); storySpots.bastiao.y = groundH(storySpots.bastiao.x, storySpots.bastiao.z); storySpots.bastiaoYaw = ry; }
  { const w = toW(-2.6, 0, hL + 2.4); const gy = groundH(w.x, w.z); for (let k = 0; k < 6; k++) { const g = boxUV(new THREE.BoxGeometry(0.7, 0.42, 0.55), 0.9); put(g, M.block, mtx(w.x + (k % 3) * 0.06 * Math.cos(ry), gy + 0.21 + Math.floor(k / 3) * 0.43, w.z, 0, ry + (k % 3) * 0.6 - 0.6, 0)); } addCircle(w.x, w.z, 0.8); }
  storySpots.ponte = toW(-1.4, 0, hL + 2.5); storySpots.ponte.y = groundH(storySpots.ponte.x, storySpots.ponte.z);
}

function shrine() {
  const { x, z } = POI.shrine; const y = groundH(x, z); const ry = face(x, z, 0, 0); const B = mtx(x, y, z, 0, ry, 0);
  box(4.2, 0.35, 2.6, M.ruin, 1.2, mtx(0, 0.1, 0, 0, 0, 0, B)); { const c = new THREE.Vector3(0, 0, 0).applyMatrix4(B); addBox(c.x, c.z, 2.1, 1.3, ry, -1e9, y + 0.2); } addWalk(B, -2.1, 2.1, -1.3, 1.3, 0.28);
  box(4.0, 1.4, 0.4, M.ruin, 1.2, mtx(0, 0.95, -1.15, 0, 0, 0, B));
  // pequenas figuras redondas de pedra, cobertas de musgo
  for (let i = 0; i < 14; i++) { const px = -1.7 + (i % 7) * 0.56, pz = -0.75 + Math.floor(i / 7) * 0.5, s = rr(0.75, 1.15) * (i % 7 === 3 ? 1.35 : 1);
    const body = new THREE.CylinderGeometry(0.11 * s, 0.15 * s, 0.32 * s, 10); put(cylUV(body, 0.15), M.ruin, mtx(px, 0.28 + 0.16 * s, pz, 0, rr(-0.3, 0.3), rr(-0.08, 0.08), B));
    const head = new THREE.SphereGeometry(0.12 * s, 12, 8); put(boxUV(head, 0.4), i % 3 === 0 ? M.roofMoss : M.ruin, mtx(px, 0.28 + 0.4 * s, pz, rr(-0.2, 0.2), 0, 0, B)); }
  // flores frescas e uma tigela
  for (let i = 0; i < 16; i++) { const sp = new THREE.IcosahedronGeometry(0.05, 0); put(sp, M.flowers[i % M.flowers.length], mtx(rr(-1.6, 1.6), 0.31, rr(0.55, 1.1), 0, 0, 0, B), false); }
  cyl(0.18, 0.12, 0.08, 14, M.clay, 1, mtx(0.2, 0.32, 0.9, 0, 0, 0, B), false);
  // lanterninhas de pedra
  for (const s of [-1, 1]) { const L0 = mtx(s * 2.6, 0, 1.1, 0, 0, 0, B); cyl(0.08, 0.12, 0.7, 8, M.ruin, 1, mtx(0, 0.35, 0, 0, 0, 0, L0)); box(0.36, 0.3, 0.36, M.ruin, 1, mtx(0, 0.85, 0, 0, 0, 0, L0)); box(0.48, 0.08, 0.48, M.ruin, 1, mtx(0, 1.04, 0, 0, 0, 0, L0)); lamps.push(new THREE.Vector3(0, 0.85, 0).applyMatrix4(L0)); const c = new THREE.Vector3(0, 0, 0).applyMatrix4(L0); addCircle(c.x, c.z, 0.25); }
  storySpots.santuario = new THREE.Vector3(0, 0, 2.6).applyMatrix4(B); storySpots.santuario.y = groundH(storySpots.santuario.x, storySpots.santuario.z);
}

// montinhos de pedra (marcos) ao longo da trilha da montanha, e uma placa no começo
function trailMarks() {
  for (let i = 1; i < TRAIL.length - 1; i += 2) { const [x1, z1] = TRAIL[i], [x2, z2] = TRAIL[i + 1]; const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); const px = x1 - dz / L * 2.6, pz = z1 + dx / L * 2.6; const gy = groundH(px, pz);
    let y = gy; for (let k = 0; k < 5; k++) { const sz = 0.42 - k * 0.07; const g = new THREE.DodecahedronGeometry(sz, 0); g.scale(1.2, 0.55, 1); put(boxUV(g, 0.8), k % 2 ? M.ruinMoss : M.ruin, mtx(px + rr(-0.05, 0.05), y + sz * 0.45, pz + rr(-0.05, 0.05), rr(-0.1, 0.1), rand() * 6, 0)); y += sz * 0.8; } addCircle(px, pz, 0.45); }
  { const [x, z] = TRAIL[1]; const px = x + 2.2, pz = z + 1; const gy = groundH(px, pz); cyl(0.07, 0.08, 1.8, 7, M.oldWood, 1, mtx(px, gy + 0.9, pz)); box(0.9, 0.32, 0.05, M.oldWood, 1, mtx(px + 0.3, gy + 1.55, pz, 0, -0.6, -0.08)); addCircle(px, pz, 0.15); storySpots.placaMonte = new THREE.Vector3(px, gy, pz); }
}
export function buildLandmarks() { observatory(); garden(); stairs(); aqueduct(); bridge(); shrine(); trailMarks(); }
export const FLOWER_ZONES = () => [[POI.garden.x, POI.garden.z, 14, 900], [POI.head.x, POI.head.z, 16, 700], [POI.observatory.x, POI.observatory.z + 12, 8, 120], [-42, 27, 6, 80]];
