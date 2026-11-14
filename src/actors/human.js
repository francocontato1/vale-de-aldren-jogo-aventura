import { THREE, loadGLTF, clamp, lerp, rand, rr, U } from '../core.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const ANIM_FILES = {
  idle: 'M_Standing_Idle_001', idle2: 'M_Standing_Idle_Variations_002', idle3: 'M_Standing_Idle_Variations_006',
  walk: 'M_Walk_001', jog: 'M_Jog_001', run: 'M_Run_001', crouch: 'M_Crouch_Walk_003', back: 'M_Walk_Backwards_001',
  strafeL: 'M_Walk_Strafe_Left_002', strafeR: 'M_Walk_Strafe_Right_002', jump: 'M_Run_Jump_001', fall: 'M_Falling_Idle_002',
  talk1: 'M_Talking_Variations_001', talk2: 'M_Talking_Variations_002', talk3: 'M_Talking_Variations_005', expr1: 'M_Standing_Expressions_001', expr2: 'M_Standing_Expressions_013',
};
const BASES = { bento: 'a/av_bento.glb.wasm', iago: 'a/av_iago.glb.wasm', tomas: 'a/av_tomas.glb.wasm', mateus: 'a/av_mateus.glb.wasm' };
export const LIB = { bases: {}, clips: {}, hat: null };

function cleanClip(clip) {
  clip.tracks = clip.tracks.filter(t => !t.name.endsWith('.scale'));
  for (const t of clip.tracks) {
    if (t.name === 'Hips.position') { const v = t.values; const x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } }
  }
  return clip;
}
export async function loadHumanLibrary() {
  const ents = Object.entries(BASES);
  const loaded = await Promise.all(ents.map(([k, u]) => loadGLTF(u)));
  ents.forEach(([k], i) => { LIB.bases[k] = loaded[i]; });
  const anims = Object.entries(ANIM_FILES);
  const al = await Promise.all(anims.map(([k, f]) => loadGLTF('a/anim/' + f + '.glb.wasm')));
  anims.forEach(([k], i) => { const c = al[i].animations[0]; c.name = k; LIB.clips[k] = cleanClip(c); });
  LIB.bases.bento.scene.traverse(o => { if (o.isSkinnedMesh && o.name === 'Wolf3D_Headwear') LIB.hat = o; });
}

// ---------- texture recolouring ----------
const recolorCache = new Map();
function recolorTexture(tex, key, fn) {
  if (!tex || !tex.image) return tex;
  const ck = tex.uuid + key; if (recolorCache.has(ck)) return recolorCache.get(ck);
  const img = tex.image; const w = img.width, h = img.height; const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0); const id = ctx.getImageData(0, 0, w, h); const d = id.data;
  let sum = 0, cnt = 0; for (let i = 0; i < d.length; i += 64) { if (d[i + 3] < 10) continue; sum += (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255; cnt++; } fn.avg = cnt ? sum / cnt : 0.5;
  for (let i = 0; i < d.length; i += 4) { const o = fn(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255); d[i] = o[0] * 255; d[i + 1] = o[1] * 255; d[i + 2] = o[2] * 255; }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.flipY = tex.flipY; t.colorSpace = tex.colorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.anisotropy = 4; t.needsUpdate = true;
  recolorCache.set(ck, t); return t;
}
// dye: keep luminance detail, replace hue with target colour
const dye = (c, amt = 1, contrast = 0.55) => { const f = (r, g, b) => { const l = 0.3 * r + 0.59 * g + 0.11 * b; const avg = Math.max(f.avg || 0.5, 0.02); let k = l / avg; k = 1 + (k - 1) * contrast; k = clamp(k, 0, 2.2); return [lerp(r, clamp(c[0] * k, 0, 1), amt), lerp(g, clamp(c[1] * k, 0, 1), amt), lerp(b, clamp(c[2] * k, 0, 1), amt)]; }; return f; };
const dyeAbs = (c, amt = 1, gain = 1.9) => (r, g, b) => { const l = 0.3 * r + 0.59 * g + 0.11 * b; const k = Math.pow(l, 0.9) * gain; return [lerp(r, clamp(c[0] * k, 0, 1), amt), lerp(g, clamp(c[1] * k, 0, 1), amt), lerp(b, clamp(c[2] * k, 0, 1), amt)]; };
// key-based dye for atlases: leave skin tones alone
const dyeNonSkin = (rules) => (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const sat = mx > 0 ? (mx - mn) / mx : 0; const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const skin = r > g && g > b && sat > 0.18 && sat < 0.62 && r > 0.25 && (r - g) < 0.35; if (skin) return [r, g, b];
  for (const rule of rules) if (rule.test(r, g, b, sat, l)) return dyeAbs(rule.c, rule.amt || 1, rule.gain || 1.9)(r, g, b);
  return [r, g, b];
};

