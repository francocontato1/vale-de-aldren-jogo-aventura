// Curiosidades da floresta, perto das trilhas (para se ver enquanto se corre): círculo de cogumelos,
// tronco oco, colmeia com abelhas, ninho com ovos, amoreira, pedra com estrela dos Veladores, fonte na
// pedra, cabana de caçador abandonada e a árvore com nomes gravados. E detalhes do chão da mata:
// samambaias, troncos caídos com musgo e tufos de cogumelos, espalhados ao longo das trilhas.
import { THREE, scene, camera, U, rand, rr, clamp } from '../core.js';
import { groundH, normalY, PATHS, forestDensity, sandAt, WATER } from './terrain.js';
import { M, put, box, mtx, cyl, boxUV, addBox, addCircle, storySpots } from './village.js';

export const CURIO = { bees: [], spring: null };
// pontos ao lado das trilhas, dentro da mata, um para cada curiosidade
function sitesAlongPaths(n, minFD, avoid) {
  const out = []; const segs = []; for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) segs.push([p[i], p[i + 1]]);
  let tries = 0; while (out.length < n && tries++ < 6000) { const [[x1, z1], [x2, z2]] = segs[(rand() * segs.length) | 0]; const t = rand(); const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); const s = rand() < 0.5 ? -1 : 1; const off = rr(6.5, 10);
    const x = x1 + dx * t - dz / L * off * s, z = z1 + dz * t + dx / L * off * s; const h = groundH(x, z); if (h < 2 || h > 80 || normalY(x, z) < 0.86 || sandAt(x, z) > 0.1) continue; if (forestDensity(x, z) < minFD) continue; if (Math.hypot(x, z) < 70) continue; if (avoid(x, z, 4) || out.some(o => Math.hypot(o.x - x, o.z - z) < 60)) continue; out.push({ x, z, h, face: Math.atan2(-dz / L * s * -1, dx / L * s) }); }
  return out;
}
function mushroom(x, y, z, s, cap = M.mushCap) { cyl(0.03 * s, 0.04 * s, 0.12 * s, 7, M.mushStem, 1, mtx(x, y + 0.06 * s, z), false); const g = new THREE.SphereGeometry(0.075 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.62, 1); put(g, cap, mtx(x, y + 0.115 * s, z), false); }
export function buildCuriosities(avoid) {
  M.mushCap = new THREE.MeshStandardMaterial({ color: 0x9a3a22, roughness: 0.6 }); M.mushCapB = new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: 0.7 }); M.mushStem = new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.8 });
  M.berry = new THREE.MeshStandardMaterial({ color: 0x2a0d1e, roughness: 0.25 }); M.egg = new THREE.MeshStandardMaterial({ color: 0xbfd6d8, roughness: 0.5 }); M.honey = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.9 });
  const S = sitesAlongPaths(9, 0.08, avoid); if (S.length < 9) S.push(...sitesAlongPaths(9 - S.length, -0.05, avoid));
  const at = (i) => S[i % S.length];
  // 1) círculo de cogumelos
  { const p = at(0); for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283 + rr(-0.08, 0.08), r = 1.9 + rr(-0.15, 0.15); const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r; mushroom(x, groundH(x, z), z, rr(0.8, 1.4), i % 4 ? M.mushCap : M.mushCapB); } storySpots.cogumelos = new THREE.Vector3(p.x, p.h, p.z); }
  // 2) tronco oco caído, coberto de musgo
  { const p = at(1); const rot = rand() * 6; const B = mtx(p.x, p.h + 0.45, p.z, 0, rot, Math.PI / 2); const outer = new THREE.CylinderGeometry(0.55, 0.62, 5.2, 14, 1, true); put(outer, M.bark, B); const inner = new THREE.CylinderGeometry(0.45, 0.5, 5.2, 14, 1, true); inner.scale(-1, 1, 1); put(inner, M.oldWood, B); for (const sgn of [-1, 1]) { const ring = new THREE.RingGeometry(0.45, 0.6, 14); put(ring, M.oldWood, B.clone().multiply(mtx(0, sgn * 2.6, 0, sgn * Math.PI / 2, 0, 0))); }
    for (let i = 0; i < 26; i++) { const g = new THREE.IcosahedronGeometry(rr(0.08, 0.16), 0); put(g, M.leaf, B.clone().multiply(mtx(rr(-0.15, 0.15) - 0.55, rr(-2.4, 2.4), rr(-0.25, 0.25))), false); }
    const c = new THREE.Vector3(0, 0, 0).applyMatrix4(B); addBox(c.x, c.z, 2.6, 0.6, rot); storySpots.tronco = new THREE.Vector3(p.x + Math.cos(rot) * 1.4, p.h, p.z - Math.sin(rot) * 1.4); }
  // 3) colmeia num toco alto, com abelhas
  { const p = at(2); cyl(0.38, 0.48, 2.4, 12, M.bark, 1, mtx(p.x, p.h + 1.2, p.z)); const hv = new THREE.SphereGeometry(0.26, 12, 10); hv.scale(1, 1.3, 1); put(boxUV(hv, 0.3), M.honey, mtx(p.x + 0.36, p.h + 1.7, p.z)); addCircle(p.x, p.z, 0.5); CURIO.bees.push({ x: p.x + 0.36, y: p.h + 1.7, z: p.z }); storySpots.colmeia = new THREE.Vector3(p.x + 1.6, p.h, p.z + 0.6); }
  // 4) ninho com ovos num toco baixo
  { const p = at(3); cyl(0.32, 0.4, 0.9, 10, M.bark, 1, mtx(p.x, p.h + 0.45, p.z)); const n = new THREE.TorusGeometry(0.16, 0.07, 6, 14); put(n, M.hay, mtx(p.x, p.h + 0.95, p.z, Math.PI / 2, 0, 0)); for (let i = 0; i < 3; i++) { const e = new THREE.SphereGeometry(0.045, 10, 8); e.scale(1, 1.3, 1); put(e, M.egg, mtx(p.x + Math.cos(i * 2.1) * 0.05, p.h + 0.96, p.z + Math.sin(i * 2.1) * 0.05), false); } addCircle(p.x, p.z, 0.45); storySpots.ninhoAve = new THREE.Vector3(p.x + 1.2, p.h, p.z); }
  // 5) amoreira com frutas
  { const p = at(4); for (let i = 0; i < 9; i++) { const g = new THREE.IcosahedronGeometry(rr(0.45, 0.75), 1); g.scale(1, 0.75, 1); put(g, M.leaf, mtx(p.x + rr(-1, 1), p.h + rr(0.3, 0.7), p.z + rr(-1, 1)), true); } for (let i = 0; i < 40; i++) { const b = new THREE.SphereGeometry(0.03, 6, 5); put(b, M.berry, mtx(p.x + rr(-1.2, 1.2), p.h + rr(0.5, 1.05), p.z + rr(-1.2, 1.2)), false); } addCircle(p.x, p.z, 1.1); storySpots.amoras = new THREE.Vector3(p.x + 1.8, p.h, p.z); }
  // 6) pedra com a estrela dos Veladores, coberta de musgo
  { const p = at(5); const g = new THREE.BoxGeometry(1.0, 1.7, 0.4, 3, 5, 2); const pp = g.attributes.position; for (let k = 0; k < pp.count; k++) { const yy = pp.getY(k); pp.setX(k, pp.getX(k) * (1 - 0.18 * Math.max(0, yy / 0.85))); pp.setZ(k, pp.getZ(k) + Math.sin(yy * 3 + k) * 0.02); } g.computeVertexNormals(); put(boxUV(g, 1.4), M.ruinMoss, mtx(p.x, p.h + 0.7, p.z, rr(-0.06, 0.06), p.face, rr(-0.05, 0.05)));
    const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 - Math.PI / 2, r = i % 2 ? 0.07 : 0.17; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const sg = new THREE.ShapeGeometry(star); put(sg, M.soot, mtx(p.x, p.h + 1.05, p.z, 0, p.face, 0).multiply(mtx(0, 0, 0.21)), false); addCircle(p.x, p.z, 0.6); storySpots.estrela = new THREE.Vector3(p.x + Math.sin(p.face) * 1.6, p.h, p.z + Math.cos(p.face) * 1.6); }
  // 7) fonte: água brotando numa bacia de pedra
  { const p = at(6); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const g = new THREE.DodecahedronGeometry(0.25, 0); put(boxUV(g, 0.6), M.stone, mtx(p.x + Math.cos(a) * 0.85, p.h + 0.12, p.z + Math.sin(a) * 0.85, rand(), rand(), rand())); } box(0.5, 0.9, 0.35, M.ruinMoss, 1, mtx(p.x, p.h + 0.45, p.z - 0.9)); cyl(0.04, 0.04, 0.3, 6, M.iron, 1, mtx(p.x, p.h + 0.75, p.z - 0.65, Math.PI / 2, 0, 0), false);
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), new THREE.MeshStandardMaterial({ color: 0x0a1416, roughness: 0.04, metalness: 0.1, envMapIntensity: 1.6 })); w.rotation.x = -Math.PI / 2; w.position.set(p.x, p.h + 0.16, p.z); scene.add(w); CURIO.spring = { x: p.x, y: p.h + 0.75, z: p.z - 0.6, wy: p.h + 0.17 }; addCircle(p.x, p.z, 1.0); storySpots.fonte = new THREE.Vector3(p.x + 1.5, p.h, p.z + 0.4); }
  // 8) cabana de caçador abandonada (alpendre de troncos com lanterna apagada)
  { const p = at(7); const rot = p.face; const B = mtx(p.x, p.h, p.z, 0, rot, 0); for (const [a, b] of [[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]]) cyl(0.1, 0.12, b < 0 ? 2.2 : 1.5, 7, M.bark, 1, mtx(a, (b < 0 ? 2.2 : 1.5) / 2, b, 0, 0, 0, B)); box(3.2, 0.1, 2.6, M.planks, 1, mtx(0, 1.9, 0, 0.28, 0, 0, B)); for (let i = 0; i < 6; i++) cyl(0.08, 0.08, 2.6, 6, M.bark, 1, mtx(0, 0.15 + i * 0.17, -1.05, 0, 0, Math.PI / 2, B)); box(1.4, 0.08, 0.7, M.oldWood, 1, mtx(0.3, 0.45, -0.5, 0, 0, 0, B)); cyl(0.06, 0.07, 0.18, 8, M.iron, 1, mtx(0.6, 0.58, -0.5, 0, 0, 0, B), false);
    const c = new THREE.Vector3(0, 0, -1.05).applyMatrix4(B); addBox(c.x, c.z, 1.4, 0.15, rot); storySpots.cabana = new THREE.Vector3(0, 0, 1.8).applyMatrix4(B); storySpots.cabana.y = p.h; }
  // 9) a árvore com nomes gravados
  { const p = at(8); cyl(0.85, 1.15, 7, 14, M.bark, 1.2, mtx(p.x, p.h + 3.4, p.z)); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; cyl(0.12, 0.35, 2.4, 6, M.bark, 1, mtx(p.x + Math.cos(a) * 1.2, p.h + 0.3, p.z + Math.sin(a) * 1.2, 0, -a, 1.2)); } for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(rr(2.2, 3.4), 1); put(g, M.leaf, mtx(p.x + rr(-2.5, 2.5), p.h + rr(6.5, 9), p.z + rr(-2.5, 2.5))); }
    box(0.5, 0.3, 0.02, M.soot, 1, mtx(p.x + Math.sin(p.face) * 0.95, p.h + 1.6, p.z + Math.cos(p.face) * 0.95, 0, p.face, 0), false); addCircle(p.x, p.z, 1.2); storySpots.arvoreNomes = new THREE.Vector3(p.x + Math.sin(p.face) * 2.2, p.h, p.z + Math.cos(p.face) * 2.2); }
}

