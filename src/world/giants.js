import { THREE, Simplex, clamp, lerp, U } from '../core.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundH, WATER } from './terrain.js';

// Rocky primitives -----------------------------------------------------------
const nz = (x, y, z) => Simplex(x * 0.9 + z * 0.37, y * 0.9 - z * 0.21) * 0.6 + Simplex(x * 2.3 - y * 0.4, z * 2.3 + y * 0.7) * 0.3 + Simplex(x * 6.1, z * 6.1 + y) * 0.1;
function rocky(geo, amt, seed) {
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo, 1e-3);
  geo.computeVertexNormals(); const p = geo.attributes.position; const n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const d = nz(x * 0.35 + seed, y * 0.35, z * 0.35 - seed) * amt; p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d); }
  geo.computeVertexNormals(); return geo;
}
function blob(c, r, sx = 1, sy = 1, sz = 1, seed = 0, rough = 0.3) { const g = new THREE.IcosahedronGeometry(r, 2); g.scale(sx, sy, sz); const out = rocky(g, r * rough, seed); out.translate(c[0], c[1], c[2]); return out; }
function limb(a, b, r1, r2, seed = 0) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const len = A.distanceTo(B);
  const g = new THREE.BoxGeometry((r1 + r2) * 0.95, len, (r1 + r2) * 0.85, 3, 7, 3); const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const t = pp.getY(i) / len + 0.5; const k = lerp(r1, r2, t) / ((r1 + r2) / 2); pp.setX(i, pp.getX(i) * k); pp.setZ(i, pp.getZ(i) * k); } const geo = rocky(g, (r1 + r2) * 0.16, seed);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  geo.applyQuaternion(q); const mid = A.clone().add(B).multiplyScalar(0.5); geo.translate(mid.x, mid.y, mid.z);
  return [geo, blob([B.x, B.y, B.z], r2 * 1.05, 1, 1, 1, seed + 1, 0.12), blob([A.x, A.y, A.z], r1 * 1.02, 1, 1, 1, seed + 2, 0.12)];
}
function boxUVWorld(geo, tile) {
  const p = geo.attributes.position, n = geo.attributes.normal; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v; if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); } uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}

// Poses (meters, giant-local, +z = facing) -----------------------------------------
const POSES = {
  kneel: { hips: [0, 4.2, 0], chest: [0, 7.4, 0.7], neck: [0, 9.2, 1.4], head: [0, 10.3, 2.2], headTilt: 0.5,
    arms: [[[2.5, 8.5, 0.7], [2.9, 6.3, 2.6], [0.55, 5.4, 3.7]], [[-2.5, 8.5, 0.7], [-2.9, 6.3, 2.6], [-0.55, 5.4, 3.7]]],
    legs: [[[1.3, 3.8, 0.2], [1.5, 0.9, 2.8], [1.5, 0.5, -1.4]], [[-1.3, 3.8, 0.2], [-1.5, 4.0, 3.4], [-1.5, 0.4, 3.6]]], sword: true },
  sit: { hips: [0, 3.0, 0], chest: [0, 6.3, -0.3], neck: [0, 8.3, -0.1], head: [0, 9.5, 0.4], headTilt: 0.25,
    arms: [[[2.5, 7.5, -0.3], [3.1, 5.0, 1.4], [2.0, 3.6, 3.8]], [[-2.5, 7.5, -0.3], [-3.1, 5.0, 1.4], [-2.0, 3.6, 3.8]]],
    legs: [[[1.4, 3.0, 0.4], [1.6, 3.2, 4.1], [1.7, 0.3, 4.8]], [[-1.4, 3.0, 0.4], [-1.6, 3.2, 4.1], [-1.7, 0.3, 4.8]]] },
  reach: { hips: [0, 3.0, 0], chest: [0, 6.3, 0.2], neck: [0, 8.3, 0.6], head: [0, 9.5, 1.0], headTilt: -0.35,
    arms: [[[2.5, 7.6, 0.2], [3.6, 9.8, 1.4], [3.4, 12.6, 2.4]], [[-2.5, 7.5, 0.2], [-3.2, 5.2, 1.6], [-2.2, 3.4, 3.4]]],
    legs: [[[1.4, 3.0, 0.4], [1.6, 3.2, 4.1], [1.7, 0.3, 4.8]], [[-1.4, 3.0, 0.4], [-1.6, 3.2, 4.1], [-1.7, 0.3, 4.8]]] },
  lie: { hips: [0, 1.4, 0], chest: [0, 1.9, 3.3], neck: [0, 1.8, 5.3], head: [0, 2.0, 6.5], headTilt: -1.35, headTurn: 0.5,
    arms: [[[2.6, 1.9, 4.0], [4.2, 5.0, 5.6], [6.0, 0.6, 7.6]], [[-2.6, 1.8, 4.0], [-3.4, 0.9, 1.6], [-3.5, 0.6, -0.8]]],
    legs: [[[1.3, 1.4, -0.6], [1.6, 3.4, -3.8], [1.6, 0.5, -6.6]], [[-1.3, 1.3, -0.6], [-1.5, 1.0, -4.4], [-1.6, 0.6, -8.0]]] },
};