// ---------- outfits ----------
export const OUTFITS = {
  bento: { base: 'bento', mats: { Wolf3D_Outfit_Top: [0.24, 0.2, 0.17], Wolf3D_Outfit_Bottom: [0.2, 0.18, 0.16], Wolf3D_Outfit_Footwear: [0.14, 0.1, 0.07], Wolf3D_Headwear: [0.18, 0.16, 0.13] } },
  corvo: { base: 'bento', mats: { Wolf3D_Outfit_Top: [0.07, 0.07, 0.075], Wolf3D_Outfit_Bottom: [0.08, 0.075, 0.07], Wolf3D_Outfit_Footwear: [0.06, 0.05, 0.04], Wolf3D_Headwear: [0.05, 0.05, 0.05], Wolf3D_Beard: [0.05, 0.045, 0.04] } },
  iago: { base: 'iago', mats: { Wolf3D_Outfit_Top: [0.33, 0.29, 0.19], Wolf3D_Outfit_Bottom: [0.24, 0.19, 0.14], Wolf3D_Outfit_Footwear: [0.17, 0.12, 0.08] }, rifle: true },
  bandit1: { base: 'iago', mats: { Wolf3D_Outfit_Top: [0.3, 0.09, 0.07], Wolf3D_Outfit_Bottom: [0.12, 0.11, 0.1], Wolf3D_Outfit_Footwear: [0.08, 0.06, 0.05], Wolf3D_Hair: [0.06, 0.05, 0.045] }, hat: [0.12, 0.1, 0.08], rifle: true },
  tomas: { base: 'tomas', mats: { Wolf3D_Outfit_Top: [0.72, 0.66, 0.55], Wolf3D_Outfit_Bottom: [0.3, 0.24, 0.17], Wolf3D_Outfit_Footwear: [0.16, 0.11, 0.07] }, hat: [0.42, 0.34, 0.22] },
  player: { base: 'tomas', mats: { Wolf3D_Outfit_Top: [0.33, 0.37, 0.4], Wolf3D_Outfit_Bottom: [0.22, 0.18, 0.14], Wolf3D_Outfit_Footwear: [0.13, 0.09, 0.06], Wolf3D_Hair: [0.16, 0.11, 0.07] }, hat: [0.28, 0.22, 0.15] },
  bandit2: { base: 'tomas', mats: { Wolf3D_Outfit_Top: [0.16, 0.15, 0.13], Wolf3D_Outfit_Bottom: [0.14, 0.12, 0.1], Wolf3D_Outfit_Footwear: [0.08, 0.06, 0.05], Wolf3D_Hair: [0.05, 0.04, 0.04] }, hat: [0.08, 0.07, 0.06], rifle: true },
  mateus: { base: 'mateus', atlas: [{ test: (r, g, b, s, l) => b > r * 1.15 && s > 0.2, c: [0.18, 0.13, 0.09] }, { test: (r, g, b, s, l) => s < 0.2 && l > 0.45, c: [0.62, 0.55, 0.44], gain: 1.05 }, { test: (r, g, b, s, l) => s < 0.25 && l <= 0.45, c: [0.22, 0.18, 0.14], gain: 1.6 }] },
  bandit3: { base: 'mateus', atlas: [{ test: (r, g, b, s, l) => b > r * 1.15 && s > 0.2, c: [0.1, 0.08, 0.06] }, { test: (r, g, b, s, l) => s < 0.2 && l > 0.45, c: [0.32, 0.2, 0.14], gain: 1.1 }, { test: (r, g, b, s, l) => s < 0.25 && l <= 0.45, c: [0.12, 0.11, 0.1] }], hat: [0.1, 0.09, 0.08], rifle: true },
};

