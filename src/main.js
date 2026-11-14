import { THREE, renderer, scene, camera, U, Q, settings, store, clamp, lerp, smooth, rand, rr, angDiff, lerpAng, makeMacroTexture, loadGLTF, progress, isTouch, trackP } from './core.js';
import { computeTerrainData, buildTerrain, groundH, normalY, splatAt, POI, PATHS, MIRANTE, TRAIL, forestDensity, WATER, HGT, NRM, SPLAT, NV, CELL, HALF, creekDist } from './world/terrain.js';
import { buildWater, setWaterQuality } from './world/water.js';
import { SkySystem } from './world/sky.js';
import { Grass } from './world/grass.js';
import { Trees } from './world/trees.js';
import { loadVillageMaterials, buildVillage, colliders, villageDirt, smokes, fires, M, interiors, doors, insideHouse, inFootprint, storySpots, probe, lamps, windmills, seats, beds, inSolid } from './world/village.js';
import { Nav } from './actors/nav.js';
import { FLOWER_ZONES } from './world/landmarks.js';
import { LINES, CAST, PLACES, NOTES, FINALE, text as lineText } from './story.js';
import { buildGiant, buildHeadFragment, updateGiants, giants } from './world/giants.js';
import { Lume, initSpirits, addSiteSpirits, updateSpirits, Motes, LumeRain, GLOW } from './magic.js';
import { buildProps, updateProps, setPropRadius } from './world/props.js';
import { loadHumanLibrary, Human } from './actors/human.js';
import { loadAnimals, spawnAnimals, updateAnimals } from './actors/animals.js';
import { Post } from './post.js';
import { Sound, Music, Voice, Speech, preloadSounds } from './audio.js';

const $ = (id) => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// =====================================================================
// colisões
// =====================================================================
const CG = 10; const circGrid = new Map();
function addCirc(x, z, r) { const k = Math.floor(x / CG) + ',' + Math.floor(z / CG); let a = circGrid.get(k); if (!a) circGrid.set(k, a = []); a.push(x, z, r); }
function insideBox(x, z, m, y) { for (const b of colliders.boxes) { if (y !== undefined && (y + 1.7 < b.y0 || y > b.y1)) continue; const dx = x - b.x, dz = z - b.z; if (Math.abs(dx) > b.rad + m || Math.abs(dz) > b.rad + m) continue; const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.hw + m && Math.abs(lz) < b.hd + m) return true; } return false; }
function collide(p, r, y) {
  for (const b of colliders.boxes) {
    if (y !== undefined && (y + 1.7 < b.y0 || y > b.y1)) continue;
    const dx = p.x - b.x, dz = p.z - b.z; if (Math.abs(dx) > b.rad + r || Math.abs(dz) > b.rad + r) continue;
    let lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; const ex = b.hw + r, ez = b.hd + r;
    if (Math.abs(lx) < ex && Math.abs(lz) < ez) { if (ex - Math.abs(lx) < ez - Math.abs(lz)) lx = Math.sign(lx || 1) * ex; else lz = Math.sign(lz || 1) * ez; p.x = b.x + lx * b.c + lz * b.s; p.z = b.z - lx * b.s + lz * b.c; }
  }
  const cx = Math.floor(p.x / CG), cz = Math.floor(p.z / CG);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const arr = circGrid.get((cx + a) + ',' + (cz + b)); if (!arr) continue; for (let i = 0; i < arr.length; i += 3) { const dx = p.x - arr[i], dz = p.z - arr[i + 1], rr2 = arr[i + 2] + r; const d2 = dx * dx + dz * dz; if (d2 < rr2 * rr2 && d2 > 1e-6) { const d = Math.sqrt(d2); p.x = arr[i] + dx / d * rr2; p.z = arr[i + 1] + dz / d * rr2; } } }
}
function treeHit(x, z) { const cx = Math.floor(x / CG), cz = Math.floor(z / CG); const arr = circGrid.get(cx + ',' + cz); if (!arr) return false; for (let i = 0; i < arr.length; i += 3) { const dx = x - arr[i], dz = z - arr[i + 1]; if (dx * dx + dz * dz < arr[i + 2] * arr[i + 2]) return true; } return false; }

// =====================================================================
// partículas (fumaça, fogo, poeira, respingos)
// =====================================================================
function softTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
function smokeTex() { const S = 128; const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const id = g.createImageData(S, S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2); const r = Math.hypot(dx, dy); let n = 0, a = 1, f = 3; for (let o = 0; o < 4; o++) { n += a * (0.5 + 0.5 * Math.sin(x / S * f * 6.28 + Math.cos(y / S * f * 5.1) * 2 + o * 1.7) * Math.cos(y / S * f * 6.28 + o)); a *= 0.5; f *= 2; } const al = clamp((1 - r) * 1.4, 0, 1) * (0.55 + 0.45 * n / 1.9); const i = (y * S + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = al * 255; } g.putImageData(id, 0, 0); return new THREE.CanvasTexture(c); }
class Particles {
  constructor(max, tex, additive) {
    this.max = max; this.p = []; const g = new THREE.BufferGeometry();
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
    this.mat.uniforms.tex.value = tex;
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.layers.set(1); scene.add(this.points);
  }
  emit(o) { if (this.p.length >= this.max) this.p.shift(); this.p.push(Object.assign({ t: 0, life: 1, vx: 0, vy: 0, vz: 0, s0: 0.3, s1: 1, a0: 1, c: [1, 1, 1], drag: 0, g: 0, wind: 0 }, o)); }
  update(dt, wind) {
    let i = 0; const keep = [];
    for (const q of this.p) { q.t += dt; if (q.t >= q.life) continue; const k = q.t / q.life; q.vx *= 1 - q.drag * dt; q.vz *= 1 - q.drag * dt; q.vy = q.vy * (1 - q.drag * dt) - q.g * dt; q.x += (q.vx + wind.x * q.wind) * dt; q.y += q.vy * dt; q.z += (q.vz + wind.y * q.wind) * dt;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z; const a = q.a0 * (q.fadeIn ? Math.min(1, k / q.fadeIn) : 1) * (1 - k) * (1 - k * 0.3);
      this.col[i * 4] = q.c[0]; this.col[i * 4 + 1] = q.c[1]; this.col[i * 4 + 2] = q.c[2]; this.col[i * 4 + 3] = a; this.size[i] = lerp(q.s0, q.s1, Math.sqrt(k)); i++; keep.push(q); }
    this.p = keep; this.points.geometry.setDrawRange(0, i); for (const k of ['position', 'pcol', 'psize']) this.points.geometry.attributes[k].needsUpdate = true;
  }
}

// =====================================================================
// estado
// =====================================================================
const S = { met: {}, lumes: {}, notes: {}, final: 0, letter: 0, told: 0, chat: {}, day: 0, found: {}, sat: 0 };
let state = 'loading', hour = 16.4, elapsed = 0, timeLapse = 0;
const player = { x: 2, z: 44, y: 0, vy: 0, h: Math.PI, onGround: true, stepAcc: 0, speed: 0, sit: null, standT: 0 };
const cam = { yaw: 0, pitch: -0.1, dist: 3.4, cur: V3(), look: V3(), cine: 0, intro: 0, mode: 'follow', orbit: 0 };
const keys = {}; let locked = false, lockFailed = false;
const touch = { mx: 0, my: 0, run: false, jump: false };
let sky, trees, grass, post, smoke, fireP, dust, motes = null, water;
const npcs = []; let pH = null;
const SAVE_KEY = 'aldren-vale-v7';
const sketches = {}; // imagens do caderno (guardadas à parte, por tamanho)
function save() { store.set(SAVE_KEY, JSON.stringify({ S, p: { x: player.x, z: player.z, h: player.h }, hour })); }
function load() { const raw = store.get(SAVE_KEY); if (!raw) return false; try { const d = JSON.parse(raw); Object.assign(S, d.S); if (d.p) { player.x = d.p.x; player.z = d.p.z; player.h = d.p.h; cam.yaw = d.p.h + Math.PI; } if (typeof d.hour === 'number') hour = d.hour; for (const pl of PLACES) { const s = store.get('aldren-sketch-' + pl.id); if (s) sketches[pl.id] = s; } return true; } catch (e) { return false; } }

