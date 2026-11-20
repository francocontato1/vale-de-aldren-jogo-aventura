// Frutas no alto das árvores (derrubadas com o arco), o arco do filho do Seu Cosme e as flechas.
// As frutas nascem no meio da copa: cada uma fica num ponto de folha de verdade da árvore (amostrado da
// geometria das folhas), um pouco para fora, então nunca flutuam nem somem dentro do tronco.
import { THREE, scene, rand, rr, clamp, lerp } from './core.js';
import { groundH } from './world/terrain.js';

const KINDS = { maca: { color: 0xc8352a, r: 0.085 }, laranja: { color: 0xe8901f, r: 0.09 }, figo: { color: 0x5b2f5e, r: 0.07 } };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

export class Orchard {
  constructor(trees, opts) {
    this.fruits = []; this.arrows = [];
    const near = (it) => Math.hypot(it.x, it.z) < (opts.radius || 260) && (!opts.ok || opts.ok(it.x, it.z));
    const broad = trees.items.filter(it => ['oakA', 'oakB', 'ashA'].includes(it.v.sp.key) && near(it));
    // poucas árvores, espalhadas: cada espécie de fruta na sua
    const chosen = []; for (const it of broad.sort(() => rand() - 0.5)) { if (chosen.length >= (opts.count || 16)) break; if (chosen.some(o => Math.hypot(o.x - it.x, o.z - it.z) < 22)) continue; chosen.push(it); }
    const kinds = Object.keys(KINDS);
    const geo = new THREE.SphereGeometry(1, 12, 9); const mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0 });
    const total = chosen.length * 7; this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, total)); this.mesh.castShadow = true; this.mesh.frustumCulled = false; this.mesh.count = 0;
    // um cabinho escuro em cima de cada fruta
    const sg = new THREE.CylinderGeometry(0.06, 0.04, 1, 5); sg.translate(0, 0.5, 0); this.stems = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ color: 0x3b2a18, roughness: 1 }), Math.max(1, total)); this.stems.frustumCulled = false; this.stems.count = 0;
    let k = 0;
    chosen.forEach((it, ti) => {
      const kind = kinds[ti % kinds.length]; const K = KINDS[kind];
      const lp = it.v.lg.attributes.position; it.v.lg.computeBoundingBox(); const bb = it.v.lg.boundingBox; const cy = (bb.min.y + bb.max.y) / 2, h = bb.max.y - bb.min.y;
      const cand = [];
      for (let i = 0; i < lp.count; i += 7) { const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i); const rxz = Math.hypot(x, z); if (y < bb.min.y + h * 0.12 || y > cy + h * 0.15) continue; cand.push([x, y, z, rxz]); }
      cand.sort((a, b) => b[3] - a[3]); const outer = cand.slice(0, Math.max(10, cand.length >> 2));
      for (let n = 0; n < 7 && outer.length; n++) {
        const c = outer.splice((rand() * outer.length) | 0, 1)[0]; const dir = new THREE.Vector3(c[0], 0, c[2]).normalize();
        const local = new THREE.Vector3(c[0] + dir.x * 0.12, c[1] - 0.06, c[2] + dir.z * 0.12).multiplyScalar(it.s).applyAxisAngle(new THREE.Vector3(0, 1, 0), it.rot);
        const pos = new THREE.Vector3(it.x + local.x, it.y + local.y, it.z + local.z);
        this.fruits.push({ kind, i: k, home: pos.clone(), pos: pos.clone(), r: K.r * rr(0.9, 1.12), state: 'tree', vy: 0, t: 0 });
        this.mesh.setColorAt(k, _c.setHex(K.color).offsetHSL(rr(-0.02, 0.02), 0, rr(-0.05, 0.04))); k++;
      }
    });
    this.mesh.count = this.stems.count = k; scene.add(this.mesh, this.stems); this.sync();
  }
  sync() { for (const f of this.fruits) this.write(f); this.mesh.instanceMatrix.needsUpdate = true; this.stems.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; }
  write(f) {
    const vis = f.state !== 'gone'; const r = vis ? f.r : 0.0001;
    _m.compose(f.pos, _q.identity(), _s.set(r, r * 0.95, r)); this.mesh.setMatrixAt(f.i, _m);
    _p.copy(f.pos); _p.y += r * 0.85; _m.compose(_p, _q.identity(), _s.set(vis ? 0.012 : 0.0001, vis ? 0.05 : 0.0001, vis ? 0.012 : 0.0001)); this.stems.setMatrixAt(f.i, _m);
  }
  // fruta mais perto do raio (origem, direção), até maxD metros
  pick(o, d, maxD = 45) {
    let best = null, bt = maxD;
    for (const f of this.fruits) { if (f.state !== 'tree') continue; _p.copy(f.pos).sub(o); const t = _p.dot(d); if (t < 0 || t > bt) continue; const miss = Math.sqrt(Math.max(0, _p.lengthSq() - t * t)); if (miss < f.r + 0.22) { bt = t; best = f; } }
    return best ? { f: best, t: bt } : null;
  }
  knock(f) { f.state = 'fall'; f.vy = 0; f.vx = rr(-0.6, 0.6); f.vz = rr(-0.6, 0.6); }
  // frutas no chão, para pegar
  groundNear(x, z, r = 1.6) { let best = null, bd = r; for (const f of this.fruits) { if (f.state !== 'ground') continue; const d = Math.hypot(f.pos.x - x, f.pos.z - z); if (d < bd) { bd = d; best = f; } } return best; }
  take(f) { f.state = 'gone'; f.t = 0; this.write(f); this.mesh.instanceMatrix.needsUpdate = true; this.stems.instanceMatrix.needsUpdate = true; }
  // fruta caída que ninguém pegou volta pra árvore no dia seguinte (e as colhidas também)
  regrow() { for (const f of this.fruits) if (f.state === 'gone' || f.state === 'ground') { f.state = 'tree'; f.pos.copy(f.home); } this.sync(); }
  // frutas no alto perto do jogador (a Lia comenta)
  treeNear(x, z, r = 4) { for (const f of this.fruits) if (f.state === 'tree' && Math.hypot(f.pos.x - x, f.pos.z - z) < r) return f; return null; }
  shoot(from, to, hit, onHit) {
    const g = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 5), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.8 })); shaft.rotation.x = Math.PI / 2; g.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 6), new THREE.MeshStandardMaterial({ color: 0x555a60, metalness: 0.6, roughness: 0.4 })); tip.rotation.x = Math.PI / 2; tip.position.z = 0.37; g.add(tip);
    for (const a of [0, 2.1, 4.2]) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.1), new THREE.MeshStandardMaterial({ color: 0xe9e2d0, side: THREE.DoubleSide, roughness: 1 })); fl.position.z = -0.3; fl.rotation.set(Math.PI / 2, a, 0); g.add(fl); }
    g.position.copy(from); g.lookAt(to); scene.add(g);
    this.arrows.push({ g, from: from.clone(), to: to.clone(), t: 0, d: Math.max(0.05, from.distanceTo(to) / 42), hit, onHit, stuck: 0 });
  }
  update(dt) {
    let dirty = false;
    for (const f of this.fruits) {
      if (f.state === 'fall') { f.vy -= 9.8 * dt; f.pos.y += f.vy * dt; f.pos.x += f.vx * dt; f.pos.z += f.vz * dt; const gy = groundH(f.pos.x, f.pos.z) + f.r * 0.9; if (f.pos.y <= gy) { f.pos.y = gy; if (Math.abs(f.vy) > 2) { f.vy = -f.vy * 0.25; f.vx *= 0.4; f.vz *= 0.4; } else { f.state = 'ground'; } } dirty = true; this.write(f); }
    }
    if (dirty) { this.mesh.instanceMatrix.needsUpdate = true; this.stems.instanceMatrix.needsUpdate = true; }
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      if (a.t < a.d) { a.t += dt; const k = Math.min(1, a.t / a.d); a.g.position.lerpVectors(a.from, a.to, k); a.g.position.y += Math.sin(k * Math.PI) * a.from.distanceTo(a.to) * 0.015; if (k >= 1) { a.onHit && a.onHit(a.hit); if (a.hit) a.stuck = 99; } }
      else { a.stuck += dt; if (a.stuck > 8) { scene.remove(a.g); a.g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.arrows.splice(i, 1); } }
    }
  }
}