// ---------- rifle ----------
let RIFLE_GEO = null;
export function makeRifle(planksTex) {
  const g = new THREE.Group();
  const wood = new THREE.MeshPhysicalMaterial({ color: 0x6a3418, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35, map: planksTex || null });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 1, roughness: 0.32 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x1b1d20, metalness: 0.9, roughness: 0.38 });
  // stock profile (side view, x = forward(-), y up). origin = trigger grip
  const sh = new THREE.Shape(); sh.moveTo(0.02, 0.02); sh.lineTo(-0.06, 0.0); sh.lineTo(-0.36, -0.045); sh.lineTo(-0.37, -0.14); sh.lineTo(-0.33, -0.15); sh.lineTo(-0.07, -0.06); sh.lineTo(-0.02, -0.04); sh.lineTo(0.03, -0.02); sh.lineTo(0.02, 0.02);
  const stock = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.036, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 }), wood);
  stock.geometry.translate(0, 0, -0.018); stock.rotation.y = -Math.PI / 2; g.add(stock);
  const recv = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.06, 0.17), brass); recv.position.set(0, 0.012, 0.1); g.add(recv);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.011, 0.58, 10), steel); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, 0.47); g.add(barrel);
  const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.5, 10), steel); mag.rotation.x = Math.PI / 2; mag.position.set(0, 0.008, 0.43); g.add(mag);
  const fore = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.24), wood); fore.position.set(0, 0.012, 0.3); g.add(fore);
  const lever = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 14, Math.PI * 1.3), steel); lever.rotation.set(0, Math.PI / 2, 0.6); lever.position.set(0, -0.035, 0.07); g.add(lever);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.01), steel); sight.position.set(0, 0.046, 0.74); g.add(sight);
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.025, 0.012), steel); hammer.position.set(0, 0.048, 0.025); hammer.rotation.x = -0.4; g.add(hammer);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.77);
  return g;
}

// ---------- sword ----------
export function makeSword() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xd0d4da, metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2620, metalness: 0.9, roughness: 0.45 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xa8843c, metalness: 1, roughness: 0.3 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.75 });
  // blade: diamond cross-section, tapered to a point
  const sh = new THREE.Shape(); sh.moveTo(-0.027, 0); sh.lineTo(0.027, 0); sh.lineTo(0.022, 0.7); sh.lineTo(0, 0.8); sh.lineTo(-0.022, 0.7); sh.lineTo(-0.027, 0);
  const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: true, bevelThickness: 0.0035, bevelSize: 0.0035, bevelSegments: 1 }); bg.translate(0, 0.11, -0.001);
  const blade = new THREE.Mesh(bg, steel); g.add(blade);
  const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.5, 0.0075), dark); fuller.position.set(0, 0.42, 0); g.add(fuller);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.022, 0.03), brass); guard.position.y = 0.1; g.add(guard);
  for (const s2 of [-1, 1]) { const q = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), brass); q.position.set(0.095 * s2, 0.1, 0); g.add(q); }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.17, 10), leather); grip.position.y = 0.0; g.add(grip);
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.0175, 0.0025, 4, 12), dark); r.rotation.x = Math.PI / 2; r.position.y = -0.07 + i * 0.035; g.add(r); }
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), brass); pommel.position.y = -0.1; pommel.scale.set(1, 0.8, 1); g.add(pommel);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.034, 0.84, 8), leather); sc.scale.set(1.2, 1, 0.45); sc.position.y = 0.52; sc.visible = false; g.add(sc); g.userData.scabbard = sc;
  g.userData.tip = new THREE.Vector3(0, 0.92, 0);
  return g;
}
const SW = {
  guard: { h: [-0.2, 1.05, 0.3], d: [0.2, 1, 0.55] },
  block: { h: [-0.02, 1.38, 0.36], d: [1, 0.22, 0.15] },
  aWind: { h: [-0.42, 1.66, -0.02], d: [-0.35, 1, -0.55] }, aMid: { h: [-0.05, 1.42, 0.62], d: [0.3, 0.2, 1] }, aEnd: { h: [0.3, 0.95, 0.42], d: [0.85, -0.45, 0.35] },
  bWind: { h: [0.18, 1.55, 0.12], d: [0.75, 0.85, -0.3] }, bMid: { h: [-0.05, 1.3, 0.62], d: [-0.2, 0.15, 1] }, bEnd: { h: [-0.48, 1.0, 0.36], d: [-0.9, -0.25, 0.45] },
};
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
function swordPose(t, variant, blockW) {
  // returns {h (char space), d (char space), twist}
  const P = variant ? { w: SW.bWind, m: SW.bMid, e: SW.bEnd, tw: 1 } : { w: SW.aWind, m: SW.aMid, e: SW.aEnd, tw: -1 };
  let h, d, twist = 0;
  const g = SW.guard;
  if (t < 0) { h = V(g.h); d = V(g.d).normalize(); }
  else if (t < 0.32) { const k = smoothK(t / 0.32); h = V(g.h).lerp(V(P.w.h), k); d = V(g.d).normalize().lerp(V(P.w.d).normalize(), k).normalize(); twist = 0.55 * P.tw * k; }
  else if (t < 0.56) { const k = (t - 0.32) / 0.24; const kk = k * k * (3 - 2 * k); const a = V(P.w.h), b = V(P.m.h), c = V(P.e.h); h = a.clone().multiplyScalar((1 - kk) * (1 - kk)).add(b.multiplyScalar(2 * kk * (1 - kk))).add(c.multiplyScalar(kk * kk)); const d0 = V(P.w.d).normalize(), d1 = V(P.m.d).normalize(), d2 = V(P.e.d).normalize(); d = kk < 0.5 ? d0.lerp(d1, kk * 2) : d1.lerp(d2, kk * 2 - 1); d.normalize(); twist = lerp(0.55 * P.tw, -0.5 * P.tw, kk); }
  else { const k = smoothK((t - 0.56) / 0.44); h = V(P.e.h).lerp(V(g.h), k); d = V(P.e.d).normalize().lerp(V(g.d).normalize(), k).normalize(); twist = lerp(-0.5 * P.tw, 0, k); }
  if (blockW > 0) { h.lerp(V(SW.block.h), blockW); d.lerp(V(SW.block.d).normalize(), blockW).normalize(); }
  return { h, d, twist };
}
const smoothK = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

