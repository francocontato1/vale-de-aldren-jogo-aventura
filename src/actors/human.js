// Personagens: peças CC0 da Quaternius (corpos, cabeças, cabelos, roupas de fantasia) montadas num
// único esqueleto em tempo de execução, animadas com a Universal Animation Library.
import { THREE, loadGLTF, clamp, lerp, rand, rr, U } from '../core.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const FILES = ['f_peasant', 'f_ranger', 'm_peasant', 'm_ranger', 'm_wizard', 'm_noble', 'head_f', 'head_m', 'hair_f', 'hair_m'];
export const LIB = { gltf: {}, clips: { f: {}, m: {} }, tex: {} };

// nome curto -> clipe da UAL
export const CLIP = {
  idle: 'Idle_Loop', talk: 'Idle_Talking_Loop', lantern: 'Idle_Lantern_Loop', torch: 'Idle_Torch_Loop', fold: 'Idle_FoldArms_Loop', rail: 'Idle_Rail_Loop',
  walk: 'Walk_Loop', walkSlow: 'Walk_Formal_Loop', jog: 'Jog_Fwd_Loop', run: 'Sprint_Loop', carry: 'Walk_Carry_Loop',
  jumpStart: 'Jump_Start', jump: 'Jump_Loop', land: 'Jump_Land',
  sitDown: 'Sitting_Enter', sit: 'Sitting_Idle_Loop', sitTalk: 'Sitting_Talking_Loop', standUp: 'Sitting_Exit',
  interact: 'Interact', pickup: 'PickUp_Table', kneel: 'Fixing_Kneeling', crouch: 'Crouch_Idle_Loop',
  spellIn: 'Spell_Simple_Enter', spell: 'Spell_Simple_Idle_Loop', spellOut: 'Spell_Simple_Exit',
  yes: 'Yes', no: 'Idle_No_Loop', harvest: 'Farm_Harvest', plant: 'Farm_PlantSeed', water: 'Farm_Watering', chop: 'TreeChopping_Loop',
  lie: 'LayToIdle', drive: 'Driving_Loop', eat: 'Consume', throw: 'OverhandThrow', swim: 'Swim_Idle_Loop', swimFwd: 'Swim_Fwd_Loop', dance: 'Dance_Loop',
};
const ONESHOT = new Set(['jumpStart', 'land', 'sitDown', 'standUp', 'interact', 'pickup', 'spellIn', 'spellOut', 'yes', 'throw', 'eat', 'lie', 'plant', 'harvest']);