// =====================================================================
// inicialização
// =====================================================================
const SPOTS = {}; // onde contemplar cada lugar
async function boot() {
  preloadSounds(trackP); Speech.init();
  progress.onChange = () => { const f = progress.total ? progress.done / progress.total : 0; $('loadBar').style.transform = `scaleX(${0.08 + f * 0.62})`; };
  const step = async (label, frac, fn) => { $('loading').textContent = label; $('loadBar').style.transform = `scaleX(${frac})`; await new Promise(r => setTimeout(r, 20)); return fn(); };
  renderer.setPixelRatio(Q().pr); renderer.setSize(innerWidth, innerHeight); $('game').appendChild(renderer.domElement);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  makeMacroTexture();
  await step('Desenhando o vale…', 0.05, () => computeTerrainData(villageDirt));
  const rock = await loadGLTF('a/rock1.glb.wasm'); let rockMat; rock.scene.traverse(o => { if (o.isMesh) rockMat = o.material; });
  await step('Pintando o terreno…', 0.12, () => buildTerrain(scene, rockMat));
  water = await buildWater(scene);
  sky = new SkySystem(scene);
  trees = new Trees(scene);
  await step('Crescendo as árvores…', 0.2, () => trees.build());
  await loadVillageMaterials(trees.variants[0].bark);
  await step('Erguendo a vila…', 0.35, () => buildVillage(scene));
  for (const c of colliders.circles) addCirc(c[0], c[1], c[2]);
  load();
  await step('Os gigantes descansam…', 0.42, () => placeGiants(rockMat));
  const zones = [[POI.garden.x, POI.garden.z, 18], [POI.observatory.x, POI.observatory.z, 26], [POI.stairs.x, POI.stairs.z, 16], [POI.shrine.x, POI.shrine.z, 6], [POI.tower.x, POI.tower.z, 14], [POI.stones.x, POI.stones.z, 14], [POI.bridge.x, POI.bridge.z, 12], [-74, -34, 6]];
  const vEx = (x, z) => Math.hypot(x, z) < 62 || zones.some(zn => Math.hypot(x - zn[0], z - zn[1]) < zn[2]) || giants.some(g => Math.hypot(x - g.x, z - g.z) < 18) || creekDist(x, z) < 2.5;
  await step('Espalhando pedras e flores…', 0.48, () => buildProps(scene, { avoid: (x, z, r) => vEx(x, z) || pathDistOK(x, z, r), addCircle: addCirc, villageExclude: vEx, zones: FLOWER_ZONES() }));
  await step('Plantando a floresta…', 0.56, () => trees.scatter({ avoid: (x, z, r) => vEx(x, z) || pathDistOK(x, z, r + 1) || aqueductNear(x, z), forestDensity, groundH, normalY, onTree: (it) => { if (it.v.sp.type !== 'bush') addCirc(it.x, it.z, (it.v.sp.type === 'pine' ? 0.28 : 0.36) * it.s); }, extra: [[-12, -32, 'oakA', 1], [34, -12, 'oakB', 0.9], [-38, 22, 'ashA', 1], [10, 44, 'oakA', 1.1], [-52, -16, 'pineA', 1], [storySpots.treeRoot.x, storySpots.treeRoot.z, 'oakB', 1.45], [POI.shrine.x - 4, POI.shrine.z - 5, 'oakB', 1.5]] }));
  grass = new Grass(scene, { exclude: (x, z) => inFootprint(x, z, 0.1) || insideBox(x, z, 0.4) || treeHit(x, z) || Math.hypot(x - POI.observatory.x, z - POI.observatory.z) < 9.3 });
  await step('Chamando os moradores…', 0.66, () => Promise.all([loadHumanLibrary(), loadAnimals()]));
  initSpirits(); motes = new Motes(260);
  const sTex = smokeTex(), dTex = softTex();
  smoke = new Particles(700, sTex, false); fireP = new Particles(400, dTex, true); dust = new Particles(300, sTex, false);
  for (const f of fires) { if (f.dead) continue; const l = new THREE.PointLight(f.forge ? 0xff6a20 : 0xff8a3a, 0, f.big ? 26 : 16, 2); l.position.copy(f.p).add(V3(0, f.forge ? 0 : 0.6, 0)); scene.add(l); f.light = l; f.base = f.forge ? 5 : 9; }
  for (const d of doors) scene.add(d.pivot);
  hearthLights = [0, 1].map(() => { const l = new THREE.PointLight(0xff8b3d, 0, 9, 1.6); scene.add(l); return l; }); candleLight = new THREE.PointLight(0xffb060, 0, 5, 1.8); scene.add(candleLight);
  roomLight = new THREE.PointLight(0xfff0dc, 0, 9, 1.4); scene.add(roomLight);
  buildLamps(); buildLantern(); buildRipples();
  const had = !!store.get(SAVE_KEY);
  await step('Últimos detalhes…', 0.9, () => { initNav(); buildPlayer(); buildNPCs(); spawnAnimals(); buildMapBase(); });
  post = new Post(); post.setSize(innerWidth, innerHeight);
  player.y = groundH(player.x, player.z);
  for (let i = 0; i < 30; i++) grass.update(player.x, player.z, 100);
  trees.update(V3(player.x, 0, player.z), new THREE.Color(0.3, 0.35, 0.42));
  renderer.compile(scene, camera);
  state = 'menu'; $('loading').textContent = had ? 'Seu caderno continua onde você parou' : ''; $('loadBar').parentElement.hidden = true;
  $('startBtn').disabled = false; if (had) $('startBtn').textContent = 'Voltar ao vale';
  clock.start(); if (!MANUAL) requestAnimationFrame(rafFrame); else frame(0.016);
}
function pathDistOK(x, z, r) { for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) { const [x1, z1] = p[i], [x2, z2] = p[i + 1]; const dx = x2 - x1, dz = z2 - z1; const t = clamp(((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz), 0, 1); if (Math.hypot(x1 + dx * t - x, z1 + dz * t - z) < 3 + r) return true; } return false; }
function aqueductNear(x, z) { const A = [-104, 18], B = [-44, 112]; const dx = B[0] - A[0], dz = B[1] - A[1]; const t = clamp(((x - A[0]) * dx + (z - A[1]) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(A[0] + dx * t - x, A[1] + dz * t - z) < 5; }

// os quatro gigantes e o rosto entre as flores
function placeGiants(rockMat) {
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  { const gx = -176, gz = 128; buildGiant(scene, rockMat, { pose: 'reach', x: gx, y: WATER - 8.6, z: gz, rot: face(gx, gz, 0, 0), seed: 11, id: 'lago' });
    let sx = gx, sz = gz; const dx = -gx, dz = -gz, dl = Math.hypot(dx, dz); for (let i = 0; i < 200; i++) { sx += dx / dl; sz += dz / dl; if (groundH(sx, sz) > 0.8) break; } sx += dx / dl * 3; sz += dz / dl * 3;
    SPOTS.lake = { x: sx, z: sz, yaw: face(sx, sz, gx, gz) }; }
  { const gx = POI.stones.x - 22, gz = POI.stones.z - 16; buildGiant(scene, rockMat, { pose: 'kneel', x: gx, y: groundH(gx, gz) - 0.4, z: gz, rot: face(gx, gz, POI.stones.x, POI.stones.z), seed: 23, id: 'circulo' }); SPOTS.stones = { x: POI.stones.x + 1.5, z: POI.stones.z + 2, yaw: face(POI.stones.x, POI.stones.z, gx, gz) }; }
  { const gx = POI.tower.x + 26, gz = POI.tower.z + 18; buildGiant(scene, rockMat, { pose: 'lie', x: gx, y: groundH(gx, gz) - 0.5, z: gz, rot: -0.7, seed: 37, id: 'torre' }); SPOTS.tower = { x: storySpots.tower.x, z: storySpots.tower.z, yaw: face(storySpots.tower.x, storySpots.tower.z, POI.tower.x, POI.tower.z) }; }
  { // a gigante sentada no alto do monte, atrás do mirante (o platô no fim da trilha), olhando a vila
    const sx = MIRANTE.x, sz = MIRANTE.z; const fx0 = -sx, fz0 = -sz, fl = Math.hypot(fx0, fz0); const gx = sx - fx0 / fl * 13, gz = sz - fz0 / fl * 13;
    const g = buildGiant(scene, rockMat, { pose: 'sit', x: gx, y: groundH(gx, gz) - 0.8, z: gz, rot: face(gx, gz, 0, 0), seed: 51, id: 'monte' });
    SPOTS.peak = { x: sx, z: sz, yaw: g.rot }; POI.peaks.x = sx; POI.peaks.z = sz; }
  { const hx = POI.head.x, hz = POI.head.z; const hf = buildHeadFragment(scene, rockMat, hx, hz, 0.9); addCirc(hf[0], hf[1], hf[2] * 0.6); SPOTS.head = { x: storySpots.head.x, z: storySpots.head.z, yaw: face(storySpots.head.x, storySpots.head.z, hx, hz) }; }
  SPOTS.tree = { x: storySpots.tree.x, z: storySpots.tree.z, yaw: face(storySpots.tree.x, storySpots.tree.z, storySpots.treeRoot.x, storySpots.treeRoot.z) };
  SPOTS.garden = { x: storySpots.relogios.x, z: storySpots.relogios.z, yaw: face(storySpots.relogios.x, storySpots.relogios.z, POI.garden.x, POI.garden.z) };
  SPOTS.stairs = { x: storySpots.escada.x, z: storySpots.escada.z, yaw: storySpots.escadaRot + Math.PI, top: storySpots.escadaTop };
  for (const g of giants) for (const c of g.cols) addCirc(c[0], c[1], c[2]);
  for (const pl of PLACES) if (S.lumes[pl.id]) placeDone(pl, true);
  if (S.final) finalAmbience();
}

// =====================================================================
// jogadora (Lia)
// =====================================================================
function buildPlayer() { pH = new Human('lia'); scene.add(pH.root); }
const camFwd = V3();
function updatePlayer(dt) {
  const k = keys; let f = 0, s = 0;
  const free = state === 'play';
  if (free && !player.sit) { if (k.KeyW) f += 1; if (k.KeyS) f -= 1; if (k.KeyA) s -= 1; if (k.KeyD) s += 1; f += touch.my; s += touch.mx; }
  if (free) { if (k.ArrowLeft) cam.yaw += dt * 1.8; if (k.ArrowRight) cam.yaw -= dt * 1.8; if (k.ArrowUp) cam.pitch = clamp(cam.pitch + dt * 1.0, -1.1, 0.9); if (k.ArrowDown) cam.pitch = clamp(cam.pitch - dt * 1.0, -1.1, 0.9); }
  // sentada: qualquer movimento levanta
  if (player.sit) { if (free && (Math.abs(f) + Math.abs(s) > 0.2 || k.Space)) standUp(); updateSitting(dt); return; }
  const len = Math.min(1, Math.hypot(f, s));
  const cy = cam.yaw; const fwd = V3(-Math.sin(cy), 0, -Math.cos(cy)), right = V3(Math.cos(cy), 0, -Math.sin(cy));
  const dir = fwd.clone().multiplyScalar(f).addScaledVector(right, s); if (dir.lengthSq() > 0) dir.normalize();
  const jog = (k.ShiftLeft || k.ShiftRight || touch.run);
  let speed = jog ? 3.7 : 1.75;
  const gh0 = groundH(player.x, player.z); const depth = WATER - gh0; const inWater = depth > 0.08 && player.y < WATER + 0.1; if (inWater) speed *= clamp(1 - depth * 0.55, 0.35, 1);
  const tgt = len * speed; player.speed = lerp(player.speed, tgt, clamp(dt * (tgt > player.speed ? 3.2 : 5), 0, 1));
  if (len > 0.05) player.h = lerpAng(player.h, Math.atan2(dir.x, dir.z), dt * 5.5);
  // anda na direção em que está virada (curvas suaves, sem patinar de lado)
  const mvDir = len > 0.05 ? V3(Math.sin(player.h), 0, Math.cos(player.h)).lerp(dir, 0.35).normalize() : V3();
  let nx = player.x + mvDir.x * player.speed * dt, nz = player.z + mvDir.z * player.speed * dt;
  const pr0 = probe(nx, nz, player.y); const stepLen = Math.hypot(nx - player.x, nz - player.z);
  if (pr0.block || (stepLen > 1e-4 && player.onGround && (pr0.h - player.y) / stepLen > 1.1 && pr0.h > player.y + 0.05)) { nx = player.x; nz = player.z; }
  if (groundH(nx, nz) < WATER - 1.1 && pr0.h < WATER) { nx = player.x; nz = player.z; if (!player.deepWarn) { player.deepWarn = true; toast('A água fica funda', 'Melhor contornar pela margem'); setTimeout(() => player.deepWarn = false, 8000); } }
  const p = { x: nx, z: nz }; collide(p, 0.3, player.y); for (const n of npcs) { if (!n.h.root.visible) continue; const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz); if (d < 0.6 && d > 1e-3) { p.x = n.x + dx / d * 0.6; p.z = n.z + dz / d * 0.6; } }
  const r = Math.hypot(p.x, p.z); if (r > 690) { p.x *= 690 / r; p.z *= 690 / r; }
  const moved = Math.hypot(p.x - player.x, p.z - player.z); player.x = p.x; player.z = p.z;
  const ground = probe(player.x, player.z, player.y).h;
  if ((k.Space || touch.jump) && player.onGround && free) { player.vy = 4.2; player.onGround = false; pH.play('jumpStart', 0.1); }
  touch.jump = false;
  player.vy -= 15 * dt; player.y += player.vy * dt;
  if (player.y <= ground) { if (!player.onGround && player.vy < -3) { Sound.step(surface(), 1.3, player.x, player.z); pH.play('land', 0.08); player.landT = 0.25; } player.y = ground; player.vy = 0; player.onGround = true; }
  else if (player.y - ground > 0.35) player.onGround = false;
  else if (player.onGround) player.y = lerp(player.y, ground, clamp(dt * 18, 0, 1));
  // passos
  const effSpeed = moved / Math.max(dt, 1e-4);
  if (player.onGround && effSpeed > 0.3) { player.stepAcc += dt * effSpeed / (effSpeed > 3 ? 1.45 : 1.25); if (player.stepAcc > 0.5) { player.stepAcc = 0; Sound.step(inWater ? 'water' : surface(), clamp(effSpeed / 2.5, 0.6, 1.2), player.x, player.z, effSpeed > 3); if (inWater) waterStep(player.x, player.z, depth, effSpeed); } }
  if (inWater && player.speed < 0.3 && rand() < dt * 0.6) ripple(player.x + rr(-0.3, 0.3), player.z + rr(-0.3, 0.3), 0.6);
  pH.root.position.set(player.x, player.y, player.z); pH.root.rotation.y = player.h;
  player.landT = Math.max(0, (player.landT || 0) - dt);
  if (!player.onGround && player.vy < -1) pH.locomote(0, { air: true });
  else if (player.landT > 0 && /land/.test(pH.currentName)) { }
  else pH.locomote(player.onGround ? effSpeed : 0, { idle: lanternOn ? 'lantern' : 'idle' });
  if (state === 'dialog' && dlgNPC && dlgNPC.h) pH.lookAtPoint(dlgNPC.h.headPos, 1); else pH.lookAtPoint(camera.position.clone().addScaledVector(camFwd, 20), 0.5);
  pH.update(dt);
}
function surface() { if (insideHouse(player.x, player.z) || player.y > groundH(player.x, player.z) + 0.4) return 'wood'; const sp = splatAt(player.x, player.z); if (sp[0] > 0.5 || sp[3] > 0.5) return 'dirt'; return 'grass'; }

// sentar (bancos, lugares dos Veladores)
function sitAt(spot, onSat) {
  player.sit = { t: 0, onSat, spot, lapse: false }; player.x = spot.x; player.z = spot.z; player.y = spot.seat ? spot.y - SIT_H : probe(spot.x, spot.z, (spot.y ?? groundH(spot.x, spot.z)) + 0.3).h; player.h = spot.yaw ?? player.h; player.speed = 0;
  pH.root.position.set(player.x, player.y, player.z); pH.root.rotation.y = player.h; pH.play('sitDown', 0.3); Sound.rustle(player.x, player.z);
  cam.mode = 'sit'; cam.orbit = 0; if (spot.seat) taken.set(spot.seat, 'lia');
}
// deitar na cama: a pose é o primeiro quadro de LayToIdle; levantar toca o clipe inteiro
function lieAt(b) {
  const L = Human.LIE; const c = Math.cos(b.yaw), sn = Math.sin(b.yaw);
  player.sit = { t: 0, spot: { x: b.side.x, z: b.side.z, yaw: b.yaw }, lie: b, from: { x: player.x, z: player.z, y: player.y }, k: 0 };
  player.sit.to = { x: b.x + L.dx * c + L.dz * sn, z: b.z - L.dx * sn + L.dz * c, y: b.y + L.dy, yaw: b.yaw + L.yaw };
  player.speed = 0; pH.pose('lie', 0, 1.2); Sound.rustle(player.x, player.z); taken.set(b, 'lia');
  cam.mode = 'lie'; cam.orbit = 0; $('lapseHint').hidden = false; $('lapseHint').textContent = isNight() ? 'T · dormir até de manhã' : 'T · deixar o tempo passar';
}
function updateSitting(dt) {
  const st = player.sit; st.t += dt;
  if (st.lie) { // deitada
    if (!st.rising) { st.k = Math.min(1, st.k + dt / 1.4); const k = smooth(0, 1, st.k); player.x = lerp(st.from.x, st.to.x, k); player.z = lerp(st.from.z, st.to.z, k); player.y = lerp(st.from.y, st.to.y, k); player.h = lerpAng(player.h, st.to.yaw, dt * 5); }
    else if (pH.done() || st.t > 5) { player.x = st.lie.side.x; player.z = st.lie.side.z; player.y = probe(player.x, player.z, player.y + 0.3).h; taken.delete(st.lie); player.sit = null; cam.mode = 'follow'; $('lapseHint').hidden = true; $('lapseHint').textContent = lapseText; pH.play('idle', 0.3); }
    pH.root.position.set(player.x, player.y, player.z); pH.root.rotation.y = player.h; pH.lookAtPoint(null); pH.update(dt); return;
  }
  if (pH.currentName === 'sitDown' && pH.done()) pH.play('sit', 0.4);
  if (pH.currentName === 'standUp' && pH.done()) { const sp = st.spot; if (sp && sp.seat) { const e = seatExit(sp.seat), ex = e.x, ez = e.z; player.x = ex; player.z = ez; player.y = probe(ex, ez, player.y + 0.5).h; } player.sit = null; cam.mode = 'follow'; }
  if (st.onSat && st.t > 2.2) { const f = st.onSat; st.onSat = null; f(); }
  pH.root.position.set(player.x, player.y, player.z); pH.root.rotation.y = player.h; pH.lookAtPoint(null); pH.update(dt);
}
function standUp() { if (!player.sit || pH.currentName === 'standUp' || state !== 'play') return; timeLapse = 0; $('lapseHint').classList.remove('on'); if (player.sit.lie) { if (!player.sit.rising) { player.sit.rising = true; player.sit.t = 0; pH.unpose(1); } return; } if (player.sit.spot && player.sit.spot.seat) taken.delete(player.sit.spot.seat); pH.play('standUp', 0.25); $('lapseHint').hidden = true; }
let lapseText = 'T · deixar o tempo passar · mova-se para levantar';
// dormir: tela escurece, a noite passa, amanhece
function sleepUntilMorning() {
  if (state !== 'play' || !player.sit || !player.sit.lie || player.sit.sleeping) return; player.sit.sleeping = true; const f = $('fade'); f.style.opacity = '1'; Music.stop(3);
  setTimeout(() => { hour = 6.6; S.day++; if (sky) sky.setHour(hour); save(); setTimeout(() => { f.style.opacity = '0'; toast('Bom dia', 'A noite passou num instante'); if (player.sit) player.sit.sleeping = false; Music.silence = 4; }, 900); }, 2200);
}

// =====================================================================
// câmera
// =====================================================================
function updateCamera(dt) {
  if (window.__camOverride) { const o = window.__camOverride; if (pH) pH.root.visible = true; camera.position.set(...o.pos); camera.lookAt(...o.look); camera.fov = o.fov || 50; camera.updateProjectionMatrix(); return; }
  const cy = cam.yaw, cp = cam.pitch;
  camFwd.set(-Math.sin(cy) * Math.cos(cp), Math.sin(cp), -Math.cos(cy) * Math.cos(cp));
  // lume: órbita lenta em volta da lembrança
  if (state === 'lume' && lume) { const c = lume.center; cam.orbit += dt * 0.045; const a = (cam.lumeA ?? Math.atan2(player.x - c.x, player.z - c.z)) + cam.orbit; cam.lumeA = cam.lumeA ?? a; const want = V3(c.x + Math.sin(a) * 6.8, c.y + 2.2, c.z + Math.cos(a) * 6.8); want.y = Math.max(want.y, groundH(want.x, want.z) + 1.2); cam.cur.lerp(want, 1 - Math.exp(-dt * 1.5)); camera.position.copy(cam.cur); camera.lookAt(c.x, c.y + 1.2, c.z); camera.fov = lerp(camera.fov, 42, 1 - Math.exp(-dt * 2)); camera.updateProjectionMatrix(); return; }
  cam.lumeA = undefined;
  if (state === 'finale' && finale) { finale.camera(dt); return; }
  cam.inK = lerp(cam.inK || 0, insideHouse(player.x, player.z) ? 1 : 0, 1 - Math.exp(-dt * 4));
  if (cam.mode === 'lie' && player.sit && player.sit.lie) {
    const b = player.sit.lie; const head = pH.headPos; const sd = V3(b.side.x - b.x, 0, b.side.z - b.z).normalize(); const fw = V3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
    let want = head.clone().addScaledVector(sd, 1.25).addScaledVector(fw, 0.9 + Math.sin(elapsed * 0.05) * 0.2).add(V3(0, 1.05, 0)); let last = head.clone();
    for (let i = 1; i <= 12; i++) { const q = head.clone().lerp(want, i / 12); if (insideBox(q.x, q.z, 0.15, player.y) || inSolid(q.x, q.y, q.z, 0.18)) break; last = q; }
    cam.cur.lerp(last, 1 - Math.exp(-dt * 3)); camera.position.copy(cam.cur); camera.lookAt(head.x, head.y - 0.15, head.z); camera.fov = lerp(camera.fov, 50, 1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix(); if (pH) pH.root.visible = true; return;
  }
  const sitK = cam.mode === 'sit' ? 1 : 0; cam.sitK = lerp(cam.sitK || 0, sitK, 1 - Math.exp(-dt * 1.2));
  const dist = lerp(lerp(3.5, 1.9, cam.inK), 5.2, cam.sitK * (1 - cam.inK)), shoulder = lerp(0.3, 0.18, cam.inK), fov = lerp(lerp(52, 62, cam.inK), 46, cam.sitK);
  if (cam.mode === 'sit') { cam.yaw = lerpAng(cam.yaw, player.h + Math.PI + 0.5 + Math.sin(elapsed * 0.05) * 0.15, dt * 0.25); cam.pitch = lerp(cam.pitch, -0.05, dt * 0.4); }
  const right = V3(Math.cos(cy), 0, -Math.sin(cy));
  const pivot = V3(player.x, player.y + (player.sit ? 1.0 : 1.5), player.z);
  let want = pivot.clone().addScaledVector(camFwd, -dist).addScaledVector(right, shoulder).add(V3(0, 0.12, 0));
  const steps = 14; let last = pivot.clone().addScaledVector(right, shoulder * 0.3);
  for (let i = 1; i <= steps; i++) { const t = i / steps; const q = pivot.clone().lerp(want, t); if (q.y < groundH(q.x, q.z) + 0.3 || insideBox(q.x, q.z, 0.15, player.y) || inSolid(q.x, q.y, q.z, 0.18) || q.y < probe(q.x, q.z, player.y + 0.4).h + 0.25) break; last = q; }
  want = last;
  if (cam.cine > 0.001 && dlgNPC && dlgNPC.h) {
    const H = dlgNPC.h.headPos; const P = pH.headPos; const d = H.clone().sub(P); d.y = 0; d.normalize(); const rr2 = V3(d.z, 0, -d.x);
    const cpos = P.clone().addScaledVector(d, -0.9).addScaledVector(rr2, -0.6).add(V3(0, 0.1, 0));
    want.lerp(cpos, smooth(0, 1, cam.cine)); cam.look.copy(H).add(V3(0, -0.05, 0));
  }
  if (cam.intro > 0) { cam.intro -= dt; const k = smooth(0, 1, 1 - cam.intro / INTRO_T); const a = 2.2 - k * 1.6; const R2 = lerp(140, 5, k);
    const from = V3(player.x + Math.sin(a) * R2, groundH(player.x, player.z) + lerp(70, 2.2, Math.pow(k, 0.65)), player.z + Math.cos(a) * R2);
    cam.cur.copy(from); camera.position.copy(from); camera.lookAt(lerp(0, player.x, k), lerp(20, player.y + 1.4, k), lerp(-60, player.z, k)); camera.fov = lerp(40, 52, k); camera.updateProjectionMatrix(); if (cam.intro <= 0) cam.intro = 0; return; }
  cam.cur.lerp(want, 1 - Math.exp(-dt * (cam.cine > 0 ? 5 : cam.sitK > 0.1 ? 3 : 14)));
  if (cam.cur.distanceTo(want) > 6) cam.cur.copy(want);
  camera.position.copy(cam.cur);
  { const close = camera.position.distanceTo(V3(player.x, player.y + 1.5, player.z)) < 0.7 && cam.cine < 0.1; if (pH) pH.root.visible = !close; }
  if (cam.cine > 0.001 && dlgNPC) { const m = new THREE.Matrix4().lookAt(camera.position, cam.look, V3(0, 1, 0)); const qq = new THREE.Quaternion().setFromRotationMatrix(m); const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(cp, cy, 0, 'YXZ')); camera.quaternion.copy(q0.slerp(qq, smooth(0, 1, cam.cine))); }
  else if (cam.sitK > 0.05) { const look = pivot.clone().add(V3(Math.sin(player.h) * 6, 0.8, Math.cos(player.h) * 6)); const m = new THREE.Matrix4().lookAt(camera.position, look, V3(0, 1, 0)); const qq = new THREE.Quaternion().setFromRotationMatrix(m); const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(cp, cy, 0, 'YXZ')); camera.quaternion.copy(q0.slerp(qq, cam.sitK * 0.6)); }
  else camera.rotation.set(cp, cy, 0);
  camera.fov = lerp(camera.fov, cam.cine > 0.5 ? 36 : fov, 1 - Math.exp(-dt * 6)); camera.updateProjectionMatrix();
}