// ---------- Human ----------
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _m = new THREE.Matrix4();
function worldPos(b, out) { return out.setFromMatrixPosition(b.matrixWorld); }
// rotate bone (world space delta) so that the point `from` moves toward `to` around bone origin
function rotateBoneToward(bone, from, to, w = 1) {
  const o = worldPos(bone, _v3); const a = _v1.copy(from).sub(o).normalize(), b = _v2.copy(to).sub(o).normalize();
  if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) return;
  _q1.setFromUnitVectors(a, b); if (w < 1) _q1.slerp(_q2.identity(), 1 - w);
  bone.getWorldQuaternion(_q2); _q2.premultiply(_q1);
  bone.parent.getWorldQuaternion(_q3); bone.quaternion.copy(_q3.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}
function setBoneWorldQuat(bone, q) { bone.parent.getWorldQuaternion(_q3); bone.quaternion.copy(_q3.invert().multiply(q)); bone.updateMatrixWorld(true); }

export class Human {
  constructor(outfitKey, opts = {}) {
    const of = OUTFITS[outfitKey]; this.outfit = of; this.key = outfitKey;
    const src = LIB.bases[of.base];
    this.root = new THREE.Group(); this.model = SkeletonUtils.clone(src.scene); this.root.add(this.model);
    this.meshes = []; this.morphs = [];
    this.model.traverse(o => {
      if (o.isSkinnedMesh || o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const m = o.material.clone(); o.material = m; m.envMapIntensity = 0.9;
        if (of.mats && of.mats[o.name] && m.map) { const flat = of.base === 'tomas' && o.name === 'Wolf3D_Outfit_Top'; m.map = recolorTexture(m.map, outfitKey + o.name, dye(of.mats[o.name], 1, flat ? 0.0 : 0.55)); m.color.setRGB(1, 1, 1); }
        if (of.atlas && m.map && (o.name === 'Wolf3D_Avatar' || m.name === 'Wolf3D_Avatar')) m.map = recolorTexture(m.map, outfitKey + 'atlas', dyeNonSkin(of.atlas));
        if (/Skin|Body|Head|Avatar/.test(m.name)) { m.roughness = Math.max(m.roughness, 0.55); }
        if (/Eye/.test(m.name)) { m.roughness = 0.05; m.envMapIntensity = 1.6; }
        if (o.morphTargetDictionary) this.morphs.push(o);
        this.meshes.push(o);
      }
    });
    this.bones = {}; this.model.traverse(o => { if (o.isBone) this.bones[o.name] = o; });
    if (of.hat && LIB.hat && !this.model.getObjectByName('Wolf3D_Headwear')) this.addHat(of.hat);
    // animation
    this.mixer = new THREE.AnimationMixer(this.model); this.actions = {};
    for (const k in LIB.clips) { const a = this.mixer.clipAction(LIB.clips[k]); this.actions[k] = a; }
    this.current = null; this.play('idle', 0);
    this.mixer.update(rand() * 3);
    // look-at helpers (rest-pose forward axes)
    this.model.updateMatrixWorld(true);
    const fwd = new THREE.Vector3(0, 0, 1);
    this.localFwd = {};
    for (const n of ['Head', 'Neck', 'Spine2', 'LeftEye', 'RightEye']) { const b = this.bones[n]; if (!b) continue; b.getWorldQuaternion(_q1); this.localFwd[n] = fwd.clone().applyQuaternion(_q1.invert()); }
    this.lookTarget = null; this.lookW = 0; this.eyeOff = new THREE.Vector2(); this.saccadeT = 0;
    this.blinkT = rr(1, 4); this.blink = 0; this.talking = 0; this.talkPhase = 0;
    this.aimW = 0; this.aimDir = new THREE.Vector3(0, 0, 1); this.speed = 0; this.dead = false; this.deadT = 0;
    this.rifle = null; this.rifleOnBack = true; this.sword = null; this.weapon = 'rifle'; this.swingT = -1; this.swingVar = 0; this.blockW = 0; this.swordW = 0;
    if (of.rifle || opts.rifle) this.giveRifle(opts.rifleMesh);
  }
  addHat(color) {
    const src = LIB.hat; const hat = src.clone(); hat.material = src.material.clone(); hat.material.map = recolorTexture(src.material.map, 'hat' + color.join(), dye(color)); hat.frustumCulled = false; hat.castShadow = true;
    const bones = src.skeleton.bones.map(b => this.bones[b.name] || this.bones.Head);
    hat.bind(new THREE.Skeleton(bones, src.skeleton.boneInverses.map(m => m.clone())), new THREE.Matrix4());
    // the hat in the source avatar is a child of the armature root; mirror that
    const parent = this.model.getObjectByName('Wolf3D_Body')?.parent || this.model; parent.add(hat); this.meshes.push(hat);
  }
  giveSword(mesh) { this.sword = mesh || makeSword(); this.holsterSword(); }
  holsterSword() { const hip = this.bones.Hips; if (!hip || !this.sword) return; this.root.updateMatrixWorld(true); const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion());
    const yc = new THREE.Vector3(0.05, -0.55, -0.83).normalize(), zc = new THREE.Vector3(1, 0, 0), xc = new THREE.Vector3().crossVectors(yc, zc).normalize(); zc.crossVectors(xc, yc).normalize();
    const qw = rootQ.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xc, yc, zc)));
    const wpos = hip.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.2, -0.02, 0.02).applyQuaternion(rootQ));
    const ws = hip.getWorldScale(new THREE.Vector3()).x || 1; hip.add(this.sword); this.sword.quaternion.copy(hip.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(qw)); this.sword.position.copy(hip.worldToLocal(wpos)); this.sword.scale.setScalar(1 / ws); this.swordInHand = false; if (this.sword.userData.scabbard) this.sword.userData.scabbard.visible = true; }
  applySword(dt) {
    if (!this.sword) return;
    if (this.swingT >= 0) { this.swingT += dt / 0.62; if (this.swingT >= 1) this.swingT = -1; }
    const B = this.bones; const p = swordPose(this.swingT, this.swingVar, this.blockW);
    const w = this.swordW; if (w < 0.01) return;
    if (!this.swordInHand) { this.root.add(this.sword); this.sword.scale.setScalar(1); this.swordInHand = true; if (this.sword.userData.scabbard) this.sword.userData.scabbard.visible = false; }
    // torso twist
    for (const [bone, k] of [[B.Spine1, 0.4], [B.Spine2, 0.6]]) { if (!bone) continue; bone.getWorldQuaternion(_q1); _q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.twist * k * w); _q1.premultiply(_q2); setBoneWorldQuat(bone, _q1); }
    this.root.updateMatrixWorld(true);
    const hW = p.h.clone().applyMatrix4(this.root.matrixWorld); const rq = this.root.getWorldQuaternion(new THREE.Quaternion()); const dW = p.d.clone().applyQuaternion(rq).normalize();
    const sh = worldPos(B.RightShoulder || B.RightArm, new THREE.Vector3()); const right = new THREE.Vector3(-1, 0, 0).applyQuaternion(rq);
    const pole = sh.clone().addScaledVector(right, 0.6).add(new THREE.Vector3(0, -0.7, 0));
    this.ik(B.RightArm, B.RightForeArm, B.RightHand, hW, pole, w);
    const hand = worldPos(B.RightHand, new THREE.Vector3());
    // sword frame: +y along blade, +x = edge (perpendicular, roughly horizontal)
    const ex = new THREE.Vector3().crossVectors(dW, new THREE.Vector3(0, 1, 0)); if (ex.lengthSq() < 1e-4) ex.set(1, 0, 0); ex.normalize(); const ez = new THREE.Vector3().crossVectors(ex, dW).normalize();
    const sq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, dW, ez));
    const inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert(); this.sword.position.copy(hand.clone().addScaledVector(dW, 0.02)).applyMatrix4(inv); this.sword.quaternion.copy(rq.clone().invert().multiply(sq));
    const qH = sq.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -Math.PI / 2))).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.2, 0, -1.57)));
    B.RightHand.getWorldQuaternion(_q1); setBoneWorldQuat(B.RightHand, _q1.slerp(qH, 0.6 * w));
  }
  startSwing() { if (this.swingT >= 0 && this.swingT < 0.75) return false; this.swingVar = this.swingT >= 0 ? 1 - this.swingVar : (this.swingVar ? 0 : 1); this.swingT = 0; return true; }
  get swordTipWorld() { return this.sword ? this.sword.localToWorld(this.sword.userData.tip.clone()) : null; }
  giveRifle(mesh) { this.rifle = mesh || makeRifle(); this.attachRifle(true); }
  attachRifle(back) {
    if (!this.rifle) return; this.rifleOnBack = back;
    if (back) {
      const sp = this.bones.Spine2; this.root.updateMatrixWorld(true);
      // desired orientation in character space: barrel up over the left shoulder, sights facing away from the back
      const zc = new THREE.Vector3(0.55, 0.83, 0).normalize(), yc = new THREE.Vector3(0, 0, -1), xc = new THREE.Vector3().crossVectors(yc, zc).normalize();
      const qc = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xc, yc, zc));
      const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion()); const qw = rootQ.clone().multiply(qc);
      const spQ = sp.getWorldQuaternion(new THREE.Quaternion()); const ws = sp.getWorldScale(new THREE.Vector3()).x || 1;
      const wpos = sp.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.1, -0.1, -0.14).applyQuaternion(rootQ));
      sp.add(this.rifle); this.rifle.quaternion.copy(spQ.clone().invert().multiply(qw)); this.rifle.position.copy(sp.worldToLocal(wpos)); this.rifle.scale.setScalar(1 / ws);
    }
    else { this.root.add(this.rifle); this.rifle.scale.setScalar(1); }
  }
  play(name, fade = 0.25, speed = 1) {
    const a = this.actions[name]; if (!a) return;
    a.timeScale = speed;
    if (this.current === a) return;
    a.reset().setEffectiveWeight(1).play(); if (this.current && fade > 0) a.crossFadeFrom(this.current, fade, true); else if (this.current) this.current.stop();
    this.current = a; this.currentName = name;
  }
  setMorph(name, v) { for (const m of this.morphs) { const i = m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; } }
  hasMorph(name) { return this.morphs.some(m => m.morphTargetDictionary[name] !== undefined); }
  locomote(speed, opts = {}) {
    // speed in m/s, chooses clip and playback rate to minimise foot sliding
    this.speed = speed; if (this.dead) return;
    if (opts.air) { this.play('fall', 0.2); return; }
    if (opts.talk) { if (!/talk/.test(this.currentName)) this.play(opts.talk, 0.35); return; }
    if (opts.strafe && speed > 0.3) { const s = opts.strafe; this.play(s, 0.25, clamp(speed / 1.35, 0.7, 1.5)); return; }
    if (speed < 0.15) { if (!/idle|expr/.test(this.currentName)) this.play(opts.idle || 'idle', 0.35); return; }
    if (opts.crouch) { this.play('crouch', 0.25, clamp(speed / 1.2, 0.6, 1.6)); return; }
    if (speed < 2.3) this.play('walk', 0.3, clamp(speed / 1.45, 0.55, 1.5));
    else if (speed < 4.6) this.play('jog', 0.3, clamp(speed / 3.3, 0.7, 1.4));
    else this.play('run', 0.3, clamp(speed / 5.6, 0.8, 1.3));
  }
  // world-space aim at a direction: twist spine & hold the rifle with two-bone IK
  applyAim(dir, w) {
    if (w <= 0.001 || !this.rifle) return;
    const B = this.bones; const sp = B.Spine2, sp1 = B.Spine1;
    // twist torso toward aim (yaw + pitch), split over spine bones
    for (const [bone, k] of [[sp1, 0.35], [sp, 0.5]]) { if (!bone) continue; bone.updateMatrixWorld(true); bone.getWorldQuaternion(_q1); const f = this.localFwd.Spine2.clone().applyQuaternion(_q1); const tgt = dir.clone(); _q2.setFromUnitVectors(f.normalize(), tgt.normalize()); _q2.slerp(_q3.identity(), 1 - k * w); _q1.premultiply(_q2); setBoneWorldQuat(bone, _q1); }
    // rifle placement: stock at right shoulder, barrel along dir
    const sh = worldPos(B.RightShoulder || B.RightArm, new THREE.Vector3());
    const up = new THREE.Vector3(0, 1, 0); const right = new THREE.Vector3().crossVectors(dir, up).normalize(); const rup = new THREE.Vector3().crossVectors(right, dir).normalize();
    const grip = sh.clone().addScaledVector(right, -0.08).addScaledVector(rup, 0.05).addScaledVector(dir, 0.4);
    const m = new THREE.Matrix4().makeBasis(right.clone().negate(), rup, dir); const rq = new THREE.Quaternion().setFromRotationMatrix(m);
    if (this.rifle.parent !== this.root) this.attachRifle(false);
    // rifle lives in root space
    this.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    this.rifle.position.copy(grip).applyMatrix4(inv); this.root.getWorldQuaternion(_q1); this.rifle.quaternion.copy(_q1.invert().multiply(rq));
    this.rifle.updateMatrixWorld(true);
    const rh = new THREE.Vector3(0, -0.035, 0.0).applyMatrix4(this.rifle.matrixWorld);
    const lh = new THREE.Vector3(0, -0.02, 0.33).applyMatrix4(this.rifle.matrixWorld);
    const poleR = sh.clone().addScaledVector(right, 0.5).addScaledVector(rup, -0.6);
    const poleL = worldPos(B.LeftShoulder || B.LeftArm, new THREE.Vector3()).addScaledVector(right, -0.4).addScaledVector(rup, -0.8);
    this.ik(B.RightArm, B.RightForeArm, B.RightHand, rh, poleR, w);
    this.ik(B.LeftArm, B.LeftForeArm, B.LeftHand, lh, poleL, w);
    // hands orientation follows rifle
    const qR = rq.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.2, 0, -1.57))); const qL = rq.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.4, 0.0, 1.57)));
    B.RightHand.getWorldQuaternion(_q1); setBoneWorldQuat(B.RightHand, _q1.slerp(qR, w)); B.LeftHand.getWorldQuaternion(_q1); setBoneWorldQuat(B.LeftHand, _q1.slerp(qL, w));
  }
  ik(a, b, c, target, pole, w) {
    if (!a || !b || !c) return;
    const pa = worldPos(a, new THREE.Vector3()), pb = worldPos(b, new THREE.Vector3()), pc = worldPos(c, new THREE.Vector3());
    const l1 = pa.distanceTo(pb), l2 = pb.distanceTo(pc);
    const t = new THREE.Vector3().lerpVectors(pc, target, w);
    const toT = t.clone().sub(pa); let d = clamp(toT.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3); const dirT = toT.normalize();
    const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1); const sinA = Math.sqrt(1 - cosA * cosA);
    const pn = new THREE.Vector3().crossVectors(dirT, pole.clone().sub(pa)).normalize(); const bend = new THREE.Vector3().crossVectors(pn, dirT).normalize();
    const elbow = pa.clone().addScaledVector(dirT, l1 * cosA).addScaledVector(bend, l1 * sinA);
    rotateBoneToward(a, pb, elbow, 1);
    const pb2 = worldPos(b, new THREE.Vector3()), pc2 = worldPos(c, new THREE.Vector3());
    rotateBoneToward(b, pc2, pa.clone().addScaledVector(dirT, d), 1);
  }
  lookAtPoint(p, w = 1) { this.lookTarget = p; this.lookWTarget = w; }
  applyLook(dt) {
    const tw = this.lookTarget ? (this.lookWTarget ?? 1) : 0; this.lookW = lerp(this.lookW, tw, clamp(dt * 3, 0, 1));
    if (this.lookW < 0.01 || !this.lookTarget) return;
    const H = this.bones.Head, Nk = this.bones.Neck; if (!H) return;
    const hp = worldPos(H, new THREE.Vector3()); const dir = this.lookTarget.clone().sub(hp).normalize();
    // limit relative to body facing
    const bodyFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.root.quaternion);
    const yaw = Math.atan2(dir.x, dir.z) - Math.atan2(bodyFwd.x, bodyFwd.z); let y = Math.atan2(Math.sin(yaw), Math.cos(yaw)); y = clamp(y, -1.25, 1.25);
    const pitch = clamp(Math.asin(clamp(dir.y, -1, 1)), -0.5, 0.45);
    const by = Math.atan2(bodyFwd.x, bodyFwd.z) + y; const ld = new THREE.Vector3(Math.sin(by) * Math.cos(pitch), Math.sin(pitch), Math.cos(by) * Math.cos(pitch));
    for (const [bone, k] of [[Nk, 0.4], [H, 0.75]]) { if (!bone) continue; bone.getWorldQuaternion(_q1); const f = this.localFwd[bone.name].clone().applyQuaternion(_q1).normalize(); _q2.setFromUnitVectors(f, ld); _q2.slerp(_q3.identity(), 1 - k * this.lookW); _q1.premultiply(_q2); setBoneWorldQuat(bone, _q1); }
    // eyes: track target exactly with small saccades
    this.saccadeT -= dt; if (this.saccadeT < 0) { this.saccadeT = rr(0.4, 2.2); this.eyeOff.set(rr(-0.04, 0.04), rr(-0.025, 0.025)); }
    for (const n of ['LeftEye', 'RightEye']) { const e = this.bones[n]; if (!e) continue; const ep = worldPos(e, new THREE.Vector3()); const ed = this.lookTarget.clone().sub(ep).normalize(); ed.x += this.eyeOff.x; ed.y += this.eyeOff.y; ed.normalize(); e.getWorldQuaternion(_q1); const f = this.localFwd[n].clone().applyQuaternion(_q1).normalize(); const ang = f.angleTo(ed); if (ang > 0.6) continue; _q2.setFromUnitVectors(f, ed); _q2.slerp(_q3.identity(), 1 - this.lookW); _q1.premultiply(_q2); setBoneWorldQuat(e, _q1); }
  }
  face(dt) {
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = 1; this.blinkT = rr(2.2, 5.5); if (rand() < 0.15) this.blinkT = 0.25; }
    const b = this.blink > 0 ? Math.sin(Math.min(this.blink, 1) * Math.PI) : 0; this.blink = Math.max(0, this.blink - dt * 7);
    this.setMorph('eyeBlinkLeft', b); this.setMorph('eyeBlinkRight', b); this.setMorph('eyesClosed', b);
    if (this.talking > 0) { this.talkPhase += dt * 11; const o = clamp(0.5 + 0.5 * Math.sin(this.talkPhase) * Math.sin(this.talkPhase * 0.37 + 1.3) + 0.15 * Math.sin(this.talkPhase * 2.3), 0, 1) * 0.55;
      this.setMorph('mouthOpen', o); this.setMorph('jawOpen', o * 0.6); this.setMorph('viseme_aa', o * 0.8); this.setMorph('viseme_O', clamp(0.4 - o, 0, 1) * 0.6); }
    else { this.setMorph('mouthOpen', 0); this.setMorph('jawOpen', 0); this.setMorph('viseme_aa', 0); this.setMorph('viseme_O', 0); }
  }
  update(dt) {
    if (this.dead) { this.updateDeath(dt); return; }
    this.mixer.update(dt); this.root.updateMatrixWorld(true);
    this.applyLook(dt);
    if (this.aimW > 0.001) this.applyAim(this.aimDir, this.aimW);
    else if (this.rifle && !this.rifleOnBack) this.attachRifle(true);
    if (this.sword) { this.swordW = lerp(this.swordW, this.weapon === 'sword' ? 1 : 0, clamp(dt * 8, 0, 1)); if (this.swordW > 0.02) this.applySword(dt); else if (this.swordInHand) this.holsterSword(); }
    this.face(dt);
  }
  die(dir) { this.dead = true; this.deadT = 0; this.deathDir = dir ? dir.clone() : new THREE.Vector3(0, 0, -1); this.mixer.stopAllAction(); this.startQ = this.model.quaternion.clone(); if (this.rifle && !this.rifleOnBack) this.attachRifle(true); if (this.swordInHand) this.holsterSword(); }
  updateDeath(dt) {
    this.deadT += dt; const k = clamp(this.deadT / 0.9, 0, 1); const e = k * k * (3 - 2 * k);
    // fall backwards away from the hit, knees buckle
    const axis = new THREE.Vector3(1, 0, 0); this.model.quaternion.copy(this.startQ).multiply(new THREE.Quaternion().setFromAxisAngle(axis, -1.45 * e));
    this.model.position.y = -0.05 * e + Math.sin(e * Math.PI) * 0.15 - e * 0.02; this.model.position.z = -0.6 * e;
    const B = this.bones; for (const n of ['LeftUpLeg', 'RightUpLeg']) if (B[n]) B[n].rotation.x = lerp(B[n].rotation.x, -0.3, e * 0.1);
    for (const n of ['LeftLeg', 'RightLeg']) if (B[n]) B[n].rotation.x = lerp(B[n].rotation.x, 0.8, e * 0.1);
    for (const n of ['LeftArm', 'RightArm']) if (B[n]) B[n].rotation.z = lerp(B[n].rotation.z, n[0] === 'L' ? 0.6 : -0.6, e * 0.08);
    if (this.deadT < 1.2) this.face(dt); else { this.setMorph('eyesClosed', 0.7); this.setMorph('eyeBlinkLeft', 0.7); this.setMorph('eyeBlinkRight', 0.7); }
  }
  get headPos() { return worldPos(this.bones.Head, new THREE.Vector3()); }
}