// ---------- elenco ----------
// skin: multiplicador da textura de pele (as texturas da Quaternius são de pele escura; clareamos por personagem)
export const CHARS = {
  lia: { sex: 'f', outfit: 'f_ranger', hide: /Hood|Pauldron/, hair: 'Hair_Long', hairCol: [0.33, 0.2, 0.12], skin: [1.55, 1.32, 1.18], tint: { T_Ranger: [0.95, 0.98, 1.0] }, height: 1.0 },
  odessa: { sex: 'f', outfit: 'f_ranger', hide: /Hood|Pauldron|Bracer/, hair: 'Hair_Long', hairCol: [0.93, 0.93, 0.95], skin: [1.75, 1.58, 1.48], tint: { T_Ranger: [0.62, 0.62, 1.05] }, height: 0.98, elf: true },
  anselmo: { sex: 'm', outfit: 'm_peasant', hair: ['Hair_Balding', 'Hair_Beard'], hairCol: [0.8, 0.78, 0.74], skin: [1.5, 1.25, 1.05], tint: { T_Peasant: [0.85, 0.78, 0.68] }, height: 0.96, old: true },
  celeste: { sex: 'f', outfit: 'f_peasant', hair: 'Hair_Buns', hairCol: [0.18, 0.1, 0.06], skin: [1.3, 1.08, 0.92], tint: { T_Peasant: [1.05, 0.88, 0.78] }, height: 0.97 },
  tome: { sex: 'm', outfit: 'm_peasant', hair: 'Hair_SimpleParted', hairCol: [0.45, 0.28, 0.13], skin: [1.6, 1.35, 1.15], tint: { T_Peasant: [0.75, 0.9, 1.0] }, height: 0.62, child: true },
  irene: { sex: 'f', outfit: 'f_peasant', hair: 'Hair_Bob', hairCol: [0.55, 0.3, 0.14], skin: [1.6, 1.38, 1.22], tint: { T_Peasant: [0.8, 1.0, 0.82] }, height: 0.99 },
  bastiao: { sex: 'm', outfit: 'm_ranger', hide: /Hood|Pauldron/, hair: ['Hair_Buzzed', 'Hair_MuttonChops'], hairCol: [0.2, 0.15, 0.11], skin: [1.15, 0.98, 0.85], tint: { T_Ranger: [1.0, 0.85, 0.7] }, height: 1.03 },
  eco_m: { sex: 'm', outfit: 'm_wizard', hair: ['Hair_Ponytail', 'Hair_Moustache'], hairCol: [0.3, 0.25, 0.2], skin: [1.3, 1.1, 0.95], height: 1.0 },
  eco_f: { sex: 'f', outfit: 'f_peasant', hair: 'Hair_Long', hairCol: [0.25, 0.18, 0.12], skin: [1.4, 1.2, 1.05], height: 0.98 },
  eco_old: { sex: 'm', outfit: 'm_wizard', hair: ['Hair_Balding', 'Hair_Beard'], hairCol: [0.85, 0.85, 0.85], skin: [1.3, 1.1, 0.95], height: 0.97, old: true, wizTex: 'Wizard_2' },
  // pessoas das lembranças (o material de luz substitui as cores; o que conta é a silhueta)
  v_teo_m: { sex: 'm', outfit: 'm_peasant', hair: 'Hair_SimpleParted', hairCol: [0.4, 0.3, 0.2], skin: [1.3, 1.1, 0.95], height: 0.6, child: true },
  v_ilsa_m: { sex: 'f', outfit: 'f_peasant', hair: 'Hair_Long', hairCol: [0.3, 0.2, 0.12], skin: [1.3, 1.1, 0.95], height: 0.58, child: true },
  v_teo: { sex: 'm', outfit: 'm_peasant', hair: ['Hair_SimpleParted'], hairCol: [0.4, 0.3, 0.2], skin: [1.3, 1.1, 0.95], height: 1.0 },
  v_ilsa: { sex: 'f', outfit: 'f_peasant', hair: 'Hair_Long', hairCol: [0.3, 0.2, 0.12], skin: [1.3, 1.1, 0.95], height: 0.97 },
  v_teo_v: { sex: 'm', outfit: 'm_peasant', hair: ['Hair_Balding', 'Hair_Beard'], hairCol: [0.85, 0.85, 0.85], skin: [1.3, 1.1, 0.95], height: 0.95, old: true },
  v_auren: { sex: 'm', outfit: 'm_wizard', hair: ['Hair_Balding', 'Hair_Beard'], hairCol: [0.85, 0.85, 0.85], skin: [1.3, 1.1, 0.95], height: 0.97, old: true, wizTex: 'Wizard_2' },
  v_sela: { sex: 'f', outfit: 'f_ranger', hide: /Pauldron/, hair: 'Hair_Buns', hairCol: [0.3, 0.2, 0.12], skin: [1.3, 1.1, 0.95], height: 0.96 },
  v_sela_m: { sex: 'f', outfit: 'f_peasant', hair: 'Hair_Buns', hairCol: [0.3, 0.2, 0.12], skin: [1.3, 1.1, 0.95], height: 0.55, child: true },
  v_dessa: { sex: 'f', outfit: 'f_ranger', hide: /Hood|Pauldron|Bracer/, hair: 'Hair_Long', hairCol: [0.93, 0.93, 0.95], skin: [1.6, 1.45, 1.35], height: 0.6, child: true, elf: true },
  // Vila da Maré
  marta: { sex: 'f', outfit: 'f_peasant', hair: 'Hair_Buns', hairCol: [0.62, 0.58, 0.54], skin: [1.45, 1.2, 1.02], tint: { T_Peasant: [0.72, 0.85, 1.05] }, height: 0.95, old: true },
  joca: { sex: 'm', outfit: 'm_peasant', hair: ['Hair_Buzzed'], hairCol: [0.22, 0.14, 0.08], skin: [1.2, 0.98, 0.82], tint: { T_Peasant: [1.05, 0.95, 0.8] }, height: 1.02 },
  tiao: { sex: 'm', outfit: 'm_ranger', hide: /Hood|Pauldron/, hair: ['Hair_SimpleParted', 'Hair_Moustache'], hairCol: [0.16, 0.12, 0.09], skin: [1.0, 0.82, 0.68], tint: { T_Ranger: [0.7, 0.85, 1.0] }, height: 1.0 },
  nina: { sex: 'f', outfit: 'f_peasant', hair: 'Hair_Bob', hairCol: [0.62, 0.4, 0.2], skin: [1.15, 0.94, 0.78], tint: { T_Peasant: [1.05, 0.8, 0.75] }, height: 0.6, child: true },
  davi: { sex: 'm', outfit: 'm_noble', hair: ['Hair_Balding', 'Hair_Beard'], hairCol: [0.9, 0.9, 0.9], skin: [1.35, 1.1, 0.92], height: 0.98, old: true, nobleTex: 'Noble_3' },
  aldeao1: { sex: 'm', outfit: 'm_noble', hair: ['Hair_SlickBack'], hairCol: [0.12, 0.1, 0.08], skin: [1.25, 1.05, 0.9], height: 1.0, nobleTex: 'Noble_3' },
};

