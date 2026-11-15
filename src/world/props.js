import { THREE, loadGLTF, rand, rr, U, GLSL_NOISE } from '../core.js';
import { groundH, normalY, splatAt, WATER, forestDensity } from './terrain.js';

// draws only the instances near the camera (rebuilt when the camera moves)
const nearSets = [];
class NearSet {
  constructor(scene, geo, mat, items, radius, cast) {
    this.items = items; this.radius = radius; this.im = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length)); this.im.count = 0; this.im.castShadow = cast; this.im.receiveShadow = true; this.im.frustumCulled = false; if (!cast) this.im.layers.set(1); scene.add(this.im); nearSets.push(this);
  }
  update(cx, cz) { const r2 = this.radius * this.radius; let n = 0; for (const it of this.items) { const dx = it.p.x - cx, dz = it.p.z - cz; if (dx * dx + dz * dz < r2 * (it.big ? 4 : 1)) this.im.setMatrixAt(n++, it.m); } this.im.count = n; this.im.instanceMatrix.needsUpdate = true; }
}
let lastNear = { x: 1e9, z: 1e9 };
export function updateProps(cx, cz, force) { if (!force && Math.hypot(cx - lastNear.x, cz - lastNear.z) < 8) return; lastNear = { x: cx, z: cz }; for (const n of nearSets) n.update(cx, cz); }
export function setPropRadius(k) { for (const n of nearSets) n.radius = n.baseR * k; lastNear = { x: 1e9, z: 1e9 }; }
export async function buildProps(scene, { avoid, addCircle, villageExclude, zones = [] }) {
  const [r1, r2, r3, fw, fy, fb, tg] = await Promise.all(['rock1', 'rock2', 'rock3', 'flower_white', 'flower_yellow', 'flower_blue', 'grass'].map(n => loadGLTF('a/' + n + '.glb.wasm')));
  const out = { rockMat: null };
  // ---- rocks ----
  const rockGeos = [r1, r2, r3].map(g => { let mesh; g.scene.traverse(o => { if (o.isMesh) mesh = o; }); mesh.updateWorldMatrix(true, false); const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld); geo.computeBoundingBox(); const bb = geo.boundingBox; const s = 1 / Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z); geo.translate(0, -bb.min.y, 0); geo.scale(s, s, s); if (!out.rockMat) out.rockMat = mesh.material; /* as três pedras usam as mesmas texturas: só a rock1 as carrega */ return geo; });
  const rmat = out.rockMat; rmat.roughness = 1; rmat.color && rmat.color.setRGB(0.92, 0.9, 0.86);
  const rockLists = [[], [], []];
  let tries = 0, placed = 0;
  while (placed < 900 && tries < 20000) { tries++; const x = rr(-700, 700), z = rr(-700, 700); if (Math.hypot(x, z) > 720) continue; const y = groundH(x, z); if (y < -0.5) continue; const ny = normalY(x, z); const sp = splatAt(x, z);
    const big = rand() < 0.12; const steep = ny < 0.88 || sp[1] > 0.3; if (!steep && rand() < 0.65) continue; const s = big ? rr(2.5, 6) : rr(0.4, 1.6); if (avoid(x, z, s * 0.5)) continue;
    rockLists[(rand() * 3) | 0].push({ x, y, z, s, sy: rr(0.6, 1.1), rot: rand() * 6.28, tilt: rr(-0.25, 0.25) }); if (s > 0.9) addCircle(x, z, s * 0.42); placed++; }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  rockLists.forEach((list, i) => { const items = list.map(r => { e.set(r.tilt, r.rot, r.tilt * 0.5); q.setFromEuler(e); const m = new THREE.Matrix4().compose(new THREE.Vector3(r.x, r.y - r.s * 0.18, r.z), q, new THREE.Vector3(r.s, r.s * r.sy, r.s)); return { p: { x: r.x, z: r.z }, m, big: r.s > 2 }; }); const ns = new NearSet(scene, rockGeos[i], rmat, items, 150, true); ns.baseR = 150; });
  // ---- wind-swayed small plants (flowers, tall grass clumps) ----
  const plantMat = (src) => { const m = new THREE.MeshStandardMaterial({ map: src.map || null, color: src.color || new THREE.Color(1, 1, 1), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }); if (src.emissive) m.emissive = src.emissive.clone().multiplyScalar(0); m.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.time; sh.uniforms.uWind = U.wind; sh.uniforms.uPlayer = U.player; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec2 uWind; uniform vec3 uPlayer;').replace('#include <begin_vertex>', `#include <begin_vertex>
 vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
 float hh = max(position.y, 0.0); float k = hh*hh*0.9;
 transformed.xz += (uWind*0.18 + vec2(sin(uTime*2.1+ip.x), cos(uTime*1.7+ip.z))*0.06) * k;
 vec2 dp = ip.xz - uPlayer.xz; float dd = length(dp); float push = (1.0-smoothstep(0.2,1.0,dd)); transformed.xz += normalize(dp+1e-4)*push*k*0.6;`); }; m.customProgramCacheKey = () => 'plant'; return m; };
  const scatterPlant = (gltf, count, scale, pred, zoneShare = 0) => {
    const meshes = []; gltf.scene.updateMatrixWorld(true); gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
    const box = new THREE.Box3().setFromObject(gltf.scene); const h = box.max.y - box.min.y; const base = scale / h;
    const items = []; let t = 0; while (items.length < count && t < count * 30) { t++; const x = rr(-450, 450), z = rr(-450, 450); const y = groundH(x, z); if (y < WATER + 0.6 || normalY(x, z) < 0.85) continue; const sp = splatAt(x, z); if (sp[0] > 0.4 || sp[1] > 0.25 || sp[2] > 0.1) continue; if (villageExclude(x, z)) continue; if (!pred(x, z)) continue; const cluster = 1 + ((rand() * 5) | 0); for (let c = 0; c < cluster && items.length < count; c++) { const cx = x + rr(-1.5, 1.5), cz = z + rr(-1.5, 1.5); items.push([cx, groundH(cx, cz) - 0.03, cz, rr(0.7, 1.3), rand() * 6.28]); } }
    // canteiros densos (jardim dos relógios, rosto entre as flores...)
    for (const [zx, zz, zr, zn] of zones) { const k = Math.round(zn * zoneShare); for (let i = 0; i < k; i++) { const a = rand() * 6.283, r = Math.sqrt(rand()) * zr; const cx = zx + Math.cos(a) * r, cz = zz + Math.sin(a) * r; items.push([cx, groundH(cx, cz) - 0.03, cz, rr(0.7, 1.25), rand() * 6.28]); } }
    const its = items.map(it => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it[4]); return { p: { x: it[0], z: it[2] }, m: new THREE.Matrix4().compose(new THREE.Vector3(it[0], it[1], it[2]), q, new THREE.Vector3(it[3], it[3], it[3])) }; });
    for (const mesh of meshes) { const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld); geo.translate(0, -box.min.y, 0); geo.scale(base, base, base); const ns = new NearSet(scene, geo, plantMat(mesh.material), its, 48, false); ns.baseR = 48; }
  };
  scatterPlant(fw, 380, 0.42, (x, z) => forestDensity(x, z) < 0.1, 0.3);
  scatterPlant(fy, 600, 0.38, (x, z) => forestDensity(x, z) < 0.05, 0.4);
  scatterPlant(fb, 400, 0.4, (x, z) => forestDensity(x, z) < 0.15, 0.3);
  // tall grass cards: tint the bw texture green-gold
  { let src; tg.scene.traverse(o => { if (o.isMesh) src = o.material; }); if (src) { src.color = new THREE.Color(0.2, 0.26, 0.1); } scatterPlant(tg, 1500, 0.75, (x, z) => Math.hypot(x, z) > 80); }
  return out;
}
