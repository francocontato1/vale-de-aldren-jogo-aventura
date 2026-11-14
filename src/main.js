import { THREE, renderer, scene, camera, U, Q, QUAL, settings, store, clamp, lerp, smooth, rand, rr, angDiff, lerpAng, makeMacroTexture, loadGLTF, progress, isTouch, hash2, trackP } from './core.js';
import { computeTerrainData, buildTerrain, groundH, normalY, splatAt, POI, PATHS, forestDensity, WATER, HGT, NRM, SPLAT, NV, N, CELL, HALF } from './world/terrain.js';
import { buildWater } from './world/water.js';
import { SkySystem } from './world/sky.js';
import { Grass } from './world/grass.js';
import { Trees } from './world/trees.js';
import { loadVillageMaterials, buildVillage, colliders, villageDirt, smokes, fires, interactPoints, M, HOUSES, interiors, doors, insideHouse, inFootprint, storySpots } from './world/village.js';
import { Speech } from './speech.js';
import { VIGIAS, PAGES, FINAL_ECHO } from './story.js';
import { buildGiant, buildNameStone, buildHeadFragment, updateGiants, updateNameStones } from './world/giants.js';
import { Echo, initSpirits, addSiteSpirits, updateSpirits, Motes, setEchoLight } from './magic.js';
import { buildProps, updateProps, setPropRadius } from './world/props.js';
import { loadHumanLibrary, Human, makeRifle, makeSword } from './actors/human.js';
import { Wolf, buildWolfTemplate } from './actors/wolf.js';
import { Post } from './post.js';
import { Sound, preloadSounds } from './audio.js';

const $ = (id) => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// =====================================================================
// collisions
// =====================================================================
const CG = 10; const circGrid = new Map();
function addCirc(x, z, r) { const k = Math.floor(x / CG) + ',' + Math.floor(z / CG); let a = circGrid.get(k); if (!a) circGrid.set(k, a = []); a.push(x, z, r); }
function insideBox(x, z, m) { for (const b of colliders.boxes) { const dx = x - b.x, dz = z - b.z; if (Math.abs(dx) > b.rad + m || Math.abs(dz) > b.rad + m) continue; const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.hw + m && Math.abs(lz) < b.hd + m) return true; } return false; }
function collide(p, r) {
  for (const b of colliders.boxes) {
    const dx = p.x - b.x, dz = p.z - b.z; if (Math.abs(dx) > b.rad + r || Math.abs(dz) > b.rad + r) continue;
    let lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; const ex = b.hw + r, ez = b.hd + r;
    if (Math.abs(lx) < ex && Math.abs(lz) < ez) { if (ex - Math.abs(lx) < ez - Math.abs(lz)) lx = Math.sign(lx || 1) * ex; else lz = Math.sign(lz || 1) * ez; p.x = b.x + lx * b.c + lz * b.s; p.z = b.z - lx * b.s + lz * b.c; }
  }
  const cx = Math.floor(p.x / CG), cz = Math.floor(p.z / CG);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const arr = circGrid.get((cx + a) + ',' + (cz + b)); if (!arr) continue; for (let i = 0; i < arr.length; i += 3) { const dx = p.x - arr[i], dz = p.z - arr[i + 1], rr2 = arr[i + 2] + r; const d2 = dx * dx + dz * dz; if (d2 < rr2 * rr2 && d2 > 1e-6) { const d = Math.sqrt(d2); p.x = arr[i] + dx / d * rr2; p.z = arr[i + 1] + dz / d * rr2; } } }
}
function treeHit(x, z) { const cx = Math.floor(x / CG), cz = Math.floor(z / CG); const arr = circGrid.get(cx + ',' + cz); if (!arr) return false; for (let i = 0; i < arr.length; i += 3) { const dx = x - arr[i], dz = z - arr[i + 1]; if (dx * dx + dz * dz < arr[i + 2] * arr[i + 2]) return true; } return false; }

// =====================================================================
// particles (smoke, fire, dust, blood, flash)
// =====================================================================
function softTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
function smokeTex() { const S = 128; const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const id = g.createImageData(S, S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2); const r = Math.hypot(dx, dy); let n = 0, a = 1, f = 3; for (let o = 0; o < 4; o++) { n += a * (0.5 + 0.5 * Math.sin(x / S * f * 6.28 + Math.cos(y / S * f * 5.1) * 2 + o * 1.7) * Math.cos(y / S * f * 6.28 + o)); a *= 0.5; f *= 2; } const al = clamp((1 - r) * 1.4, 0, 1) * (0.55 + 0.45 * n / 1.9); const i = (y * S + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = al * 255; } g.putImageData(id, 0, 0); return new THREE.CanvasTexture(c); }
class Particles {
  constructor(max, tex, additive) {
    this.max = max; this.n = 0; this.p = []; const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('pcol', new THREE.BufferAttribute(this.col, 4)); g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tex: { value: null }, scale: { value: 600 }, amb: { value: new THREE.Color(1, 1, 1) } }]),
      vertexShader: `attribute vec4 pcol; attribute float psize; uniform float scale; varying vec4 vC;
        #include <fog_pars_vertex>
        void main(){ vC = pcol; vec4 mvPosition = modelViewMatrix*vec4(position,1.); gl_PointSize = psize*scale/max(-mvPosition.z,0.1); gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D tex; uniform vec3 amb; varying vec4 vC;
        #include <fog_pars_fragment>
        void main(){ vec4 t = texture2D(tex, gl_PointCoord); gl_FragColor = vec4(vC.rgb*amb, vC.a*t.a); if(gl_FragColor.a<0.004) discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
        }` });
    this.mat.uniforms.tex.value = tex; this.additive = additive;
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
  }
  emit(o) { if (this.p.length >= this.max) this.p.shift(); this.p.push(Object.assign({ t: 0, life: 1, vx: 0, vy: 0, vz: 0, s0: 0.3, s1: 1, a0: 1, c: [1, 1, 1], drag: 0, g: 0 }, o)); }
  update(dt, wind) {
    let i = 0; const keep = [];
    for (const q of this.p) { q.t += dt; if (q.t >= q.life) continue; const k = q.t / q.life; q.vx *= 1 - q.drag * dt; q.vz *= 1 - q.drag * dt; q.vy = q.vy * (1 - q.drag * dt) - q.g * dt; q.x += (q.vx + wind.x * q.wind) * dt; q.y += q.vy * dt; q.z += (q.vz + wind.y * q.wind) * dt;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z; const a = q.a0 * (q.fadeIn ? Math.min(1, k / q.fadeIn) : 1) * (1 - k) * (1 - k * 0.3);
      this.col[i * 4] = q.c[0]; this.col[i * 4 + 1] = q.c[1]; this.col[i * 4 + 2] = q.c[2]; this.col[i * 4 + 3] = a; this.size[i] = lerp(q.s0, q.s1, Math.sqrt(k)); i++; keep.push(q); }
    this.p = keep; this.points.geometry.setDrawRange(0, i); for (const k of ['position', 'pcol', 'psize']) this.points.geometry.attributes[k].needsUpdate = true;
  }
}

// =====================================================================
// game state
// =====================================================================
const S = { names: {}, met: {}, pages: [], final: 0, blade: 0, found: {}, day: 0, intro: false, weapon: 'sword', ammoMag: 0, ammoRes: 0, bandages: 0, looted: [] };
let state = 'loading', hour = 16.6, elapsed = 0;
const player = { x: 0, z: 22, y: 0, vy: 0, h: Math.PI, hp: 100, st: 100, onGround: true, regenT: 0, aim: 0, fireCd: 0, reload: 0, stepAcc: 0, speed: 0, walk: false };
const cam = { yaw: 0, pitch: -0.12, dist: 3.6, cur: V3(), look: V3(), shake: 0, kick: 0, cine: 0 };
const keys = {}; let mouseL = false, mouseR = false, locked = false, lockFailed = false;
const touch = { mx: 0, my: 0, aim: false, run: false, fire: false };
let sky, trees, grass, post, smoke, fireP, flashP, dust, muzzleLight, villageFireLights = [];
const npcs = [], enemies = [];
const SAVE_KEY = 'aldren3-save';
function save() { store.set(SAVE_KEY, JSON.stringify({ S, p: { x: player.x, z: player.z, h: player.h }, hour })); }
function load() { const raw = store.get(SAVE_KEY); if (!raw) return false; try { const d = JSON.parse(raw); Object.assign(S, d.S); if (d.p) { player.x = d.p.x; player.z = d.p.z; player.h = d.p.h; cam.yaw = d.p.h + Math.PI; } if (typeof d.hour === 'number') hour = d.hour; return true; } catch (e) { return false; } }

// =====================================================================
// boot
// =====================================================================
async function boot() {
  preloadSounds(trackP); Speech.init();
  progress.onChange = () => { const f = progress.total ? progress.done / progress.total : 0; $('loadBar').style.transform = `scaleX(${0.08 + f * 0.62})`; };
  const step = async (label, frac, fn) => { $('loading').textContent = label; $('loadBar').style.transform = `scaleX(${frac})`; await new Promise(r => setTimeout(r, 20)); return fn(); };
  renderer.setPixelRatio(Q().pr); renderer.setSize(innerWidth, innerHeight); $('game').appendChild(renderer.domElement);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  makeMacroTexture();
  await step('Esculpindo o vale…', 0.05, () => computeTerrainData(villageDirt));
  const rock = await loadGLTF('a/rock1.glb.wasm'); let rockMat; rock.scene.traverse(o => { if (o.isMesh) rockMat = o.material; });
  await step('Pintando o terreno…', 0.12, () => buildTerrain(scene, rockMat));
  await buildWater(scene);
  sky = new SkySystem(scene);
  trees = new Trees(scene);
  await step('Crescendo as árvores…', 0.2, () => trees.build());
  await loadVillageMaterials(trees.variants[0].bark);
  await step('Erguendo a vila…', 0.35, () => buildVillage(scene));
  for (const c of colliders.circles) addCirc(c[0], c[1], c[2]);
  load();
  await step('Os Vigias dormem…', 0.4, () => placeSaga(rockMat));
  const zones = sagaZones();
  const vEx = (x, z) => Math.hypot(x, z) < 62 || Math.hypot(x - POI.camp.x, z - POI.camp.z) < 24 || Math.hypot(x - POI.tower.x, z - POI.tower.z) < 14 || Math.hypot(x - POI.stones.x, z - POI.stones.z) < 14 || zones.some(zn => Math.hypot(x - zn[0], z - zn[1]) < zn[2]);
  await step('Espalhando pedras e flores…', 0.45, () => buildProps(scene, { avoid: (x, z, r) => vEx(x, z) || pathDistOK(x, z, r), addCircle: addCirc, villageExclude: vEx }));
  await step('Plantando a floresta…', 0.55, () => trees.scatter({ avoid: (x, z, r) => vEx(x, z) || pathDistOK(x, z, r + 1), forestDensity, groundH, normalY, onTree: (it) => { if (it.v.sp.type !== 'bush') addCirc(it.x, it.z, (it.v.sp.type === 'pine' ? 0.28 : 0.36) * it.s); }, extra: [[-12, -32, 'oakA', 1], [34, -12, 'oakB', 0.9], [-38, 22, 'ashA', 1], [10, 44, 'oakA', 1.1], [-52, -16, 'pineA', 1], [27, -63, 'oakB', 1.15], [storySpots.treeRoot.x, storySpots.treeRoot.z, 'oakB', 1.3]] }));
  grass = new Grass(scene, { exclude: (x, z) => inFootprint(x, z, 0.1) || insideBox(x, z, 0.4) || treeHit(x, z) });
  await step('Chamando os moradores…', 0.62, () => loadHumanLibrary());
  await step('Sombras se juntam…', 0.8, () => buildWolfTemplate());
  initSpirits(); motes = new Motes(240);
  // effects
  const sTex = smokeTex(), dTex = softTex();
  smoke = new Particles(700, sTex, false); fireP = new Particles(400, dTex, true); dust = new Particles(300, sTex, false); flashP = new Particles(40, dTex, true);
  muzzleLight = new THREE.PointLight(0xffb060, 0, 14, 2); scene.add(muzzleLight); setEchoLight(muzzleLight);
  for (const f of fires) { if (f.dead) continue; const l = new THREE.PointLight(f.forge ? 0xff6a20 : 0xff8a3a, 0, f.big ? 26 : 18, 2); l.position.copy(f.p).add(V3(0, f.forge ? 0 : 0.6, 0)); l.castShadow = false; scene.add(l); f.light = l; f.base = f.forge ? 6 : f.big ? 14 : 10; }
  for (const d of doors) scene.add(d.pivot);
  hearthLights = [0, 1].map(() => { const l = new THREE.PointLight(0xff8b3d, 0, 10, 1.6); scene.add(l); return l; }); candleLight = new THREE.PointLight(0xffb060, 0, 5, 1.8); scene.add(candleLight);
  buildLantern(); buildRipples();
  const had = !!store.get(SAVE_KEY);
  await step('Últimos detalhes…', 0.9, () => { buildPlayer(); buildNPCs(); buildEnemies(); buildMapBase(); });
  post = new Post(); post.setSize(innerWidth, innerHeight);
  player.y = groundH(player.x, player.z);
  for (let i = 0; i < 30; i++) grass.update(player.x, player.z, 100);
  trees.update(V3(player.x, 0, player.z), new THREE.Color(0.3, 0.35, 0.42));
  // warm up shaders
  renderer.compile(scene, camera);
  state = 'menu'; $('loading').textContent = had ? 'Progresso anterior encontrado' : ''; $('loadBar').parentElement.hidden = true;
  $('startBtn').disabled = false; if (had) $('startBtn').textContent = 'Continuar a jornada';
  clock.start(); if (!MANUAL) requestAnimationFrame(rafFrame); else frame(0.016);
}
function pathDistOK(x, z, r) { for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) { const [x1, z1] = p[i], [x2, z2] = p[i + 1]; const dx = x2 - x1, dz = z2 - z1; const t = clamp(((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz), 0, 1); if (Math.hypot(x1 + dx * t - x, z1 + dz * t - z) < 3 + r) return true; } return false; }

