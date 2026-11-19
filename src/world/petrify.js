// Petrificação: quem fica preso no luto endurece devagar, das pontas dos dedos para dentro.
// applyPetrify(human, { region, amount }) cria, por vértice, a distância (em metros, ao longo do braço)
// até a ponta dos dedos, medida na pose de repouso a partir dos pesos de pele dos ossos dos dedos, da mão,
// do antebraço e do braço. O shader do material (onBeforeCompile) transforma em pedra tudo o que está
// antes da "frente" (amount × alcance da região), com uma borda irregular e fraturada, veios que avançam
// pela pele, rachaduras finas, brilho de mica e um calor fraquinho dentro das rachaduras perto da borda.
import { THREE } from '../core.js';

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
// alcance de cada região, medido a partir da ponta do dedo médio (em metros de pose de repouso)
const REGIONS = ['fingers', 'hands', 'forearms', 'arms'];

// ---- geometria: distância até a ponta dos dedos ------------------------------------------------------
const geoCache = new WeakMap(); // geometria original -> { geo, reach }
function chainFor(mesh) {
  const sk = mesh.skeleton; // os ossos já são os do esqueleto mestre, com nomes canônicos
  const idx = {}; sk.bones.forEach((b, i) => { if (!(b.name in idx)) idx[b.name] = i; });
  const bindPos = (n) => { const i = idx[n]; if (i === undefined) return null; return new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[i]).invert()); };
  // D(osso) = distância até a ponta, seguindo a cadeia; seg(osso) = [cabeça, filho, D(filho)]
  const info = new Map(); const reach = {};
  for (const s of ['l', 'r']) {
    const tipD = {};
    for (const f of FINGERS) {
      const j = [1, 2, 3].map(k => `${f}_0${k}_${s}`), leaf = `${f}_04_leaf_${s}`; const pts = [...j, leaf].map(bindPos); if (pts.some(p => !p)) continue;
      let D = 0; info.set(idx[leaf], { head: pts[3], child: pts[3], Dc: 0, L: 0 });
      for (let k = 2; k >= 0; k--) { const L = pts[k].distanceTo(pts[k + 1]); info.set(idx[j[k]], { head: pts[k], child: pts[k + 1], Dc: D, L }); D += L; }
      tipD[f] = D;
    }
    const hand = bindPos('hand_' + s), mid = bindPos('middle_01_' + s), low = bindPos('lowerarm_' + s), up = bindPos('upperarm_' + s), cla = bindPos('clavicle_' + s);
    if (!hand || !mid || !low || !up) continue;
    const Dm = tipD.middle ?? 0.09; let L = hand.distanceTo(mid); info.set(idx['hand_' + s], { head: hand, child: mid, Dc: Dm, L }); const Dh = Dm + L;
    L = low.distanceTo(hand); info.set(idx['lowerarm_' + s], { head: low, child: hand, Dc: Dh, L }); const Dl = Dh + L;
    L = up.distanceTo(low); info.set(idx['upperarm_' + s], { head: up, child: low, Dc: Dl, L }); const Du = Dl + L;
    if (cla) { L = cla.distanceTo(up); info.set(idx['clavicle_' + s], { head: cla, child: up, Dc: Du, L }); }
    reach[s] = { fingers: Dm * 0.98, hands: Dh + 0.015, forearms: Dl + 0.05, arms: Du + 0.03, far: Du + 0.35 };
  }
  return { info, reach: reach.r || reach.l };
}
function prepare(mesh) {
  const src = mesh.geometry; if (geoCache.has(src)) return geoCache.get(src);
  const { info, reach } = chainFor(mesh); if (!reach || !info.size) { geoCache.set(src, null); return null; }
  const pos = src.attributes.position, si = src.attributes.skinIndex, sw = src.attributes.skinWeight; if (!si || !sw) { geoCache.set(src, null); return null; }
  const d = new Float32Array(pos.count); const v = new THREE.Vector3(), t = new THREE.Vector3(); let any = false;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.bindMatrix);
    let acc = 0, wc = 0;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k); if (w <= 0) continue; const b = info.get(si.getComponent(i, k)); if (!b) continue;
      let dd = b.Dc; if (b.L > 0) { t.copy(b.head).sub(b.child); dd += THREE.MathUtils.clamp(v.clone().sub(b.child).dot(t) / b.L, 0, b.L); }
      acc += w * dd; wc += w;
    }
    d[i] = wc > 0.02 ? acc + (1 - wc) * reach.far : 99; if (d[i] < reach.arms + 0.1) any = true;
  }
  if (!any) { geoCache.set(src, null); return null; }
  // geometria nova que reaproveita os atributos originais e só acrescenta aPet
  const g = new THREE.BufferGeometry(); for (const k in src.attributes) g.setAttribute(k, src.attributes[k]); g.setIndex(src.index);
  for (const k in src.morphAttributes) g.morphAttributes[k] = src.morphAttributes[k]; for (const gr of src.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
  g.boundingBox = src.boundingBox; g.boundingSphere = src.boundingSphere;
  g.setAttribute('aPet', new THREE.BufferAttribute(d, 1));
  const out = { geo: g, reach }; geoCache.set(src, out); return out;
}

