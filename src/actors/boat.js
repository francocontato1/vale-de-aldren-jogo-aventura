// Barcos da Vila da Maré: casco de tábuas gerado por seções (como se desenha um casco de verdade),
// mastro, retranca, vela de pano que enfuna com o vento, leme e cana. O barco à vela navega:
// boia sobre as mesmas ondas do mar (ocean.js), aderna com o vento, não anda contra o vento
// (zona morta de ~40°), deixa esteira e respingos na proa.
import { THREE, U, clamp, lerp, smooth, rr, rand, angDiff, lerpAng } from '../core.js';
import { seaSurface, depthAt } from '../world/ocean.js';
import { WATER } from '../world/terrain.js';

// casco: L comprimento, B boca, D pontal. Retorna geometria com cores por fiada (tábuas) e UV ao longo do casco
export function hullGeometry({ L = 5, B = 1.8, D = 0.75, sheer = 0.25, colors = [0x2f5d85, 0xe8e2d4, 0xe8e2d4, 0x6b4a2e, 0x3a2a20] } = {}) {
  const NS = 26, NP = 12; const pos = [], uv = [], col = [], idx = [];
  const cols = colors.map(c => new THREE.Color(c));
  const half = (t) => { const tt = t * 2 - 1; const bow = t > 0.5 ? Math.pow(1 - Math.pow((t - 0.5) / 0.5, 2.2), 0.62) : Math.pow(1 - Math.pow((0.5 - t) / 0.5, 3.2), 0.4) * 0.92 + 0.08; return B / 2 * Math.max(0, bow) * (1 - 0.04 * tt); };
  const top = (t) => D * 0.5 + sheer * (Math.pow(t, 3) * 1.6 + Math.pow(1 - t, 3) * 0.6);
  const keel = (t) => -D * 0.5 * (1 - Math.pow(Math.abs(t - 0.45) / 0.55, 2.5) * 0.55);
  for (let i = 0; i <= NS; i++) {
    const t = i / NS; const x = (t - 0.5) * L; const hb = half(t), yt = top(t), yk = keel(t);
    for (let side = -1; side <= 1; side += 2) for (let j = 0; j <= NP; j++) {
      const s = j / NP; // 0 = quilha, 1 = borda
      const a = s * Math.PI / 2; const ex = 2.4; const zz = hb * Math.pow(Math.sin(a), 2 / ex) * side; const yy = yk + (yt - yk) * (1 - Math.pow(Math.cos(a), 2 / ex));
      pos.push(x, yy, zz); uv.push(t * L / 1.2, s * 3);
      const strake = Math.min(cols.length - 1, Math.floor((1 - s) * cols.length * 0.999)); const c = cols[strake]; const k = 0.92 + 0.08 * ((j % 2) ? 1 : 0);
      col.push(c.r * k, c.g * k, c.b * k);
    }
  }
  const row = (NP + 1) * 2;
  for (let i = 0; i < NS; i++) for (let side = 0; side < 2; side++) for (let j = 0; j < NP; j++) { const a = i * row + side * (NP + 1) + j, b = a + 1, c = a + row, d = c + 1; if (side === 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
  // espelho de popa (tábua reta atrás)
  const base = pos.length / 3; const t0 = 0, hb0 = half(t0), yt0 = top(t0), yk0 = keel(t0); pos.push(-L / 2, yk0, 0, -L / 2, yt0, -hb0, -L / 2, yt0, hb0); uv.push(0, 0, 0, 1, 1, 1); for (let k = 0; k < 3; k++) col.push(cols[1].r, cols[1].g, cols[1].b); idx.push(base, base + 1, base + 2);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.userData = { half, top, keel, L, B, D };
  return g;
}

// vela triangular (latina simples presa ao mastro e à retranca), subdividida para enfunar
function sailGeometry(h = 4.6, foot = 2.6) {
  const g = new THREE.BufferGeometry(); const NU = 10, NV = 14; const pos = [], uv = [], idx = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const v = j / NV, u = i / NU; const w = foot * (1 - v); pos.push(-u * w, v * h, 0); uv.push(u, v); }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.userData = { NU, NV, h, foot, base: Float32Array.from(pos) };
  return g;
}
function sailTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 46) { g.fillStyle = 'rgba(120,100,70,0.25)'; g.fillRect(0, y, 256, 2); } // costuras dos panos
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? '90,80,60' : '255,250,240'},${rr(0.02, 0.07)})`; g.fillRect(rand() * 256, rand() * 512, 1, rr(1, 4)); }
  g.fillStyle = 'rgba(120,90,60,.12)'; g.beginPath(); g.ellipse(170, 380, 60, 90, 0.3, 0, 7); g.fill(); // mancha de sal/tempo
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

let planksTex = null;
export function boatMaterials(planks) { planksTex = planks; }
const MAT = {};
function mats() {
  if (MAT.hull) return MAT;
  MAT.hull = new THREE.MeshStandardMaterial({ map: planksTex, vertexColors: true, roughness: 0.75, side: THREE.DoubleSide });
  MAT.wood = new THREE.MeshStandardMaterial({ map: planksTex, color: 0x8a6a4a, roughness: 0.8 });
  MAT.dark = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.85 });
  MAT.rope = new THREE.MeshStandardMaterial({ color: 0xb59a6a, roughness: 1 });
  MAT.sail = new THREE.MeshStandardMaterial({ map: sailTexture(), roughness: 0.95, side: THREE.DoubleSide });
  MAT.sail.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.06;'); }; // pano translúcido: um pouco de luz atravessa
  return MAT;
}

// monta um barco (hull + bancos + mastro/vela opcional) como Group; origem = linha d'água no meio
export function makeBoat({ L = 5, B = 1.8, D = 0.75, sail = true, colors } = {}) {
  const M = mats(); const root = new THREE.Group(); const hullG = hullGeometry({ L, B, D, colors }); const hull = new THREE.Mesh(hullG, M.hull); hull.castShadow = true; hull.receiveShadow = true; root.add(hull);
  const { half, top } = hullG.userData;
  // borda (verdugo) e bancos
  for (let k = 0; k < 3; k++) { const t = 0.25 + k * 0.22; const x = (t - 0.5) * L; const w = half(t) * 2 - 0.06; const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, w), M.wood); b.position.set(x, top(t) - 0.22, 0); b.castShadow = true; root.add(b); }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(L * 0.7, 0.03, B * 0.45), M.wood); floor.position.set(-L * 0.03, -D * 0.28, 0); root.add(floor);
  for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3((t - 0.5) * L, top(t) + 0.02, half(t) * s)); } const curve = new THREE.CatmullRomCurve3(pts); const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.035, 5), M.dark); rail.castShadow = true; root.add(rail); }
  // leme e cana
  const rud = new THREE.Group(); rud.position.set(-L / 2 - 0.02, 0, 0); root.add(rud); const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.04), M.dark); blade.position.set(-0.12, -0.25, 0); rud.add(blade); const tiller = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), M.wood); tiller.position.set(0.45, top(0) + 0.05, 0); rud.add(tiller);
  // tampa invisível na altura da borda: impede o mar (transparente) de aparecer dentro do casco
  { const sh = new THREE.Shape(); const N = 24; for (let i = 0; i <= N; i++) { const t = i / N; const x = (t - 0.5) * L; const w = Math.max(0.01, half(t) - 0.04); i ? sh.lineTo(x, w) : sh.moveTo(x, w); } for (let i = N; i >= 0; i--) { const t = i / N; sh.lineTo((t - 0.5) * L, -Math.max(0.01, half(t) - 0.04)); }
    const mg = new THREE.ShapeGeometry(sh); mg.rotateX(-Math.PI / 2); const mask = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide })); mask.position.y = Math.min(top(0.35), top(0.7)) - 0.1; mask.renderOrder = 1; root.add(mask); }
  const out = { root, hull, rudder: rud, tiller, L, B, D, top, half };
  if (sail) {
    const mx = L * 0.12; const mh = 5.6; const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, mh, 8), M.wood); mast.position.set(mx, mh / 2 - D * 0.3, 0); mast.castShadow = true; root.add(mast);
    const boomPivot = new THREE.Group(); boomPivot.position.set(mx, 0.85, 0); root.add(boomPivot); const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.75, 7), M.wood); boom.rotation.z = Math.PI / 2; boom.position.x = -1.35; boom.castShadow = true; boomPivot.add(boom);
    const sg = sailGeometry(4.5, 2.65); const sailM = new THREE.Mesh(sg, M.sail); sailM.position.set(-0.04, 0.05, 0); sailM.castShadow = true; boomPivot.add(sailM);
    // estais (cabos do mastro à proa e aos bordos) e escota
    const line = (a, b, r = 0.008) => { const d = b.clone().sub(a); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 4), M.rope); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); root.add(m); return m; };
    const topM = new THREE.Vector3(mx, mh - D * 0.3 - 0.1, 0); line(topM, new THREE.Vector3(L / 2 - 0.05, top(1) + 0.02, 0)); for (const s of [-1, 1]) line(topM, new THREE.Vector3(mx - 0.15, top(0.6) + 0.02, (half(0.6) - 0.04) * s));
    out.mast = mast; out.boom = boomPivot; out.sail = sailM; out.sailG = sg;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// o barco que a Lia pode velejar
// ---------------------------------------------------------------------------------------------
export class SailBoat {
  constructor(scene, x, z, yaw) {
    this.b = makeBoat({ L: 5.2, B: 1.85, D: 0.78, sail: true }); scene.add(this.b.root);
    this.x = x; this.z = z; this.yaw = yaw; this.speed = 0; this.rudder = 0; this.trim = 0.6; this.heel = 0; this.pitch = 0; this.roll = 0; this.heave = 0; this.boomA = 0; this.vy = 0; this.y = WATER;
    this.home = { x, z, yaw }; this.sailing = false; this.wakeT = 0; this.luff = 0;
    this.update(0.016, null, 0);
  }
  // ponto onde a Lia senta (junto à cana do leme)
  seat() { const r = this.b.root; return new THREE.Vector3(-this.b.L / 2 + 0.75, this.b.top(0.15) - 0.35, 0.35).applyMatrix4(r.matrixWorld); }
  // controles: steer -1..1 (leme), throttle -1..1 (caçar/folgar a vela)
  update(dt, input, t, wind = U.wind.value, windStr = U.windStrength.value) {
    const L = this.b.L;
    if (input) { this.rudder = lerp(this.rudder, -input.steer * 0.6, clamp(dt * 3, 0, 1)); this.trim = clamp(this.trim + input.throttle * dt * 0.45, 0.15, 1); }
    else { this.rudder = lerp(this.rudder, 0, clamp(dt * 1.5, 0, 1)); }
    // vento real no mar: a brisa do vale, mais firme sobre a água
    const wdir = Math.atan2(wind.x, wind.y); const ws = 3.2 + windStr * 3.5; // m/s
    const rel = angDiff(this.yaw, wdir); // 0 = vento de popa (U.wind aponta para onde o vento sopra); ±π = proa ao vento
    const off = Math.PI - Math.abs(rel); // 0 = proa ao vento
    // curva polar simples: nada dentro de ~38° do vento, máximo de través, bom de popa
    const polar = off < 0.66 ? 0 : off < 1.2 ? smooth(0.66, 1.2, off) * 0.85 : off < 2.2 ? 0.85 + 0.15 * Math.sin((off - 1.2) / 1.0 * Math.PI * 0.5) : 1 - (off - 2.2) * 0.12;
    this.luff = off < 0.66 ? 1 - off / 0.66 : 0; // vela panejando
    this.boost = !!(input && input.boost); this.polar = polar; this.ws = ws;
    const target = (this.sailing ? polar * ws * 0.95 * (0.35 + 0.65 * this.trim) * (this.boost ? 1.65 : 1) : 0);
    const dep = depthAt(this.x, this.z);
    this.speed = lerp(this.speed, target, clamp(dt * (target > this.speed ? 0.35 : 0.6), 0, 1));
    if (this.sailing) this.yaw += this.rudder * (0.15 + this.speed * 0.22) * dt * -1;
    // encalhe: freia no raso
    const nx = this.x + Math.sin(this.yaw) * this.speed * dt, nz = this.z + Math.cos(this.yaw) * this.speed * dt;
    const inside = Math.abs(nx) < 740 && Math.abs(nz) < 740; // além da borda do mapa não há terra desenhada
    if (depthAt(nx, nz) > 0.7 && inside) { this.x = nx; this.z = nz; } else { this.speed *= Math.exp(-dt * 4); this.grounded = true; if (!inside) this.edge = true; }
    // boia: altura e inclinação pelas ondas sob a proa/popa/bordos
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const sB = seaSurface(this.x + fx * L * 0.4, this.z + fz * L * 0.4, t), sS = seaSurface(this.x - fx * L * 0.4, this.z - fz * L * 0.4, t), sP = seaSurface(this.x + rx * 0.8, this.z + rz * 0.8, t), sQ = seaSurface(this.x - rx * 0.8, this.z - rz * 0.8, t);
    const h = (sB.y + sS.y + sP.y + sQ.y) / 4; this.y = lerp(this.y, h, clamp(dt * 4, 0, 1));
    this.pitch = lerp(this.pitch, Math.atan2(sB.y - sS.y, L * 0.8), clamp(dt * 3, 0, 1));
    // adernar: pressão do vento na vela, para o lado oposto ao vento
    const heelT = this.sailing ? clamp(polar * ws * this.trim * 0.035, 0, 0.32) * Math.sign(rel || 1) * (1 - this.luff) : 0;
    this.heel = lerp(this.heel, heelT, clamp(dt * 0.8, 0, 1));
    this.roll = lerp(this.roll, Math.atan2(sP.y - sQ.y, 1.6) + this.heel, clamp(dt * 3, 0, 1));
    const r = this.b.root; r.position.set(this.x, this.y + 0.05, this.z); r.rotation.set(0, 0, 0); r.rotateY(this.yaw - Math.PI / 2); r.rotateZ(this.pitch); r.rotateX(this.roll); r.updateMatrixWorld(true);
    // leme e cana acompanham o comando
    this.b.rudder.rotation.y = this.rudder;
    // retranca: vai para o lado de sotavento, aberta conforme o rumo e a escota
    if (this.b.boom) {
      const ideal = clamp((Math.PI - off) * 0.55, 0.12, 1.35) * (1.15 - this.trim * 0.5); const side = rel > 0 ? 1 : -1; const want = this.sailing ? ideal * side : 0.05;
      this.boomA = lerp(this.boomA, want + (this.luff > 0 ? Math.sin(t * 7) * 0.08 * this.luff : 0), clamp(dt * 1.6, 0, 1)); this.b.boom.rotation.y = this.boomA;
      // vela enfuna (barriga) proporcional ao vento, panejando quando aproa
      const g = this.b.sailG, P = g.attributes.position, base = g.userData.base, { NU, NV } = g.userData; const belly = (this.sailing ? (0.18 + 0.35 * polar * this.trim) : 0.08) * (1 - this.luff * 0.7) * -side;
      for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const k = j * (NU + 1) + i; const u = i / NU, v = j / NV; const flap = this.luff * 0.12 * Math.sin(t * 9 + u * 6 + v * 3) + 0.015 * Math.sin(t * 3.1 + u * 5 + v * 2); P.setZ(k, base[k * 3 + 2] + (belly * Math.sin(Math.PI * u) * (1 - v * 0.8) + flap * u) * (1 - v * 0.3)); }
      P.needsUpdate = true; g.computeVertexNormals();
    }
    this.surface = sB;
  }
}