// =====================================================================
// moradores
// =====================================================================
function buildNPCs() {
  const od = storySpots.odessa; odessa = addNPC({ id: 'odessa', key: 'odessa', day: [od.x, od.z, Math.atan2(-POI.observatory.x, -POI.observatory.z)], talk: talkOdessa, idle: 'fold', always: true, nightIdle: 'idle', lookSky: true });
  anselmo = addNPC({ id: 'anselmo', key: 'anselmo', day: [44, 47, 0.4], talk: talkAnselmo, idle: 'idle', wander: [[44, 47], [52, 44], [50, 55], [40, 52]], home: houseOf('anselmo'), slow: true });
  celeste = addNPC({ id: 'celeste', key: 'celeste', day: [-21.9, -11.4, 0.35], talk: talkCeleste, idle: 'idle', home: houseOf('padaria'), work: 'kneel' });
  tome = addNPC({ id: 'tome', key: 'tome', day: [-3, 6, 0], talk: talkTome, idle: 'idle', wander: [[-3, 6], [-38, 25], [-12, 20], [6, 12], [0, -6]], home: houseOf('familia'), fast: true });
  // a Irene pinta na margem do lago: procura terra firme indo do lago em direção à vila
  let ix = -128, iz = 92; { const dx = -ix, dz = -iz, dl = Math.hypot(dx, dz); for (let i = 0; i < 120 && groundH(ix, iz) < 0.9; i++) { ix += dx / dl; iz += dz / dl; } ix += dx / dl * 2; iz += dz / dl * 2; }
  irene = addNPC({ id: 'irene', key: 'irene', day: [ix, iz, Math.atan2(-170 - ix, 120 - iz)], talk: talkIrene, idle: 'idle', home: houseOf('irene') });
  const bs = storySpots.bastiao; bastiao = addNPC({ id: 'bastiao', key: 'bastiao', day: [bs.x, bs.z, storySpots.bastiaoYaw + Math.PI], talk: talkBastiao, idle: 'kneel', home: houseOf('casagrande') });
  // cavalete de pintura da Irene
  { const ia = Math.atan2(-170 - ix, 120 - iz); const ex = ix + Math.sin(ia) * 1.1 + Math.cos(ia) * 0.6, ez = iz + Math.cos(ia) * 1.1 - Math.sin(ia) * 0.6, ey = groundH(ex, ez); const g = new THREE.Group(); for (const a of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.05), M.oldWood); l.position.set(a * 0.35, 0.8, 0); l.rotation.set(0.12, 0, a * -0.08); g.add(l); } const cv = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), paintingMat()); cv.position.set(0, 1.15, 0.08); cv.rotation.x = 0.12; g.add(cv); g.position.set(ex, ey, ez); g.rotation.y = ia + Math.PI; scene.add(g); addCirc(ex, ez, 0.4); }
}
function paintingMat() { const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, '#f2c78a'); gr.addColorStop(0.45, '#e9a06a'); gr.addColorStop(0.55, '#5a7c86'); gr.addColorStop(1, '#2f4f5a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 192); g.fillStyle = 'rgba(255,240,200,0.8)'; for (let i = 0; i < 40; i++) g.fillRect(90 + Math.random() * 80, 110 + Math.random() * 60, 18 + Math.random() * 20, 2); g.fillStyle = '#2b3a2a'; g.beginPath(); g.moveTo(0, 105); g.quadraticCurveTo(60, 70, 120, 100); g.lineTo(256, 95); g.lineTo(256, 108); g.lineTo(0, 110); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); }
const isNight = () => hour >= 20.2 || hour < 6.3;
const isBedtime = () => hour >= 22.4 || hour < 6.3;
// ---------------------------------------------------------------------
// rotina dos moradores: de dia cada um no seu canto; ao anoitecer vão para casa e sentam perto da
// lareira; mais tarde dormem na cama (de verdade, dá para vê-los pela janela). Os trajetos são
// planejados com A* (nav.js) e simulados mesmo longe da câmera, então ninguém fica preso no caminho.
// ---------------------------------------------------------------------
let nav = null;
function initNav() {
  const stairs = interiors.flatMap(h => h.stair.map(st => [st.foot.x, st.foot.z, st.top.x, st.top.z]));
  nav = new Nav({ boxes: colliders.boxes,
    circles: (x, z, cb) => { const cx = Math.floor(x / CG), cz = Math.floor(z / CG); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const arr = circGrid.get((cx + a) + ',' + (cz + b)); if (!arr) continue; for (let i = 0; i < arr.length; i += 3) cb(arr[i], arr[i + 1], arr[i + 2]); } },
    extra: (x, z) => { for (const [ax, az, bx, bz] of stairs) { const dx = bx - ax, dz = bz - az; const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); if (Math.hypot(ax + dx * t - x, az + dz * t - z) < 0.62) return true; } return false; } });
}
const SIT_H = 0.48; // altura do assento esperada pelo clipe "Sitting" (calibrada olhando a pose)
const taken = new Map(); // assento/cama -> morador
function claim(n, spot) { if (!spot) return null; const o = taken.get(spot); if (o && o !== n) return null; taken.set(spot, n); return spot; }
// ponto livre ao lado de um assento para sentar/levantar (frente, lados, trás)
function seatExit(st) { if (st._exit) return st._exit; const f = [Math.sin(st.yaw), Math.cos(st.yaw)], r = [Math.cos(st.yaw), -Math.sin(st.yaw)]; const c = [[st.exit, 0], [0.15, 0.62], [0.15, -0.62], [-0.55, 0], [0.6, 0.5], [0.6, -0.5]];
  for (const [a, b] of c) { const x = st.x + f[0] * a + r[0] * b, z = st.z + f[1] * a + r[1] * b; if (!nav || nav.free(x, z)) return (st._exit = { x, z }); } return (st._exit = { x: st.x + f[0] * st.exit, z: st.z + f[1] * st.exit }); }