// =====================================================================
// player
// =====================================================================
let pH; const rifleTemplate = () => makeRifle(M.planks.map);
function makePlayerHuman() { const h = new Human('player'); if (h.rifle) { h.rifle.visible = false; } h.giveSword(makeSword()); h.weapon = 'sword'; return h; }
function buildPlayer() { pH = makePlayerHuman(); scene.add(pH.root); }
function setWeapon(w) { w = 'sword'; if (!pH || pH.weapon === w) return; pH.weapon = w; S.weapon = w; player.aim = 0; Sound.equip(w); $('weapon').querySelector('.name').textContent = w === 'sword' ? 'Espada' : 'Rifle de alavanca'; $('ammo').hidden = w === 'sword'; }
const aimDir = V3(); const camFwd = V3();
function updatePlayer(dt) {
  const k = keys; let f = 0, s = 0;
  if (state === 'play') { if (k.KeyW) f += 1; if (k.KeyS) f -= 1; if (k.KeyA) s -= 1; if (k.KeyD) s += 1;
    if (k.ArrowLeft) cam.yaw += dt * 2.2; if (k.ArrowRight) cam.yaw -= dt * 2.2; if (k.ArrowUp) cam.pitch = clamp(cam.pitch + dt * 1.2, -1.2, 0.95); if (k.ArrowDown) cam.pitch = clamp(cam.pitch - dt * 1.2, -1.2, 0.95); f += touch.my; s += touch.mx; }
  const len = Math.min(1, Math.hypot(f, s));
  const cy = cam.yaw; const fwd = V3(-Math.sin(cy), 0, -Math.cos(cy)), right = V3(Math.cos(cy), 0, -Math.sin(cy));
  const dir = fwd.clone().multiplyScalar(f).addScaledVector(right, s); if (dir.lengthSq() > 0) dir.normalize();
  const sword = pH.weapon === 'sword';
  const wantAim = !sword && state === 'play' && (mouseR || touch.aim) && player.reload <= 0;
  pH.blockW = lerp(pH.blockW, sword && state === 'play' && (mouseR || touch.aim) && pH.swingT < 0 ? 1 : 0, clamp(dt * 12, 0, 1)); player.block = pH.blockW > 0.6;
  player.aim = clamp(player.aim + (wantAim ? dt * 5 : -dt * 4), 0, 1);
  const sprint = (k.ShiftLeft || k.ShiftRight || touch.run) && len > 0.3 && player.aim < 0.2 && player.st > 2;
  let speed = player.walk ? 1.45 : 3.4; if (sprint) speed = 6.2; if (player.aim > 0.3) speed = 1.5; if (player.block) speed = 1.6; if (sword && pH.swingT >= 0) speed *= 0.5;
  const gh0 = groundH(player.x, player.z); const depth = WATER - gh0; const inWater = depth > 0.08; if (inWater) speed *= clamp(1 - depth * 0.55, 0.35, 1);
  if (sprint) player.st = Math.max(0, player.st - 14 * dt); else player.st = Math.min(100, player.st + 18 * dt);
  const tgtSpeed = len * speed; player.speed = lerp(player.speed, tgtSpeed, clamp(dt * (tgtSpeed > player.speed ? 5 : 8), 0, 1));
  let mv = dir.clone().multiplyScalar(player.speed);
  if (player.aim > 0.3 || len < 0.01) { if (len < 0.01) mv.set(0, 0, 0); }
  // facing
  if (player.aim > 0.3) player.h = lerpAng(player.h, Math.atan2(fwd.x, fwd.z), dt * 14);
  else if (len > 0.05) player.h = lerpAng(player.h, Math.atan2(dir.x, dir.z), dt * 9);
  // move with slope limit & collisions
  let nx = player.x + mv.x * dt, nz = player.z + mv.z * dt; const gh1 = groundH(nx, nz); const stepLen = Math.hypot(nx - player.x, nz - player.z);
  if (stepLen > 1e-4 && player.onGround && (gh1 - gh0) / stepLen > 1.0) { nx = player.x; nz = player.z; }
  if (groundH(nx, nz) < WATER - 1.15) { nx = player.x; nz = player.z; if (!player.deepWarn) { player.deepWarn = true; toast('Água funda', 'Não dá para seguir nadando'); setTimeout(() => player.deepWarn = false, 6000); } }
  const p = { x: nx, z: nz }; collide(p, 0.32); for (const n of npcs) { const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz); if (d < 0.6 && d > 1e-3) { p.x = n.x + dx / d * 0.6; p.z = n.z + dz / d * 0.6; } }
  const r = Math.hypot(p.x, p.z); if (r > 690) { p.x *= 690 / r; p.z *= 690 / r; }
  player.x = p.x; player.z = p.z;
  const gh = groundH(player.x, player.z);
  if ((k.Space || touch.jump) && player.onGround && player.st > 10 && state === 'play' && player.aim < 0.3) { player.vy = 4.6; player.onGround = false; player.st -= 10; }
  touch.jump = false;
  player.vy -= 16 * dt; player.y += player.vy * dt; if (player.y <= gh) { if (!player.onGround && player.vy < -6) { Sound.step(surface(), 2, player.x, player.z); } player.y = gh; player.vy = 0; player.onGround = true; } else if (player.y - gh > 0.3) player.onGround = false; else if (player.onGround) player.y = gh;
  // footsteps
  if (player.onGround && player.speed > 0.4) { player.stepAcc += dt * player.speed / (player.speed > 4.5 ? 1.7 : 1.35); if (player.stepAcc > 0.5) { player.stepAcc = 0; Sound.step(inWater ? 'water' : surface(), clamp(player.speed / 3, 0.5, 1.4), player.x, player.z, player.speed > 4.5); if (inWater) waterStep(player.x, player.z, depth, player.speed); } }
  if (inWater && player.speed < 0.3 && rand() < dt * 0.8) ripple(player.x + rr(-0.3, 0.3), player.z + rr(-0.3, 0.3), 0.6);
  // regen
  player.regenT -= dt; if (player.regenT < 0 && player.hp > 0) player.hp = Math.min(100, player.hp + 2.2 * dt);
  // weapon
  player.fireCd -= dt;
  if (player.reload > 0) { player.reload -= dt; if (player.reload <= 0) { if (S.ammoMag < 8 && S.ammoRes > 0) { S.ammoMag++; S.ammoRes--; Sound.reload(); if (S.ammoMag < 8 && S.ammoRes > 0) player.reload = 0.55; } } }
  if (!sword && (mouseL || touch.fire) && player.aim > 0.85 && player.fireCd <= 0 && state === 'play') { shoot(); }
  if (sword && (mouseL || touch.fire) && state === 'play' && player.st > 8 && !player.block) { if (pH.startSwing()) { player.st -= 9; player.swingHit = false; player.regenT = Math.max(player.regenT, 3); Sound.swing(); if (rand() < 0.35) Sound.effort(); } mouseL = false; }
  if (sword && pH.swingT > 0.42 && !player.swingHit) { player.swingHit = true; swordHit(); }
  if (touch.fire) touch.fire = false;
  // character
  pH.root.position.set(player.x, player.y, player.z); pH.root.rotation.y = player.h;
  if (player.aim > 0.3) {
    const lf = mv.dot(V3(Math.sin(player.h), 0, Math.cos(player.h))), ls = mv.dot(V3(-Math.cos(player.h), 0, Math.sin(player.h)));
    const sp = Math.hypot(lf, ls); let strafe = null; if (sp > 0.3) { if (Math.abs(ls) > Math.abs(lf)) strafe = ls > 0 ? 'strafeR' : 'strafeL'; else strafe = lf > 0 ? 'walk' : 'back'; }
    if (strafe === 'walk') pH.locomote(sp); else pH.locomote(sp, { strafe });
  } else pH.locomote(player.onGround ? player.speed : 0, { air: !player.onGround && player.vy < -1.5 });
  pH.aimW = player.aim; pH.aimDir.copy(camFwd);
  if (state === 'dialog' && dlgNPC && dlgNPC.h) pH.lookAtPoint(dlgNPC.h.headPos, 1); else if (player.aim < 0.1) pH.lookAtPoint(camera.position.clone().addScaledVector(camFwd, 20), 0.55); else pH.lookAtPoint(null);
  pH.update(dt);
}
function surface() { if (insideHouse(player.x, player.z)) return 'wood'; const sp = splatAt(player.x, player.z); if (insideBox(player.x, player.z, 1.5) || Math.hypot(player.x - 28, player.z - 4) < 3) return 'stone'; if (sp[0] > 0.5 || sp[3] > 0.5) return 'dirt'; return 'grass'; }

// third-person camera with collision
function updateCamera(dt) {
  if (state === 'echo' && echoSite) { const c = echoSite.echoAt; const cy0 = groundH(c.x, c.z); cam.echoA = (cam.echoA ?? Math.atan2(player.x - c.x, player.z - c.z)) + dt * 0.05; const want = V3(c.x + Math.sin(cam.echoA) * 6.5, cy0 + 2.1, c.z + Math.cos(cam.echoA) * 6.5); want.y = Math.max(want.y, groundH(want.x, want.z) + 1.2); cam.cur.lerp(want, 1 - Math.exp(-dt * 2)); camera.position.copy(cam.cur); camera.lookAt(c.x, cy0 + 1.3, c.z); camera.fov = lerp(camera.fov, 45, 1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix(); return; } else cam.echoA = undefined;
  const aiming = player.aim;
  cam.inK = lerp(cam.inK || 0, insideHouse(player.x, player.z) ? 1 : 0, 1 - Math.exp(-dt * 4));
  const dist = lerp(lerp(3.4, 1.85, cam.inK), 1.35, aiming), shoulder = lerp(lerp(0.32, 0.2, cam.inK), 0.55, aiming), fov = lerp(lerp(55, 62, cam.inK), 40, aiming);
  const cy = cam.yaw, cp = cam.pitch;
  camFwd.set(-Math.sin(cy) * Math.cos(cp), Math.sin(cp), -Math.cos(cy) * Math.cos(cp));
  const right = V3(Math.cos(cy), 0, -Math.sin(cy));
  const pivot = V3(player.x, player.y + lerp(1.55, 1.62, aiming), player.z);
  let want = pivot.clone().addScaledVector(camFwd, -dist).addScaledVector(right, shoulder).add(V3(0, 0.12, 0));
  // collision march
  const steps = 16; let last = pivot.clone().addScaledVector(right, shoulder * 0.3);
  for (let i = 1; i <= steps; i++) { const t = i / steps; const q = pivot.clone().lerp(want, t); if (q.y < groundH(q.x, q.z) + 0.3 || insideBox(q.x, q.z, 0.15) && q.y < groundH(q.x, q.z) + 7) break; last = q; }
  want = last;
  if (cam.cine > 0.001 && dlgNPC && dlgNPC.h) {
    const H = dlgNPC.h.headPos; const P = pH.headPos; const d = H.clone().sub(P); d.y = 0; d.normalize(); const rr2 = V3(d.z, 0, -d.x);
    const cpos = P.clone().addScaledVector(d, -0.85).addScaledVector(rr2, -0.55).add(V3(0, 0.08, 0));
    want.lerp(cpos, smooth(0, 1, cam.cine));
    cam.look.copy(H).add(V3(0, -0.04, 0));
  }
  if (cam.intro > 0) { cam.intro -= dt; const k = smooth(0, 1, 1 - cam.intro / INTRO_T); const a = 1.2 - k * 1.0; const R2 = lerp(70, 4, k);
    const from = V3(player.x + Math.sin(a) * R2, groundH(player.x, player.z) + lerp(38, 2.2, Math.pow(k, 0.7)), player.z + Math.cos(a) * R2);
    want.lerp(from, 1 - smooth(0.82, 1, k)); cam.cur.copy(want); camera.position.copy(want); camera.lookAt(player.x, player.y + lerp(4, 1.5, k), player.z); camera.fov = lerp(35, 55, k); camera.updateProjectionMatrix(); if (cam.intro <= 0) { cam.intro = 0; } return; }
  cam.cur.lerp(want, 1 - Math.exp(-dt * (cam.cine > 0 ? 6 : 18)));
  if (cam.cur.distanceTo(want) > 6) cam.cur.copy(want);
  camera.position.copy(cam.cur);
  { const close = camera.position.distanceTo(V3(player.x, player.y + 1.55, player.z)) < 0.75 && cam.cine < 0.1; if (pH) pH.root.visible = !close; }
  cam.shake = Math.max(0, cam.shake - dt * 2.5); cam.kick = Math.max(0, cam.kick - dt * 6);
  const sh = cam.shake * cam.shake;
  if (cam.cine > 0.001 && dlgNPC) { const m = new THREE.Matrix4().lookAt(camera.position, cam.look, V3(0, 1, 0)); const qq = new THREE.Quaternion().setFromRotationMatrix(m); const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(cp, cy, 0, 'YXZ')); camera.quaternion.copy(q0.slerp(qq, smooth(0, 1, cam.cine))); }
  else camera.rotation.set(cp + cam.kick * 0.05 + (rand() - 0.5) * sh * 0.06, cy + (rand() - 0.5) * sh * 0.06, 0);
  camera.fov = lerp(camera.fov, cam.cine > 0.5 ? 38 : fov, 1 - Math.exp(-dt * 10)); camera.updateProjectionMatrix();
  $('crosshair').style.opacity = player.aim > 0.6 && state === 'play' ? 1 : 0;
}