// o arco: na mão esquerda quando a Lia mira, nas costas quando não
export function makeBow() {
  const g = new THREE.Group(); const wood = new THREE.MeshStandardMaterial({ color: 0x3e2a18, roughness: 0.62 });
  const limb = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.014, 6, 24, Math.PI * 0.8), wood); limb.rotation.z = Math.PI / 2 - Math.PI * 0.4; g.add(limb);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.9 })); grip.position.x = 0.55; g.add(grip);
  const a0 = -Math.PI * 0.4 + Math.PI / 2, a1 = a0 + Math.PI * 0.8; const p0 = new THREE.Vector3(Math.cos(a0) * 0.55, Math.sin(a0) * 0.55, 0), p1 = new THREE.Vector3(Math.cos(a1) * 0.55, Math.sin(a1) * 0.55, 0);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, p0.distanceTo(p1), 4), new THREE.MeshBasicMaterial({ color: 0xe8e0cc })); str.position.copy(p0).add(p1).multiplyScalar(0.5); str.lookAt(p1); str.rotateX(Math.PI / 2); g.add(str);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // a origem passa a ser a empunhadura (antes era o centro da curva, e o arco ficava longe da mão, rodeando a Lia)
  const outer = new THREE.Group(); g.position.x = -0.55; outer.add(g); outer.scale.setScalar(0.78); // arco curto de caça, ~85 cm
  return outer;
}