function release(n) { for (const [k, v] of taken) if (v === n) taken.delete(k); }
function homeSeat(n) { if (n.homeSeat && taken.get(n.homeSeat) === n) return n.homeSeat; const h = n.home; if (!h) return null; const list = [...h.seats].sort((a, b) => (a.kind === 'chair' ? 0 : 1) - (b.kind === 'chair' ? 0 : 1)); for (const st of list) if (!taken.get(st) || taken.get(st) === n) { n.homeSeat = claim(n, st); return st; } return null; }
function homeBed(n) { if (n.homeBed && taken.get(n.homeBed) === n) return n.homeBed; const h = n.home; if (!h) return null; for (const b of h.beds) if (!taken.get(b) || taken.get(b) === n) { n.homeBed = claim(n, b); return b; } return null; }
// o que o morador quer fazer agora: { key, x, z, act, yaw, spot }
function npcPlan(n) {
  if (n.home && !n.always) {
    if (isBedtime()) { const b = homeBed(n); if (b) return { key: 'bed', x: b.side.x, z: b.side.z, act: 'sleep', spot: b }; }
    if (isNight()) { const st = homeSeat(n); if (st) { const e = seatExit(st); return { key: 'seat', x: e.x, z: e.z, act: 'sit', spot: st }; } }
  }
  if (n.wander) { const t = n.wander[n.wi]; return { key: 'w' + n.wi, x: t[0], z: t[1], act: 'wander' }; }
  return { key: 'day', x: n.day[0], z: n.day[1], act: 'day', yaw: n.day[2] };
}
// rota até o plano: A* no térreo; se a cama for no andar de cima, sobe pela escada
function planRoute(n, plan) {
  const pts = []; let from = [n.x, n.z];
  const up = plan.spot && plan.spot.house && plan.spot.y > plan.spot.house.levels[0] + 1.2;
  const st = up ? plan.spot.house.stair[0] : null;
  // descendo do andar de cima, primeiro volta à escada
  if (n.floorUp && n.floorUp.stair && !(up && n.floorUp.house === plan.spot.house)) { const s2 = n.floorUp.stair; pts.push([s2.landing.x, s2.landing.z], [s2.top.x, s2.top.z], [s2.foot.x, s2.foot.z], [s2.bottom.x, s2.bottom.z]); from = [s2.bottom.x, s2.bottom.z]; }
  if (up && n.floorUp && n.floorUp.house === plan.spot.house) { pts.push([plan.x, plan.z]); return pts; }
  const goal = up ? [st.bottom.x, st.bottom.z] : [plan.x, plan.z];
  const p = nav.path(from[0], from[1], goal[0], goal[1]); if (!p) return null; pts.push(...p);
  if (up) pts.push([st.foot.x, st.foot.z], [st.top.x, st.top.z], [st.landing.x, st.landing.z], [plan.x, plan.z]);
  return pts;
}
function addNPC(o) { const h = new Human(o.key); scene.add(h.root); const n = Object.assign({ h, wi: 0, wait: rr(1, 4), speed: 0, talkT: 0, x: o.day[0], z: o.day[1], y: groundH(o.day[0], o.day[1]), yaw: o.day[2] || 0, route: null, pose: null, fails: 0, stuckT: 0 }, o); h.root.position.set(n.x, n.y, n.z); npcs.push(n); return n; }
let odessa, anselmo, celeste, tome, irene, bastiao;
function houseOf(role) { return interiors.find(h => h.role === role); }
function teleportNPC(n, x, z, y) { n.x = x; n.z = z; n.y = y ?? probe(x, z, groundH(x, z) + 0.3).h; n.floorUp = null; }
function npcVisible(n) { const dx = n.x - camera.position.x, dz = n.z - camera.position.z, d = Math.hypot(dx, dz); if (d < 6) return true; if (d > 95) return false; const f = camFwd; return (dx * f.x + dz * f.z) / d > 0.35; }
function arrive(n, plan) {
  if (plan.act === 'sit' && plan.spot) { const st = plan.spot; n.mode = 'settle'; n.settle = { t: 0, x0: n.x, z0: n.z, y0: n.y, x1: st.x, z1: st.z, y1: st.y - SIT_H, yaw: st.yaw, then: 'sitting' }; n.h.play('sitDown', 0.35); return; }
  if (plan.act === 'sleep' && plan.spot) { const b = plan.spot; const L = Human.LIE; const c = Math.cos(b.yaw), sn = Math.sin(b.yaw); n.mode = 'settle'; n.settle = { t: 0, x0: n.x, z0: n.z, y0: n.y, x1: b.x + L.dx * c + L.dz * sn, z1: b.z - L.dx * sn + L.dz * c, y1: b.y + L.dy, yaw: b.yaw + L.yaw, then: 'lying', dur: 1.6 }; n.h.pose('lie', 0, 1.2); return; }
  if (plan.act === 'wander') { n.mode = 'wait'; n.wait = rr(5, 14); return; }
  n.mode = 'idle';
}
function rise(n) {
  // levanta da cadeira ou da cama antes de seguir para o próximo plano
  if (n.mode === 'sitting') { n.mode = 'rising'; n.riseT = 0; n.h.play('standUp', 0.3); }
  else if (n.mode === 'lying') { n.mode = 'rising'; n.riseT = 0; n.h.unpose(1); }
  else n.mode = 'walk';
}
function updateNPCs(dt) {
  const lvl = Voice.update();
  for (const n of npcs) {
    const talking = state === 'dialog' && dlgNPC === n; const dp = Math.hypot(player.x - n.x, player.z - n.z); let speed = 0;
    if (n.finale) { n.mode = 'idle'; n.route = null; release(n); n.y = probe(n.x, n.z, groundH(n.x, n.z) + 0.5).h; }
    else if (!talking) {
      const plan = npcPlan(n);
      if (n.planKey !== plan.key) { n.planKey = plan.key; n.route = null; n.fails = 0; if (['sitting', 'lying', 'settle'].includes(n.mode)) rise(n); else if (n.mode !== 'rising') n.mode = 'walk'; }
      if (n.mode === 'rising') { n.riseT += dt; if (n.h.done() || n.riseT > 4) { const back = n.homeBed && n.mode === 'rising' && n.lastPose === 'lying' ? n.homeBed.side : null; if (back) { n.x = back.x; n.z = back.z; } else if (n.settle) { n.x = n.settle.x0; n.z = n.settle.z0; } n.y = probe(n.x, n.z, n.y + 0.4).h; n.mode = 'walk'; n.route = null; } }
      else if (n.mode === 'settle') { const S2 = n.settle; S2.t += dt; const k = smooth(0, S2.dur || 0.7, S2.t); n.x = lerp(S2.x0, S2.x1, k); n.z = lerp(S2.z0, S2.z1, k); n.y = lerp(S2.y0, S2.y1, k); n.yaw = lerpAng(n.yaw, S2.yaw, dt * 6); if (S2.t > (S2.dur || 0.7) + 0.2) { n.mode = S2.then; n.lastPose = S2.then; n.yaw = S2.yaw; } }
      else if (n.mode === 'wait') { n.wait -= dt; if (n.wait <= 0) { n.wi = (n.wi + 1) % n.wander.length; } }
      else if (n.mode === 'walk' || !n.mode) {
        n.mode = 'walk';
        if (!n.route) { n.retryT = (n.retryT || 0) - dt; if (n.retryT <= 0) { const pts = planRoute(n, plan); if (pts) n.route = { pts, i: 0, best: 1e9, stuckT: 0 }; else { n.fails++; n.retryT = 2.5; if (n.fails >= 2 && !npcVisible(n)) { teleportNPC(n, plan.x, plan.z, plan.spot && plan.spot.house ? plan.spot.house.levels[plan.spot.y > plan.spot.house.levels[0] + 1.2 ? 1 : 0] : undefined); n.route = { pts: [], i: 0 }; } } } }
        if (n.route) {
          const R = n.route; const wp = R.pts[R.i];
          if (!wp) { n.route = { pts: [], i: 0, done: true }; arrive(n, plan); }
          else {
            const dx = wp[0] - n.x, dz = wp[1] - n.z, d = Math.hypot(dx, dz);
            const pause = n.wander && dp < 2.2 && !isNight();
            if (d < 0.22) { R.i++; R.best = 1e9; R.stuckT = 0;
              // passou pelo topo da escada: está no andar de cima
              if (plan.spot && plan.spot.house && plan.spot.house.stair[0]) { const st = plan.spot.house.stair[0]; if (Math.hypot(wp[0] - st.top.x, wp[1] - st.top.z) < 0.05) n.floorUp = { house: plan.spot.house, stair: st }; }
              if (n.floorUp && Math.hypot(wp[0] - n.floorUp.stair.bottom.x, wp[1] - n.floorUp.stair.bottom.z) < 0.05) n.floorUp = null; }
            else if (!pause) {
              const base = n.fast ? 2.4 : n.slow ? 0.95 : 1.25; const stairK = n.y > groundH(n.x, n.z) + 0.8 ? 0.75 : 1; speed = base * stairK * clamp(d / 0.6 + 0.4, 0.4, 1);
              const step = Math.min(d, speed * dt); n.x += dx / d * step; n.z += dz / d * step; n.yaw = lerpAng(n.yaw, Math.atan2(dx, dz), dt * 5);
              n.y = probe(n.x, n.z, n.y + 0.3).h;
              // preso? (não se aproxima do ponto há alguns segundos) -> replaneja; persistente -> reposiciona fora da vista
              if (d < R.best - 0.05) { R.best = d; R.stuckT = 0; } else { R.stuckT += dt; if (R.stuckT > 3) { n.route = null; n.fails++; if (n.fails > 3 && !npcVisible(n)) teleportNPC(n, plan.x, plan.z); } }
            }
          }
        }
      }
    }
    // sobe/desce degraus suavemente quando parado
    if (n.mode === 'idle' || n.mode === 'wait') n.y = probe(n.x, n.z, n.y + 0.3).h;
    const camDist = Math.hypot(n.x - camera.position.x, n.z - camera.position.z); const vis = camDist < 95 || n.finale; n.h.root.visible = vis; n.inside = !!insideHouse(n.x, n.z);
    if (!vis) continue;
    const cast = camDist < 32; if (n.cast !== cast) { n.cast = cast; for (const m of n.h.meshes) if (!m.userData.hair) m.castShadow = cast; }
    const posed = ['sitting', 'lying', 'settle', 'rising'].includes(n.mode);
    if (!posed && (talking || (dp < 3.2 && !n.finale))) { const want = Math.atan2(player.x - n.x, player.z - n.z); if (Math.abs(angDiff(want, n.yaw)) > 0.7 || talking) n.yaw = lerpAng(n.yaw, want, dt * 2.5); }
    else if (n.mode === 'idle' && !n.finale && n.planKey === 'day') n.yaw = lerpAng(n.yaw, n.day[2], dt * 1.2);
    n.h.root.position.set(n.x, n.y, n.z); n.h.root.rotation.y = n.yaw;
    const speaking = (talking && Voice.playing) || (n.finale && finale && finale.speaker === n.id && Voice.playing);
    n.h.talking = speaking ? lvl : 0;
    if (n.mode === 'sitting') { const want = speaking ? 'sitTalk' : 'sit'; if (n.h.currentName !== want) n.h.play(want, 0.4); }
    else if (n.mode === 'settle' && n.settle.then === 'sitting') { if (n.h.currentName === 'sitDown' && n.h.done()) n.h.play('sit', 0.4); }
    else if (n.mode === 'lying' || n.mode === 'settle' || n.mode === 'rising') { }
    else { const idle = n.finale ? (n.finaleIdle || 'idle') : (isNight() && n.nightIdle) ? n.nightIdle : (dp > 6 && n.work && hour > 7 && hour < 17) ? n.work : n.idle; n.h.locomote(speed, { idle: talking ? 'talk' : idle, talk: speaking, slow: n.slow }); }
    if (n.mode === 'lying') n.h.lookAtPoint(null);
    else if (dp < 7 || talking) n.h.lookAtPoint(pH.headPos, 1); else if (n.lookSky && isNight()) n.h.lookAtPoint(n.h.headPos.add(V3(Math.sin(n.yaw) * 3, 4, Math.cos(n.yaw) * 3)), 0.8); else n.h.lookAtPoint(null);
    n.h.update(dt);
  }
}
// =====================================================================
// diálogos
// =====================================================================
const Nd = (line, opts) => ({ line, opts }), O = (t, go, act) => ({ t, go, act });
const lumesN = () => PLACES.filter(p => S.lumes[p.id]).length;
const BYE = [O('Até mais.', null)];
// conversa casual: percorre as falas em ordem, uma por visita
function chat(id, list, opts = BYE) { const i = S.chat[id] || 0; S.chat[id] = (i + 1) % list.length; return Nd(list[i], opts); }
function talkOdessa() {
  if (!S.met.odessa) return Nd('od_first', [
    O('Você é a maga Odessa?', () => Nd('od_quem', [O('Que tipo de mapa você quer?', mapaOd)])),
    O('Que tipo de mapa você quer?', mapaOd)]);
  const n = lumesN();
  if (n >= 8 && !S.told) return Nd('od_todos', [O('Eu volto quando escurecer.', null, () => { S.told = 1; refreshQuest(); save(); })]);
  if (S.told && !S.final) { if (isNight()) return Nd('fim1', [O('Olhar para cima com ela', null, () => { pendingAfterDialog = startFinale; })]); return Nd('od_noite', BYE); }
  if (S.final) return chat('odessa_pos', ['od_pos1', 'od_pos2', 'od_cha']);
  return Nd(['od_n1', 'od_n1', 'od_n2', 'od_n2', 'od_n3', 'od_n3', 'od_n4', 'od_n4'][Math.min(n, 7)] || 'od_cha', [O('Ainda tem chá?', () => Nd('od_cha', BYE)), O('Vou continuar procurando.', null)]);
}
const mapaOd = () => Nd('od_mapa', [O('Como eu encontro esses lugares?', () => Nd('od_como', [O('E depois?', () => Nd('od_depois', [O('Combinado.', null, () => { S.met.odessa = 1; toast('O mapa do que importa', 'Contemple os oito lugares dos Veladores'); refreshQuest(); save(); })]))]))]);
function talkAnselmo() {
  if (isNight()) return Nd('an_noite', BYE);
  if (!S.met.anselmo) return Nd('an_first', [O('O senhor conhece os gigantes?', () => Nd('an_gigantes', [O('E os Veladores?', () => Nd('an_veladores', BYE, met('anselmo')))])), O('O que acha que aconteceu com os Veladores?', () => Nd('an_veladores', BYE, met('anselmo')))]);
  return chat('anselmo', ['an_c1', 'an_c2', 'an_c3']);
}
function talkCeleste() {
  if (isNight()) return Nd('ce_noite', BYE);
  if (!S.met.celeste) return Nd('ce_first', [O('A Odessa vem sempre aqui?', () => Nd('ce_odessa', [O('E as ruínas? O que você acha?', () => Nd('ce_ruinas', BYE))]), met('celeste')), O('O que você acha das ruínas?', () => Nd('ce_ruinas', BYE), met('celeste'))]);
  return chat('celeste', ['ce_c1', 'ce_c3', 'ce_c2']);
}
function talkTome() {
  if (S.final) return Nd('to_pos', BYE);
  if (!S.met.tome) return Nd('to_first', [O('Eu ainda não sei.', () => Nd('to_naosei', BYE), met('tome')), O('Por que você quer saber?', () => Nd('to_porque', BYE), met('tome'))]);
  return chat('tome', ['to_c1', 'to_c2', 'to_c3']);
}
function talkIrene() {
  if (!S.met.irene) return Nd('ir_first', [O('Então por que você continua?', () => Nd('ir_porque', [O('Posso ver?', () => Nd('ir_ver', BYE))]), met('irene')), O('Posso ver?', () => Nd('ir_ver', BYE), met('irene'))]);
  return chat('irene', ['ir_c1', 'ir_c2', 'ir_c3']);
}
function talkBastiao() {
  if (!S.met.bastiao) return Nd('ba_first', [O('Só vim conhecer.', () => Nd('ba_conhecer', [O('O que você está fazendo?', () => Nd('ba_ponte', BYE))]), met('bastiao')), O('O que você está fazendo?', () => Nd('ba_ponte', BYE), met('bastiao'))]);
  return chat('bastiao', ['ba_c1', 'ba_c2', 'ba_c3']);
}
const met = (id) => () => { S.met[id] = 1; save(); };
let dlgNPC = null, dlgNode = null, pendingAfterDialog = null;
function openDialog(n) { if (n.finale) return; document.body.classList.add('cine'); dlgNPC = n; state = 'dialog'; post.bokeh.enabled = perf.level < 2; const node = n.talk(); Voice.prefetch([node.line]); showNode(node); }
function showNode(node) {
  if (!node) { closeDialog(); return; } dlgNode = node; $('dialog').hidden = false; $('prompt').hidden = true;
  const sp = LINES[node.line] ? LINES[node.line][0] : null; const who = CAST[sp] || { name: dlgNPC.name || '', role: '' };
  $('dlgName').textContent = who.name; $('dlgRole').textContent = who.role || ''; $('dlgText').textContent = lineText(node.line); $('dlgText').classList.remove('in'); void $('dlgText').offsetWidth; $('dlgText').classList.add('in');
  Voice.say(node.line, {});
  if (dlgNPC && dlgNPC.h) dlgNPC.h.nod = 1;
  const box = $('dlgOpts'); box.innerHTML = ''; node.opts.forEach((o, i) => { const b = document.createElement('button'); b.innerHTML = `<b>${i + 1}</b>`; b.appendChild(document.createTextNode(o.t)); b.onclick = (e) => { e.stopPropagation(); choose(i); }; box.appendChild(b); });
  // pré-carrega as próximas falas
  for (const o of node.opts) if (typeof o.go === 'function') { try { const nx = o.go(); if (nx && nx.line) Voice.prefetch([nx.line]); } catch (e) { } }
}
function choose(i) { const o = dlgNode && dlgNode.opts[i]; if (!o) return; Sound.click(); if (o.act) o.act(); const nx = typeof o.go === 'function' ? o.go() : o.go; showNode(nx || null); refreshQuest(); }
function closeDialog() { Voice.stop(); document.body.classList.remove('cine'); $('dialog').hidden = true; dlgNode = null; if (state === 'dialog') state = 'play'; post.bokeh.enabled = false; const after = pendingAfterDialog; pendingAfterDialog = null; setTimeout(() => { if (state === 'play') dlgNPC = null; if (after) after(); }, 300); }
// pensamento da Lia, sem caixa de diálogo: só legenda
function think(id, after) { const el = $('thought'); el.textContent = lineText(id); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); el.hidden = false; Voice.say(id, { onEnd: () => { setTimeout(() => { el.classList.remove('show'); setTimeout(() => { el.hidden = true; }, 900); after && after(); }, 900); } }); }