// =====================================================================
// shooting
// =====================================================================
function raySphere(o, d, c, r) { const oc = o.clone().sub(c); const b = oc.dot(d); const cc = oc.dot(oc) - r * r; const h = b * b - cc; if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1; }
function enemyHitboxes(e) {
  if (e.kind === 'wolf') { const f = V3(Math.sin(e.yaw), 0, Math.cos(e.yaw)); const y = groundH(e.x, e.z) * 1; const b = V3(e.x, y, e.z); const s = e.scale; return [{ c: b.clone().add(V3(0, 0.76 * s, 0)).addScaledVector(f, 0.12 * s), r: 0.26 * s, m: 1 }, { c: b.clone().add(V3(0, 0.78 * s, 0)).addScaledVector(f, -0.32 * s), r: 0.2 * s, m: 0.8 }, { c: b.clone().add(V3(0, 0.97 * s, 0)).addScaledVector(f, 0.66 * s), r: 0.14 * s, m: 2 }]; }
  const b = V3(e.x, groundH(e.x, e.z), e.z); return [{ c: b.clone().add(V3(0, 0.45, 0)), r: 0.24, m: 0.7 }, { c: b.clone().add(V3(0, 0.95, 0)), r: 0.27, m: 1 }, { c: b.clone().add(V3(0, 1.3, 0)), r: 0.25, m: 1.1 }, { c: e.h.headPos.clone().add(V3(0, 0.06, 0)), r: 0.13, m: 2.6 }];
}
function shoot() {
  if (S.ammoMag <= 0) { Sound.dry(); player.fireCd = 0.4; if (S.ammoRes > 0) startReload(); return; }
  S.ammoMag--; player.fireCd = S.rifle ? 0.75 : 0.9; player.regenT = Math.max(player.regenT, 4);
  const spread = (S.rifle ? 0.004 : 0.009) + player.speed * 0.006;
  const o = camera.position.clone(); const d = camFwd.clone().add(V3(rr(-spread, spread), rr(-spread, spread), rr(-spread, spread))).normalize();
  const start = o.clone().addScaledVector(d, 1.2);
  let best = { t: 400, e: null, m: 1, kind: 'none' };
  for (const e of enemies) { if (e.dead) continue; for (const hb of enemyHitboxes(e)) { const t = raySphere(start, d, hb.c, hb.r); if (t > 0 && t < best.t) best = { t, e, m: hb.m, kind: 'enemy' }; } }
  // terrain / buildings / trunks
  for (let t = 0.5; t < Math.min(best.t, 400); t += 0.35) { const q = start.clone().addScaledVector(d, t); if (q.y < groundH(q.x, q.z)) { if (t < best.t) best = { t, e: null, kind: 'ground' }; break; } if (q.y < groundH(q.x, q.z) + 6 && insideBox(q.x, q.z, 0)) { best = { t, e: null, kind: 'wall' }; break; } if (q.y < groundH(q.x, q.z) + 8 && treeHit(q.x, q.z)) { best = { t, e: null, kind: 'wood' }; break; } }
  const hitP = start.clone().addScaledVector(d, best.t);
  // effects
  const muzzle = pH.rifle ? pH.rifle.localToWorld(pH.rifle.userData.muzzle.clone()) : o;
  muzzleLight.position.copy(muzzle); muzzleLight.intensity = 30; setTimeout(() => muzzleLight.intensity = 0, 55);
  for (let i = 0; i < 6; i++) flashP.emit({ x: muzzle.x, y: muzzle.y, z: muzzle.z, vx: d.x * rr(3, 9), vy: d.y * rr(3, 9), vz: d.z * rr(3, 9), life: 0.07, s0: 0.25, s1: 0.06, c: [1, 0.7, 0.35], a0: 1, wind: 0 });
  for (let i = 0; i < 10; i++) smoke.emit({ x: muzzle.x, y: muzzle.y, z: muzzle.z, vx: d.x * rr(0.5, 3) + rr(-0.2, 0.2), vy: d.y * rr(0.5, 3) + rr(0, 0.3), vz: d.z * rr(0.5, 3) + rr(-0.2, 0.2), drag: 1.6, life: rr(1.4, 2.6), s0: 0.12, s1: rr(0.8, 1.4), c: [0.78, 0.76, 0.74], a0: 0.22, wind: 0.4 });
  Sound.rifle(player.x, player.z, true); setTimeout(() => Sound.lever(), 380);
  cam.shake = Math.max(cam.shake, 0.25); cam.kick = 1; cam.pitch += 0.012;
  if (best.kind === 'enemy') { const e = best.e; const dmg = (S.rifle ? 52 : 40) * best.m; damageEnemy(e, dmg, d); for (let i = 0; i < 8; i++) dust.emit({ x: hitP.x, y: hitP.y, z: hitP.z, vx: d.x * rr(0.5, 2) + rr(-0.6, 0.6), vy: rr(0, 1), vz: d.z * rr(0.5, 2) + rr(-0.6, 0.6), g: 3, drag: 2, life: rr(0.3, 0.7), s0: 0.05, s1: 0.22, c: [0.35, 0.03, 0.02], a0: 0.85, wind: 0 }); Sound.hitFlesh(hitP.x, hitP.z); hitMarker(best.m > 1.5); }
  else if (best.kind === 'ground' && hitP.y < WATER + 0.15) { waterStep(hitP.x, hitP.z, 1, 4); Sound.splash(hitP.x, hitP.z, 1.2); }
  else if (best.kind !== 'none') { const c = best.kind === 'ground' ? [0.42, 0.36, 0.28] : best.kind === 'wood' ? [0.45, 0.35, 0.24] : [0.6, 0.58, 0.55]; for (let i = 0; i < 12; i++) dust.emit({ x: hitP.x, y: hitP.y + 0.05, z: hitP.z, vx: rr(-0.8, 0.8), vy: rr(0.8, 2.6), vz: rr(-0.8, 0.8), g: 4, drag: 1.5, life: rr(0.5, 1.2), s0: 0.06, s1: 0.45, c, a0: 0.7, wind: 0.3 }); if (best.kind === 'wall') Sound.ricochet(hitP.x, hitP.z); }
  // alert nearby enemies
  for (const e of enemies) if (!e.dead && Math.hypot(e.x - player.x, e.z - player.z) < (e.kind === 'bandit' ? 90 : 60)) { e.aggroed = true; }
  if (S.ammoMag === 0 && S.ammoRes > 0) setTimeout(() => startReload(), 600);
}
function startReload() { if (player.reload > 0 || S.ammoMag >= 8 || S.ammoRes <= 0) return; player.reload = 0.7; }
function hitMarker(head) { const h = $('hitmark'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); h.classList.toggle('head', !!head); }

// =====================================================================
// NPCs
// =====================================================================
function addNPC(o) { const h = new Human(o.outfit, { rifleMesh: rifleTemplate() }); h.root.position.set(o.x, groundH(o.x, o.z), o.z); h.root.rotation.y = o.yaw; scene.add(h.root); const n = Object.assign({ h, home: { x: o.x, z: o.z, yaw: o.yaw }, wi: 0, wait: rr(1, 4), speed: 0, talkT: 0 }, o); npcs.push(n); return n; }
let bento, mateus, iago, tomas;
function buildNPCs() {
  bento = addNPC({ id: 'bento', name: 'Bento', role: 'Ancião de Aldren', outfit: 'bento', x: 3, z: -3.6, yaw: Math.PI, talk: talkBento, idle: 'idle2' });
  mateus = addNPC({ id: 'mateus', name: 'Mateus', role: 'Ferreiro e armeiro', outfit: 'mateus', x: 26.5, z: 8.2, yaw: -1.6, talk: talkMateus, idle: 'idle3' });
  iago = addNPC({ id: 'iago', name: 'Iago', role: 'Caçador', outfit: 'iago', x: -5.5, z: -45, yaw: Math.PI * 0.9, talk: talkIago, idle: 'idle' });
  tomas = addNPC({ id: 'tomas', name: 'Tomás', role: 'Pastor', outfit: 'tomas', x: 40, z: 44, yaw: 0.5, talk: talkTomas, idle: 'idle2', wander: [[40, 44], [52, 45], [53, 54], [39, 52]] });
}
function updateNPCs(dt) {
  for (const n of npcs) {
    const talking = state === 'dialog' && dlgNPC === n; const dp = Math.hypot(player.x - n.x, player.z - n.z); let speed = 0;
    const far = Math.hypot(n.x - camera.position.x, n.z - camera.position.z) > 90; n.h.root.visible = !far; if (far) continue;
    if (n.wander && !talking && dp > 2.5) { if (n.wait > 0) n.wait -= dt; else { const t = n.wander[n.wi]; const dx = t[0] - n.x, dz = t[1] - n.z, d = Math.hypot(dx, dz); if (d < 0.4) { n.wi = (n.wi + 1) % n.wander.length; n.wait = rr(3, 9); } else { speed = 1.25; n.x += dx / d * speed * dt; n.z += dz / d * speed * dt; n.yaw = lerpAng(n.yaw, Math.atan2(dx, dz), dt * 4); const p = { x: n.x, z: n.z }; collide(p, 0.3); n.x = p.x; n.z = p.z; } } }
    if (talking || dp < 3.2) { const want = Math.atan2(player.x - n.x, player.z - n.z); if (Math.abs(angDiff(want, n.yaw)) > 0.6 || talking) n.yaw = lerpAng(n.yaw, want, dt * 2.5); }
    else if (!n.wander) n.yaw = lerpAng(n.yaw, n.home.yaw, dt * 1.5);
    n.h.root.position.set(n.x, groundH(n.x, n.z), n.z); n.h.root.rotation.y = n.yaw;
    n.talkT -= dt; n.h.talking = talking && n.talkT > 0 ? 1 : 0;
    n.h.locomote(speed, { idle: n.idle, talk: talking && n.talkT > 0 ? n.talkClip : null });
    if (dp < 7 || talking) n.h.lookAtPoint(pH.headPos, 1); else n.h.lookAtPoint(null);
    n.h.update(dt);
  }
}