// ---- shader ------------------------------------------------------------------------------------------
const VERT_HEAD = `
attribute float aPet; varying float vPetD; varying vec3 vPetP;`;
const VERT_BODY = `
vPetD = aPet;
#ifdef USE_SKINNING
vPetP = (bindMatrix * vec4(position, 1.0)).xyz;
#else
vPetP = position;
#endif`;
const FRAG_HEAD = `
uniform float uPetFront; uniform float uPetGlow;
varying float vPetD; varying vec3 vPetP;
float pHash(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float pNoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(pHash(i), pHash(i + vec3(1, 0, 0)), f.x), mix(pHash(i + vec3(0, 1, 0)), pHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(pHash(i + vec3(0, 0, 1)), pHash(i + vec3(1, 0, 1)), f.x), mix(pHash(i + vec3(0, 1, 1)), pHash(i + vec3(1, 1, 1)), f.x), f.y), f.z) * 2.0 - 1.0; }
// rachaduras: bordas de Voronoi (placas de pedra) com o domínio torcido, para ficarem quebradas e não redondas
vec3 pHash3(vec3 p) { return vec3(pHash(p), pHash(p + 19.19), pHash(p + 47.47)); }
// Voronoi barato: só os 8 vizinhos do canto mais próximo (laço curto, compila rápido até no celular)
float pVoro(vec3 p) {
  vec3 i = floor(p - 0.5), f = p - i; float d1 = 8.0, d2 = 8.0;
  for (int k = 0; k < 8; k++) {
    vec3 g = vec3(float(k - (k / 2) * 2), float((k / 2) - (k / 4) * 2), float(k / 4)); vec3 r = g + 0.15 + pHash3(i + g) * 0.7 - f; float d = dot(r, r);
    d2 = min(d2, max(d, d1)); d1 = min(d1, d); }
  return sqrt(d2) - sqrt(d1);
}
float pCrack(vec3 p, float w) { float v = pVoro(p + 0.3 * pNoise(p * 2.1)); return 1.0 - smoothstep(0.0, max(w, fwidth(v) * 1.2), v); }
vec3 pBump(vec3 pos, vec3 n, float h) {
  vec3 sx = dFdx(pos), sy = dFdy(pos); vec3 r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1);
  vec2 dh = vec2(dFdx(h), dFdy(h)); vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2); return normalize(abs(det) * n - grad); }`;