// =====================================================================
// lumes, caderno, descobertas
// =====================================================================
let lume = null, lumePlace = null;
function contemplate(place) {
  const sp = SPOTS[place.place]; if (!sp) return;
  if (place.night && !(hour >= 19.6 || hour < 5)) { sitAt(spAt(sp), () => think('li_circ_dia', () => { $('lapseHint').hidden = false; player.sit.waitNight = place; })); return; }
  sitAt(spAt(sp), () => startLume(place));
}
const spAt = (sp) => ({ x: sp.x, z: sp.z, yaw: sp.yaw, y: sp.y });
function startLume(place) {
  const sp = SPOTS[place.place]; lumePlace = place; state = 'lume'; document.body.classList.add('cine'); timeLapse = 0; $('lapseHint').hidden = true;
  const fwd = V3(Math.sin(sp.yaw), 0, Math.cos(sp.yaw)); const c = { x: sp.x + fwd.x * 3.2, z: sp.z + fwd.z * 3.2 };
  if (place.id === 'escada') { c.x = sp.x + fwd.x * 1.2; c.z = sp.z + fwd.z * 1.2; }
  lume = new Lume(place, c, { yaw: sp.yaw + Math.PI, top: sp.top }, () => finishLume(place));
  Music.stop(4); setTimeout(() => Music.play('memory', { fade: 3, vol: 0.8 }), 600);
}
function finishLume(place) {
  lume = null; state = 'play'; document.body.classList.remove('cine'); S.lumes[place.id] = 1; placeDone(place);
  // desenha a cena no caderno
  captureSketch(place.id); Sound.page();
  const n = lumesN(); toast('Desenhado no caderno', `${place.name} · ${n}/8`); refreshQuest(); save();
  if (n === 8) setTimeout(() => think('li_mapa_cheio'), 2500);
  Music.silence = rr(12, 30);
}
function placeDone(place, quiet) { const g = giants.find(g => g.id === place.id); if (g) g.target = 0.35; const sp = SPOTS[place.place]; if (sp) addSiteSpirits(V3(sp.x, groundH(sp.x, sp.z), sp.z), quiet ? 6 : 9, 9, 3); }
function captureSketch(id) {
  try {
    // render pequeno e direto (sem pós-processamento), lido da GPU e redesenhado como lápis sobre papel
    const W = 480, H = Math.round(480 / camera.aspect);
    const rt = new THREE.WebGLRenderTarget(W, H); renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
    const px = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px); rt.dispose();
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const im = g.createImageData(W, H), d = im.data, L = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s0 = ((H - 1 - y) * W + x) * 4; const lin = (px[s0] * 0.3 + px[s0 + 1] * 0.59 + px[s0 + 2] * 0.11) / 255; const tm = lin / (1 + lin) * 1.6; L[y * W + x] = Math.pow(clamp(tm, 0, 1), 1 / 2.2); }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; const gx = L[i + 1 - W] + 2 * L[i + 1] + L[i + 1 + W] - L[i - 1 - W] - 2 * L[i - 1] - L[i - 1 + W]; const gy = L[i + W - 1] + 2 * L[i + W] + L[i + W + 1] - L[i - W - 1] - 2 * L[i - W] - L[i - W + 1]; const e = clamp(Math.hypot(gx, gy) * 2.2, 0, 1); const tone = 0.55 + 0.45 * Math.pow(L[i], 0.6); const hatch = ((x + y) % 5 === 0 && L[i] < 0.35) ? 0.12 : 0; const v = clamp(tone - e * 0.75 - hatch, 0, 1); d[i * 4] = 236 * v + 10; d[i * 4 + 1] = 222 * v + 8; d[i * 4 + 2] = 196 * v + 6; d[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); const url = c.toDataURL('image/jpeg', 0.72); sketches[id] = url; store.set('aldren-sketch-' + id, url);
  } catch (e) { console.warn('esboço', e); }
}
function readNote(id) { const n = NOTES[id]; if (!S.notes[id]) { S.notes[id] = 1; Sound.page(); save(); toast('Anotado no caderno', n.title); } think(n.line); }
function openJournal() {
  const list = $('journalList'); list.innerHTML = '';
  const n = lumesN(); $('journalCount').textContent = `${n} de 8 lugares`;
  for (const pl of [...PLACES].sort((a, b) => (S.lumes[b.id] ? 1 : 0) - (S.lumes[a.id] ? 1 : 0))) { const b = document.createElement('article'); const done = S.lumes[pl.id];
    b.innerHTML = done ? `${sketches[pl.id] ? `<img alt="" src="${sketches[pl.id]}">` : ''}<h3>${pl.name}</h3><p class="cap">${pl.sketch}</p><p>${lineText(pl.reflect)}</p>` : `<h3 class="unk">Um lugar ainda não visto</h3><p class="cap">${pl.hint}</p>`; list.appendChild(b); }
  const notes = Object.keys(S.notes); if (notes.length) { const h = document.createElement('h2'); h.textContent = 'Anotações'; list.appendChild(h); for (const k of notes) { const b = document.createElement('article'); b.innerHTML = `<h3>${NOTES[k].title}</h3><p>${lineText(NOTES[k].line)}</p>`; list.appendChild(b); } }
  $('journal').hidden = false; if (state === 'play') state = 'journal';
}
function closeJournal() { $('journal').hidden = true; if (state === 'journal') state = 'play'; }

// =====================================================================
// final: a Chuva de Lumes
// =====================================================================
let finale = null;
function startFinale() {
  state = 'finale'; document.body.classList.add('cine'); Music.stop(3); timeLapse = 0;
  const c = storySpots.finale; const fwd = V3(Math.sin(odessa.day[2]), 0, Math.cos(odessa.day[2]));
  const ring = [[odessa, 1.2, 0], [anselmo, -1.8, 1.6], [celeste, -2.6, -0.4], [tome, 2.2, 1.8], [irene, 0.6, 2.8], [bastiao, 3.0, -0.8]];
  const rgt = V3(fwd.z, 0, -fwd.x);
  for (const [n, a, b] of ring) { n.finale = true; n.inside = false; n.x = c.x + rgt.x * a + fwd.x * b; n.z = c.z + rgt.z * a + fwd.z * b; n.yaw = Math.atan2(fwd.x, fwd.z); n.finaleIdle = n === odessa ? 'idle' : n === anselmo ? 'fold' : 'idle'; n.h.root.visible = true; }
  player.x = c.x - rgt.x * 0.4; player.z = c.z - rgt.z * 0.4; player.h = Math.atan2(fwd.x, fwd.z); player.y = probe(player.x, player.z, groundH(player.x, player.z) + 0.5).h; player.speed = 0;
  const lines = FINALE.slice(); let i = -1; let t = 0, waiting = false;
  finale = { speaker: null, t: 0, rain: null, camera: (dt) => { finale.t += dt; const a = finale.t * 0.03; const center = V3(c.x, groundH(c.x, c.z), c.z); const up = smooth(10, 26, finale.t); const want = center.clone().add(V3(Math.sin(odessa.yaw + Math.PI + a) * lerp(7, 9, up), lerp(1.8, 1.2, up), Math.cos(odessa.yaw + Math.PI + a) * lerp(7, 9, up))); cam.cur.lerp(want, 1 - Math.exp(-dt * 1.2)); camera.position.copy(cam.cur); const look = center.clone().add(V3(fwd.x * 6, lerp(1.4, 7.5, up), fwd.z * 6)); camera.lookAt(look); camera.fov = lerp(camera.fov, 50, dt); camera.updateProjectionMatrix(); },
    update: (dt) => { t += dt; if (finale.rain) finale.rain.update(dt); pH.root.position.set(player.x, player.y, player.z); pH.root.rotation.y = player.h; pH.locomote(0); pH.lookAtPoint(V3(player.x + fwd.x * 6, player.y + 8, player.z + fwd.z * 6), 0.9); pH.update(dt);
      if (!waiting && t > 2.5) { i++; const id = lines[i]; if (!id) { finale.end(); return; } const [sp] = LINES[id]; finale.speaker = sp; showSub(id); waiting = true;
        if (id === 'fim5') { odessa.finaleIdle = 'spellIn'; setTimeout(() => { odessa.finaleIdle = 'spell'; }, 1500); }
        if (id === 'fim6') { finale.rain = new LumeRain(c); sky.meteors = 1; Music.play('finale', { fade: 2, vol: 1 }); }
        Voice.say(id, { onEnd: () => { waiting = false; t = id === 'fim5' ? -3 : 0.6; } }); } },
    end: () => { hideSub(); finale.speaker = null; odessa.finaleIdle = 'idle'; S.final = 1; save(); refreshQuest(); finalAmbience(); $('ending').hidden = false; setTimeout(() => $('ending').classList.add('show'), 50); setTimeout(() => think('fim11'), 1200); } };
}
function finalAmbience() { for (const g of giants) g.target = 0.6; for (let i = 0; i < 4; i++) addSiteSpirits(V3(rr(-40, 40), groundH(0, 0), rr(-40, 40)), 6, 14, 6); }
function endFinale() { $('ending').hidden = true; $('ending').classList.remove('show'); document.body.classList.remove('cine'); for (const n of npcs) n.finale = false; state = 'play'; finale = null; sky.meteors = 0.25; cam.mode = 'follow'; requestLock(); }
function showSub(id) { const m = $('memory'); m.hidden = false; $('memTime').textContent = ''; const sp = LINES[id][0]; $('memName').textContent = CAST[sp] ? CAST[sp].name : ''; $('memText').textContent = lineText(id); m.classList.remove('show', 'thought'); void m.offsetWidth; m.classList.add('show'); }
function hideSub() { $('memory').classList.remove('show'); $('memory').hidden = true; }