// =====================================================================
// enemies
// =====================================================================
const WOLF_PACKS = [[110, 150, 3], [-120, -60, 3], [170, -110, 3], [-60, 230, 2], [-20, -190, 2], [-260, 40, 3], [160, -300, 2]];
function spawnWolf(x, z, home) { const s = rr(0.92, 1.12); const w = new Wolf(s); w.root.position.set(x, groundH(x, z), z); scene.add(w.root); const e = { kind: 'wolf', w, scale: s, x, z, yaw: rand() * 6.28, hp: 55, maxHp: 55, state: 'wander', home, wp: { x, z }, cd: 0, t: 0, wait: 0, speed: 0, dead: false, deadT: 0, dmg: 11, reach: 1.7, aggro: 26, name: 'Lobo', howlT: rr(20, 120) }; enemies.push(e); return e; }
function spawnBandit(x, z, leader, outfit) { const h = new Human(leader ? 'corvo' : outfit, { rifle: true, rifleMesh: rifleTemplate() }); h.root.position.set(x, groundH(x, z), z); scene.add(h.root); const e = { kind: 'bandit', voice: leader ? 2 : 1 + ((x * 7 | 0) & 1), leader, h, x, z, yaw: rand() * 6.28, hp: leader ? 200 : 80, maxHp: leader ? 200 : 80, state: 'idle', home: { x, z }, wp: { x, z }, cd: rr(1, 2), t: 0, speed: 0, dead: false, deadT: 0, dmg: leader ? 18 : 12, aggro: 50, name: leader ? 'Corvo' : 'Saqueador', id: Math.round(x * 100 + z) }; enemies.push(e); return e; }
function buildEnemies() {
  for (const st of SITES) { const n = st.v.id === 'maren' ? 2 : 3; for (let i = 0; i < n; i++) { const a = rr(0, 6.28); let px = st.stone.x + Math.cos(a) * rr(10, 18), pz = st.stone.z + Math.sin(a) * rr(10, 18); if (groundH(px, pz) < 0.8) { px = st.stone.x + rr(-6, 6); pz = st.stone.z + rr(-6, 6); } const e = spawnWolf(px, pz, { x: st.stone.x, z: st.stone.z }); e.site = st.v.id; e.hp = e.maxHp = 45; if (S.names[st.v.id]) { e.dead = true; e.w.root.visible = false; e.gone = true; } } }
}
function damageEnemy(e, dmg, dir, quiet) {
  if (e.dead) return; e.hp -= dmg; e.aggroed = true; e.hitT = 0.25;
  if (e.kind === 'wolf') { e.state = 'stagger'; e.t = 0; e.kx = dir.x * 3; e.kz = dir.z * 3; if (e.hp > 0) Sound.wolfHurt(e.x, e.z); }
  else if (e.hp > 0) { Sound.manHurt(e.x, e.z, e.voice); e.h.hitReact = 0.3; }
  if (e.hp <= 0) {
    e.dead = true; e.deadT = 0;
    if (quiet) { }
    else if (e.kind === 'wolf') { Sound.wolfDie(e.x, e.z); Sound.chime(); } else { Sound.manDie(e.x, e.z, e.voice); setTimeout(() => Sound.bodyFall(e.x, e.z, 1), 750); }
    if (e.kind === 'wolf') { e.w.dead = true; if (S.qA === 1 && S.kills < 4) { S.kills++; if (S.kills === 4) toast('Lobos abatidos', 'Volte e fale com Bento'); } }
    else { e.h.die(dir); if (e.leader) { S.leaderDead = true; if (S.qC === 1) { S.qC = 2; toast('O Corvo caiu', 'Volte a Aldren e fale com Bento'); } } }
    refreshQuest(); save();
  }
}
function losTo(ax, ay, az, bx, by, bz) { const d = Math.hypot(bx - ax, bz - az); const n = Math.ceil(d / 2); for (let i = 1; i < n; i++) { const t = i / n; const x = lerp(ax, bx, t), y = lerp(ay, by, t), z = lerp(az, bz, t); if (groundH(x, z) > y - 0.2) return false; if (y < groundH(x, z) + 5 && insideBox(x, z, 0)) return false; } return true; }
function updateEnemies(dt) {
  const alive = player.hp > 0 && state === 'play';
  for (const e of enemies) {
    const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz); const toP = Math.atan2(dx, dz);
    const camD = Math.hypot(e.x - camera.position.x, e.z - camera.position.z); const vis = camD < (e.kind === 'wolf' ? 110 : 130);
    if (e.kind === 'wolf') {
      const W = e.w; W.root.visible = vis && (!e.dead || e.deadT < 40);
      if (e.dead) { e.deadT += dt; if (!e.gone && e.deadT < 1.3) { W.root.visible = vis; const k = e.deadT / 1.3; W.root.scale.setScalar(e.scale * (1 - k * 0.6)); if (rand() < 0.8) for (let i = 0; i < 3; i++) flashP.emit({ x: e.x + rr(-0.5, 0.5), y: groundH(e.x, e.z) + rr(0.3, 1.0), z: e.z + rr(-0.5, 0.5), vx: rr(-0.3, 0.3), vy: rr(0.8, 2), vz: rr(-0.3, 0.3), life: rr(0.8, 1.6), s0: 0.12, s1: 0.02, c: [0.6, 0.85, 1.0], a0: 0.9, wind: 0.2 }); } else { W.root.visible = false; e.gone = true; }
        if (e.deadT > 120 && dist > 100 && e.site && !S.names[e.site]) { e.gone = false; W.root.scale.setScalar(e.scale); W.root.visible = true; e.dead = false; W.dead = false; W.mesh.rotation.z = 0; W.mesh.position.set(0, 0, 0); e.hp = e.maxHp; e.x = e.home.x + rr(-6, 6); e.z = e.home.z + rr(-6, 6); e.state = 'wander'; e.aggroed = false; } else { continue; } }
      let mv = 0, mx = 0, mz = 0; e.cd -= dt; e.howlT -= dt; const homeD = Math.hypot(e.x - e.home.x, e.z - e.home.z);
      if (e.howlT < 0) { e.howlT = rr(60, 200); if (sky.nightF > 0.4 && dist < 260) Sound.howl(e.x, e.z); }
      const opts = {};
      switch (e.state) {
        case 'wander': { const wx = e.wp.x - e.x, wz = e.wp.z - e.z, wd = Math.hypot(wx, wz); if (wd < 0.8 || e.t > 14) { e.t = 0; e.wait = rr(2, 7); e.wp = { x: e.home.x + rr(-24, 24), z: e.home.z + rr(-24, 24) }; if (groundH(e.wp.x, e.wp.z) < 0.8) e.wp = { x: e.home.x, z: e.home.z }; }
          if (e.wait > 0) { e.wait -= dt; opts.sniff = Math.sin(elapsed * 0.7 + e.x) > 0.3; } else { mv = 1.3; mx = wx / wd; mz = wz / wd; e.yaw = lerpAng(e.yaw, Math.atan2(wx, wz), dt * 3); } e.t += dt;
          if (alive && (dist < e.aggro || (e.aggroed && dist < 70))) { e.state = 'chase'; e.aggroed = true; Sound.growl(e.x, e.z); combatT = 12; for (const o of enemies) if (!o.dead && o !== e && o.kind === 'wolf' && Math.hypot(o.x - e.x, o.z - e.z) < 30 && o.state === 'wander') { o.state = 'chase'; o.aggroed = true; } }
          break; }
        case 'chase': { if (!alive || dist > 80 || homeD > 110) { e.state = 'return'; e.aggroed = false; break; }
          e.yaw = lerpAng(e.yaw, toP, dt * 6);
          if (dist > e.reach + 0.4) { mv = dist > 10 ? 8.5 : 5.5; mx = dx / dist; mz = dz / dist; if (e.cd > 0 && dist < 6) { const side = (e.home.x > 0 ? 1 : -1) * (((e.x * 7 + e.z * 3) | 0) % 2 ? 1 : -1); mx = -dz / dist * side * 0.85 + dx / dist * 0.15; mz = dx / dist * side * 0.85 + dz / dist * 0.15; mv = 3.4; } }
          else if (e.cd <= 0) { e.state = 'windup'; e.t = 0; Sound.growl(e.x, e.z); } else { mv = 1.0; mx = -dx / dist; mz = -dz / dist; }
          break; }
        case 'windup': { e.t += dt; e.yaw = lerpAng(e.yaw, toP, dt * 6); opts.windup = true; if (e.t > 0.5) { e.state = 'strike'; e.t = 0; e.struck = false; } break; }
        case 'strike': { e.t += dt; opts.strike = true; if (e.t < 0.22) { mv = 8.5; mx = Math.sin(e.yaw); mz = Math.cos(e.yaw); }
          if (!e.struck && e.t > 0.14) { e.struck = true; Sound.bite(e.x, e.z); if (dist < e.reach + 0.6 && Math.abs(angDiff(toP, e.yaw)) < 1.0) damagePlayer(e.dmg, e); }
          if (e.t > 0.5) { e.state = 'chase'; e.cd = rr(1.2, 2.2); } break; }
        case 'stagger': { e.t += dt; e.x += e.kx * dt; e.z += e.kz * dt; e.kx *= 0.85; e.kz *= 0.85; if (e.t > 0.35) { e.state = 'chase'; e.cd = Math.max(e.cd, 0.4); } break; }
        case 'return': { const wx = e.home.x - e.x, wz = e.home.z - e.z, wd = Math.hypot(wx, wz); e.hp = Math.min(e.maxHp, e.hp + dt * 4); if (wd < 4) { e.state = 'wander'; } else { mv = 3.6; mx = wx / wd; mz = wz / wd; e.yaw = lerpAng(e.yaw, Math.atan2(wx, wz), dt * 4); } if (alive && dist < e.aggro * 0.6) { e.state = 'chase'; e.aggroed = true; } break; }
      }
      if (mv > 0) { const nx = e.x + mx * mv * dt, nz = e.z + mz * mv * dt; if (groundH(nx, nz) > 0.3) { e.x = nx; e.z = nz; } }
      for (const o of enemies) { if (o === e || o.dead) continue; const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz); if (od < 1.2 && od > 1e-3) { e.x += ox / od * (1.2 - od) * 0.5; e.z += oz / od * (1.2 - od) * 0.5; } }
      if (dist < 1.0 && dist > 1e-3) { e.x -= dx / dist * (1.0 - dist); e.z -= dz / dist * (1.0 - dist); }
      const p = { x: e.x, z: e.z }; collide(p, 0.45); e.x = p.x; e.z = p.z;
      e.speed = lerp(e.speed, mv, clamp(dt * 5, 0, 1)); W.speed = e.speed; W.aggro = lerp(W.aggro, e.state === 'wander' || e.state === 'return' ? 0 : 1, clamp(dt * 3, 0, 1));
      opts.lookYaw = e.state === 'wander' ? Math.sin(elapsed * 0.4 + e.z) * 0.5 : angDiff(toP, e.yaw);
      // body pitch along slope
      W.root.position.set(e.x, groundH(e.x, e.z), e.z); W.root.rotation.y = e.yaw;
      const fh = groundH(e.x + Math.sin(e.yaw) * 0.5, e.z + Math.cos(e.yaw) * 0.5), bh = groundH(e.x - Math.sin(e.yaw) * 0.5, e.z - Math.cos(e.yaw) * 0.5); W.root.rotation.x = -Math.atan2(fh - bh, 1.0) * 0.8;
      W.mesh.castShadow = camD < 35; if (vis) { W.setShellLOD(camD); W.update(dt, opts); W.eyeMat.emissiveIntensity = 3.5; if (camD < 60 && rand() < dt * 6) smoke.emit({ x: e.x + rr(-0.4, 0.4), y: groundH(e.x, e.z) + rr(0.5, 1.0), z: e.z + rr(-0.4, 0.4), vx: rr(-0.1, 0.1), vy: rr(0.2, 0.5), vz: rr(-0.1, 0.1), drag: 0.5, life: rr(1.2, 2.2), s0: 0.3, s1: 1.1, c: [0.05, 0.05, 0.09], a0: 0.35, wind: 0.3 }); }
    } else {
      const H = e.h; H.root.visible = vis;
      if (e.dead) { e.deadT += dt; if (vis) H.update(dt); continue; }
      let mv = 0, mx = 0, mz = 0; e.cd -= dt; e.t += dt;
      const eyes = H.headPos; const los = dist < 140 && losTo(eyes.x, eyes.y, eyes.z, player.x, player.y + 1.5, player.z);
      if (alive && !e.aggroed && ((dist < e.aggro && los) || dist < 14)) { e.aggroed = true; Sound.shout(e.x, e.z); if (combatT <= 0) Sound.alert(); combatT = 15; for (const o of enemies) if (o.kind === 'bandit' && !o.dead) o.aggroed = true; }
      if (!alive) e.aggroed = false;
      let aim = 0;
      if (e.aggroed) {
        e.yaw = lerpAng(e.yaw, toP, dt * 5);
        const want = e.leader ? 22 : 18 + (e.id % 7);
        if (!los || dist > want + 8) { mv = dist > 35 ? 3.4 : 1.6; mx = dx / dist; mz = dz / dist; }
        else if (dist < 8) { mv = 1.5; mx = -dx / dist; mz = -dz / dist; aim = 1; }
        else { aim = 1; const side = Math.sin(e.t * 0.6 + e.id) > 0 ? 1 : -1; if (Math.sin(e.t * 0.35 + e.id * 1.7) > 0.4) { mv = 1.3; mx = -dz / dist * side; mz = dx / dist * side; } }
        if (aim && los && e.cd <= 0 && H.aimW > 0.85) { e.cd = rr(2.0, 3.4) * (e.leader ? 0.8 : 1); banditShoot(e, dist); }
      } else {
        // idle around the camp fire, sometimes stroll
        if (e.t > 8 && rand() < 0.01) { e.wp = { x: e.home.x + rr(-6, 6), z: e.home.z + rr(-6, 6) }; e.t = 0; }
        const wx = e.wp.x - e.x, wz = e.wp.z - e.z, wd = Math.hypot(wx, wz); if (wd > 0.5) { mv = 1.2; mx = wx / wd; mz = wz / wd; e.yaw = lerpAng(e.yaw, Math.atan2(wx, wz), dt * 3); }
        else { const fy = Math.atan2(POI.camp.x - e.x, POI.camp.z - e.z); e.yaw = lerpAng(e.yaw, fy, dt); }
      }
      if (mv > 0) { const nx = e.x + mx * mv * dt, nz = e.z + mz * mv * dt; if (groundH(nx, nz) > 0.3) { e.x = nx; e.z = nz; } }
      const p = { x: e.x, z: e.z }; collide(p, 0.35); e.x = p.x; e.z = p.z;
      for (const o of enemies) { if (o === e || o.dead || o.kind !== 'bandit') continue; const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz); if (od < 1.0 && od > 1e-3) { e.x += ox / od * (1 - od) * 0.5; e.z += oz / od * (1 - od) * 0.5; } }
      e.speed = lerp(e.speed, mv, clamp(dt * 6, 0, 1));
      H.root.position.set(e.x, groundH(e.x, e.z), e.z); H.root.rotation.y = e.yaw;
      H.aimW = lerp(H.aimW, aim, clamp(dt * 4, 0, 1)); H.aimDir.set(player.x - e.x, (player.y + 1.3) - (groundH(e.x, e.z) + 1.5), player.z - e.z).normalize();
      if (H.aimW > 0.3) { const fwd = V3(Math.sin(e.yaw), 0, Math.cos(e.yaw)); const mvv = V3(mx * mv, 0, mz * mv); const lf = mvv.dot(fwd), ls = mvv.dot(V3(-Math.cos(e.yaw), 0, Math.sin(e.yaw))); let st = null; if (Math.hypot(lf, ls) > 0.3) st = Math.abs(ls) > Math.abs(lf) ? (ls > 0 ? 'strafeR' : 'strafeL') : (lf > 0 ? null : 'back'); if (st) H.locomote(e.speed, { strafe: st }); else H.locomote(e.speed); }
      else H.locomote(e.speed, { idle: 'idle3' });
      if (dist < 25 || e.aggroed) H.lookAtPoint(pH.headPos, 0.9); else H.lookAtPoint(null);
      if (vis) H.update(dt);
    }
  }
}
function banditShoot(e, dist) {
  const H = e.h; const muzzle = H.rifle ? H.rifle.localToWorld(H.rifle.userData.muzzle.clone()) : H.headPos;
  Sound.rifle(e.x, e.z, false);
  for (let i = 0; i < 4; i++) flashP.emit({ x: muzzle.x, y: muzzle.y, z: muzzle.z, vx: H.aimDir.x * rr(3, 8), vy: H.aimDir.y * rr(3, 8), vz: H.aimDir.z * rr(3, 8), life: 0.07, s0: 0.3, s1: 0.08, c: [1, 0.7, 0.35], a0: 1, wind: 0 });
  for (let i = 0; i < 7; i++) smoke.emit({ x: muzzle.x, y: muzzle.y, z: muzzle.z, vx: H.aimDir.x * rr(0.5, 2.5), vy: rr(0, 0.4), vz: H.aimDir.z * rr(0.5, 2.5), drag: 1.6, life: rr(1.4, 2.4), s0: 0.12, s1: rr(0.8, 1.3), c: [0.78, 0.76, 0.74], a0: 0.2, wind: 0.4 });
  muzzleLight.position.copy(muzzle); muzzleLight.intensity = 20; setTimeout(() => muzzleLight.intensity = 0, 50);
  const moving = player.speed > 2 ? 0.22 : player.speed > 0.5 ? 0.1 : 0; const chance = clamp(0.72 - dist / 70 - moving - (player.aim > 0.5 ? 0 : 0.05), 0.08, 0.7);
  if (rand() < chance) damagePlayer(e.dmg, e);
  else { const a = rr(0, 6.28), r = rr(0.6, 2.2); const hx = player.x + Math.cos(a) * r, hz = player.z + Math.sin(a) * r; for (let i = 0; i < 10; i++) dust.emit({ x: hx, y: groundH(hx, hz) + 0.05, z: hz, vx: rr(-0.6, 0.6), vy: rr(1, 2.6), vz: rr(-0.6, 0.6), g: 4, drag: 1.5, life: rr(0.5, 1.1), s0: 0.06, s1: 0.4, c: [0.42, 0.36, 0.28], a0: 0.7, wind: 0.3 }); Sound.ricochet(hx, hz); }
}
function swordHit() {
  const fwd = V3(Math.sin(player.h), 0, Math.cos(player.h)); let any = false;
  for (const e of enemies) { if (e.dead) continue; const dx = e.x - player.x, dz = e.z - player.z, d = Math.hypot(dx, dz); if (d > 2.6) continue; const dot = (dx * fwd.x + dz * fwd.z) / (d || 1); if (dot < 0.25 && d > 1.0) continue;
    any = true; const dir = V3(dx / (d || 1), 0, dz / (d || 1)); damageEnemy(e, (S.rifle ? 50 : 42), dir, 'sword'); cam.shake = Math.max(cam.shake, 0.18); hitStop = 0.06;
    const tip = pH.swordTipWorld || V3(e.x, 1, e.z); const c = e.kind === 'wolf' ? V3(e.x, groundH(e.x, e.z) + 0.75, e.z) : V3(e.x, groundH(e.x, e.z) + 1.2, e.z);
    for (let i = 0; i < 14; i++) dust.emit({ x: c.x, y: c.y, z: c.z, vx: dir.x * rr(0.5, 2.5) + rr(-0.8, 0.8), vy: rr(0, 1.5), vz: dir.z * rr(0.5, 2.5) + rr(-0.8, 0.8), g: 5, drag: 2, life: rr(0.3, 0.8), s0: 0.04, s1: 0.2, c: [0.32, 0.02, 0.02], a0: 0.9, wind: 0 }); }
  if (any) { Sound.slash(player.x, player.z); hitMarker(false); }
}
let hitStop = 0;
function damagePlayer(d, src) {
  if (player.hp <= 0 || state === 'dead') return;
  if (player.block) { const ang = Math.atan2(src.x - player.x, src.z - player.z); if (Math.abs(angDiff(ang, player.h)) < 1.2) { d *= src.kind === 'bandit' ? 0.85 : 0.2; Sound.clash(player.x, player.z); player.st = Math.max(0, player.st - 12); cam.shake = Math.max(cam.shake, 0.2); if (src.kind !== 'bandit') { if (src.state) { src.state = 'stagger'; src.t = 0; src.kx = Math.sin(ang) * 4; src.kz = Math.cos(ang) * 4; } return; } } }
  player.hp -= d; player.regenT = 7; cam.shake = Math.max(cam.shake, 0.45); hurtA = Math.min(1, hurtA + 0.6); Sound.hurt();
  const ang = Math.atan2(src.x - player.x, src.z - player.z) - (cam.yaw + Math.PI); showDamageDir(ang);
  if (player.hp <= 0) { player.hp = 0; die(); }
}
let hurtA = 0;
function showDamageDir(a) { const el = $('dmgdir'); el.style.transform = `rotate(${-a}rad)`; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
function die() {
  state = 'dead'; pH.die(); Sound.loss(); $('death').hidden = false; $('fade').style.opacity = 1;
  setTimeout(() => {
    scene.remove(pH.root); pH = makePlayerHuman(); scene.add(pH.root);
    player.x = 0; player.z = 20; player.h = Math.PI; cam.yaw = 0; player.hp = 100; player.st = 100; hour = (hour + 6) % 24; S.ammoRes = Math.max(S.ammoRes, 16);
    for (const e of enemies) if (!e.dead) { e.aggroed = false; if (e.kind === 'wolf') e.state = 'return'; else { e.x = e.home.x; e.z = e.home.z; } }
    setTimeout(() => { $('death').hidden = true; $('fade').style.opacity = 0; state = 'play'; }, 800);
  }, 3000);
}

// =====================================================================
// quests & dialogue
// =====================================================================
function objectives() {
  const o = []; const n = VIGIAS.filter(v => S.names[v.id]).length;
  if (!S.met.bento) o.push({ t: 'Encontre Bento, o ancião, perto do poço', tgt: bento });
  else if (n < 4) { const left = SITES.filter(s => !S.names[s.v.id]); let best = null, bd = 1e9; for (const s of left) { const d = Math.hypot(s.stone.x - player.x, s.stone.z - player.z); if (d < bd) { bd = d; best = s; } } o.push({ t: `Devolva os nomes dos Vigias (${n}/4)`, tgt: best ? best.stone : null }); }
  else if (!S.final) o.push({ t: 'Vá aos túmulos dos Quatro ao anoitecer', tgt: storySpots.graves });
  else o.push({ t: 'O vale lembra. Ande por onde quiser.', tgt: null });
  o.push({ t: `Páginas do diário: ${S.pages.length}/${PAGES.length} · Lugares: ${Object.keys(S.found).length}/5`, tgt: null });
  return o;
}
function refreshQuest() { $('questText').innerHTML = objectives().map(x => `<div>${x.t}</div>`).join(''); $('namesCount').textContent = VIGIAS.filter(v => S.names[v.id]).length + '/4'; }
const Nd = (text, opts) => ({ text, opts }), O = (t, go, act) => ({ t, go, act });
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const namesN = () => VIGIAS.filter(v => S.names[v.id]).length;
function talkBento() {
  if (!S.met.bento) return Nd('Essa lanterna... Eu conheço essa luz. Era da Elowen. Então ela se foi, finalmente. Eu tinha nove anos quando ela me ensinou a ler. Hoje tenho oitenta e nove.', [
    O('Ela me pediu para devolver os nomes.', () => Nd('Os nomes dos Vigias. Os quatro gigantes que lutaram ao lado dela e dos outros na Longa Noite. Depois dormiram, e o vale foi esquecendo como chamá-los. Quando um nome some, alguma coisa some junto. Os espíritos da floresta, por exemplo. Quase não aparecem mais.', [
      O('Onde eles dormem?', () => Nd('Um no fundo do Lago Espelhado, com a mão erguida. Outro ajoelhado perto do Círculo de Pedras, a oeste. Um caído junto à velha Torre de Vigia, ao norte. E a última sentada no alto da montanha, olhando para cá. Ao pé de cada um há uma pedra com uma runa. Elowen dizia que a pedra lembra o nome quando alguém se dispõe a ouvir.', [O('Vou até eles.', null, () => { S.met.bento = 1; toast('O pedido de Elowen', 'Devolva os nomes dos Vigias'); save(); })]))])),
    O('Quem eram os Quatro?', () => Nd('Elowen, a maga. Teodor, o cavaleiro, que falava pouco e contava tudo. Iara, a caçadora, avó do Iago. E Brás, o curandeiro, que ria antes de todo mundo. Estão enterrados na colina a nordeste. Todos menos ela. Eu fiz uma pedra para ela também, mesmo sem corpo. Achei que ela ia gostar de estar perto deles.', [O('Voltar', talkBento)]))]);
  const n = namesN();
  if (n < 4) return Nd([`Você já devolveu ${n} ${n === 1 ? 'nome' : 'nomes'}. Ontem à noite vi uma luzinha perto do poço. Fazia setenta anos que eu não via um espírito.`, 'As sombras que rondam os Vigias não são maldade, sabe. São o esquecimento tomando forma. Não tenha pena de desfazê-las.', 'Quando eu era menino, a Elowen me disse que a magia é lembrar que as coisas existiam. Eu demorei a vida inteira para entender.'][n % 3], [O('Até mais.', null)]);
  if (!S.final) return Nd('Os quatro nomes de volta. Eu ouço o vale diferente. Vá até os túmulos quando o sol estiver baixo. Ela gostava dessa hora. Dizia que era quando o mundo lembrava de si mesmo.', [O('Vou.', null)]);
  return Nd(pick(['Ainda conto as chaminés, de vez em quando. Oitenta e três, ainda. Ninguém foi embora de vez.', 'Os espíritos voltaram a brincar no poço. Igual a quando eu era menino.', 'Obrigado, aprendiz. E agora? Elowen diria: vá ver o mundo.']), [O('Até mais.', null)]);
}
function talkIago() {
  const n = namesN();
  if (!S.met.iago) return Nd('Você é o aprendiz da Elowen? Minha avó falava dela como se fosse uma estação do ano: chegava, ficava um tempo, ia embora, e voltava sem ter envelhecido um dia.', [O('Sua avó era a Iara?', () => Nd('Era. A última dos Quatro a ir. Ela me ensinou a caçar, mas eu acho que ela gostava mesmo era de olhar o céu. Dizia que as estrelas eram as únicas coisas que ela via do mesmo jeito que a Elowen.', [O('Alguma dica para as sombras?', () => Nd('Sombras não sangram. Desfazem. Elas rondam em grupo perto dos Vigias, porque é ali que o esquecimento pesa mais. Segure a guarda com o botão direito quando uma abaixar a cabeça. Depois corte.', [O('Obrigado.', null, () => { S.met.iago = 1; save(); })]))]))]);
  if (n >= 4) return Nd('Ontem à noite a Maren, lá em cima, estava com os olhos acesos. Minha avó ia chorar de ver isso. Eu chorei por ela.', [O('Até mais.', null)]);
  return Nd(pick(['Na trilha do lago há uma espada fincada numa pedra. Ninguém nunca tirou. Ninguém nunca quis.', 'Tem uma cabeça de pedra no meio do campo a leste. Não é de nenhum dos nossos Vigias. Ninguém sabe de quem é. Isso me incomoda mais do que eu gostaria.', 'O acampamento dos Quatro ainda está lá, a leste. As cobertas no chão. Ninguém mexe.']), [O('Até mais.', null)]);
}
function talkMateus() {
  const n = namesN();
  if (n >= 2 && !S.blade) return Nd('Deixa eu ver essa lâmina. Hm. Você anda cortando sombra com ela, dá para sentir. Está fria. Me dá um minuto na forja.', [O('(Entregar a espada)', () => Nd('Pronto. Temperei com água do poço, como meu avô fazia para o Teodor. Ela vai cortar sombra como quem corta névoa.', [O('Obrigado, Mateus.', null)]), () => { S.blade = 1; Sound.clang(mateus.x, mateus.z); toast('Lâmina temperada', 'A espada corta mais fundo'); save(); })]);
  return Nd(pick(['Meu avô forjou a espada do Teodor. Ele dizia que ela pesava demais porque o Teodor nunca a deixava descansar.', 'Fogo, ferro e paciência. O resto é conversa.', 'Dizem que a espada do Teodor ainda está no fundo do lago. Eu não vou buscar. Tem coisa que é para ficar onde está.']), [O('Até mais.', null)]);
}
function talkTomas() { return Nd(pick(['As ovelhas sabem antes da gente quando o tempo vai virar. Acho que elas lembram de coisas que a gente esqueceu.', 'Tem um balanço velho perto da casa grande a oeste. Foi o Teodor quem pendurou, dizem. Às vezes eu vejo ele balançando sozinho, sem vento.', 'Fico aqui olhando as nuvens passarem. Minha mãe dizia que é perda de tempo. Mas de que outro jeito a gente ia perder o tempo?']), [O('Até mais.', null)]); }
let dlgNPC = null, dlgNode = null;
function openDialog(n) { document.body.classList.add('cine'); dlgNPC = n; state = 'dialog'; post.bokeh.enabled = true; showNode(n.talk()); }
function showLore(title, text, voice = 'lore', opts) { dlgNPC = { name: title, role: '', lore: true, voice }; state = 'dialog'; document.body.classList.add('cine'); showNode(Nd(text, opts || [O('Continuar', null)])); }
function showNode(node) {
  if (!node) { closeDialog(); return; } dlgNode = node; $('dialog').hidden = false; $('prompt').hidden = true; $('status').style.visibility = 'hidden';
  $('dlgName').textContent = dlgNPC.name; $('dlgRole').textContent = dlgNPC.role || ''; $('dlgText').textContent = node.text;
  if (dlgNPC.h) { const n = dlgNPC; n.talkT = 60; n.talkClip = pick(['talk1', 'talk2', 'talk3']); Speech.speak(node.text, n.id, () => { n.talkT = 60; }, () => { n.talkT = 0; }); } else Speech.speak(node.text, dlgNPC.voice || 'lore');
  const box = $('dlgOpts'); box.innerHTML = ''; node.opts.forEach((o, i) => { const b = document.createElement('button'); b.innerHTML = `<b>${i + 1}</b>`; b.appendChild(document.createTextNode(o.t)); b.onclick = (e) => { e.stopPropagation(); choose(i); }; box.appendChild(b); });
}
function choose(i) { const o = dlgNode && dlgNode.opts[i]; if (!o) return; Sound.click(); if (o.act) o.act(); const nx = typeof o.go === 'function' ? o.go() : o.go; showNode(nx || null); refreshQuest(); }
function closeDialog() { Speech.stop(); if (dlgNPC && dlgNPC.h) dlgNPC.talkT = 0; document.body.classList.remove('cine'); $('dialog').hidden = true; $('status').style.visibility = ''; dlgNode = null; if (state === 'dialog') state = 'play'; post.bokeh.enabled = false; const after = pendingAfterDialog; pendingAfterDialog = null; setTimeout(() => { if (state === 'play') dlgNPC = null; if (after) after(); }, 300); }
let pendingAfterDialog = null;

// =====================================================================
// the Vigias, echoes, pages, ending
// =====================================================================
const SITES = []; let echo = null; let pageMeshes = [];
function placeSaga(rockMat) {
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  // Aurel, submerged in the lake, reaching up
  { const gx = -176, gz = 128; const g = buildGiant(scene, rockMat, { pose: 'reach', x: gx, y: WATER - 8.6, z: gz, rot: face(gx, gz, 0, 0), runeIdx: 0, seed: 11 });
    let sx = gx, sz = gz; const dx = -gx, dz = -gz, dl = Math.hypot(dx, dz); for (let i = 0; i < 200; i++) { sx += dx / dl; sz += dz / dl; if (groundH(sx, sz) > 0.8) break; } sx += dx / dl * 3; sz += dz / dl * 3;
    const st = buildNameStone(scene, rockMat, sx, sz, face(sx, sz, gx, gz) + Math.PI, 0); SITES.push({ v: VIGIAS[0], g, stone: st, echoAt: V3(sx + dx / dl * 5, 0, sz + dz / dl * 5 + 2), lookAt: V3(gx, 3, gz) }); storySpots.lakepage = V3(sx + 2.5, groundH(sx + 2.5, sz - 1.5), sz - 1.5); }
  // Seren kneeling by the stone circle
  { const gx = POI.stones.x - 22, gz = POI.stones.z - 16; const g = buildGiant(scene, rockMat, { pose: 'kneel', x: gx, y: groundH(gx, gz) - 0.4, z: gz, rot: face(gx, gz, POI.stones.x, POI.stones.z), runeIdx: 1, seed: 23 });
    const sx = POI.stones.x - 6, sz = POI.stones.z - 4; const st = buildNameStone(scene, rockMat, sx, sz, face(sx, sz, POI.stones.x, POI.stones.z), 1); SITES.push({ v: VIGIAS[1], g, stone: st, echoAt: V3(POI.stones.x + (sx - POI.stones.x) * 0.55, 0, POI.stones.z + (sz - POI.stones.z) * 0.55 + 1.5), lookAt: V3(gx, 10, gz) }); }
  // Doran fallen beside the tower
  { const gx = POI.tower.x + 26, gz = POI.tower.z + 18; const g = buildGiant(scene, rockMat, { pose: 'lie', x: gx, y: groundH(gx, gz) - 0.5, z: gz, rot: -0.7, runeIdx: 2, seed: 37 });
    const sx = POI.tower.x + 9, sz = POI.tower.z + 8; const st = buildNameStone(scene, rockMat, sx, sz, face(sx, sz, 0, 0), 2); SITES.push({ v: VIGIAS[2], g, stone: st, echoAt: V3(POI.tower.x + 5, 0, POI.tower.z + 6), lookAt: V3(0, 8, 0) }); }
  // Maren seated high on the mountain, looking at the valley
  { let best = null; for (let z = -330; z > -520; z -= 6) for (let x = -120; x <= 40; x += 8) { const h = groundH(x, z); const ny = normalY(x, z); if (h > 55 && h < 110 && ny > 0.86) { const sc = h - Math.abs(x + 50) * 0.2; if (!best || sc > best.sc) best = { x, z, sc }; } }
    if (!best) best = { x: -50, z: -420 }; const gx = best.x, gz = best.z; const g = buildGiant(scene, rockMat, { pose: 'sit', x: gx, y: groundH(gx, gz) - 0.8, z: gz, rot: face(gx, gz, 0, 0), runeIdx: 3, seed: 51 });
    const fx = Math.sin(g.rot), fz = Math.cos(g.rot); const sx = gx + fx * 12, sz = gz + fz * 12; const st = buildNameStone(scene, rockMat, sx, sz, g.rot, 3); SITES.push({ v: VIGIAS[3], g, stone: st, echoAt: V3(sx + fx * 3, 0, sz + fz * 3), lookAt: V3(0, 5, 0) }); POI.peaks.x = sx; POI.peaks.z = sz; }
  for (const s of SITES) { for (const c of s.g.cols) addCirc(c[0], c[1], c[2]); addCirc(s.stone.x, s.stone.z, 0.7); if (S.names[s.v.id]) { s.g.target = 1; s.g.awake = 1; s.stone.lit = 1; addSiteSpirits(V3(s.stone.x, groundH(s.stone.x, s.stone.z), s.stone.z), 9, 10, 3); } }
  const hf = buildHeadFragment(scene, rockMat, storySpots.head.x + 3, storySpots.head.z - 2, 0.8); addCirc(hf[0], hf[1], hf[2] * 0.6);
  // diary pages: a folded paper with a faint glow
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xf1e6cc, roughness: 0.9, emissive: 0xffe6b0, emissiveIntensity: 0.25, side: THREE.DoubleSide });
  for (const pg of PAGES) { const sp = storySpots[pg.spot]; if (!sp) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.36), paperMat); m.rotation.set(-Math.PI / 2 + 0.15, rand() * 6, 0); m.position.set(sp.x, groundH(sp.x, sp.z) + 0.04, sp.z); m.visible = !S.pages.includes(pg.id); scene.add(m);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xfff0c8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(0.9); halo.position.copy(m.position).add(V3(0, 0.25, 0)); halo.visible = m.visible; scene.add(halo); pageMeshes.push({ pg, m, halo, x: sp.x, z: sp.z }); }
  if (S.final) finalAmbience();
}
let _gs = null; function glowSprite() { if (_gs) return _gs; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _gs = new THREE.CanvasTexture(c); return _gs; }
const sagaZones = () => SITES.map(s => [s.g.x, s.g.z, 26 * s.g.S / 1.6]).concat([[storySpots.graves.x, storySpots.graves.z, 9], [storySpots.swing.x, storySpots.swing.z, 6], [storySpots.sword.x, storySpots.sword.z, 5], [storySpots.head.x, storySpots.head.z, 9]]);
function returnName(site) {
  const v = site.v;
  showLore('A pedra lembra', v.nameText, 'lore', [O(`Dizer o nome em voz alta: "${v.name}"`, null, () => { pendingAfterDialog = () => { Speech.speak(v.name + '.', 'lore'); site.stone.lit = 1; Sound.chime(); setTimeout(() => startEcho(site), 1200); }; }), O('Agora não.', null)]);
}
function startEcho(site) {
  const def = site.v.echo; const c = site.echoAt.clone(); c.y = groundH(c.x, c.z);
  const fire = V3(c.x, c.y, c.z + 0.2);
  echo = new Echo(def, c, (k, x, z) => k === 'fire' ? fire : k === 'village' ? V3(0, 0, 0) : k === 'valley' ? V3(0, 0, 0) : k === 'player' ? V3(player.x, 0, player.z) : (echo && echo.figs ? (echo.figs.find(f => f.who === k) || { x: x + 1, z }) : { x: x + 1, z }), () => finishSite(site));
  echoSite = site; state = 'echo'; document.body.classList.add('cine'); combatT = 0;
  for (const e of enemies) if (!e.dead) { if (e.site === site.v.id || Math.hypot(e.x - c.x, e.z - c.z) < 45) damageEnemy(e, 999, V3(0, 0, 1), true); else { e.aggroed = false; e.state = 'return'; } }
}
let echoSite = null;
function finishSite(site) {
  const v = site.v; S.names[v.id] = 1; site.g.target = 1; echo = null; echoSite = null; state = 'play'; document.body.classList.remove('cine');
  addSiteSpirits(V3(site.stone.x, groundH(site.stone.x, site.stone.z), site.stone.z), 12, 11, 3.5);
  for (const e of enemies) if (e.site === v.id && !e.dead) damageEnemy(e, 999, V3(0, 0, 1), true);
  Sound.victory(); toast('Nome devolvido', `${v.name}, ${v.title}`); refreshQuest(); save();
  if (namesN() === 4) setTimeout(() => toast('Os quatro nomes', 'Vá aos túmulos dos Quatro ao anoitecer'), 4500);
}
function startFinal() {
  const c = storySpots.graves.clone(); c.y = groundH(c.x, c.z);
  echo = new Echo(FINAL_ECHO, V3(c.x, c.y, c.z + 0.5), (k, x, z) => V3(player.x, 0, player.z), () => { echo = null; state = 'play'; document.body.classList.remove('cine'); S.final = 1; save(); refreshQuest(); finalAmbience(); showEnding(); });
  state = 'echo'; echoSite = { lookAt: V3(0, 6, 0), echoAt: c }; document.body.classList.add('cine');
}
function finalAmbience() { for (const s of SITES) { s.g.target = 1; } for (let i = 0; i < 4; i++) addSiteSpirits(V3(rr(-40, 40), groundH(0, 0), rr(-40, 40)), 6, 14, 6); }
function showEnding() { $('ending').hidden = false; Sound.victory(); setTimeout(() => { $('ending').classList.add('show'); }, 50); }
function readPage(pm) {
  const pg = pm.pg; if (!S.pages.includes(pg.id)) { S.pages.push(pg.id); pm.m.visible = false; pm.halo.visible = false; Sound.pickup(); save(); }
  showLore(pg.title, pg.text, /Elowen/.test(pg.title) ? 'elowen' : 'lore'); refreshQuest();
}
function openJournal() {
  const list = $('journalList'); list.innerHTML = '';
  if (!S.pages.length) list.innerHTML = '<p class="empty">Nenhuma página ainda. Elas costumam ficar nos cantos que alguém amou.</p>';
  for (const id of S.pages) { const pg = PAGES.find(p => p.id === id); const b = document.createElement('article'); b.innerHTML = `<h3>${pg.title}</h3><p>${pg.text}</p>`; list.appendChild(b); }
  const nm = $('journalNames'); nm.innerHTML = VIGIAS.map(v => S.names[v.id] ? `<li><b>${v.name}</b>, ${v.title}</li>` : '<li class="unk">Um nome ainda esquecido</li>').join('');
  $('journal').hidden = false; prevJournalState = state; if (state === 'play') state = 'journal';
}
let prevJournalState = 'play';
function closeJournal() { $('journal').hidden = true; if (state === 'journal') state = 'play'; }