// ---------------- chão da mata ao longo das trilhas: samambaias, troncos com musgo, tufos de cogumelos
function fernTexture() { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.clearRect(0, 0, 64, 256); g.strokeStyle = '#3d5a24'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 256); g.quadraticCurveTo(34, 120, 30, 0); g.stroke();
  for (let i = 0; i < 26; i++) { const y = 250 - i * 9.5; const L = 26 * Math.sin((i + 1) / 27 * Math.PI) + 4; for (const s of [-1, 1]) { g.fillStyle = i % 2 ? '#4f7a2c' : '#5b8634'; g.beginPath(); g.moveTo(32, y); g.quadraticCurveTo(32 + s * L * 0.6, y - 10, 32 + s * L, y - 3); g.quadraticCurveTo(32 + s * L * 0.5, y + 2, 32, y + 2); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function buildForestFloor(avoid) {
  // samambaia: 6 frondes curvas em roseta
  const fronds = []; for (let i = 0; i < 6; i++) { const g = new THREE.PlaneGeometry(0.28, 1.0, 1, 6); g.translate(0, 0.5, 0); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, y * y * 0.55); p.setY(k, y * 0.85); } g.rotateX(-0.35); g.rotateY(i / 6 * Math.PI * 2 + rr(-0.2, 0.2)); fronds.push(g.toNonIndexed()); }
  let n = 0; for (const g of fronds) n += g.attributes.position.count; const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0; for (const g of fronds) { pos.set(g.attributes.position.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); fg.computeVertexNormals();
  const fm = new THREE.MeshStandardMaterial({ map: fernTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  fm.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.time; sh.uniforms.uWind = U.wind; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec2 uWind;').replace('#include <begin_vertex>', `#include <begin_vertex>
 vec3 ip = vec3(instanceMatrix[3][0], 0., instanceMatrix[3][2]); float k = max(position.y, 0.) * max(position.y, 0.); transformed.xz += (uWind * 0.08 + vec2(sin(uTime * 1.7 + ip.x), cos(uTime * 1.3 + ip.z)) * 0.04) * k;`); }; fm.customProgramCacheKey = () => 'fern';
  const items = []; const segs = []; for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) segs.push([p[i], p[i + 1]]);
  for (let i = 0; i < 2600; i++) { const [[x1, z1], [x2, z2]] = segs[(rand() * segs.length) | 0]; const t = rand(); const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); const off = rr(3.2, 22) * (rand() < 0.5 ? -1 : 1); const x = x1 + dx * t - dz / L * off, z = z1 + dz * t + dx / L * off; const h = groundH(x, z); if (h < 1.5 || normalY(x, z) < 0.82 || sandAt(x, z) > 0.1) continue; if (forestDensity(x, z) < 0.0 && rand() < 0.75) continue; if (avoid(x, z, 0.5)) continue; items.push([x, h, z, rr(0.6, 1.3), rand() * 6.28]); }
  const im = new THREE.InstancedMesh(fg, fm, items.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); items.forEach((it, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it[4]); m4.compose(new THREE.Vector3(it[0], it[1] - 0.05, it[2]), q, new THREE.Vector3(it[3], it[3], it[3])); im.setMatrixAt(i, m4); });
  im.castShadow = false; im.receiveShadow = true; im.layers.set(1); scene.add(im); CURIO.ferns = { im, items, m4 };
  // troncos caídos com musgo e tufos de cogumelos (geometria fixa, assada com a vila)
  let logs = 0; for (let i = 0; i < 400 && logs < 70; i++) { const [[x1, z1], [x2, z2]] = segs[(rand() * segs.length) | 0]; const t = rand(); const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); const off = rr(4, 16) * (rand() < 0.5 ? -1 : 1); const x = x1 + dx * t - dz / L * off, z = z1 + dz * t + dx / L * off; const h = groundH(x, z); if (h < 2 || normalY(x, z) < 0.88 || forestDensity(x, z) < 0.05 || avoid(x, z, 3) || sandAt(x, z) > 0.1) continue;
    const len = rr(2.5, 5), r = rr(0.18, 0.32), rot = rand() * 6; cyl(r, r * 1.1, len, 10, M.bark, 1, mtx(x, h + r * 0.8, z, 0, rot, Math.PI / 2)); for (let k = 0; k < 8; k++) { const g = new THREE.IcosahedronGeometry(rr(0.06, 0.12), 0); put(g, M.leaf, mtx(x + Math.cos(rot) * rr(-len / 2, len / 2), h + r * 1.6, z - Math.sin(rot) * rr(-len / 2, len / 2)), false); }
    if (rand() < 0.6) for (let k = 0; k < 5; k++) mushroom(x + rr(-0.5, 0.5), h, z + rr(-0.5, 0.5), rr(0.5, 0.9), rand() < 0.5 ? M.mushCapB : M.mushCap);
    addBox(x, z, len / 2, r, rot); CURIO.logs = (CURIO.logs || []); CURIO.logs.push([x, z]); logs++; }
}
// abelhas voando em volta da colmeia, filete d'água na fonte
const beeMat = new THREE.PointsMaterial({ color: 0x2a2010, size: 0.03, sizeAttenuation: true });
export function updateCuriosities(dt, t, emit) {
  if (!CURIO.beePts && CURIO.bees.length) { const n = CURIO.bees.length * 14; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); CURIO.beePts = new THREE.Points(g, beeMat); CURIO.beePts.frustumCulled = false; scene.add(CURIO.beePts); }
  if (CURIO.beePts) { const a = CURIO.beePts.geometry.attributes.position.array; let i = 0; for (const b of CURIO.bees) for (let k = 0; k < 14; k++) { const ph = k * 1.7; a[i++] = b.x + Math.sin(t * (1.3 + k * 0.1) + ph) * (0.4 + (k % 4) * 0.2); a[i++] = b.y + Math.sin(t * 2.1 + ph * 2) * 0.35; a[i++] = b.z + Math.cos(t * (1.1 + k * 0.13) + ph) * (0.4 + (k % 3) * 0.25); } CURIO.beePts.geometry.attributes.position.needsUpdate = true; }
  if (CURIO.spring && emit && Math.hypot(CURIO.spring.x - camera.position.x, CURIO.spring.z - camera.position.z) < 25 && rand() < dt * 30) { const s = CURIO.spring; emit({ x: s.x + rr(-0.01, 0.01), y: s.y, z: s.z + 0.12, vx: 0, vy: -0.3, vz: rr(0.6, 0.8), g: 9, drag: 0, life: 0.32, s0: 0.035, s1: 0.03, c: [0.75, 0.85, 0.88], a0: 0.55, wind: 0 }); }
}