// =====================================================================
// interações
// =====================================================================
let curInter = null;
function interactables() {
  const out = [];
  for (const n of npcs) { if (!n.h.root.visible || n.finale || Math.abs(n.y - player.y) > 1.6) continue; if (n.mode === 'lying' || (n.mode === 'settle' && n.settle.then === 'lying')) out.push({ x: n.x, z: n.z, r: 2.6, label: CAST[n.id].name + ' está dormindo', act: () => think('li_dormindo') }); else out.push({ x: n.x, z: n.z, r: 2.6, label: 'Conversar com ' + CAST[n.id].name, act: () => openDialog(n) }); }
  if (S.met.odessa) for (const pl of PLACES) { const sp = SPOTS[pl.place]; if (!sp) continue; out.push({ x: sp.x, z: sp.z, r: 3.2, label: S.lumes[pl.id] ? 'Sentar e olhar um pouco' : 'Sentar e contemplar', act: () => S.lumes[pl.id] ? sitAt(spAt(sp), sitThought) : contemplate(pl) }); }
  else for (const pl of PLACES) { const sp = SPOTS[pl.place]; if (sp) out.push({ x: sp.x, z: sp.z, r: 3.2, label: 'Sentar um pouco', act: () => sitAt(spAt(sp), sitThought) }); }
  for (const k in NOTES) { const sp = storySpots[k]; if (sp) out.push({ x: sp.x, z: sp.z, r: 2.4, label: S.notes[k] ? 'Olhar de novo' : 'Observar', act: () => readNote(k) }); }
  // cadeiras, bancos e camas (dentro e fora das casas)
  for (const st of seats) { if (Math.abs(st.x - player.x) > 2 || Math.abs(st.z - player.z) > 2 || Math.abs(st.y - SIT_H - player.y) > 0.8 || taken.get(st)) continue; out.push({ x: st.x, z: st.z, r: 1.25, label: st.kind === 'chair' ? 'Sentar na cadeira' : st.outdoor ? 'Sentar no banco' : 'Sentar à mesa', act: () => sitAt({ x: st.x, z: st.z, y: st.y, yaw: st.yaw, seat: st }, st.outdoor ? sitThought : () => { $('lapseHint').hidden = false; }) }); }
  for (const b of beds) { if (Math.abs(b.x - player.x) > 2.6 || Math.abs(b.z - player.z) > 2.6 || Math.abs(b.y - 0.5 - player.y) > 0.9 || taken.get(b)) continue; out.push({ x: b.side.x, z: b.side.z, r: 1.6, label: 'Deitar na cama', act: () => lieAt(b) }); }
  return out;
}
const sitThought = () => { const ids = ['li_sentar1', 'li_sentar2', 'li_sentar3']; think(ids[S.sat++ % 3]); $('lapseHint').hidden = false; save(); };
function checkInteract() {
  if (state !== 'play' || player.sit) { curInter = null; $('prompt').hidden = true; return; }
  let best = null, bd = 1e9; const fx = Math.sin(player.h), fz = Math.cos(player.h);
  for (const it of interactables()) { const dx = it.x - player.x, dz = it.z - player.z, d = Math.hypot(dx, dz); if (d > it.r) continue; const dot = (dx * fx + dz * fz) / (d || 1); if (dot < 0.1 && d > 1.4) continue; const sc = d - dot; if (sc < bd) { bd = sc; best = it; } }
  curInter = best; const pr = $('prompt'); if (best) { pr.hidden = false; pr.innerHTML = `<kbd>${isTouch ? 'Usar' : 'E'}</kbd>${best.label}`; } else pr.hidden = true;
}
function interact() { if (state === 'play' && curInter && !player.sit) { curInter.act(); refreshQuest(); } }
function checkDiscover() {
  for (const k in POI) { if (S.found[k] || k === 'village') continue; const p = POI[k]; if (Math.hypot(player.x - p.x, player.z - p.z) < (k === 'lake' ? 80 : 26)) { S.found[k] = 1; toast('Lugar descoberto', p.name); Music.stinger('discover'); refreshQuest(); save(); } }
}

// =====================================================================
// objetivos, bússola, mapa, avisos
// =====================================================================
function nearestOpenPlace() { let best = null, bd = 1e9; for (const pl of PLACES) { if (S.lumes[pl.id]) continue; const sp = SPOTS[pl.place]; if (!sp) continue; const d = Math.hypot(sp.x - player.x, sp.z - player.z); if (d < bd) { bd = d; best = { pl, sp }; } } return best; }
function objectives() {
  const n = lumesN(); const o = [];
  if (!S.met.odessa) o.push({ t: 'Encontre Odessa no observatório, na colina a nordeste da vila', tgt: storySpots.odessa });
  else if (n < 8) { const b = nearestOpenPlace(); o.push({ t: `Contemple os lugares dos Veladores (${n}/8)`, sub: b ? b.pl.hint : '', tgt: b ? b.sp : null }); }
  else if (!S.told) o.push({ t: 'Volte ao observatório e conte tudo a Odessa', tgt: storySpots.odessa });
  else if (!S.final) o.push({ t: isNight() ? 'Suba ao observatório: a Chuva de Lumes começou' : 'Espere a noite e suba ao observatório', tgt: storySpots.odessa });
  else o.push({ t: 'O vale é seu. Ande por onde quiser.', tgt: null });
  return o;
}
function refreshQuest() { const o = objectives()[0]; $('questText').innerHTML = `<div>${o.t}</div>` + (o.sub ? `<div>${o.sub}</div>` : ''); $('lumeCount').textContent = lumesN() + '/8'; }
const cmp = $('compassCv').getContext('2d');
function drawCompass() {
  const W = 880, H = 76; cmp.clearRect(0, 0, W, H); const head = ((Math.atan2(camFwd.x, -camFwd.z) * 180 / Math.PI) + 360) % 360; const ppd = W / 200;
  const labels = { 0: 'N', 45: 'NE', 90: 'L', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' }; cmp.textAlign = 'center'; cmp.textBaseline = 'middle';
  for (let d = Math.floor((head - 100) / 15) * 15; d <= head + 100; d += 15) { const x = W / 2 + (d - head) * ppd; const dd = ((d % 360) + 360) % 360; cmp.globalAlpha = (1 - Math.abs(d - head) / 100) * 0.9;
    if (labels[dd] !== undefined) { cmp.fillStyle = dd === 0 ? '#f0d2a0' : '#f3ecdc'; cmp.font = (dd % 90 === 0 ? '600 28px ' : '500 20px ') + '"Cormorant Garamond",Georgia,serif'; cmp.fillText(labels[dd], x, 34); } else { cmp.fillStyle = 'rgba(243,236,220,.45)'; cmp.fillRect(x - 1, 30, 2, 8); } }
  cmp.globalAlpha = 1; const o = objectives()[0];
  if (o && o.tgt) { const t = o.tgt; const b = (Math.atan2(t.x - player.x, -(t.z - player.z)) * 180 / Math.PI + 360) % 360; let dd = b - head; while (dd > 180) dd -= 360; while (dd < -180) dd += 360; const x = W / 2 + clamp(dd, -96, 96) * ppd;
    cmp.fillStyle = '#ffe2b0'; cmp.shadowColor = 'rgba(255,220,160,.8)'; cmp.shadowBlur = 10; cmp.beginPath(); cmp.arc(x, 12, 5, 0, 7); cmp.fill(); cmp.shadowBlur = 0; cmp.font = '500 17px Inter,system-ui,sans-serif'; cmp.fillStyle = 'rgba(243,236,220,.8)'; cmp.fillText(Math.round(Math.hypot(t.x - player.x, t.z - player.z)) + ' m', x, 64); }
}
let mapBase = null;
function buildMapBase() {
  const c = document.createElement('canvas'); c.width = c.height = NV; const ctx = c.getContext('2d'); const img = ctx.createImageData(NV, NV);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) { const k = j * NV + i; const h = HGT[k]; let col = [0.72, 0.68, 0.52]; const sp = [SPLAT[k * 4], SPLAT[k * 4 + 1], SPLAT[k * 4 + 2], SPLAT[k * 4 + 3]];
    const mix = (a, b, t) => a.map((v, q) => lerp(v, b[q], t)); col = mix(col, [0.66, 0.58, 0.44], sp[0]); col = mix(col, [0.62, 0.6, 0.55], sp[1]); col = mix(col, [0.93, 0.92, 0.88], sp[2]);
    const fd = forestDensity(i * CELL - HALF, j * CELL - HALF); col = mix(col, [0.5, 0.55, 0.4], clamp(fd * 2.5, 0, 0.7) * (1 - sp[1]) * (1 - sp[2]));
    const sh = clamp(0.85 + (NRM[k * 3] * -0.9 + NRM[k * 3 + 2] * -0.6) * 1.2, 0.5, 1.25); const contour = Math.abs((h % 12) - 6) > 5.6 ? 0.88 : 1; if (h < WATER) col = [0.55, 0.64, 0.66]; else col = col.map(v => v * sh * contour);
    img.data[k * 4] = clamp(col[0], 0, 1) * 255; img.data[k * 4 + 1] = clamp(col[1], 0, 1) * 255; img.data[k * 4 + 2] = clamp(col[2], 0, 1) * 255; img.data[k * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0); mapBase = c;
}
function drawMap() {
  const cv = $('mapCv'), ctx = cv.getContext('2d'); const W = cv.width; const view = 1200; const sc = W / view; const tx = x => (x + view / 2) * sc, tz = z => (z + view / 2) * sc;
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(0, 0, W, W); const src = (HALF - view / 2) / CELL; ctx.drawImage(mapBase, src, src, view / CELL, view / CELL, 0, 0, W, W);
  ctx.strokeStyle = 'rgba(110,80,50,.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); for (const p of PATHS) { ctx.beginPath(); p.forEach(([x, z], i) => i ? ctx.lineTo(tx(x), tz(z)) : ctx.moveTo(tx(x), tz(z))); ctx.stroke(); } ctx.setLineDash([]);
  ctx.font = 'italic 600 21px "Cormorant Garamond",Georgia,serif'; ctx.textAlign = 'center';
  for (const k in POI) { const p = POI[k]; const known = k === 'village' || S.found[k]; if (!known) continue; ctx.fillStyle = '#3a2c1c'; ctx.beginPath(); ctx.arc(tx(p.x), tz(p.z), 4, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(250,244,228,.85)'; ctx.lineWidth = 3; ctx.strokeText(p.name, tx(p.x), tz(p.z) - 11); ctx.fillText(p.name, tx(p.x), tz(p.z) - 11); }
  for (const pl of PLACES) { const sp = SPOTS[pl.place]; if (!sp || !S.lumes[pl.id]) continue; ctx.fillStyle = '#c9902f'; ctx.beginPath(); ctx.arc(tx(sp.x), tz(sp.z), 7, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.save(); ctx.translate(tx(player.x), tz(player.z)); ctx.rotate(Math.PI - player.h); ctx.fillStyle = '#7a3a22'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function toast(t, sub) { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = sub ? `<small>${t}</small>${sub}` : t; $('toasts').appendChild(d); setTimeout(() => d.remove(), 5200); }
function updateHUD() { const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60); $('clock').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); drawCompass(); if (!$('mapView').hidden) drawMap(); }

// =====================================================================
// efeitos do mundo
// =====================================================================
const windV = new THREE.Vector2();
function updateWorldFX(dt) {
  windV.set(Math.cos(elapsed * 0.02) * 1.0, Math.sin(elapsed * 0.017) * 0.6 + 0.3); U.wind.value.copy(windV); U.windStrength.value = 0.7 + 0.5 * Math.sin(elapsed * 0.11) * Math.sin(elapsed * 0.037 + 1);
  for (const sp of smokes) { if (Math.hypot(sp.x - camera.position.x, sp.z - camera.position.z) > 180) continue; if (rand() < dt * 2.5) smoke.emit({ x: sp.x + rr(-0.15, 0.15), y: sp.y, z: sp.z + rr(-0.15, 0.15), vx: rr(-0.1, 0.1), vy: rr(0.6, 1.0), vz: rr(-0.1, 0.1), drag: 0.25, life: rr(6, 9), s0: 0.4, s1: rr(2.6, 4.2), c: [0.75, 0.74, 0.72], a0: 0.13, fadeIn: 0.15, wind: 0.9 }); }
  for (const f of fires) {
    if (f.dead) continue;
    if (f.light) f.light.intensity = f.base * (0.75 + 0.18 * Math.sin(elapsed * 13 + f.p.x) * Math.sin(elapsed * 7.3 + f.p.z) + 0.1 * Math.sin(elapsed * 23)) * (0.3 + 0.7 * (1 - sky.dayF * 0.7));
    if (Math.hypot(f.p.x - camera.position.x, f.p.z - camera.position.z) > 110 || f.forge) continue;
    for (let i = 0; i < 3; i++) if (rand() < dt * 28) fireP.emit({ x: f.p.x + rr(-0.22, 0.22), y: f.p.y - 0.35, z: f.p.z + rr(-0.22, 0.22), vx: rr(-0.1, 0.1), vy: rr(0.8, 1.5), vz: rr(-0.1, 0.1), life: rr(0.35, 0.7), s0: rr(0.35, 0.55), s1: 0.05, c: [1.0, rr(0.42, 0.6), 0.16], a0: 0.85, wind: 0.2 });
    if (rand() < dt * 2) smoke.emit({ x: f.p.x, y: f.p.y + 0.6, z: f.p.z, vx: 0, vy: 0.8, vz: 0, drag: 0.3, life: 5, s0: 0.3, s1: 2.0, c: [0.5, 0.5, 0.5], a0: 0.1, fadeIn: 0.2, wind: 0.8 });
    if (rand() < dt * 4) fireP.emit({ x: f.p.x, y: f.p.y, z: f.p.z, vx: rr(-0.3, 0.3), vy: rr(1.5, 3), vz: rr(-0.3, 0.3), life: rr(1, 2), s0: 0.04, s1: 0.02, c: [1, 0.55, 0.2], a0: 1, wind: 0.6 });
  }
  const w2 = { x: windV.x, y: windV.y }; smoke.update(dt, w2); fireP.update(dt, w2); dust.update(dt, w2);
  const amb = new THREE.Color().copy(U.sunColor.value).multiplyScalar(0.5 * sky.dayF).add(new THREE.Color(0.35, 0.4, 0.48).multiplyScalar(0.2 + 0.5 * sky.dayF)); smoke.mat.uniforms.amb.value.copy(amb); dust.mat.uniforms.amb.value.copy(amb).multiplyScalar(1.4);
  M.glass.emissiveIntensity = (cam.inK || 0) > 0.5 ? 0 : sky.nightF * 1.1;
  for (const w of windmills) w.sails.rotation.z -= dt * (0.25 + 0.2 * U.windStrength.value);
}
// lampiões das casas: brilho em todos, luz de verdade só nos mais próximos
let lampSprites = [], lampLights = [];
function buildLamps() {
  const mat = new THREE.SpriteMaterial({ map: GLOW, color: 0xffc27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const p of lamps) { const s = new THREE.Sprite(mat); s.position.copy(p); s.scale.setScalar(0.9); scene.add(s); lampSprites.push(s); }
  lampLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffb565, 0, 9, 1.8); scene.add(l); return l; });
}
function updateLamps() {
  const on = smooth(0.25, 0.7, sky.nightF); for (const s of lampSprites) { s.visible = on > 0.02; s.material.opacity = on * (0.85 + 0.1 * Math.sin(elapsed * 9)); }
  const near = lamps.map((p, i) => [p.distanceToSquared(camera.position), i]).sort((a, b) => a[0] - b[0]);
  lampLights.forEach((l, k) => { const it = near[k]; if (!it || on < 0.02) { l.intensity = 0; return; } l.position.copy(lamps[it[1]]); l.intensity = 3 * on; });
}
let hearthLights = [], candleLight = null, roomLight = null;
function updateDoors(dt) {
  for (const d of doors) { let near = Math.hypot(player.x - d.p.x, player.z - d.p.z) < 2.4; for (const n of npcs) if (n.mode !== 'lying' && n.mode !== 'sitting' && Math.abs(n.y - d.p.y) < 2.5 && Math.hypot(n.x - d.p.x, n.z - d.p.z) < 1.8) near = true;
    d.target = near ? 1 : 0; if (near !== d.was) { d.was = near; if (Math.hypot(camera.position.x - d.p.x, camera.position.z - d.p.z) < 25) Sound.door(near, d.p.x, d.p.z); }
    d.open = lerp(d.open, d.target, 1 - Math.exp(-dt * 3)); d.pivot.rotation.y = d.rot - d.open * 1.75; }
}
function updateInteriorLights(dt) {
  const list = interiors.map(h => ({ h, d: Math.hypot(h.x - camera.position.x, h.z - camera.position.z) })).sort((a, b) => a.d - b.d);
  hearthLights.forEach((l, i) => { const it = list[i]; if (!it || it.d > 40) { l.intensity = 0; return; } l.position.copy(it.h.fire).add(V3(0, 0.3, 0)); l.intensity = (3.5 + 1.2 * Math.sin(elapsed * 11 + i) * Math.sin(elapsed * 7.3) + rand() * 0.6) * clamp(1 - it.d / 40, 0, 1);
    if (it.d < 20 && rand() < dt * 22) fireP.emit({ x: it.h.fire.x + rr(-0.2, 0.2), y: it.h.fire.y - 0.1, z: it.h.fire.z + rr(-0.1, 0.1), vx: 0, vy: rr(0.5, 1.0), vz: 0, life: rr(0.3, 0.6), s0: rr(0.25, 0.4), s1: 0.04, c: [1, rr(0.4, 0.6), 0.15], a0: 0.85, wind: 0 }); });
  const ih = insideHouse(player.x, player.z);
  if (candleLight) { if (ih && ih.candle) { candleLight.position.copy(ih.candle); candleLight.intensity = 1.4 + 0.3 * Math.sin(elapsed * 17) * Math.sin(elapsed * 5); } else candleLight.intensity = 0; }
  // luz do dia que entra pelas janelas: uma luz suave no meio do cômodo
  if (roomLight) { if (ih) { roomLight.position.set(ih.x, player.y + 2.2, ih.z); roomLight.color.copy(U.sunColor.value).lerp(new THREE.Color(0.85, 0.9, 1), 0.5); roomLight.intensity = 6 * sky.dayF + 0.4; } else roomLight.intensity = 0; }
}
let lantern = null, lanternOn = false, lanternK = 0;
function buildLantern() {
  const g = new THREE.Group(); const frame = new THREE.MeshStandardMaterial({ color: 0x3a2e22, metalness: 0.7, roughness: 0.45 }); const glass = new THREE.MeshStandardMaterial({ color: 0xfff1d8, emissive: 0xffc777, emissiveIntensity: 0, transparent: true, opacity: 0.6, roughness: 0.1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.15, 12), glass); body.position.y = -0.16; g.add(body); for (const y of [-0.245, -0.075]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.022, 12), frame); r.position.y = y; g.add(r); }
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.05, 12), frame); top.position.y = -0.04; g.add(top); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 12), frame); ring.position.y = 0.0; g.add(ring);
  const light = new THREE.PointLight(0xffd29a, 0, 14, 1.6); light.position.set(0, -0.16, 0); g.add(light);
  lantern = { g, glass, light, ang: V3(), vel: V3() }; g.visible = false; scene.add(g);
}
function toggleLantern() { lanternOn = !lanternOn; Sound.rustle(player.x, player.z); }
function updateLantern(dt) {
  if (!lantern || !pH) return; lanternK = lerp(lanternK, lanternOn ? 1 : 0, 1 - Math.exp(-dt * 5)); lantern.g.visible = lanternK > 0.02 && pH.root.visible;
  if (!lantern.g.visible) { lantern.light.intensity = 0; return; }
  // pendurada na mão esquerda, balançando como um pêndulo (sempre na vertical, sem "grudar" no osso)
  const hp = pH.handPos('l'); const prev = lantern.prev || hp.clone(); const acc = hp.clone().sub(prev).divideScalar(Math.max(dt, 1e-3)); lantern.prev = hp.clone();
  lantern.vel.x += (-acc.z * 0.02 - lantern.ang.x * 22) * dt; lantern.vel.z += (acc.x * 0.02 - lantern.ang.z * 22) * dt; lantern.vel.multiplyScalar(Math.exp(-dt * 2.5)); lantern.ang.addScaledVector(lantern.vel, dt);
  lantern.ang.x = clamp(lantern.ang.x, -0.6, 0.6); lantern.ang.z = clamp(lantern.ang.z, -0.6, 0.6);
  lantern.g.position.copy(hp).add(V3(0, -0.03, 0)); lantern.g.rotation.set(lantern.ang.x, 0, lantern.ang.z);
  const fl = 0.93 + 0.07 * Math.sin(elapsed * 21) * Math.sin(elapsed * 8.7); lantern.light.intensity = 4.5 * lanternK * fl; lantern.glass.emissiveIntensity = 2.0 * lanternK * fl;
  if (sky.nightF > 0.6 && !lanternOn && !S.lanternTip && state === 'play') { S.lanternTip = true; think('li_noite'); toast('Lanterna', isTouch ? 'Toque em Lanterna' : 'Pressione L'); }
}
const ripples = []; let rippleMat = null;
function buildRipples() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 40, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  rippleMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, color: 0xdfe8ea });
  for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rippleMat.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 4; scene.add(m); ripples.push({ m, t: 1, life: 1, s: 1 }); }
}
function ripple(x, z, s = 1) { const r = ripples.find(r => r.t >= r.life) || ripples[0]; r.t = 0; r.life = rr(1.2, 2.0); r.s = s; r.m.position.set(x, WATER + 0.035, z); r.m.visible = true; }
function updateRipples(dt) { for (const r of ripples) { if (r.t >= r.life) { r.m.visible = false; continue; } r.t += dt; const k = r.t / r.life; r.m.scale.setScalar(0.3 + k * 2.6 * r.s); r.m.material.opacity = (1 - k) * 0.4 * (0.6 + 0.4 * sky.dayF); } }
function waterStep(x, z, depth, speed) { ripple(x, z, 0.8 + speed * 0.15); for (let i = 0; i < 6 + speed * 2; i++) dust.emit({ x: x + rr(-0.2, 0.2), y: WATER + 0.05, z: z + rr(-0.2, 0.2), vx: rr(-0.6, 0.6), vy: rr(0.8, 1.8) * clamp(speed / 3, 0.5, 1.2), vz: rr(-0.6, 0.6), g: 9, drag: 0.5, life: rr(0.35, 0.6), s0: 0.05, s1: 0.1, c: [0.85, 0.9, 0.92], a0: 0.45, wind: 0 }); }