// =====================================================================
// interactions
// =====================================================================
let curInter = null;
function interactables() {
  const out = [];
  for (const n of npcs) out.push({ x: n.x, z: n.z, r: 2.6, label: 'Falar com ' + n.name, act: () => openDialog(n) });
  for (const s of SITES) if (!S.names[s.v.id]) out.push({ x: s.stone.x, z: s.stone.z, r: 3, label: 'Tocar a pedra da runa', act: () => { if (!S.met.bento) { showLore('Uma pedra com runa', 'A runa brilha de leve sob a lanterna, mas a pedra não diz nada. Talvez alguém na vila saiba o que ela guarda.'); return; } returnName(s); } });
  else out.push({ x: s.stone.x, z: s.stone.z, r: 3, label: 'Ler a pedra', act: () => showLore(s.v.name, s.v.nameText) });
  for (const pm of pageMeshes) if (!S.pages.includes(pm.pg.id)) out.push({ x: pm.x, z: pm.z, r: 2.2, label: 'Ler a página', act: () => readPage(pm) });
  const gv = storySpots.graves; out.push({ x: gv.x, z: gv.z - 2.5, r: 3.2, label: 'Ler as lápides', act: () => { if (namesN() === 4 && !S.final && (hour >= 18.3 || hour < 5)) { startFinal(); return; } showLore('Túmulos dos Quatro', 'Teodor, que contou as chaminés. Iara, que olhava para cima. Brás, que ria primeiro. E uma pedra mais nova, de outra cor: Elowen, que voltou para casa.' + (namesN() === 4 && !S.final ? ' O sol ainda está alto. Ela gostava do entardecer.' : '')); } });
  const bn = storySpots.bench; out.push({ x: bn.x, z: bn.z, r: 2, label: 'Sentar e esperar o entardecer', act: () => { $('fade').style.opacity = 1; setTimeout(() => { if (hour < 18.4 && hour > 5) hour = 18.5; else if (hour >= 5 && hour < 18.4) hour = 18.5; $('fade').style.opacity = 0; toast('O sol baixou', ''); }, 1300); } });
  const sw = storySpots.swing; out.push({ x: sw.x - 1.5, z: sw.z - 1.1, r: 2, label: 'Empurrar o balanço', act: () => { swingPush = 1.2; Sound.play && Sound.play('gear', { vol: 0.3, rate: 0.6 }); } });
  return out;
}
let swingPush = 0;
function checkInteract() {
  if (state !== 'play') { curInter = null; $('prompt').hidden = true; return; }
  let best = null, bd = 1e9; const fx = Math.sin(player.h), fz = Math.cos(player.h);
  for (const it of interactables()) { const dx = it.x - player.x, dz = it.z - player.z, d = Math.hypot(dx, dz); if (d > it.r) continue; const dot = (dx * fx + dz * fz) / (d || 1); if (dot < 0.2 && d > 1.3) continue; const sc = d - dot; if (sc < bd) { bd = sc; best = it; } }
  curInter = best; const pr = $('prompt'); if (best) { pr.hidden = false; pr.innerHTML = `<kbd>${isTouch ? 'Usar' : 'E'}</kbd>${best.label}`; } else pr.hidden = true;
}
function interact() { if (state === 'play' && curInter) { curInter.act(); refreshQuest(); } }
function useBandage() { }
function checkDiscover() {
  for (const k of ['lake', 'tower', 'camp', 'stones']) { if (S.found[k]) continue; const p = POI[k]; if (Math.hypot(player.x - p.x, player.z - p.z) < (k === 'lake' ? 90 : 32)) { S.found[k] = 1; toast('Lugar descoberto', p.name); Sound.chime(); refreshQuest(); save(); } }
  if (!S.found.peaks && Math.hypot(player.x - POI.peaks.x, player.z - POI.peaks.z) < 40) { S.found.peaks = 1; toast('Lugar descoberto', 'O mirante de Maren'); Sound.chime(); refreshQuest(); save(); }
}