let rockMat = null, mossTex = null;
function giantMaterial(rockMaps) {
  if (rockMat) return rockMat;
  rockMat = new THREE.MeshStandardMaterial({ map: rockMaps.map, normalMap: rockMaps.normalMap, roughness: 0.92, color: 0xf2ece0, envMapIntensity: 1.3, normalScale: new THREE.Vector2(1.5, 1.5) });
  rockMat.onBeforeCompile = (s) => {
    s.uniforms.tMacro = U.macro;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW; varying vec3 vGN;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vGW = (modelMatrix*vec4(transformed,1.)).xyz; vGN = normalize(mat3(modelMatrix)*objectNormal);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tMacro; varying vec3 vGW; varying vec3 vGN;')
      .replace('#include <map_fragment>', `#include <map_fragment>
 vec4 mc = texture2D(tMacro, vGW.xz*0.05 + vGW.y*0.03);
 float up = smoothstep(0.55, 0.95, vGN.y + (mc.r-0.5)*0.5);
 float moss = clamp(up * smoothstep(0.35, 0.7, mc.g + mc.b*0.4), 0., 1.);
 vec3 mossC = mix(vec3(0.22,0.3,0.1), vec3(0.38,0.42,0.16), mc.b);
 diffuseColor.rgb = mix(diffuseColor.rgb*vec3(0.95,0.93,0.9), mossC, moss*0.9);
 diffuseColor.rgb *= 0.95 + 0.25*mc.g;`);
  };
  rockMat.customProgramCacheKey = () => 'giantrock';
  return rockMat;
}

export const giants = [];
export function buildGiant(scene, rockMaps, o) {
  const P = POSES[o.pose]; const S = o.scale || 1.6; const parts = []; let seed = o.seed || 1;
  // torso: pelvis, ribcage, shoulders mass
  parts.push(blob(P.hips, 2.0, 1.25, 0.9, 1.0, seed++));
  parts.push(...limb(P.hips, P.chest, 1.9, 2.4, seed++));
  parts.push(blob(P.chest, 2.5, 1.35, 1.0, 0.95, seed++));
  parts.push(...limb(P.chest, P.neck, 1.1, 0.8, seed++));
  // head: blocky with brow ridge
  const hd = new THREE.Group(); const headG = rocky(new THREE.BoxGeometry(2.1, 2.4, 2.2, 4, 4, 4), 0.28, seed++); const brow = rocky(new THREE.BoxGeometry(0.45, 0.9, 0.5, 2, 3, 2), 0.06, seed++); brow.translate(0, -0.05, 1.15); const jaw = rocky(new THREE.BoxGeometry(1.7, 0.8, 1.6, 3, 2, 3), 0.15, seed++); jaw.translate(0, -1.2, 0.3);
  let head = mergeGeometries([headG, brow, jaw].map(g => g.index ? g.toNonIndexed() : g));
  const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.headTilt || 0, P.headTurn || 0, 0)); head.applyQuaternion(hq); head.translate(...P.head); parts.push(head);
  for (const arm of P.arms) { parts.push(blob(arm[0], 1.15, 1, 1, 1, seed++)); parts.push(...limb(arm[0], arm[1], 0.95, 0.75, seed++)); parts.push(...limb(arm[1], arm[2], 0.75, 0.62, seed++)); parts.push(blob(arm[2], 0.75, 1.0, 0.7, 1.2, seed++, 0.12)); }
  for (const leg of P.legs) { parts.push(...limb(leg[0], leg[1], 1.25, 0.95, seed++)); parts.push(...limb(leg[1], leg[2], 0.95, 0.75, seed++)); parts.push(blob(leg[2], 0.9, 1.0, 0.55, 1.5, seed++, 0.1)); }
  if (P.sword) { parts.push(rocky(new THREE.BoxGeometry(0.35, 6.5, 1.1, 2, 10, 3), 0.05, seed++).translate(0, 2.0, 3.85)); parts.push(rocky(new THREE.BoxGeometry(2.6, 0.45, 0.6, 6, 2, 2), 0.06, seed++).translate(0, 5.3, 3.8)); parts.push(blob([0, 6.2, 3.75], 0.35, 1, 1.6, 1, seed++)); }
  const geo = mergeGeometries(parts.map(g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }));
  geo.scale(S, S, S);
  const root = new THREE.Group(); root.position.set(o.x, o.y, o.z); root.rotation.y = o.rot || 0; scene.add(root); root.updateMatrixWorld(true);
  geo.applyMatrix4(root.matrixWorld); boxUVWorld(geo, 3.2); geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, giantMaterial(rockMaps)); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  // glowing eyes & chest rune (dark until the name is returned)
  const glow = new THREE.MeshStandardMaterial({ color: 0x0a1418, emissive: 0x7fe0ff, emissiveIntensity: 0, roughness: 0.4 });
  const eyes = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), glow); const lp = new THREE.Vector3(0.48 * s, 0.35, 1.12).applyQuaternion(hq).add(new THREE.Vector3(...P.head)).multiplyScalar(S); e.position.copy(lp); root.add(e); eyes.push(e); }
  const runeTex = makeRuneTexture(o.runeIdx || 0);
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: runeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x7fe0ff, opacity: 0.0, fog: false }));
  const cp = new THREE.Vector3(...P.chest).multiplyScalar(S); const forwardish = o.pose === 'lie' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0.15, 1).normalize();
  rune.position.copy(cp).addScaledVector(forwardish, 2.35 * S * 1.0); rune.lookAt(rune.position.clone().add(forwardish)); if (o.pose === 'lie') { rune.position.set(cp.x, cp.y + 2.6 * S * 0.62, cp.z); rune.rotation.set(-Math.PI / 2, 0, 0); } rune.scale.setScalar(S); root.add(rune);
  const light = new THREE.Object3D(); light.intensity = 0; // glow is emissive+bloom only (no extra forward light) light.position.copy(cp); root.add(light);
  // colliders along the parts that touch the ground
  const cols = []; const addC = (pt, r) => { const w = new THREE.Vector3(...pt).multiplyScalar(S).applyMatrix4(root.matrixWorld); if (pt[1] * S + o.y < groundH(w.x, w.z) + 4) cols.push([w.x, w.z, r * S]); };
  addC(P.hips, 2.0); addC(P.chest, 2.2); for (const l of P.legs) { addC(l[0], 1.2); addC(l[1], 1.0); addC(l[2], 1.0); addC([(l[1][0] + l[2][0]) / 2, (l[1][1] + l[2][1]) / 2, (l[1][2] + l[2][2]) / 2], 0.9); } for (const a of P.arms) { addC(a[2], 0.8); } if (P.sword) addC([0, 0, 3.9], 0.6);
  const g = Object.assign({ root, mesh, glow, rune, light, eyes, awake: 0, target: 0, cols, S, P }, o); giants.push(g);
  return g;
}
function makeRuneTexture(k) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128); g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#bff'; g.shadowBlur = 14;
  g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 96, 0, Math.PI * 2); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 80, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 9; const r = Math.sin; const shapes = [
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
    g.glow.emissiveIntensity = g.awake * 5 * pulse; g.rune.material.opacity = g.awake * 0.95 * pulse + (1 - g.awake) * 0.06 * (0.5 + 0.5 * Math.sin(time * 0.8 + g.z));
    g.light.intensity = g.awake * 22 * pulse;
  }
}