// =====================================================================
// entrada
// =====================================================================
const canvas = renderer.domElement;
function requestLock() {
  if (isTouch || lockFailed) return;
  try { const r = canvas.requestPointerLock && canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { lockFailed = true; showLookHint(); }); } catch (e) { lockFailed = true; }
  setTimeout(() => { if (!locked && state === 'play') { lockFailed = true; showLookHint(); } }, 700);
}
let hintShown = false; function showLookHint() { if (hintShown) return; hintShown = true; toast('Câmera', 'Arraste o mouse ou use as setas'); }
document.addEventListener('pointerlockchange', () => { const was = locked; locked = document.pointerLockElement === canvas; if (was && !locked && state === 'play') pauseGame(); });
document.addEventListener('pointerlockerror', () => { lockFailed = true; showLookHint(); });
let prevState = 'play';
function pauseGame() { if (!['play', 'dialog'].includes(state)) return; prevState = state; state = 'paused'; $('pause').hidden = false; $('pauseInfo').textContent = `São ${$('clock').textContent} no vale. ${lumesN()} de 8 lugares no caderno. O progresso fica salvo neste navegador.`; }
function resume() { $('pause').hidden = true; state = prevState === 'dialog' && dlgNode ? 'dialog' : 'play'; if (state === 'play') { $('dialog').hidden = true; post.bokeh.enabled = false; } requestLock(); }
let drag = null;
canvas.addEventListener('mousedown', (e) => { window.focus(); if (state !== 'play') return; if (!locked && !lockFailed && !isTouch) requestLock(); if (!locked) drag = { x: e.clientX, y: e.clientY }; });
addEventListener('mouseup', () => { drag = null; });
addEventListener('mousemove', (e) => { if (state !== 'play') return; let mx = 0, my = 0; if (locked) { mx = e.movementX; my = e.movementY; } else if (drag) { mx = e.clientX - drag.x; my = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; } else return; mx = clamp(mx, -200, 200); my = clamp(my, -200, 200); const s = 0.0019 * (locked ? 1 : 1.6) * settings.sens; cam.yaw -= mx * s; cam.pitch = clamp(cam.pitch - my * s, -1.1, 0.9); if (cam.mode === 'sit') cam.sitK = Math.max(0, (cam.sitK || 0) - 0.02); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if ((state === 'lume' || state === 'finale') && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { if (lume) lume.skip(); else Voice.stop(); return; }
  if (state === 'intro' && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { Voice.stop(); return; }
  if (e.code === 'KeyJ' && !e.repeat) { if (state === 'journal') closeJournal(); else if (state === 'play') openJournal(); return; }
  if (state === 'journal' && e.code === 'Escape') { closeJournal(); return; }
  if (/^Arrow|Space/.test(e.code) && state === 'play') e.preventDefault(); if (e.repeat) return;
  if (state === 'dialog') { const m = e.code.match(/^(Digit|Numpad)([1-9])$/); if (m) choose(+m[2] - 1); else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { if (Voice.playing) Voice.stop(); else if (dlgNode && dlgNode.opts.length === 1) choose(0); } else if (e.code === 'Escape') closeDialog(); return; }
  if (state !== 'play') return;
  if (e.code === 'KeyL') toggleLantern();
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyT' && player.sit) { if (player.sit.lie && isNight()) sleepUntilMorning(); else { timeLapse = timeLapse ? 0 : 1; $('lapseHint').classList.toggle('on', !!timeLapse); } }
  if (e.code === 'KeyM') $('mapView').hidden = !$('mapView').hidden;
  if (e.code === 'Escape' && lockFailed) pauseGame();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post && post.setSize(innerWidth, innerHeight); });
$('resumeBtn').onclick = (e) => { e.stopPropagation(); resume(); };
let resetArm = false; $('resetBtn').onclick = (e) => { e.stopPropagation(); if (!resetArm) { resetArm = true; $('resetConfirm').hidden = false; return; } store.del(SAVE_KEY); for (const pl of PLACES) store.del('aldren-sketch-' + pl.id); location.reload(); };
$('mapView').addEventListener('click', () => { $('mapView').hidden = true; });
$('journal').addEventListener('click', (e) => { if (e.target.id === 'journal') closeJournal(); });
document.querySelectorAll('.quality button[data-q]').forEach(b => { b.setAttribute('aria-pressed', b.dataset.q === settings.quality); b.addEventListener('click', (e) => { e.stopPropagation(); settings.quality = b.dataset.q; store.set('aldren2-q', settings.quality); $('qualNote').hidden = false; document.querySelectorAll('.quality button[data-q]').forEach(x => x.setAttribute('aria-pressed', x.dataset.q === settings.quality)); }); });
$('reloadQ').onclick = () => location.reload();
$('voiceToggle').onclick = (e) => { e.stopPropagation(); Voice.enabled = !Voice.enabled; $('voiceToggle').textContent = Voice.enabled ? 'Vozes: ligadas' : 'Vozes: desligadas'; store.set('aldren-vox', Voice.enabled ? '1' : '0'); };
if (store.get('aldren-vox') === '0') { Voice.enabled = false; $('voiceToggle').textContent = 'Vozes: desligadas'; }
$('endBtn').onclick = (e) => { e.stopPropagation(); endFinale(); };
function setupTouch() {
  document.body.classList.add('touchmode'); $('touch').hidden = false; $('keysList').hidden = true; let joyId = null, lookId = null, jx = 0, jy = 0, lx = 0, ly = 0; const joy = $('joy'), knob = $('joyKnob');
  addEventListener('touchstart', (e) => { if (state !== 'play') return; for (const t of e.changedTouches) { if (t.target.closest('button')) continue; if (t.clientX < innerWidth * 0.45 && joyId === null) { joyId = t.identifier; jx = t.clientX; jy = t.clientY; joy.style.left = (jx - 60) + 'px'; joy.style.top = (jy - 60) + 'px'; joy.style.bottom = 'auto'; } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; } } }, { passive: true });
  addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { if (t.identifier === joyId) { let dx = t.clientX - jx, dy = t.clientY - jy; const d = Math.hypot(dx, dy); if (d > 50) { dx *= 50 / d; dy *= 50 / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; touch.mx = dx / 50; touch.my = -dy / 50; } else if (t.identifier === lookId && state === 'play') { cam.yaw -= (t.clientX - lx) * 0.005; cam.pitch = clamp(cam.pitch - (t.clientY - ly) * 0.005, -1.1, 0.9); lx = t.clientX; ly = t.clientY; } } }, { passive: true });
  const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === joyId) { joyId = null; touch.mx = touch.my = 0; knob.style.transform = ''; } if (t.identifier === lookId) lookId = null; } }; addEventListener('touchend', end); addEventListener('touchcancel', end);
  const tb = (id, fn) => { const b = $(id); b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); };
  tb('tbUse', () => { if (state === 'dialog') { if (dlgNode && dlgNode.opts.length === 1) choose(0); } else if (state === 'lume' && lume) lume.skip(); else interact(); }); tb('tbJump', () => { touch.jump = true; }); tb('tbMap', () => { $('mapView').hidden = !$('mapView').hidden; }); tb('tbRun', () => { touch.run = !touch.run; $('tbRun').classList.toggle('on', touch.run); }); tb('tbLamp', toggleLantern); tb('tbBook', () => { if (state === 'journal') closeJournal(); else openJournal(); }); tb('tbTime', () => { if (player.sit) { if (player.sit.lie && isNight()) sleepUntilMorning(); else { timeLapse = timeLapse ? 0 : 1; $('lapseHint').classList.toggle('on', !!timeLapse); } } });
}