// =====================================================================
// HUD
// =====================================================================
const cmp = $('compassCv').getContext('2d');
function drawCompass() {
  const W = 880, H = 76; cmp.clearRect(0, 0, W, H); const fwd = camFwd; const head = ((Math.atan2(fwd.x, -fwd.z) * 180 / Math.PI) + 360) % 360; const ppd = W / 200;
  const g = cmp.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.2, 'rgba(12,10,8,.5)'); g.addColorStop(0.8, 'rgba(12,10,8,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); cmp.fillStyle = g; cmp.fillRect(0, 16, W, 36);
  const labels = { 0: 'N', 45: 'NE', 90: 'L', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' }; cmp.textAlign = 'center'; cmp.textBaseline = 'middle';
  for (let d = Math.floor((head - 100) / 15) * 15; d <= head + 100; d += 15) { const x = W / 2 + (d - head) * ppd; const dd = ((d % 360) + 360) % 360; cmp.globalAlpha = 1 - Math.abs(d - head) / 100;
    if (labels[dd] !== undefined) { cmp.fillStyle = dd === 0 ? '#e8b878' : '#efe6d2'; cmp.font = (dd % 90 === 0 ? '600 30px ' : '500 22px ') + '"Cormorant Garamond",Georgia,serif'; cmp.fillText(labels[dd], x, 34); } else { cmp.fillStyle = 'rgba(239,230,210,.5)'; cmp.fillRect(x - 1, 29, 2, 10); } }
  cmp.globalAlpha = 1; const o = objectives().find(x => x.tgt);
  if (o) { const t = o.tgt; const b = (Math.atan2(t.x - player.x, -(t.z - player.z)) * 180 / Math.PI + 360) % 360; let dd = b - head; while (dd > 180) dd -= 360; while (dd < -180) dd += 360; const x = W / 2 + clamp(dd, -96, 96) * ppd;
    cmp.fillStyle = '#d9b56a'; cmp.beginPath(); cmp.moveTo(x, 6); cmp.lineTo(x + 8, 14); cmp.lineTo(x, 22); cmp.lineTo(x - 8, 14); cmp.fill(); cmp.font = '500 18px Inter,system-ui,sans-serif'; cmp.fillText(Math.round(Math.hypot(t.x - player.x, t.z - player.z)) + ' m', x, 66); }
  cmp.fillStyle = '#efe6d2'; cmp.fillRect(W / 2 - 1, 16, 2, 8);
}
let mapBase = null;
function buildMapBase() {
  const c = document.createElement('canvas'); c.width = c.height = NV; const ctx = c.getContext('2d'); const img = ctx.createImageData(NV, NV);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) { const k = j * NV + i; const h = HGT[k]; let col = [0.33, 0.42, 0.22]; const sp = [SPLAT[k * 4], SPLAT[k * 4 + 1], SPLAT[k * 4 + 2], SPLAT[k * 4 + 3]];
    const mix = (a, b, t) => a.map((v, q) => lerp(v, b[q], t)); col = mix(col, [0.5, 0.42, 0.3], sp[0]); col = mix(col, [0.6, 0.58, 0.54], sp[3]); col = mix(col, [0.5, 0.48, 0.45], sp[1]); col = mix(col, [0.92, 0.94, 0.96], sp[2]);
    const fd = forestDensity(i * CELL - HALF, j * CELL - HALF); col = mix(col, [0.17, 0.25, 0.14], clamp(fd * 2.5, 0, 0.7) * (1 - sp[1]) * (1 - sp[2]));
    const sh = clamp(0.8 + (NRM[k * 3] * -0.9 + NRM[k * 3 + 2] * -0.6) * 1.3, 0.4, 1.35); if (h < WATER) col = [0.16, 0.26, 0.3]; else col = col.map(v => v * sh);
    img.data[k * 4] = clamp(col[0], 0, 1) * 255; img.data[k * 4 + 1] = clamp(col[1], 0, 1) * 255; img.data[k * 4 + 2] = clamp(col[2], 0, 1) * 255; img.data[k * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0); mapBase = c;
}
function drawMap() {
  const cv = $('mapCv'), ctx = cv.getContext('2d'); const W = cv.width; const view = 1200; const sc = W / view; const tx = x => (x + view / 2) * sc, tz = z => (z + view / 2) * sc;
  ctx.fillStyle = '#0b0a08'; ctx.fillRect(0, 0, W, W); const src = (HALF - view / 2) / CELL; ctx.drawImage(mapBase, src, src, view / CELL, view / CELL, 0, 0, W, W);
  ctx.fillStyle = 'rgba(30,22,14,0.12)'; ctx.fillRect(0, 0, W, W);
  ctx.strokeStyle = 'rgba(120,90,60,.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); for (const p of PATHS) { ctx.beginPath(); p.forEach(([x, z], i) => i ? ctx.lineTo(tx(x), tz(z)) : ctx.moveTo(tx(x), tz(z))); ctx.stroke(); } ctx.setLineDash([]);
  ctx.font = '600 22px "Cormorant Garamond",Georgia,serif'; ctx.textAlign = 'center';
  for (const k in POI) { const p = POI[k]; const known = k === 'village' || S.found[k]; ctx.fillStyle = known ? '#1c1610' : 'rgba(28,22,16,.4)'; ctx.beginPath(); ctx.arc(tx(p.x), tz(p.z), 5, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,248,230,.7)'; ctx.lineWidth = 3; ctx.strokeText(known ? p.name : '?', tx(p.x), tz(p.z) - 12); ctx.fillText(known ? p.name : '?', tx(p.x), tz(p.z) - 12); }
  const o = objectives().find(x => x.tgt); if (o) { ctx.strokeStyle = '#8a2a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx(o.tgt.x), tz(o.tgt.z), 12, 0, 7); ctx.stroke(); }
  ctx.save(); ctx.translate(tx(player.x), tz(player.z)); ctx.rotate(Math.PI - player.h); ctx.fillStyle = '#8a2a1a'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 9); ctx.lineTo(0, 4); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function toast(t, sub) { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = sub ? `<small>${t}</small>${sub}` : t; $('toasts').appendChild(d); setTimeout(() => d.remove(), 4300); }
function updateHUD(dt) {
  $('hpFill').style.transform = `scaleX(${player.hp / 100})`; $('stFill').style.transform = `scaleX(${player.st / 100})`;
  
  const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60); $('clock').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  hurtA = Math.max(0, hurtA - dt * 1.4); post.grade.uniforms.hurt.value = Math.max(hurtA, player.hp < 30 ? 0.35 + 0.15 * Math.sin(elapsed * 3) : 0);
  drawCompass(); if (!$('mapView').hidden) drawMap();
}

// =====================================================================
// world effects update
// =====================================================================
const windV = new THREE.Vector2();
function updateWorldFX(dt) {
  windV.set(Math.cos(elapsed * 0.02) * 1.0, Math.sin(elapsed * 0.017) * 0.6 + 0.3); U.wind.value.copy(windV); U.windStrength.value = 0.7 + 0.5 * Math.sin(elapsed * 0.11) * Math.sin(elapsed * 0.037 + 1);
  for (const sp of smokes) { if (Math.hypot(sp.x - camera.position.x, sp.z - camera.position.z) > 180) continue; if (rand() < dt * 3) smoke.emit({ x: sp.x + rr(-0.15, 0.15), y: sp.y, z: sp.z + rr(-0.15, 0.15), vx: rr(-0.1, 0.1), vy: rr(0.7, 1.1), vz: rr(-0.1, 0.1), drag: 0.25, life: rr(5, 8), s0: 0.4, s1: rr(2.6, 4), c: [0.7, 0.69, 0.68], a0: 0.16, fadeIn: 0.15, wind: 0.9 }); }
  for (const f of fires) {
    if (f.dead) { if (rand() < dt * 1.5 && Math.hypot(f.p.x - camera.position.x, f.p.z - camera.position.z) < 100) smoke.emit({ x: f.p.x, y: f.p.y, z: f.p.z, vx: 0, vy: 0.4, vz: 0, drag: 0.3, life: 5, s0: 0.2, s1: 1.4, c: [0.6, 0.6, 0.6], a0: 0.08, fadeIn: 0.2, wind: 0.8 }); continue; }
    if (f.light) f.light.intensity = f.base * (0.75 + 0.18 * Math.sin(elapsed * 13 + f.p.x) * Math.sin(elapsed * 7.3 + f.p.z) + 0.1 * Math.sin(elapsed * 23)) * (0.35 + 0.65 * (1 - sky.dayF * 0.6));
    if (Math.hypot(f.p.x - camera.position.x, f.p.z - camera.position.z) > 120 || f.forge) continue;
    const n = f.big ? 4 : 3; for (let i = 0; i < n; i++) if (rand() < dt * 30) fireP.emit({ x: f.p.x + rr(-0.25, 0.25), y: f.p.y - 0.35, z: f.p.z + rr(-0.25, 0.25), vx: rr(-0.1, 0.1), vy: rr(0.8, 1.6), vz: rr(-0.1, 0.1), life: rr(0.35, 0.7), s0: rr(0.35, 0.6), s1: 0.05, c: [1.0, rr(0.4, 0.6), 0.15], a0: 0.85, wind: 0.2 });
    if (rand() < dt * 2) smoke.emit({ x: f.p.x, y: f.p.y + 0.6, z: f.p.z, vx: 0, vy: 0.8, vz: 0, drag: 0.3, life: 5, s0: 0.3, s1: 2.0, c: [0.5, 0.5, 0.5], a0: 0.12, fadeIn: 0.2, wind: 0.8 });
    if (rand() < dt * 4) fireP.emit({ x: f.p.x, y: f.p.y, z: f.p.z, vx: rr(-0.3, 0.3), vy: rr(1.5, 3), vz: rr(-0.3, 0.3), life: rr(1, 2), s0: 0.04, s1: 0.02, c: [1, 0.55, 0.2], a0: 1, wind: 0.6 });
  }
  const w2 = { x: windV.x, y: windV.y }; smoke.update(dt, w2); fireP.update(dt, w2); dust.update(dt, w2); flashP.update(dt, w2);
  const amb = new THREE.Color().copy(U.sunColor.value).multiplyScalar(0.5 * sky.dayF).add(new THREE.Color(0.35, 0.4, 0.48).multiplyScalar(0.2 + 0.5 * sky.dayF)); smoke.mat.uniforms.amb.value.copy(amb); dust.mat.uniforms.amb.value.copy(amb).multiplyScalar(1.4);
  M.glass.emissiveIntensity = (cam.inK || 0) > 0.5 ? 0 : sky.nightF * 1.1;
}

// =====================================================================
// input
// =====================================================================
const canvas = renderer.domElement;
function requestLock() {
  if (isTouch || lockFailed) return;
  try { const r = canvas.requestPointerLock && canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { lockFailed = true; showLookHint(); }); } catch (e) { lockFailed = true; }
  setTimeout(() => { if (!locked && state === 'play') { lockFailed = true; showLookHint(); } }, 700);
}
let hintShown = false; function showLookHint() { if (hintShown) return; hintShown = true; toast('Câmera', 'Arraste o mouse ou use as setas para girar'); }
document.addEventListener('pointerlockchange', () => { const was = locked; locked = document.pointerLockElement === canvas; if (was && !locked && state === 'play') pauseGame(); });
document.addEventListener('pointerlockerror', () => { lockFailed = true; showLookHint(); });
let prevState = 'play';
function pauseGame() { if (state !== 'play' && state !== 'dialog') return; prevState = state; state = 'paused'; mouseL = mouseR = false; $('pause').hidden = false; $('pauseInfo').textContent = `São ${$('clock').textContent} no vale. O progresso é salvo automaticamente neste navegador.`; }
function resume() { $('pause').hidden = true; state = prevState === 'dialog' && dlgNode ? 'dialog' : 'play'; if (state === 'play') { $('dialog').hidden = true; post.bokeh.enabled = false; } requestLock(); }
let drag = null;
canvas.addEventListener('mousedown', (e) => {
  window.focus();
  if (state !== 'play') return;
  if (!locked && !lockFailed && !isTouch) requestLock();
  if (e.button === 2) mouseR = true;
  if (e.button === 0) { if (locked || player.aim > 0.5) mouseL = true; }
  if (!locked) drag = { x: e.clientX, y: e.clientY, moved: 0, btn: e.button };
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; if (e.button === 2) mouseR = false; drag = null; });
addEventListener('mousemove', (e) => { if (state !== 'play') return; let mx = 0, my = 0; if (locked) { mx = e.movementX; my = e.movementY; } else if (drag) { mx = e.clientX - drag.x; my = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; } else return; mx = clamp(mx, -200, 200); my = clamp(my, -200, 200); const s = (player.aim > 0.5 ? 0.0013 : 0.0021) * (locked ? 1 : 1.6); cam.yaw -= mx * s; cam.pitch = clamp(cam.pitch - my * s, -1.2, 0.95); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => {
  keys[e.code] = true; if (state === 'echo' && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) { echo && echo.skip(); return; }
  if (e.code === 'KeyJ' && !e.repeat) { if (state === 'journal') closeJournal(); else if (state === 'play') openJournal(); return; }
  if (state === 'journal' && e.code === 'Escape') { closeJournal(); return; } if (/^Arrow|Space/.test(e.code) && state === 'play') e.preventDefault(); if (e.repeat) return;
  if (state === 'dialog') { const m = e.code.match(/^(Digit|Numpad)([1-9])$/); if (m) choose(+m[2] - 1); else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { if (dlgNode && dlgNode.opts.length === 1) choose(0); } return; }
  if (state !== 'play') return;
  if (e.code === 'Digit1') setWeapon('rifle'); if (e.code === 'Digit2') setWeapon('sword'); if (e.code === 'KeyQ') setWeapon(pH.weapon === 'sword' ? 'rifle' : 'sword'); if (e.code === 'KeyL') toggleLantern();
  if (e.code === 'KeyE') interact(); if (e.code === 'KeyH') useBandage(); if (e.code === 'KeyR') startReload(); if (e.code === 'KeyC') { player.walk = !player.walk; toast(player.walk ? 'Andando' : 'Correndo leve', ''); }
  if (e.code === 'Space') e.preventDefault(); if (e.code === 'KeyM') $('mapView').hidden = !$('mapView').hidden; if (e.code === 'Escape' && lockFailed) pauseGame();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post && post.setSize(innerWidth, innerHeight); });
$('resumeBtn').onclick = (e) => { e.stopPropagation(); resume(); };
let resetArm = false; $('resetBtn').onclick = (e) => { e.stopPropagation(); if (!resetArm) { resetArm = true; $('resetConfirm').hidden = false; return; } store.del(SAVE_KEY); location.reload(); };
$('mapView').addEventListener('click', () => { $('mapView').hidden = true; });
document.querySelectorAll('.quality button[data-q]').forEach(b => { b.setAttribute('aria-pressed', b.dataset.q === settings.quality); b.addEventListener('click', (e) => { e.stopPropagation(); settings.quality = b.dataset.q; store.set('aldren2-q', settings.quality); $('qualNote').hidden = false; document.querySelectorAll('.quality button[data-q]').forEach(x => x.setAttribute('aria-pressed', x.dataset.q === settings.quality)); }); });
$('reloadQ').onclick = () => location.reload();
$('endBtn').onclick = (e) => { e.stopPropagation(); $('ending').hidden = true; $('ending').classList.remove('show'); requestLock(); };
function setupTouch() {
  document.body.classList.add('touchmode'); $('touch').hidden = false; $('keysList').hidden = true; let joyId = null, lookId = null, jx = 0, jy = 0, lx = 0, ly = 0; const joy = $('joy'), knob = $('joyKnob');
  addEventListener('touchstart', (e) => { if (state !== 'play') return; for (const t of e.changedTouches) { if (t.target.closest('button')) continue; if (t.clientX < innerWidth * 0.45 && joyId === null) { joyId = t.identifier; jx = t.clientX; jy = t.clientY; joy.style.left = (jx - 60) + 'px'; joy.style.top = (jy - 60) + 'px'; joy.style.bottom = 'auto'; } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; } } }, { passive: true });
  addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { if (t.identifier === joyId) { let dx = t.clientX - jx, dy = t.clientY - jy; const d = Math.hypot(dx, dy); if (d > 50) { dx *= 50 / d; dy *= 50 / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; touch.mx = dx / 50; touch.my = -dy / 50; } else if (t.identifier === lookId && state === 'play') { cam.yaw -= (t.clientX - lx) * 0.005; cam.pitch = clamp(cam.pitch - (t.clientY - ly) * 0.005, -1.1, 0.9); lx = t.clientX; ly = t.clientY; } } }, { passive: true });
  const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === joyId) { joyId = null; touch.mx = touch.my = 0; knob.style.transform = ''; } if (t.identifier === lookId) lookId = null; } }; addEventListener('touchend', end); addEventListener('touchcancel', end);
  const tb = (id, fn, up) => { const b = $(id); b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); if (up) b.addEventListener('touchend', (e) => { e.preventDefault(); up(); }); };
  tb('tbFire', () => { touch.fire = true; }); tb('tbAim', () => { touch.aim = !touch.aim; $('tbAim').classList.toggle('on', touch.aim); }); tb('tbUse', () => { if (state === 'dialog') choose(0); else interact(); }); tb('tbJump', () => { touch.jump = true; }); tb('tbHeal', useBandage); tb('tbMap', () => { $('mapView').hidden = !$('mapView').hidden; }); tb('tbRun', () => { touch.run = !touch.run; $('tbRun').classList.toggle('on', touch.run); }); tb('tbReload', startReload);
}