const FRAG_MAP = `#include <map_fragment>
  float petS = 1.0, petStone = 0.0, petCrack = 0.0, petEdge = 0.0, petFlake = 0.0, petH = 0.0;
  if (uPetFront > 0.0005 && vPetD < uPetFront + 0.07) {
    vec3 pp = vPetP * 60.0;                                       // ~1,7 cm por unidade de ruído
    float jag = pNoise(pp * 0.35) * 0.55 + pNoise(pp * 0.9 + 11.0) * 0.3 + pNoise(pp * 2.3) * 0.15;
    petS = vPetD - uPetFront + jag * 0.028;                       // < 0: pedra
    petStone = 1.0 - smoothstep(-0.0015, 0.0015, petS);
    // veios que correm à frente da pedra, por baixo da pele
    float bigC = pCrack(pp * 0.4, 0.05);
    float vein = bigC * (1.0 - smoothstep(0.0, 0.045, petS)) * step(0.0, petS);
    // ilhas de pedra soltas logo à frente da borda
    float isl = step(0.0, petS) * (1.0 - smoothstep(0.004, 0.026, petS)) * smoothstep(0.5, 0.56, pNoise(pp * 1.15 + 20.0));
    petStone = max(petStone, isl);
    // a pele perto da borda fica pálida e seca
    float pale = (1.0 - smoothstep(0.0, 0.035, petS)) * step(0.0, petS);
    vec3 skinC = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * vec3(0.95, 0.93, 0.92), pale * 0.55);
    skinC = mix(skinC, vec3(0.16, 0.15, 0.15), vein * 0.75);
    // pedra: cinza com manchas, rachaduras finas e grãos de mica
    float m1 = pNoise(pp * 0.5), m2 = pNoise(pp * 1.7 + 2.0);
    vec3 stoneC = vec3(0.13, 0.128, 0.124) * (0.85 + 0.22 * m1 + 0.12 * m2);
    stoneC = mix(stoneC, vec3(0.1, 0.104, 0.11), smoothstep(0.1, 0.7, pNoise(pp * 0.18 + 9.0)) * 0.4);
    stoneC *= mix(vec3(1.04, 1.0, 0.95), vec3(0.95, 0.98, 1.03), 0.5 + 0.5 * pNoise(pp * 0.09 + 4.0));
    petCrack = bigC * 0.9 + pCrack(pp * 1.25 + 2.0, 0.06) * 0.28;
    petEdge = 1.0 - smoothstep(-0.05, 0.0, petS);                // 1 longe da borda (pedra antiga)
    petCrack *= mix(1.0, 0.65, petEdge);
    stoneC *= 1.0 - clamp(petCrack, 0.0, 1.0) * 0.82;
    vec3 fc = floor(pp * 7.0); petFlake = step(0.968, pHash(fc + 17.0)) * petStone;
    stoneC = mix(stoneC, vec3(0.3, 0.3, 0.29), petFlake * 0.4);
    // borda fraturada: uma linha escura e um degrau de relevo onde pedra encontra pele
    float rim = (1.0 - smoothstep(0.0, 0.003, abs(petS)));
    diffuseColor.rgb = mix(skinC, stoneC, petStone);
    diffuseColor.rgb *= 1.0 - rim * 0.55;
    petH = petStone * (0.6 + 0.15 * m2) - clamp(petCrack, 0.0, 1.0) * 0.35 * petStone - vein * 0.2;
  }`;
const FRAG_ROUGH = `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, mix(0.82, 0.18, petFlake), petStone);`;
const FRAG_NORMAL = `#include <normal_fragment_maps>
  if (petStone > 0.0 || petH != 0.0) {
    normal = pBump(-vViewPosition, normal, petH * 0.004);
    if (petFlake > 0.0) { vec3 fc = floor(vPetP * 420.0); normal = normalize(normal + (vec3(pHash(fc), pHash(fc + 3.1), pHash(fc + 7.7)) - 0.5) * 0.55); }
  }`;
const FRAG_EMIT = `#include <emissivemap_fragment>
  {
    // calor fraco dentro das rachaduras, só perto da borda, como brasa que ainda não apagou
    float nearEdge = (1.0 - smoothstep(0.0, 0.035, -petS)) * petStone;
    totalEmissiveRadiance += vec3(1.0, 0.5, 0.2) * smoothstep(0.5, 1.0, petCrack) * nearEdge * uPetGlow * 0.45;
  }`;

function stoneMat(orig, u) {
  const m = orig.clone(); const prev = orig.onBeforeCompile; const prevKey = orig.customProgramCacheKey ? orig.customProgramCacheKey() : '';
  m.onBeforeCompile = (s, r) => {
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(m, s, r);
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>' + VERT_HEAD).replace('#include <begin_vertex>', '#include <begin_vertex>' + VERT_BODY);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>' + FRAG_HEAD)
      .replace('#include <map_fragment>', FRAG_MAP).replace('#include <roughnessmap_fragment>', FRAG_ROUGH)
      .replace('#include <normal_fragment_maps>', FRAG_NORMAL).replace('#include <emissivemap_fragment>', FRAG_EMIT);
  };
  m.customProgramCacheKey = () => 'petrify|' + prevKey;
  return m;
}