// =====================================================================
// abertura
// =====================================================================
const INTRO_T = 22;
function startIntro() {
  state = 'intro'; document.body.classList.add('cine'); cam.intro = INTRO_T; hour = 17.2;
  const seq = ['intro1', 'intro2', 'intro3']; let i = 0;
  Music.play('title', { fade: 4, vol: 0.85 });
  const next = () => { if (i >= seq.length) { setTimeout(letter, 1200); return; } const id = seq[i++]; const el = $('narr'); el.textContent = lineText(id); el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); Voice.say(id, { onEnd: () => setTimeout(() => { el.classList.remove('show'); setTimeout(next, 700); }, 900) }); };
  setTimeout(next, 1800);
  const letter = () => { $('narr').hidden = true; $('letter').hidden = false; $('letterText').textContent = lineText('carta'); setTimeout(() => $('letter').classList.add('show'), 50); Voice.say('carta', { onEnd: () => setTimeout(closeLetter, 1500) }); };
  const closeLetter = () => { if ($('letter').hidden) return; $('letter').classList.remove('show'); setTimeout(() => { $('letter').hidden = true; }, 900); cam.intro = 0; document.body.classList.remove('cine'); state = 'play'; S.letter = 1; save(); refreshQuest(); requestLock(); setTimeout(() => think('chegada'), 1500); };
  $('letter').onclick = closeLetter; window.__skipIntro = () => { Voice.stop(); i = 99; closeLetter(); };
}

// =====================================================================
// laço principal
// =====================================================================
const perf = { acc: 0, n: 0, level: 0, cool: 4 };
function applyLevel() {
  const L = perf.level; const q = Q();
  const prK = [1, 0.85, 0.72, 0.62, 0.55][Math.min(L, 4)];
  renderer.setPixelRatio(q.pr * prK); post.setSize(innerWidth, innerHeight);
  settings.grassK = [1, 1, 0.8, 0.65, 0.5][Math.min(L, 4)]; settings.treeK = [1, 1, 0.85, 0.7, 0.6][Math.min(L, 4)];
  setPropRadius([1, 1, 0.8, 0.65, 0.5][Math.min(L, 4)]);
  if (post.bloom) post.bloom.enabled = L < 3; if (post.reflK !== undefined) post.reflK = L >= 2 ? 0 : 1; setWaterQuality(L);
  trees.nearCenter.set(1e9, 0, 1e9);
}
function adaptQuality(dt) {
  if (MANUAL || ['loading', 'paused', 'menu'].includes(state) || document.hidden) return;
  perf.acc += dt; perf.n++; perf.cool -= dt;
  if (perf.acc >= 2) { const fps = perf.n / perf.acc; perf.acc = 0; perf.n = 0; window.__fps = fps;
    if (perf.cool <= 0 && fps < 40 && perf.level < 4) { perf.level++; perf.cool = 3; applyLevel(); }
    else if (perf.cool <= 0 && fps > 58 && perf.level > 0) { perf.level--; perf.cool = 10; applyLevel(); } }
}
const clock = new THREE.Clock(false); let saveT = 0, menuAng = 0, fpsAcc = 0, fpsN = 0;
const MANUAL = /manual=1/.test(location.search);
function rafFrame() { frame(); }
function frame(fixedDt) {
  if (!MANUAL) requestAnimationFrame(rafFrame);
  const raw = clock.getDelta(); const dt = typeof fixedDt === 'number' ? fixedDt : Math.min(raw, 0.05); elapsed += dt; U.time.value = elapsed; fpsAcc += dt; fpsN++;
  // tempo do vale: um dia leva 40 minutos; sentada, pode-se deixar o tempo correr
  const lapse = timeLapse ? 60 : 1;
  if (!['paused', 'loading', 'menu'].includes(state)) { hour += dt * 24 / 2400 * lapse; if (hour >= 24) { hour -= 24; S.day++; } }
  if (player.sit && player.sit.waitNight && (hour >= 19.6 || hour < 5)) { const pl = player.sit.waitNight; player.sit.waitNight = null; timeLapse = 0; $('lapseHint').classList.remove('on'); $('lapseHint').hidden = true; startLume(pl); }
  if (timeLapse && hour > 5.5 && hour < 5.6) { timeLapse = 0; $('lapseHint').classList.remove('on'); }
  sky.setHour(hour);
  if (state === 'lume' || state === 'journal' || state === 'intro' || state === 'finale') {
    if (state === 'lume') { if (player.sit) updateSitting(dt); else { pH.locomote(0); pH.update(dt); } } else if (state === 'finale') { finale.update(dt); } else { pH.locomote(0); pH.update(dt); }
    updateNPCs(dt); if (lume) lume.update(dt, camera.position);
    updateCamera(dt); post.grade.uniforms.letterbox.value = lerp(post.grade.uniforms.letterbox.value, state === 'journal' ? 0 : 1, 1 - Math.exp(-dt * 2));
  } else if (state === 'play' || state === 'dialog') {
    updatePlayer(dt); updateNPCs(dt); checkInteract(); if (state === 'play') checkDiscover();
    cam.cine = clamp(cam.cine + (state === 'dialog' && dlgNPC && dlgNPC.h ? dt * 2 : -dt * 3), 0, 1);
    updateCamera(dt);
    if (post.bokeh.enabled && dlgNPC && dlgNPC.h) { post.bokeh.uniforms.focus.value = camera.position.distanceTo(dlgNPC.h.headPos); }
    post.grade.uniforms.letterbox.value = lerp(post.grade.uniforms.letterbox.value, cam.cine > 0.3 || player.sit ? 0.6 : 0, 1 - Math.exp(-dt * 2));
    saveT += dt; if (saveT > 12) { saveT = 0; save(); }
  } else if (state === 'menu') {
    menuAng += dt * 0.02; const r = 46; const cx = Math.sin(menuAng) * r - 10, cz = Math.cos(menuAng) * r + 10; camera.position.set(cx, groundH(cx, cz) + 6, cz); camera.lookAt(0, groundH(0, 0) + 5, 0); camera.fov = 48; camera.updateProjectionMatrix();
    updateNPCs(dt);
  }
  U.player.value.set(player.x, player.y, player.z);
  sky.update({ x: player.x, y: player.y, z: player.z, camPos: camera.position }, dt);
  const inK = cam.inK || 0; scene.environmentIntensity *= lerp(1, 0.62, inK); renderer.toneMappingExposure *= lerp(1, 1.3, inK);
  updateAnimals(dt, player, sky.nightF);
  updateDoors(dt); updateInteriorLights(dt); updateLantern(dt); updateRipples(dt); updateLamps();
  updateGiants(dt, elapsed); const obj = state !== 'menu' ? objectives()[0] : null; updateSpirits(dt, elapsed, player, obj ? obj.tgt : null, sky.nightF, player.speed > 0.3); if (motes) motes.update(elapsed, camera.position.x, camera.position.z, sky.dayF, sky.nightF, U.wind.value);
  post.updateLook(U.sunDir.value, sky.dayF, sky.nightF, sky.dusk || 0, U.sunColor.value);
  const focus = state === 'menu' ? camera.position : V3(player.x, 0, player.z);
  grass.update(focus.x, focus.z, 2); updateProps(camera.position.x, camera.position.z);
  adaptQuality(dt);
  const amb = new THREE.Color(0.32, 0.4, 0.52).multiplyScalar(0.05 + 0.6 * sky.dayF).lerp(new THREE.Color(0.02, 0.025, 0.04), sky.nightF);
  trees.update(V3(camera.position.x, 0, camera.position.z), amb, camera.getWorldDirection(V3()));
  updateWorldFX(dt);
  if (!['menu', 'loading'].includes(state)) updateHUD();
  let fireNear = 0; for (const f of fires) if (!f.dead && !f.forge) fireNear = Math.max(fireNear, clamp(1 - Math.hypot(f.p.x - player.x, f.p.z - player.z) / 12, 0, 1));
  const ih = insideHouse(player.x, player.z); if (ih) fireNear = Math.max(fireNear, 0.5);
  const lakeD = Math.hypot(player.x - POI.lake.x, player.z - POI.lake.z); const gw = groundH(player.x, player.z);
  const ruins = ['tower', 'stones', 'garden', 'stairs', 'head', 'peaks', 'shrine', 'bridge'].some(k => Math.hypot(player.x - POI[k].x, player.z - POI[k].z) < 45);
  Sound.update(dt, { x: camera.position.x, z: camera.position.z, y: player.y, yaw: cam.yaw, windStr: U.windStrength.value, fire: fireNear, trees: clamp(forestDensity(player.x, player.z) * 3 + 0.3, 0, 1), day: sky.dayF, night: sky.nightF, inside: inK > 0.5, lake: clamp(1 - lakeD / 140, 0, 1), shore: clamp(1 - Math.abs(gw - 0.3) / 2.5, 0, 1) * (gw < 3 ? 1 : 0), village: clamp(1 - Math.hypot(player.x, player.z) / 70, 0, 1), hour, ruins, cinematic: ['lume', 'finale', 'intro', 'menu'].includes(state) });
  if (!MANUAL || window.__renderNow) post.render(dt, elapsed);
  if (fpsAcc > 1) { window.__fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
}

$('startBtn').addEventListener('click', () => {
  Sound.init(); if (Sound.ctx && Sound.ctx.state === 'suspended') Sound.ctx.resume();
  $('menu').hidden = true; $('hud').hidden = false; cam.yaw = player.h + Math.PI; cam.cur.set(player.x, player.y + 3, player.z + 4); refreshQuest();
  if (isTouch) setupTouch();
  window.focus(); try { renderer.domElement.focus(); } catch (e) { }
  const go = () => { if (!S.letter && !MANUAL) startIntro(); else { state = 'play'; requestLock(); Music.silence = 6; } };
  if (Sound.ctx) { const w = setInterval(() => { if (Sound.ready) { clearInterval(w); go(); } }, 100); setTimeout(() => { clearInterval(w); if (state === 'menu') go(); }, 6000); } else go();
});
window.__game = { storySpots, groundH, probe, get nav() { return nav; }, npcPlan, planRoute, sky: () => sky, post: () => post, camera, scene, player, S, npcs, cam, renderer, trees, grass, SPOTS, PLACES, get state() { return state; }, set state(v) { state = v; }, setHour: (h) => { hour = h; }, get hour() { return hour; }, tick: (dt, n = 1) => { for (let i = 0; i < n; i++) frame(dt); }, startLume: (i) => startLume(PLACES[i]), lieAt, seats, beds, Human, startFinale: () => startFinale(), openJournal, openDialog, choose, get pH() { return pH; }, toggleLantern, sitAt, interiors, think, Voice, Music };
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); store.set('aldren2-q', settings.quality === 'alta' ? 'media' : 'baixa'); $('loading').textContent = 'A placa de vídeo reiniciou. Recarregando com gráficos mais leves…'; $('menu').hidden = false; $('loadBar').parentElement.hidden = true; setTimeout(() => location.reload(), 1500); });
document.addEventListener('visibilitychange', () => { if (Sound.ctx) { if (document.hidden) Sound.ctx.suspend(); else Sound.ctx.resume(); } if (document.hidden && state === 'play') pauseGame(); });
boot().catch((e) => { console.error(e); $('loading').textContent = 'Falha ao carregar: ' + e.message; });