// =====================================================================
// main loop
// =====================================================================
// ---------- interiors, doors, lantern, water ----------
const INTRO_T = 6.5; let combatT = 0; let hearthLights = [], candleLight = null;
function updateDoors(dt) {
  for (const d of doors) { let near = Math.hypot(player.x - d.p.x, player.z - d.p.z) < 2.6; for (const n of npcs) if (Math.hypot(n.x - d.p.x, n.z - d.p.z) < 2) near = true;
    d.target = near ? 1 : 0; if (near !== d.was) { d.was = near; if (Math.hypot(camera.position.x - d.p.x, camera.position.z - d.p.z) < 30) Sound.door(near, d.p.x, d.p.z); }
    d.open = lerp(d.open, d.target, 1 - Math.exp(-dt * 3.5)); d.pivot.rotation.y = d.rot - d.open * 1.75; }
}
function updateInteriorLights(dt) {
  const list = interiors.map(h => ({ h, d: Math.hypot(h.x - camera.position.x, h.z - camera.position.z) })).sort((a, b) => a.d - b.d);
  hearthLights.forEach((l, i) => { const it = list[i]; if (!it || it.d > 45) { l.intensity = 0; return; } l.position.copy(it.h.fire).add(V3(0, 0.3, 0)); l.intensity = (5 + 1.5 * Math.sin(elapsed * 11 + i) * Math.sin(elapsed * 7.3) + rand() * 0.8) * clamp(1 - it.d / 45, 0, 1);
    if (it.d < 25 && rand() < dt * 25) fireP.emit({ x: it.h.fire.x + rr(-0.2, 0.2), y: it.h.fire.y - 0.1, z: it.h.fire.z + rr(-0.1, 0.1), vx: 0, vy: rr(0.5, 1.0), vz: 0, life: rr(0.3, 0.6), s0: rr(0.25, 0.4), s1: 0.04, c: [1, rr(0.4, 0.6), 0.15], a0: 0.85, wind: 0 }); });
  const ih = insideHouse(player.x, player.z); if (candleLight) { if (ih) { candleLight.position.copy(ih.candle); candleLight.intensity = 1.6 + 0.3 * Math.sin(elapsed * 17) * Math.sin(elapsed * 5); } else candleLight.intensity = 0; }
}
let lantern = null, lanternOn = false, lanternK = 0;
function buildLantern() {
  const g = new THREE.Group(); const frame = new THREE.MeshStandardMaterial({ color: 0x2a2620, metalness: 0.8, roughness: 0.45 }); const glass = new THREE.MeshStandardMaterial({ color: 0xe6f6ff, emissive: 0x9fdcff, emissiveIntensity: 0, transparent: true, opacity: 0.55, roughness: 0.1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.16, 12), glass); g.add(body); for (const y of [-0.09, 0.09]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 12), frame); r.position.y = y; g.add(r); }
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.06, 12), frame); top.position.y = 0.13; g.add(top); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 12), frame); ring.position.y = 0.18; g.add(ring);
  const light = new THREE.PointLight(0xcfe9ff, 0, 16, 1.5); light.position.set(0, 0.02, 0.12); g.add(light);
  lantern = { g, glass, light }; lantern.g.visible = false; scene.add(g);
}
function toggleLantern() { lanternOn = !lanternOn; Sound.pickup(); toast(lanternOn ? 'A lanterna de Elowen acende' : 'Lanterna apagada', ''); }
function updateLantern(dt) {
  if (!lantern || !pH) return; lanternK = lerp(lanternK, lanternOn ? 1 : 0, 1 - Math.exp(-dt * 6)); lantern.g.visible = lanternK > 0.02;
  if (!lantern.g.visible) { lantern.light.intensity = 0; return; }
  // hangs from the belt on the left hip, swinging a little with the stride
  const hip = pH.bones.Hips; const hp = hip.getWorldPosition(V3()); const rq = pH.root.quaternion; const off = V3(0.26, -0.1, 0.12).applyQuaternion(rq);
  const sw = Math.sin(elapsed * (2 + player.speed * 1.4)) * 0.05 * clamp(player.speed / 2, 0.2, 1); lantern.g.position.copy(hp).add(off).add(V3(0, -0.12, 0)); lantern.g.rotation.set(sw, player.h, sw * 0.6);
  const fl = 0.92 + 0.08 * Math.sin(elapsed * 23) * Math.sin(elapsed * 9.7); lantern.light.intensity = 5.5 * lanternK * fl; lantern.glass.emissiveIntensity = 2.2 * lanternK * fl;
  if (sky.nightF > 0.6 && !lanternOn && !S.lanternTip && state === 'play') { S.lanternTip = true; toast('Está escuro', 'Pressione L para acender a lanterna'); }
}
const ripples = []; let rippleMat = null;
function buildRipples() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 40, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  rippleMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, color: 0xdfe8ea });
  for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rippleMat.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 4; scene.add(m); ripples.push({ m, t: 1, life: 1, s: 1 }); }
}
function ripple(x, z, s = 1) { const r = ripples.find(r => r.t >= r.life) || ripples[0]; r.t = 0; r.life = rr(1.2, 2.0); r.s = s; r.m.position.set(x, WATER + 0.035, z); r.m.visible = true; }
function updateRipples(dt) { for (const r of ripples) { if (r.t >= r.life) { r.m.visible = false; continue; } r.t += dt; const k = r.t / r.life; r.m.scale.setScalar(0.3 + k * 2.6 * r.s); r.m.material.opacity = (1 - k) * 0.45 * (0.3 + 0.7 * sky.dayF + 0.3); } }
function waterStep(x, z, depth, speed) { ripple(x, z, 0.8 + speed * 0.15); for (let i = 0; i < 10 + speed * 3; i++) dust.emit({ x: x + rr(-0.2, 0.2), y: WATER + 0.05, z: z + rr(-0.2, 0.2), vx: rr(-0.8, 0.8), vy: rr(1, 2.4) * clamp(speed / 3, 0.5, 1.4), vz: rr(-0.8, 0.8), g: 9, drag: 0.5, life: rr(0.35, 0.7), s0: 0.05, s1: 0.12, c: [0.85, 0.9, 0.92], a0: 0.55, wind: 0 }); Sound.splash(x, z, clamp(speed / 3, 0.4, 1.2)); }