// ---- API ---------------------------------------------------------------------------------------------
// target: um Human (com .meshes) ou qualquer Object3D com SkinnedMesh dentro.
// region: 'fingers' | 'hands' | 'forearms' | 'arms' (até onde a pedra pode chegar); amount: 0..1 dessa extensão.
export function applyPetrify(target, opts = {}) {
  const meshes = target.meshes || (() => { const l = []; (target.root || target).traverse(o => { if (o.isSkinnedMesh) l.push(o); }); return l; })();
  const u = { uPetFront: { value: 0 }, uPetGlow: { value: opts.glow ?? 1 } };
  const handle = { region: opts.region || 'hands', amount: 0, target: 0, speed: 0, reach: null, meshes: [], u };
  const mats = new Map();
  for (const m of meshes) {
    if (m.userData.hair || /Eye|Eyebrow/.test(m.name) || m.userData.petrify) continue;
    const p = prepare(m); if (!p) continue; handle.reach = handle.reach || p.reach;
    const orig = m.material; let nm = mats.get(orig); if (!nm) { nm = stoneMat(orig, u); mats.set(orig, nm); }
    m.userData.petrify = { geo: m.geometry, mat: orig }; m.geometry = p.geo; m.material = nm; handle.meshes.push(m);
  }
  const front = () => (handle.reach ? handle.reach[handle.region] || handle.reach.hands : 0) * handle.amount;
  // anima sozinho: cada malha atualiza o uniforme quando vai ser desenhada (não precisa de laço de jogo)
  let last = performance.now();
  const tick = () => { const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now; if (handle.amount !== handle.target) { const st = handle.speed > 0 ? handle.speed * dt : 1; handle.amount += THREE.MathUtils.clamp(handle.target - handle.amount, -st, st); } u.uPetFront.value = front(); };
  for (const m of handle.meshes) m.onBeforeRender = tick;
  handle.set = (amount, seconds = 0) => { handle.target = THREE.MathUtils.clamp(amount, 0, 1); handle.speed = seconds > 0 ? Math.abs(handle.target - handle.amount) / seconds : 0; if (!seconds) { handle.amount = handle.target; u.uPetFront.value = front(); } last = performance.now(); return handle; };
  // muda a região mantendo a borda no mesmo lugar (útil para continuar crescendo além da região inicial)
  handle.setRegion = (region, amount) => { const f = front(); handle.region = region; const R = handle.reach ? handle.reach[region] : 1; handle.amount = handle.target = amount ?? (R ? THREE.MathUtils.clamp(f / R, 0, 1) : 0); u.uPetFront.value = front(); return handle; };
  handle.setGlow = (g) => { u.uPetGlow.value = g; return handle; };
  handle.remove = () => { for (const m of handle.meshes) { const o = m.userData.petrify; if (o) { m.geometry = o.geo; m.material = o.mat; delete m.userData.petrify; } m.onBeforeRender = () => { }; } handle.meshes = []; };
  // posição da borda em metros desde a ponta do dedo médio, e os marcos de cada região
  handle.levels = () => handle.reach ? Object.fromEntries(REGIONS.map(r => [r, +handle.reach[r].toFixed(3)])) : null;
  handle.set(opts.amount ?? 1);
  return handle;
}
export function setPetrify(handle, amount, seconds = 0) { return handle && handle.set(amount, seconds); }

// Elenco ----------------------------------------------------------------------------------------------
// Chame uma vez, depois que a jogadora e os moradores existem:
//   initPetrify({ player: pH, odessa, davi })   // objetos com .h (Human) ou o próprio Human
// e a história usa window.__petrify:
//   __petrify.setLia(on)          true/false: pontas dos dedos da Lia (começa desligado)
//   __petrify.setOdessa(a)        0..1: 0 = mãos curadas, 0.8 = mãos até depois do cotovelo (padrão), 1 = quase o braço todo
//   __petrify.setDavi(a)          0..1: 0 = curado, 0.25 = pontas dos dedos (padrão), 1 = as mãos inteiras
// Cada set aceita um segundo argumento opcional: segundos de transição (padrão 3; 0 = na hora).
const human = (o) => (o && o.h) || o || null;
export const petrifyHooks = {};
export function initPetrify({ player, odessa, davi } = {}) {
  const H = petrifyHooks; const o = human(odessa), d = human(davi), l = human(player);
  // Odessa: a escala vai até 1,25× o "depois do cotovelo", para 0.8 cair logo acima do cotovelo
  if (o && !H.odessa) { H.odessa = applyPetrify(o, { region: 'arms', amount: 0 }); const lv = H.odessa.levels(); H.odessaK = lv ? (lv.forearms * 1.25) / lv.arms : 0.85; }
  if (d && !H.davi) H.davi = applyPetrify(d, { region: 'hands', amount: 0, glow: 0.6 });
  if (l && !H.lia) H.lia = applyPetrify(l, { region: 'fingers', amount: 0, glow: 0.8 });
  const api = {
    setOdessa: (a, seconds = 3) => H.odessa && H.odessa.set(Math.max(0, Math.min(1, +a || 0)) * H.odessaK, seconds),
    setDavi: (a, seconds = 3) => H.davi && H.davi.set(Math.max(0, Math.min(1, +a || 0)), seconds),
    setLia: (on, seconds = 3) => H.lia && H.lia.set(on ? 0.55 : 0, seconds),
    handles: H,
  };
  api.setOdessa(0.8, 0); api.setDavi(0.25, 0); api.setLia(false, 0);
  if (typeof window !== 'undefined') window.__petrify = api;
  return api;
}