// carregada uma vez só (os gigantes de pedra pedem a biblioteca antes dos moradores)
let libReady = null;
export function loadHumanLibrary() { return libReady || (libReady = loadLibrary()); }
async function loadLibrary() {
  const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
  const { gltfLoader } = await import('../core.js'); gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  const [anims, extra, ...parts] = await Promise.all([loadGLTF('a/chars/anims.glb.wasm'), loadGLTF('a/chars/anims_extra.glb.wasm').catch(() => null), ...FILES.map(f => loadGLTF(`a/chars/${f}.glb.wasm`))]);
  if (extra) anims.animations.push(...extra.animations);
  FILES.forEach((f, i) => { const g = parts[i]; if (g.scenes.length > 1) { const all = new THREE.Group(); for (const sc of g.scenes) all.add(...sc.children.slice()); g.scene = all; } LIB.gltf[f] = g; });
  const tl = new THREE.TextureLoader();
  for (const n of ['Wizard_2', 'Noble_3']) LIB.tex[n] = tl.loadAsync(`a/chars/tex/${n}.webp`).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; return t; }).catch(() => null);
  for (const n in LIB.tex) LIB.tex[n] = await LIB.tex[n];
  // pélvis: a altura de repouso muda entre corpos femininos e masculinos
  const pelvisZ = (g) => { let z = null; g.scene.traverse(o => { if (o.isBone && o.name === 'pelvis' && z === null) z = o.position.z; }); return z; };
  const pf = pelvisZ(parts[FILES.indexOf('f_peasant')]), pm = pelvisZ(parts[FILES.indexOf('m_peasant')]);
  // altura de repouso da pélvis no manequim das animações
  const clipZ = pelvisZ(anims);
  for (const clip of anims.animations) {
    const short = Object.keys(CLIP).find(k => CLIP[k] === clip.name); if (!short) continue;
    for (const [sex, pz] of [['f', pf], ['m', pm]]) {
      const c = clip.clone(); c.name = short;
      for (const t of c.tracks) if (t.name === 'pelvis.position' && clipZ) { const k = pz / clipZ; for (let i = 0; i < t.values.length; i++) t.values[i] *= k; }
      LIB.clips[sex][short] = c;
    }
  }
}