// ---------- adaptive quality: keep the game fluid on any GPU ----------
const perf = { acc: 0, n: 0, level: 0, cool: 3, prBase: 1 };
function applyLevel() {
  const L = perf.level; const q = Q();
  const prK = [1, 0.85, 0.72, 0.62, 0.55, 0.5][Math.min(L, 5)];
  renderer.setPixelRatio(q.pr * prK); post.setSize(innerWidth, innerHeight);
  settings.grassK = [1, 1, 0.8, 0.65, 0.5, 0.4][Math.min(L, 5)]; settings.treeK = [1, 1, 0.85, 0.7, 0.6, 0.5][Math.min(L, 5)];
  setPropRadius([1, 1, 0.8, 0.65, 0.5, 0.4][Math.min(L, 5)]);
  if (L >= 2 && post.bloom) post.bloom.enabled = false; if (L >= 1 && post.ao) post.ao.enabled = false;
  trees.nearCenter.set(1e9, 0, 1e9);
}
function adaptQuality(dt) {
  if (MANUAL || state === 'loading' || state === 'paused' || document.hidden) return;
  perf.acc += dt; perf.n++; perf.cool -= dt;
  if (perf.acc >= 2) { const fps = perf.n / perf.acc; perf.acc = 0; perf.n = 0; window.__fps = fps;
    if (perf.cool <= 0 && fps < 30 && perf.level < 4) { perf.level++; perf.cool = 3; applyLevel(); }
    else if (perf.cool <= 0 && fps > 58 && perf.level > 0 && perf.upOK) { perf.level--; perf.cool = 8; applyLevel(); }
  }
}
const clock = new THREE.Clock(false); let saveT = 0, menuAng = 0, fpsAcc = 0, fpsN = 0;
const MANUAL = /manual=1/.test(location.search); let motes = null;
function rafFrame() { frame(); }
function frame(fixedDt) {
  if (!MANUAL) requestAnimationFrame(rafFrame);
  const raw = clock.getDelta(); let dt = typeof fixedDt === 'number' ? fixedDt : Math.min(raw, 0.05); if (hitStop > 0) { hitStop -= dt; dt *= 0.2; } elapsed += dt; U.time.value = elapsed; fpsAcc += dt; fpsN++;
  if (state !== 'paused' && state !== 'loading') { hour += dt * 24 / 2400; if (hour >= 24) { hour -= 24; S.day++; } }
  sky.setHour(hour);
  if (state === 'echo' || state === 'journal') {
    pH.locomote(0); pH.update(dt); updateNPCs(dt); updateEnemies(dt);
    if (echo) echo.update(dt, camera.position);
    updateCamera(dt); post.grade.uniforms.letterbox.value = lerp(post.grade.uniforms.letterbox.value, state === 'echo' ? 1 : 0, 1 - Math.exp(-dt * 3));
  } else if (state === 'play' || state === 'dialog' || state === 'dead') {
    if (state !== 'dead') updatePlayer(dt); else pH.update(dt);
    updateNPCs(dt); updateEnemies(dt); checkInteract(); if (state === 'play') checkDiscover();
    cam.cine = clamp(cam.cine + (state === 'dialog' && dlgNPC && dlgNPC.h ? dt * 2 : -dt * 3), 0, 1);
    updateCamera(dt);
    if (post.bokeh.enabled && dlgNPC && dlgNPC.h) { post.bokeh.uniforms.focus.value = camera.position.distanceTo(dlgNPC.h.headPos); }
    post.grade.uniforms.letterbox.value = lerp(post.grade.uniforms.letterbox.value, cam.cine > 0.3 ? 1 : 0, 1 - Math.exp(-dt * 6));
    saveT += dt; if (saveT > 12) { saveT = 0; save(); }
  } else if (state === 'menu') {
    menuAng += dt * 0.025; const r = 34; const cx = Math.sin(menuAng) * r, cz = Math.cos(menuAng) * r + 4; camera.position.set(cx, groundH(cx, cz) + 4.5, cz); camera.lookAt(0, groundH(0, 0) + 3, 0); camera.fov = 50; camera.updateProjectionMatrix();
    updateNPCs(dt);
  }
  U.player.value.set(player.x, player.y, player.z);
  sky.update({ x: player.x, y: player.y, z: player.z, camPos: camera.position }, dt);
  scene.environmentIntensity *= lerp(1, 0.16, cam.inK || 0); sky.sun.intensity *= lerp(1, 0.85, cam.inK || 0);
  updateDoors(dt); updateInteriorLights(dt); updateLantern(dt); updateRipples(dt); combatT -= dt;
  updateGiants(dt, elapsed); updateNameStones(dt, elapsed); const obj = (state !== 'menu' && bento) ? objectives().find(o => o.tgt) : null; updateSpirits(dt, elapsed, player, obj ? obj.tgt : null, sky.nightF, player.speed > 0.3); if (motes) motes.update(elapsed, camera.position.x, camera.position.z, sky.dayF, sky.nightF, U.wind.value);
  post.updateLook(U.sunDir.value, sky.dayF, sky.nightF, sky.dusk || 0, U.sunColor.value);
  const focus = state === 'menu' ? camera.position : V3(player.x, 0, player.z);
  grass.update(focus.x, focus.z, 2); updateProps(camera.position.x, camera.position.z);
  adaptQuality(dt);
  const amb = new THREE.Color(0.32, 0.4, 0.52).multiplyScalar(0.05 + 0.6 * sky.dayF).lerp(new THREE.Color(0.02, 0.025, 0.04), sky.nightF);
  trees.update(V3(camera.position.x, 0, camera.position.z), amb);
  updateWorldFX(dt);
  if (state !== 'menu' && state !== 'loading') updateHUD(dt);
  let fireNear = 0; for (const f of fires) if (!f.dead && !f.forge) fireNear = Math.max(fireNear, clamp(1 - Math.hypot(f.p.x - player.x, f.p.z - player.z) / 14, 0, 1));
  const lakeD = Math.hypot(player.x - POI.lake.x, player.z - POI.lake.z); const gw = groundH(player.x, player.z); Sound.update(dt, { x: camera.position.x, z: camera.position.z, y: player.y, yaw: cam.yaw, windStr: U.windStrength.value, fire: fireNear, trees: clamp(forestDensity(player.x, player.z) * 3 + 0.3, 0, 1), day: sky.dayF, night: sky.nightF, inside: (cam.inK || 0) > 0.5, lake: clamp(1 - lakeD / 140, 0, 1), shore: clamp(1 - Math.abs(gw - 0.3) / 2.5, 0, 1) * (gw < 3 ? 1 : 0), combat: combatT > 0 });
  if (!MANUAL || window.__renderNow) post.render(dt, elapsed);
  if (fpsAcc > 1) { window.__fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
}

$('startBtn').addEventListener('click', () => {
  Sound.init(); if (Sound.ctx && Sound.ctx.state === 'suspended') Sound.ctx.resume();
  $('menu').hidden = true; $('hud').hidden = false; state = 'play'; cam.yaw = player.h + Math.PI; cam.cur.set(player.x, player.y + 3, player.z + 4); refreshQuest(); if (!MANUAL) cam.intro = INTRO_T; if (pH) pH.weapon = 'sword'; $('weapon').querySelector('.name').textContent = 'Espada'; $('ammo').hidden = true;
  if (!S.letter) { S.letter = 1; setTimeout(() => { if (state === 'play') showLore('Carta de Elowen', 'Aprendiz. Quando esta carta chegar, eu já terei ido. Leve a minha lanterna até Aldren, o vale onde eu fui feliz sem perceber. Lá dormem quatro gigantes cujos nomes ninguém mais diz. Devolva os nomes. Não por eles. Por você. Há coisas que só se aprendem lembrando.', 'elowen'); }, MANUAL ? 0 : INTRO_T * 1000 + 600); }
  if (isTouch) setupTouch(); else requestLock();
  window.focus(); try { renderer.domElement.focus(); } catch (e) { }
  if (!S.intro) { S.intro = true; setTimeout(() => toast('Ecos de Aldren', 'Um vale que esqueceu os próprios nomes'), 1200); }
});
window.__game = { startEcho: (i) => startEcho(SITES[i]), startFinal: () => startFinal(), sites: SITES, openJournal: () => openJournal(), setWeapon: (w) => setWeapon(w), toggleLantern: () => toggleLantern(), setMouse: (l, r) => { mouseL = l; mouseR = r; }, tick: (dt, n = 1, renderLast = true) => { for (let i = 0; i < n; i++) frame(dt); }, post: () => post, sky: () => sky, camera, scene, player, S, enemies, npcs, cam, get state() { return state; }, set state(v) { state = v; }, setHour: (h) => { hour = h; }, get hour() { return hour; }, get exposure() { return renderer.toneMappingExposure; }, shoot, damageEnemy, openDialog, choose, get pH() { return pH; }, trees, grass, renderer };
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); store.set('aldren2-q', settings.quality === 'alta' ? 'media' : 'baixa'); $('loading').textContent = 'A placa de vídeo reiniciou. Recarregando com gráficos mais leves…'; $('menu').hidden = false; $('loadBar').parentElement.hidden = true; setTimeout(() => location.reload(), 1500); });
document.addEventListener('visibilitychange', () => { if (Sound.ctx) { if (document.hidden) Sound.ctx.suspend(); else Sound.ctx.resume(); } if (document.hidden && state === 'play') pauseGame(); });
boot().catch((e) => { console.error(e); $('loading').textContent = 'Falha ao carregar: ' + e.message; });