// a carved stele at the giant's feet where its name can be returned
export const nameStones = [];
export function buildNameStone(scene, rockMaps, x, z, rot, runeIdx) {
  const y = groundH(x, z) - 0.3;
  const g = rocky(new THREE.BoxGeometry(1.1, 2.6, 0.55, 3, 6, 2), 0.06, x * 0.1);
  g.translate(0, 1.3, 0); const root = new THREE.Group(); root.position.set(x, y, z); root.rotation.y = rot; scene.add(root); root.updateMatrixWorld(true);
  g.applyMatrix4(root.matrixWorld); boxUVWorld(g, 1.6);
  const mesh = new THREE.Mesh(g, giantMaterial(rockMaps)); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshBasicMaterial({ map: makeRuneTexture(runeIdx), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x9fe6ff, opacity: 0.25, fog: false }));
  rune.position.set(0, 1.75, 0.3); root.add(rune);
  const s = { x, z, y: y + 0.3, rot, rune, root, lit: 0 }; nameStones.push(s); return s;
}
export function buildHeadFragment(scene, rockMaps, x, z, rot, S = 2.2) {
  const headG = rocky(new THREE.BoxGeometry(2.1, 2.4, 2.2, 4, 4, 4), 0.32, 7); const nose = rocky(new THREE.BoxGeometry(0.45, 0.9, 0.5, 2, 3, 2), 0.06, 8); nose.translate(0, -0.05, 1.15); const jaw = rocky(new THREE.BoxGeometry(1.7, 0.8, 1.6, 3, 2, 3), 0.15, 9); jaw.translate(0, -1.2, 0.3);
  const geo = mergeGeometries([headG, nose, jaw].map(g => g.index ? g.toNonIndexed() : g)); geo.scale(S, S, S);
  const root = new THREE.Group(); root.position.set(x, groundH(x, z) + 0.6, z); root.rotation.set(0.35, rot, 0.6); scene.add(root); root.updateMatrixWorld(true); geo.applyMatrix4(root.matrixWorld); boxUVWorld(geo, 3);
  const mesh = new THREE.Mesh(geo, giantMaterial(rockMaps)); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  return [x, z, 2.4 * S];
}
export function updateNameStones(dt, t) { for (const s of nameStones) { const target = s.lit ? 0.95 : 0.18 + 0.1 * Math.sin(t * 1.5 + s.x); s.rune.material.opacity = lerp(s.rune.material.opacity, target, 1 - Math.exp(-dt * 2)); } }