// ---------- materiais ----------
const matCache = new Map();
function tuneMaterial(m, def, key, meshName = '') {
  const isHair = /Hair|Eyebrow|Beard|Moustache|Mutton/.test(meshName);
  const ck = key + m.name + (isHair ? 'h' : ''); if (matCache.has(ck)) return matCache.get(ck);
  const n = m.clone(); const tex = n.map && n.map.name || ''; n.envMapIntensity = 0.75; if (!n.metalnessMap) n.metalness = 0; n.vertexColors = false;
  const skinLike = /Regular_/.test(n.name) || /Regular_/.test(tex);
  if (skinLike && !isHair) { n.color.setRGB(...def.skin); n.roughness = 1; n.userData.skin = true; }
  else if (isHair || /Hair/.test(n.name)) {
    // tingimento que preserva os fios: cor-alvo × luminância relativa da textura
    n.color.setRGB(1, 1, 1); n.roughness = 0.85; n.side = THREE.DoubleSide; n.alphaTest = 0.5; const hc = new THREE.Color().setRGB(...def.hairCol, THREE.SRGBColorSpace);
    n.onBeforeCompile = (sh) => { sh.uniforms.uHair = { value: hc }; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHair;').replace('#include <map_fragment>', '#include <map_fragment>\n float hl = dot(diffuseColor.rgb, vec3(0.3,0.59,0.11)); diffuseColor.rgb = uHair * clamp(0.3 + hl * 2.6, 0.18, 1.45);'); };
    n.customProgramCacheKey = () => 'hair' + hc.getHexString(); }
  else if (/Eye/.test(n.name)) { n.roughness = 0.15; n.envMapIntensity = 1.2; }
  else {
    if (def.tint) for (const k in def.tint) if (tex.includes(k) || n.name.includes(k.replace('T_', ''))) n.color.setRGB(...def.tint[k]);
    if (def.wizTex && LIB.tex[def.wizTex] && /Wizard/.test(n.name)) { n.map = LIB.tex[def.wizTex]; }
    if (def.nobleTex && LIB.tex[def.nobleTex] && /Noble/.test(n.name)) { n.map = LIB.tex[def.nobleTex]; }
  }
  matCache.set(ck, n); return n;
}

// ---------- utilidades ----------
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
function setBoneWorldQuat(bone, q) { bone.parent.getWorldQuaternion(_q3); bone.quaternion.copy(_q3.invert().multiply(q)); bone.updateMatrixWorld(true); }

export class Human {
  // deitada na cama: deslocamento da raiz em relação ao centro do colchão (no referencial da cama, cabeceira em -z)
  static LIE = { dx: 0, dz: 0, dy: 0, yaw: 0 };
  constructor(key, opts = {}) {
    const def = CHARS[key] || CHARS.aldeao1; this.def = def; this.key = key; this.sex = def.sex;
    this.root = new THREE.Group(); this.meshes = [];
    // esqueleto mestre: o da roupa
    const outfit = SkeletonUtils.clone(LIB.gltf[def.outfit].scene); this.model = outfit; this.root.add(outfit);
    this.bones = {}; outfit.traverse(o => { if (o.isBone && !this.bones[o.name]) this.bones[o.name] = o; });
    // o GLTFLoader renomeia ossos repetidos (pelvis_1, spine_01_2...): volta ao nome original
    const canon = (n) => (this.bones[n] && /_\d$|_\d\d$/.test(n) === false) ? n : (this.bones[n.replace(/_\d+$/, '')] ? n.replace(/_\d+$/, '') : n);
    this.root.updateMatrixWorld(true);
    // religa uma malha ao esqueleto mestre preservando a pose de repouso da peça:
    // novaInversa = mestre⁻¹ · ossoOriginal · inversaOriginal
    const _m = new THREE.Matrix4();
    const retarget = (o, target) => {
      const src = o.skeleton.bones; const inv = []; const bones = [];
      for (let i = 0; i < src.length; i++) {
        const mb = this.bones[canon(src[i].name)]; if (!mb) return false; bones.push(mb);
        inv.push(_m.copy(mb.matrixWorld).invert().multiply(src[i].matrixWorld).multiply(o.skeleton.boneInverses[i]).clone());
      }
      target.bind(new THREE.Skeleton(bones, inv), o.bindMatrix.clone()); return true;
    };
    const rebind = (src, filter, hairFlag) => {
      src.updateMatrixWorld(true);
      const list = []; src.traverse(o => { if (o.isSkinnedMesh && (!filter || filter(o))) list.push(o); });
      for (const o of list) { const m = new THREE.SkinnedMesh(o.geometry, o.material); m.name = o.name; m.userData.hair = !!hairFlag; outfit.add(m); if (retarget(o, m)) this.meshes.push(m); else outfit.remove(m); }
    };
    // a roupa tem um esqueleto por peça: religa tudo ao primeiro
    const own = []; outfit.traverse(o => { if (o.isSkinnedMesh) own.push(o); });
    for (const o of own) { if (def.hide && def.hide.test(o.name)) { o.visible = false; continue; } retarget(o, o); this.meshes.push(o); }
    rebind(LIB.gltf[def.sex === 'f' ? 'head_f' : 'head_m'].scene);
    const hairs = [].concat(def.hair || []);
    if (hairs.length) rebind(LIB.gltf[def.sex === 'f' ? 'hair_f' : 'hair_m'].scene, (o) => hairs.some(h => o.name.startsWith(h) || (o.parent && o.parent.name.startsWith(h))), true);
    for (const m of this.meshes) { m.material = tuneMaterial(m.material, def, key, m.userData.hair ? 'Hair' + m.name : m.name); m.castShadow = !m.userData.hair && !/Eyebrow|Eye/.test(m.name); m.receiveShadow = true; m.frustumCulled = false; }
    // remove os esqueletos órfãos das outras peças (ficam escondidos, mas pesam no updateMatrixWorld)
    if (def.elf) this.addElfEars();
    this.root.scale.setScalar(def.height || 1);
    if (def.child) { const hb = this.bones.Head; if (hb) hb.scale.setScalar(1.28); }
    this.mixer = new THREE.AnimationMixer(outfit); this.actions = {};
    const clips = LIB.clips[def.sex];
    for (const k in clips) { const a = this.mixer.clipAction(clips[k]); if (ONESHOT.has(k)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } this.actions[k] = a; }
    // opts.still: sem sorteios (estátuas montadas durante a geração do mundo não podem consumir o rand compartilhado)
    this.current = null; this.currentName = ''; this.play(opts.idle || 'idle', 0); this.mixer.update(opts.still ? 0 : rand() * 3);
    this.lookTarget = null; this.lookW = 0; this.lookWTarget = 1; this.talking = 0; this.talkAmp = 0; this.talkPhase = 0; this.nod = 0; this.speed = 0;
    this.blinkT = opts.still ? 2 : rr(1, 4); this.blink = 0; this.breath = opts.still ? 0 : rand() * 6;
    this.root.updateMatrixWorld(true);
    this.restQ = {}; for (const n of ['Head', 'neck_01', 'spine_03']) if (this.bones[n]) this.restQ[n] = this.bones[n].quaternion.clone();
    // eixo "para frente" da cabeça em espaço local do osso (medido na pose atual: o corpo olha para +Z)
    this.fwdLocal = {}; for (const n of ['Head', 'neck_01']) { const b = this.bones[n]; if (!b) continue; b.getWorldQuaternion(_q1); this.fwdLocal[n] = new THREE.Vector3(0, 0, 1).applyQuaternion(_q1.invert()); }
    this.findEyes();
  }
  addElfEars() {
    const head = this.bones.Head; if (!head) return; const skin = this.meshes.find(m => m.material.userData.skin);
    const g = new THREE.ConeGeometry(0.022, 0.085, 8); g.translate(0, 0.0425, 0); g.scale(0.55, 1, 1);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(g, skin ? skin.material : undefined); head.add(e); e.position.set(s * 0.078, 0.08, 0.0); e.rotation.set(0.2, 0, -s * 1.15); e.castShadow = true; this.elfEar = e; }
  }
  findEyes() { this.eyes = this.meshes.filter(m => /Eye/.test(m.material.name)); }
  play(name, fade = 0.3, speed = 1) {
    const a = this.actions[name]; if (!a) return false; a.timeScale = speed;
    if (this.current === a) return true;
    a.reset().setEffectiveWeight(1).play(); if (this.current && fade > 0) a.crossFadeFrom(this.current, fade, true); else if (this.current) this.current.stop();
    this.current = a; this.currentName = name; return true;
  }
  // pose parada num quadro de um clipe (ex.: deitada = primeiro quadro de LayToIdle)
  pose(name, t = 0, fade = 0.4) { this.play(name, fade); const a = this.current; if (a && this.currentName === name) { a.time = t; a.timeScale = 0; } }
  unpose(speed = 1) { const a = this.current; if (!a) return; a.paused = false; a.enabled = true; a.timeScale = speed; a.play(); }
  done() { return !this.current || (this.current.loop === THREE.LoopOnce && this.current.time >= this.current.getClip().duration - 0.02); }
  // velocidade em m/s → clipe e ritmo para não "patinar"
  locomote(speed, opts = {}) {
    this.speed = speed; const k = 1 / (this.def.height || 1);
    if (opts.air) { this.play('jump', 0.2); return; }
    if (opts.anim) { this.play(opts.anim, opts.fade ?? 0.4); return; }
    if (speed < 0.12) { const idle = opts.talk ? 'talk' : (opts.idle || 'idle'); if (this.currentName !== idle) this.play(idle, 0.45); return; }
    if (speed < 2.2) this.play(this.def.old || opts.slow ? 'walkSlow' : 'walk', 0.35, clamp(speed * k / (this.def.old ? 1.15 : 1.35), 0.5, 1.6));
    else if (speed < 4.4) this.play('jog', 0.35, clamp(speed * k / 3.3, 0.7, 1.5));
    else this.play('run', 0.3, clamp(speed * k / 5.8, 0.8, 1.4));
  }
  lookAtPoint(p, w = 1) { this.lookTarget = p; this.lookWTarget = w; }
  applyLook(dt) {
    const tw = this.lookTarget ? this.lookWTarget : 0; this.lookW = lerp(this.lookW, tw, clamp(dt * 3, 0, 1));
    if (this.lookW < 0.01 || !this.lookTarget) return;
    const H = this.bones.Head; if (!H) return;
    const hp = H.getWorldPosition(_v1); const dir = _v2.copy(this.lookTarget).sub(hp).normalize();
    const bodyFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.root.quaternion);
    let y = Math.atan2(dir.x, dir.z) - Math.atan2(bodyFwd.x, bodyFwd.z); y = Math.atan2(Math.sin(y), Math.cos(y)); y = clamp(y, -1.1, 1.1);
    const pitch = clamp(Math.asin(clamp(dir.y, -1, 1)), -0.45, 0.4);
    const by = Math.atan2(bodyFwd.x, bodyFwd.z) + y; const ld = new THREE.Vector3(Math.sin(by) * Math.cos(pitch), Math.sin(pitch), Math.cos(by) * Math.cos(pitch));
    for (const [n, k] of [['neck_01', 0.4], ['Head', 0.7]]) { const b = this.bones[n]; if (!b || !this.fwdLocal[n]) continue; b.getWorldQuaternion(_q1); const f = this.fwdLocal[n].clone().applyQuaternion(_q1).normalize(); _q2.setFromUnitVectors(f, ld); _q2.slerp(_q3.identity(), 1 - k * this.lookW); _q1.premultiply(_q2); setBoneWorldQuat(b, _q1); }
  }
  // fala: pequenos acenos de cabeça e respiração seguindo a amplitude da voz
  applyTalk(dt) {
    this.talkAmp = lerp(this.talkAmp, this.talking, clamp(dt * 10, 0, 1)); this.breath += dt;
    const H = this.bones.Head; if (!H) return;
    const a = this.talkAmp; if (a < 0.01 && this.nod < 0.01) return;
    this.talkPhase += dt * (3 + a * 4);
    const nod = (Math.sin(this.talkPhase) * 0.5 + Math.sin(this.talkPhase * 0.37 + 1) * 0.5) * 0.06 * a + this.nod * 0.12;
    H.getWorldQuaternion(_q1); const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(this.root.quaternion);
    _q2.setFromAxisAngle(axis, nod); _q1.premultiply(_q2); setBoneWorldQuat(H, _q1); this.nod = Math.max(0, this.nod - dt * 2);
  }
  face(dt) {
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = 1; this.blinkT = rr(2.2, 5.5); if (rand() < 0.15) this.blinkT = 0.25; }
    const b = this.blink > 0 ? Math.sin(Math.min(this.blink, 1) * Math.PI) : 0; this.blink = Math.max(0, this.blink - dt * 7);
    for (const e of this.eyes) e.visible = b < 0.6;
  }
  update(dt) {
    this.mixer.update(dt); this.root.updateMatrixWorld(true);
    this.applyLook(dt); this.applyTalk(dt); this.face(dt);
  }
  get headPos() { return this.bones.Head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.08 * (this.def.height || 1), 0)); }
  handPos(side = 'r') { return this.bones['hand_' + side].getWorldPosition(new THREE.Vector3()); }
}
