import { hash2, loadTex, THREE, renderer, scene, camera, U, Q, settings, store, clamp, lerp, smooth, rand, rr, angDiff, lerpAng, makeMacroTexture, loadGLTF, progress, isTouch, trackP, VLight, LightPool } from './core.js';
import { computeTerrainData, buildTerrain, groundH, normalY, splatAt, sandAt, seaAt, fromUV, HARBOR, SEA_ROT, POI, PATHS, MIRANTE, TRAIL, NINHO, forestDensity, WATER, HGT, NRM, SPLAT, NV, CELL, HALF, creekDist } from './world/terrain.js';
import { buildWater, setWaterQuality } from './world/water.js';
import { buildOcean, updateOcean, seaSurface, depthAt, surfNear } from './world/ocean.js';
import { SkySystem } from './world/sky.js';
import { Grass } from './world/grass.js';
import { Trees } from './world/trees.js';
import { loadVillageMaterials, buildVillage, colliders, villageDirt, smokes, fires, M, interiors, doors, insideHouse, inFootprint, storySpots, probe, lamps, windmills, seats, beds, inSolid } from './world/village.js';
import { Nav } from './actors/nav.js';
import { SailBoat, boatMaterials } from './actors/boat.js';
import { harbor, updateHarbor } from './world/harbor.js';
import { FLOWER_ZONES } from './world/landmarks.js';
import { LINES, CAST, PLACES, NOTES, FINALE, FRIENDS, ITEMS, RIBBONS, LIA_WISHES, VELADORES, text as lineText } from './story.js';
import { buildGiant, buildHeadFragment, updateGiants, giants } from './world/giants.js';
import { Lume, lumeMaterial, initSpirits, addSiteSpirits, updateSpirits, Motes, LumeRain, GLOW } from './magic.js';
import { buildProps, updateProps, setPropRadius } from './world/props.js';
import { loadHumanLibrary, Human } from './actors/human.js';
import { loadAnimals, spawnAnimals, updateAnimals } from './actors/animals.js';
import { spawnFauna, updateFauna, F as FAUNA } from './actors/fauna.js';
import { updateCuriosities, CURIO } from './world/curiosities.js';
import { loadDragon, Dragon } from './actors/dragon.js';
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
const S = { said: {}, pulos: 0, ribbons: {}, lumeOrder: [], met: {}, lumes: {}, notes: {}, final: 0, letter: 0, told: 0, chat: {}, day: 0, found: {}, sat: 0, fr: {}, frDay: {}, inv: {}, fav: {}, boat: 0, sailed: 0, flags: {} };
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
// Compila de uma vez, ainda no carregamento, todos os shaders que o jogo vai usar: o mundo, as figuras de
// luz dos lumes, a Chuva de Lumes e o desfoque das conversas. Compila no MESMO tipo de alvo em que o jogo
// desenha (o buffer do pós-processamento, sem tone mapping); compilar direto na tela gerava outros shaders
// e o primeiro quadro, a lanterna e o primeiro lume recompilavam tudo de novo (era o travamento).
async function prewarm() {
  const extra = new THREE.Group(); scene.add(extra);
  const lm = lumeMaterial(); for (const key of ['eco_m', 'eco_f']) { const h = new Human(key); for (const m of h.meshes) m.material = lm; extra.add(h.root); }
  const rain = new LumeRain(V3(0, 0, 0), 8); extra.add(rain.pts);
  // o céu cria o mapa de ambiente no primeiro update: sem ele os shaders compilados seriam outros
  sky.setHour(hour); sky.update({ x: player.x, y: player.y, z: player.z, camPos: camera.position }, 0.016); scene.updateMatrixWorld(); LightPool.update();
  const rt = post.composer.renderTarget1; const prevRT = renderer.getRenderTarget(); renderer.setRenderTarget(rt);
  const comp = (s) => renderer.compileAsync ? renderer.compileAsync(s, camera) : Promise.resolve(renderer.compile(s, camera));
  try { await comp(scene); } catch (e) { renderer.compile(scene, camera); }
  // materiais de profundidade do desfoque (BokehPass troca todos os materiais por um só)
  const swap = []; const dm = post.bokeh.materialDepth; scene.traverse(o => { if ((o.isMesh || o.isPoints) && o.material) { swap.push([o, o.material]); o.material = dm; } });
  try { await comp(scene); } catch (e) { renderer.compile(scene, camera); }
  for (const [o, m] of swap) o.material = m;
  renderer.setRenderTarget(prevRT);
  // um quadro de verdade (sombras, pós-processamento) com as figuras ainda presentes, longe da vista
  extra.position.set(player.x, player.y, player.z); extra.traverse(o => { o.frustumCulled = false; });
  post.render(0.016, 0); scene.remove(extra); rain.pts.geometry.dispose();
}
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
  buildOcean(scene, await loadTex('a/tex/water_n.jpg', { srgb: false }));
  sky = new SkySystem(scene);
  trees = new Trees(scene);
  await step('Crescendo as árvores…', 0.2, () => trees.build());
  await loadVillageMaterials(trees.variants[0].bark); boatMaterials(M.planks.map);
  await step('Erguendo a vila…', 0.35, () => buildVillage(scene));
  for (const c of colliders.circles) addCirc(c[0], c[1], c[2]);
  load();
  // o que a Lia deixou no mundo continua lá
  if (S.flags.ponte && storySpots.bridgeDone) storySpots.bridgeDone.visible = true; if (S.ribbons && S.ribbons.lia) storySpots.ribbonTree?.showLia(); if (S.flags.fitaNo) storySpots.ribbonTree?.retie();
  await step('Os gigantes descansam…', 0.42, () => placeGiants(rockMat));
  const zones = [[POI.garden.x, POI.garden.z, 18], [POI.observatory.x, POI.observatory.z, 26], [POI.stairs.x, POI.stairs.z, 16], [POI.shrine.x, POI.shrine.z, 6], [POI.tower.x, POI.tower.z, 14], [POI.stones.x, POI.stones.z, 14], [POI.bridge.x, POI.bridge.z, 12], [-74, -34, 6]];
  const [hbx, hbz] = fromUV(HARBOR.u, HARBOR.v);
  const vEx = (x, z) => Math.hypot(x, z) < 62 || Math.hypot(x - hbx, z - hbz) < 58 || sandAt(x, z) > 0.3 || zones.some(zn => Math.hypot(x - zn[0], z - zn[1]) < zn[2]) || giants.some(g => Math.hypot(x - g.x, z - g.z) < 18) || creekDist(x, z) < 2.5;
  await step('Espalhando pedras e flores…', 0.48, () => buildProps(scene, { avoid: (x, z, r) => vEx(x, z) || pathDistOK(x, z, r), addCircle: addCirc, villageExclude: vEx, zones: FLOWER_ZONES() }));
  await step('Plantando a floresta…', 0.56, () => trees.scatter({ avoid: (x, z, r) => vEx(x, z) || pathDistOK(x, z, r + 1) || aqueductNear(x, z) || curioNear(x, z), forestDensity, groundH, normalY, onTree: (it) => { if (it.v.sp.type !== 'bush') addCirc(it.x, it.z, (it.v.sp.type === 'pine' ? 0.28 : 0.36) * it.s); }, extra: [[-12, -32, 'oakA', 1], [34, -12, 'oakB', 0.9], [-38, 22, 'ashA', 1], [10, 44, 'oakA', 1.1], [-52, -16, 'pineA', 1], [storySpots.treeRoot.x, storySpots.treeRoot.z, 'oakB', 1.45], [POI.shrine.x - 4, POI.shrine.z - 5, 'oakB', 1.5]] }));
  grass = new Grass(scene, { exclude: (x, z) => sandAt(x, z) > 0.45 || inFootprint(x, z, 0.1) || insideBox(x, z, 0.4) || treeHit(x, z) || Math.hypot(x - POI.observatory.x, z - POI.observatory.z) < 9.3 });
  await step('Chamando os moradores…', 0.66, () => Promise.all([loadHumanLibrary(), loadAnimals()]));
  initSpirits(); motes = new Motes(260);
  const sTex = smokeTex(), dTex = softTex();
  smoke = new Particles(700, sTex, false); fireP = new Particles(400, dTex, true); dust = new Particles(300, sTex, false);
  for (const f of fires) { if (f.dead) continue; const l = new VLight(f.forge ? 0xff6a20 : 0xff8a3a, 0, f.big ? 26 : 16, 2); l.position.copy(f.p).add(V3(0, f.forge ? 0 : 0.6, 0)); f.light = l; f.base = f.forge ? 5 : 9; }
  for (const d of doors) scene.add(d.pivot);
  hearthLights = [0, 1].map(() => new VLight(0xff8b3d, 0, 9, 1.6)); candleLight = new VLight(0xffb060, 0, 5, 1.8, 1);
  roomLight = new VLight(0xfff0dc, 0, 9, 1.4, 2);
  LightPool.init(Q().lights || 4); buildLamps(); updateObsBlink(0); buildLantern(); buildRipples();
  const had = !!store.get(SAVE_KEY);
  await step('Últimos detalhes…', 0.9, () => { initNav(); buildPlayer(); buildBoat(); buildNPCs(); spawnAnimals(); spawnFauna(FLOWER_ZONES()); POI.ninho = { x: NINHO.x, z: NINHO.z, name: 'O Ninho da Vésper' }; buildMapBase(); });
  post = new Post(); post.setSize(innerWidth, innerHeight);
  player.y = groundH(player.x, player.z);
  for (let i = 0; i < 30; i++) grass.update(player.x, player.z, 100);
  trees.update(V3(player.x, 0, player.z), new THREE.Color(0.3, 0.35, 0.42));
  await step('Acendendo as luzes…', 0.95, prewarm);
  state = 'menu'; $('loading').textContent = had ? 'Seu caderno continua onde você parou' : ''; $('loadBar').parentElement.hidden = true;
  $('startBtn').disabled = false; if (had) $('startBtn').textContent = 'Voltar ao vale';
  clock.start(); if (!MANUAL) requestAnimationFrame(rafFrame); else frame(0.016);
  // a dragoa (3,6 MB) chega depois, sem segurar a entrada no vale; os shaders dela compilam em segundo plano
  loadDragon().then(async () => { buildDragon(); await compileNew(); }).catch(e => console.warn('dragoa', e));
}
// compila (sem travar, quando o navegador permite) os shaders de algo que entrou na cena depois do carregamento
async function compileNew() {
  // a parte síncrona da compilação usa o alvo atual; o alvo volta ao normal antes de esperar
  const prev = renderer.getRenderTarget(); renderer.setRenderTarget(post.composer.renderTarget1);
  let p = null; try { p = renderer.compileAsync ? renderer.compileAsync(scene, camera) : (renderer.compile(scene, camera), null); } catch (e) { }
  renderer.setRenderTarget(prev); if (p) await p.catch(() => { });
}
function pathDistOK(x, z, r) { for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) { const [x1, z1] = p[i], [x2, z2] = p[i + 1]; const dx = x2 - x1, dz = z2 - z1; const t = clamp(((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz), 0, 1); if (Math.hypot(x1 + dx * t - x, z1 + dz * t - z) < 3 + r) return true; } return false; }
const CURIO_KEYS = ['cogumelos', 'tronco', 'colmeia', 'ninhoAve', 'amoras', 'estrela', 'fonte', 'cabana', 'arvoreNomes'];
function curioNear(x, z) { for (const k of CURIO_KEYS) { const p = storySpots[k]; if (p && Math.hypot(p.x - x, p.z - z) < 7) return true; } return false; }
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
  const gh0 = groundH(player.x, player.z); const depth = WATER - gh0; const inWater = depth > 0.08 && player.y < WATER + 0.1; if (inWater) speed *= clamp(1 - depth * 0.35, 0.5, 1);
  // nadar em água funda (mar, lagos)
  player.swim = player.swim ? depth > 0.95 : depth > 1.15; if (player.swim) { speed = jog ? 2.3 : 1.35; if (!S.flags.nadou) { S.flags.nadou = 1; toast('Nadando', isTouch ? 'Correr: nadar mais rápido' : 'Shift: nadar mais rápido'); } }
  const tgt = len * speed; player.speed = lerp(player.speed, tgt, clamp(dt * (tgt > player.speed ? 3.2 : 5), 0, 1));
  if (len > 0.05) player.h = lerpAng(player.h, Math.atan2(dir.x, dir.z), dt * 5.5);
  // anda na direção em que está virada (curvas suaves, sem patinar de lado)
  const mvDir = len > 0.05 ? V3(Math.sin(player.h), 0, Math.cos(player.h)).lerp(dir, 0.35).normalize() : V3();
  let nx = player.x + mvDir.x * player.speed * dt, nz = player.z + mvDir.z * player.speed * dt;
  const pr0 = probe(nx, nz, player.y); const stepLen = Math.hypot(nx - player.x, nz - player.z);
  // degraus construídos (soleira, escada, píer) sobem até 40 cm de uma vez; no terreno vale a inclinação máxima
  const builtStep = pr0.h > groundH(nx, nz) + 0.02;
  if (pr0.block || (stepLen > 1e-4 && player.onGround && pr0.h > player.y + 0.05 && (builtStep ? pr0.h - player.y > 0.42 : (pr0.h - player.y) / stepLen > 1.1))) { nx = player.x; nz = player.z; }
  const p = { x: nx, z: nz }; collide(p, 0.3, player.y); for (const n of npcs) { if (!n.h.root.visible) continue; const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz); if (d < 0.6 && d > 1e-3) { p.x = n.x + dx / d * 0.6; p.z = n.z + dz / d * 0.6; } }
  const r = Math.hypot(p.x, p.z); if (r > 690) { p.x *= 690 / r; p.z *= 690 / r; }
  const moved = Math.hypot(p.x - player.x, p.z - player.z); player.x = p.x; player.z = p.z;
  const ground = probe(player.x, player.z, player.y).h;
  if ((k.Space || touch.jump) && player.onGround && free && !player.swim) { player.vy = 4.2; player.onGround = false; pH.play('jumpStart', 0.1); }
  touch.jump = false;
  if (player.swim) { const sf = seaSurface(player.x, player.z, elapsed); const surfY = seaAt(player.x, player.z) ? sf.y : WATER; player.vy = 0; player.y = lerp(player.y, surfY - 1.32, clamp(dt * 4, 0, 1)); player.onGround = false; if (rand() < dt * (player.speed > 0.4 ? 5 : 1)) ripple(player.x + rr(-0.4, 0.4), player.z + rr(-0.4, 0.4), 0.8 + player.speed * 0.3); }
  else { player.vy -= 15 * dt; player.y += player.vy * dt; }
  if (player.swim) { }
  else if (player.y <= ground) { if (!player.onGround && player.vy < -3) { Sound.step(surface(), 1.3, player.x, player.z); pH.play('land', 0.08); player.landT = 0.25; } player.y = ground; player.vy = 0; player.onGround = true; }
  else if (player.y - ground > 0.35) player.onGround = false;
  else if (player.onGround) player.y = lerp(player.y, ground, clamp(dt * 18, 0, 1));
  // passos
  const effSpeed = moved / Math.max(dt, 1e-4);
  if (player.onGround && effSpeed > 0.3) { player.stepAcc += dt * effSpeed / (effSpeed > 3 ? 1.45 : 1.25); if (player.stepAcc > 0.5) { player.stepAcc = 0; Sound.step(inWater ? 'water' : surface(), clamp(effSpeed / 2.5, 0.6, 1.2), player.x, player.z, effSpeed > 3); if (inWater) waterStep(player.x, player.z, depth, effSpeed); } }
  if (inWater && player.speed < 0.3 && rand() < dt * 0.6) ripple(player.x + rr(-0.3, 0.3), player.z + rr(-0.3, 0.3), 0.6);
  pH.root.position.set(player.x, player.y, player.z); pH.root.rotation.y = player.h;
  player.landT = Math.max(0, (player.landT || 0) - dt);
  if (player.swim) pH.locomote(0, { anim: effSpeed > 0.3 ? 'swimFwd' : 'swim', fade: 0.5 });
  else if (!player.onGround && player.vy < -1) pH.locomote(0, { air: true });
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
// velejar: o barco do mestre Elias
// =====================================================================
let boat = null;
function buildBoat() {
  const d = harbor.sailDock; if (!d) return; boat = new SailBoat(scene, d.x, d.z, d.yaw);
  if (S.boatPos && depthAt(S.boatPos.x, S.boatPos.z) > 0.8) { boat.x = S.boatPos.x; boat.z = S.boatPos.z; boat.yaw = S.boatPos.yaw; }
  const [hx, hz] = fromUV(HARBOR.u, HARBOR.v); POI.mare = { x: hx, z: hz, name: 'Vila da Maré' }; if (storySpots.farol) POI.farol = { x: storySpots.farol.x, z: storySpots.farol.z, name: 'O Farol' };
}
const boatAtDock = () => boat && Math.hypot(boat.x - harbor.sailDock.x, boat.z - harbor.sailDock.z) < 3;
function startSailing() {
  if (!boat) return; state = 'sail'; $('prompt').hidden = true; curInter = null; boat.sailing = true; boat.grounded = false; player.sit = null; player.speed = 0; timeLapse = 0;
  pH.play('drive', 0.4); Sound.rustle(player.x, player.z); cam.yaw = boat.yaw + Math.PI; cam.pitch = -0.18; cam.boatT = 0;
  $('lapseHint').hidden = true; $('sailHud').hidden = false; $('sailKeys').textContent = isTouch ? 'joystick: leme e vela · Correr: vento forte · Usar: desembarcar' : 'A D leme  ·  W caçar a vela (mais força)  ·  S folgar  ·  Shift vento forte (mais rápido)  ·  E desembarcar perto do píer ou da praia';
  if (!S.sailed) { S.sailed = 1; setTimeout(() => think('li_barco'), 2500); } save(); Music.silence = Math.min(Music.silence, 5);
}
function landingSpot() {
  // procura terra firme em volta do barco (o píer conta)
  if (Math.hypot(boat.x - harbor.sailDock.x, boat.z - harbor.sailDock.z) < 8) { const p = storySpots.barco; return { x: p.x, z: p.z, y: p.y, dock: true }; }
  if (depthAt(boat.x, boat.z) > 1.8) return null;
  for (let r = 2; r < 14; r += 0.5) for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; const x = boat.x + Math.cos(t) * r, z = boat.z + Math.sin(t) * r; if (groundH(x, z) > WATER + 0.25 && normalY(x, z) > 0.8) return { x, z, y: groundH(x, z) }; }
  return null;
}
function stopSailing() {
  const L = landingSpot(); if (!L) { toast('Longe da terra', 'Chegue perto do píer ou de uma praia rasa para desembarcar'); return; }
  boat.sailing = false; state = 'play'; player.x = L.x; player.z = L.z; player.y = L.y; player.h = boat.yaw; player.vy = 0; player.onGround = true; cam.yaw = player.h + Math.PI; pH.play('idle', 0.3);
  if (L.dock) { const d = harbor.sailDock; boat.x = d.x; boat.z = d.z; boat.yaw = d.yaw; boat.speed = 0; }
  S.boatPos = { x: boat.x, z: boat.z, yaw: boat.yaw }; $('sailHud').hidden = true; $('lapseHint').hidden = true; $('lapseHint').textContent = lapseText; save();
}
function updateSailing(dt) {
  const k = keys; const steer = clamp((k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + touch.mx, -1, 1), thr = clamp((k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0) + touch.my, -1, 1);
  boat.update(dt, { steer, throttle: thr, boost: k.ShiftLeft || k.ShiftRight || touch.run }, elapsed);
  // painel: vento relativo, velocidade e vela
  { const w = U.wind.value; const wd = Math.atan2(w.x, w.y); const rel = angDiff(wd + Math.PI, boat.yaw); const deg = Math.round(Math.abs(rel) * 180 / Math.PI); const side = rel > 0.05 ? 'pela esquerda' : rel < -0.05 ? 'pela direita' : '';
    const how = deg < 38 ? 'de frente: a vela só bate, vire o barco' : deg < 70 ? 'de bolina ' + side : deg < 120 ? 'de través ' + side + ' (o melhor rumo)' : deg < 160 ? 'pela alheta ' + side : 'de popa';
    $('sailInfo').innerHTML = `Vento <b>${how}</b> · <b>${(boat.speed * 1.944).toFixed(1)}</b> nós · vela <b>${Math.round(boat.trim * 100)}%</b>${boat.boost ? ' · <b>vento forte</b>' : ''}${boat.edge ? ' · <b>fim do mar navegável</b>' : ''}`; boat.edge = false; }
  // Lia sentada na popa, segurando a cana do leme
  const r = boat.b.root; const seat = new THREE.Vector3(-boat.b.L / 2 + 0.85, boat.b.top(0.15) - 0.32 - SIT_H, 0.3).applyMatrix4(r.matrixWorld);
  player.x = seat.x; player.z = seat.z; player.y = seat.y; player.h = boat.yaw;
  pH.root.position.copy(seat); pH.root.quaternion.copy(r.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI / 2 + 0.25));
  if (pH.currentName !== 'drive') pH.play('drive', 0.4); pH.lookAtPoint(V3(boat.x + Math.sin(boat.yaw) * 20, seat.y + 1.5, boat.z + Math.cos(boat.yaw) * 20), 0.6); pH.update(dt);
  // esteira e respingos na proa
  const sp = boat.speed; if (sp > 0.6) { const fx = Math.sin(boat.yaw), fz = Math.cos(boat.yaw);
    if (rand() < dt * sp * 6) { const s2 = rand() < 0.5 ? -1 : 1; dust.emit({ x: boat.x + fx * 2.4 + fz * 0.5 * s2, y: WATER + 0.15, z: boat.z + fz * 2.4 - fx * 0.5 * s2, vx: fz * s2 * rr(0.5, 1.4) + fx * sp * 0.3, vy: rr(0.6, 1.6) * Math.min(1, sp / 3), vz: -fx * s2 * rr(0.5, 1.4) + fz * sp * 0.3, g: 9, drag: 0.6, life: rr(0.5, 0.9), s0: 0.08, s1: 0.18, c: [0.92, 0.95, 0.96], a0: 0.6, wind: 0.2 }); }
    boat.wakeT += dt; if (boat.wakeT > 0.35) { boat.wakeT = 0; ripple(boat.x - fx * 2.6 + rr(-0.3, 0.3), boat.z - fz * 2.6 + rr(-0.3, 0.3), 1.2 + sp * 0.25); } }
}

// =====================================================================
// voar com a Vésper (no código: alva)
// =====================================================================
let alva = null; const seatTmp = {};
function buildDragon() {
  alva = new Dragon(); alva.onFlap = (sp) => Sound.flap(alva.x, alva.z, state === 'fly' ? 1 : 0.6);
  // ela fica onde a Lia a deixou (inclusive depois de recarregar o jogo)
  const p = S.alvaPos; if (p && Number.isFinite(p.x) && Number.isFinite(p.z) && groundH(p.x, p.z) > WATER + 0.3) { alva.x = p.x; alva.z = p.z; alva.yaw = p.yaw || 0; alva.y = groundH(p.x, p.z); alva.update(0, null); }
  alva.onLand = () => { if (!alva.rider) { S.alvaPos = { x: +alva.x.toFixed(2), z: +alva.z.toFixed(2), yaw: +alva.yaw.toFixed(3) }; save(); } };
}
// lugar aberto e plano perto da Lia onde a Vésper cabe (corpo ~15 m, asas ~32 m)
function alvaSpotOk(x, z) {
  const gh = groundH(x, z); if (gh < WATER + 0.6 || normalY(x, z) < 0.86) return false;
  if (Math.hypot(x, z) > 700) return false;
  for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; for (const r of [0, 3.5, 6.5]) { const px = x + Math.cos(t) * r, pz = z + Math.sin(t) * r; if (!nav.free(px, pz) || Math.abs(groundH(px, pz) - gh) > 1.6) return false; if (r === 0) break; } }
  return true;
}
function alvaSpot(px, pz) {
  for (const r of [14, 17, 21, 26, 32, 39, 47, 56, 66, 80, 95, 115, 140]) { const n = Math.ceil(r * 0.5); const a0 = Math.atan2(px - cam.cur.x, pz - cam.cur.z); // à frente da câmera, para ver a chegada
    for (let i = 0; i < n; i++) { const t = a0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) / n * Math.PI * 2; const x = px + Math.sin(t) * r, z = pz + Math.cos(t) * r; if (alvaSpotOk(x, z)) return { x, z, face: Math.atan2(px - x, pz - z), px, pz }; } }
  return null;
}
// assovio (V): depois do primeiro voo, a Vésper vem de onde estiver e pousa ao lado da Lia
function whistle() {
  if (!alva || whistle.t && elapsed - whistle.t < 1.5) return; whistle.t = elapsed; Sound.whistle();
  if (!S.flags.voou) { toast('Um assovio no vento', S.alva ? 'A Vésper ainda não conhece o seu chamado. Voe com ela primeiro.' : 'Ninguém responde... ainda.'); return; }
  const d = Math.hypot(alva.x - player.x, alva.z - player.z);
  if (alva.onGround && d < 30) { alva.lookAt = V3(player.x, player.y + 1.5, player.z); toast('A Vésper já está aqui', 'Chegue perto dela e aperte E para montar'); return; }
  const spot = alvaSpot(player.x, player.z);
  if (!spot) { toast('A Vésper ouviu o assovio', 'Mas aqui não há espaço para ela pousar. Vá para um lugar aberto e plano, fora da água.'); return; }
  alva.callTo(spot); toast('A Vésper ouviu o assovio', d > 150 ? 'Ela está vindo de longe. Olhe para o céu.' : 'Ela está vindo.');
}
function mountDragon() {
  if (!alva || alva.mode !== 'rest' && alva.mode !== 'ground') return; state = 'fly'; $('prompt').hidden = true; curInter = null; player.sit = null; alva.rider = true; alva.target = null; alva.takeoff(); pH.play('drive', 0.3); cam.yaw = alva.yaw + Math.PI; cam.pitch = -0.2; cam.flyT = 0; timeLapse = 0;
  const hint = $('lapseHint'); hint.hidden = false; hint.classList.remove('on'); hint.textContent = isTouch ? 'joystick · voar   ·   Pular · subir   ·   Usar · pousar' : 'W · bater asas   S · frear   A D · curvas   Espaço · subir   Shift · descer   mouse · olhar   E · pousar';
  if (!S.flags.voou) { S.flags.voou = 1; setTimeout(() => think('li_voo'), 6000); } Music.stop(2); setTimeout(() => Music.play('title', { fade: 4, vol: 0.9 }), 2500); save();
}
function updateFlying(dt) {
  const k = keys; const steerKey = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + touch.mx;
  // mouse: se a jogadora olhou para um lado, a Vésper vira para lá
  let turn = steerKey; if (Math.abs(steerKey) < 0.1 && cam.flyT < 1.5) { const camHead = cam.yaw + Math.PI; turn = clamp(-angDiff(camHead, alva.yaw) * 1.4, -1, 1); }
  const climb = clamp((k.Space || touch.jump ? 1 : 0) - (k.ShiftLeft || k.ShiftRight || k.KeyC ? 1 : 0) + (cam.flyT < 1.5 ? clamp(-(cam.pitch + 0.2) * 1.2, -0.6, 0.6) : 0), -1, 1);
  const inp = { turn, climb, thrust: (k.KeyW ? 1 : 0) + Math.max(0, touch.my), brake: (k.KeyS ? 1 : 0) + Math.max(0, -touch.my) };
  alva.update(dt, inp, null); cam.flyT = (cam.flyT || 0) + dt;
  // Lia sentada na base do pescoço
  alva.seatMatrix(seatTmp); player.x = seatTmp.p.x; player.z = seatTmp.p.z; player.y = seatTmp.p.y - SIT_H; player.speed = 0;
  pH.root.position.set(seatTmp.p.x, seatTmp.p.y - SIT_H, seatTmp.p.z); pH.root.quaternion.copy(seatTmp.q); if (pH.currentName !== 'drive') pH.play('drive', 0.3);
  pH.lookAtPoint(V3(alva.x + Math.sin(alva.yaw) * 30, seatTmp.p.y + 2, alva.z + Math.cos(alva.yaw) * 30), 0.7); pH.update(dt);
  if (alva.mode === 'ground') dismountDragon();
}
function dismountDragon() {
  state = 'play'; alva.rider = false; const sx = Math.cos(alva.yaw), sz = -Math.sin(alva.yaw); let px = alva.x + sx * 6, pz = alva.z + sz * 6; if (groundH(px, pz) < WATER + 0.2) { px = alva.x - sx * 6; pz = alva.z - sz * 6; }
  player.x = px; player.z = pz; player.y = groundH(px, pz); player.vy = 0; player.onGround = true; player.h = Math.atan2(alva.x - px, alva.z - pz); cam.yaw = player.h + Math.PI; pH.play('idle', 0.3); pH.root.quaternion.identity();
  $('lapseHint').hidden = true; $('lapseHint').textContent = lapseText; think(S.flags.pousou ? 'li_sentar2' : 'li_voo_fim'); S.flags.pousou = 1; save();
  // ela fica ali, onde pousou; a Lia pode chamá-la de qualquer lugar com um assovio
  S.alvaPos = { x: +alva.x.toFixed(2), z: +alva.z.toFixed(2), yaw: +alva.yaw.toFixed(3) }; save();
  if (!S.flags.assovio) { S.flags.assovio = 1; save(); setTimeout(() => toast('A Vésper fica esperando aqui', (isTouch ? 'Toque em Assoviar' : 'Aperte V para assoviar') + ' e, de qualquer lugar do vale, ela voa até você e pousa ao seu lado.'), 4500); }
  if (isTouch) $('tbWhistle').hidden = false;
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
  if (state === 'fly' && alva) {
    const b = alva.bodyPos(); const cy2 = cam.yaw, cp2 = cam.pitch; const fwd2 = V3(-Math.sin(cy2) * Math.cos(cp2), Math.sin(cp2), -Math.cos(cy2) * Math.cos(cp2)); const pivot = b.clone().add(V3(0, 3, 0));
    const dist = 24 + alva.speed * 0.25; let want = pivot.clone().addScaledVector(fwd2, -dist).add(V3(0, 3.5, 0)); want.y = Math.max(want.y, Math.max(groundH(want.x, want.z), WATER) + 2);
    if (cam.flyT > 2.5) { cam.yaw = lerpAng(cam.yaw, alva.yaw + Math.PI, dt * 0.9); cam.pitch = lerp(cam.pitch, -0.18 - alva.pitch * 0.4, dt * 0.8); }
    cam.cur.lerp(want, 1 - Math.exp(-dt * 3.2)); if (cam.cur.distanceTo(want) > 60) cam.cur.copy(want); camera.position.copy(cam.cur);
    camera.lookAt(pivot.x + Math.sin(alva.yaw) * 10, pivot.y, pivot.z + Math.cos(alva.yaw) * 10); camera.rotateZ(alva.bank * 0.15);
    camera.fov = lerp(camera.fov, 55 + clamp(alva.speed - 10, 0, 25) * 0.6, 1 - Math.exp(-dt * 2)); camera.updateProjectionMatrix(); if (pH) pH.root.visible = true; return;
  }
  if (state === 'sail' && boat) {
    const b = boat; const cy2 = cam.yaw, cp2 = cam.pitch; const fwd2 = V3(-Math.sin(cy2) * Math.cos(cp2), Math.sin(cp2), -Math.cos(cy2) * Math.cos(cp2)); const pivot = V3(b.x, b.y + 1.6, b.z);
    let want = pivot.clone().addScaledVector(fwd2, -9.5).add(V3(0, 1.2, 0)); want.y = Math.max(want.y, Math.max(groundH(want.x, want.z), WATER) + 0.8);
    // a câmera tende a voltar para trás do barco quando não se mexe o mouse
    cam.boatT = (cam.boatT || 0) + dt; if (cam.boatT > 2.5) cam.yaw = lerpAng(cam.yaw, b.yaw + Math.PI, dt * 0.6);
    cam.cur.lerp(want, 1 - Math.exp(-dt * 4)); if (cam.cur.distanceTo(want) > 20) cam.cur.copy(want); camera.position.copy(cam.cur); camera.lookAt(pivot.x + Math.sin(b.yaw) * 3, pivot.y, pivot.z + Math.cos(b.yaw) * 3); camera.fov = lerp(camera.fov, 55, 1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix(); if (pH) pH.root.visible = true; return;
  }
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
  want = last; if (player.swim) want.y = Math.max(want.y, WATER + 0.7);
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
  // ...mas longe do lugar de contemplar o lago (antes ela e o cavalete apareciam dentro da lembrança)
  let ix = -128, iz = 92; { const LS = SPOTS.lake; let best = null;
    for (let k = 0; k < 24 && !best; k++) { const a = Math.atan2(92 - POI.lake.z, -128 - POI.lake.x) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.16; let x = POI.lake.x + Math.cos(a) * 20, z = POI.lake.z + Math.sin(a) * 20; const dx = Math.cos(a), dz = Math.sin(a);
      for (let i = 0; i < 160 && groundH(x, z) < 0.9; i++) { x += dx; z += dz; } x += dx * 2; z += dz * 2;
      if (groundH(x, z) >= 0.9 && (!LS || Math.hypot(x - LS.x, z - LS.z) > 18) && normalY(x, z) > 0.9 && Math.hypot(x, z) < Math.hypot(POI.lake.x, POI.lake.z) + 40) best = [x, z]; }
    if (best) [ix, iz] = best; else { const dx = -ix, dz = -iz, dl = Math.hypot(dx, dz); for (let i = 0; i < 120 && groundH(ix, iz) < 0.9; i++) { ix += dx / dl; iz += dz / dl; } ix += dx / dl * 2; iz += dz / dl * 2; } }
  irene = addNPC({ id: 'irene', key: 'irene', day: [ix, iz, Math.atan2(POI.lake.x - ix, POI.lake.z - iz)], talk: talkIrene, idle: 'idle', home: houseOf('irene') });
  const bs = storySpots.bastiao; bastiao = addNPC({ id: 'bastiao', key: 'bastiao', day: [bs.x, bs.z, storySpots.bastiaoYaw + Math.PI], talk: talkBastiao, idle: 'kneel', home: houseOf('casagrande') });
  // Vila da Maré
  { const s2 = storySpots.marta; marta = addNPC({ id: 'marta', key: 'marta', day: [s2.x, s2.z, storySpots.martaYaw], talk: talkMarta, idle: 'idle', home: houseOf('taberna'), slow: true }); }
  { const s2 = storySpots.joca; joca = addNPC({ id: 'joca', key: 'joca', day: [s2.x, s2.z, storySpots.jocaYaw], talk: talkJoca, idle: 'idle', work: 'kneel', home: houseOf('barqueiro') }); }
  { const s2 = storySpots.tiao; tiao = addNPC({ id: 'tiao', key: 'tiao', day: [s2.x, s2.z, storySpots.tiaoYaw], talk: talkTiao, idle: 'idle', home: houseOf('tiao'), daySeat: harbor.tiaoSeat }); }
  { const [a, b] = [fromUV(HARBOR.u + 34, HARBOR.v - 8), fromUV(HARBOR.u + 40, HARBOR.v + 18)], c = fromUV(HARBOR.u + 30, HARBOR.v + 30), d2 = fromUV(HARBOR.u + 12, HARBOR.v + 6);
    nina = addNPC({ id: 'nina', key: 'nina', day: [d2[0], d2[1], SEA_ROT], talk: talkNina, idle: 'idle', wander: [d2, a, b, c], home: houseOf('tiao') }); }
  if (storySpots.davi) { const s2 = storySpots.davi; davi = addNPC({ id: 'davi', key: 'davi', day: [s2.x, s2.z, storySpots.daviYaw], talk: talkDavi, idle: 'fold', always: true, nightIdle: 'lantern', lookSky: true, slow: true }); }
  // cavalete de pintura da Irene
  { const ia = Math.atan2(POI.lake.x - ix, POI.lake.z - iz); const ex = ix + Math.sin(ia) * 1.1 + Math.cos(ia) * 0.6, ez = iz + Math.cos(ia) * 1.1 - Math.sin(ia) * 0.6, ey = groundH(ex, ez); const g = new THREE.Group(); for (const a of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.05), M.oldWood); l.position.set(a * 0.35, 0.8, 0); l.rotation.set(0.12, 0, a * -0.08); g.add(l); } const cv = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), paintingMat()); cv.position.set(0, 1.15, 0.08); cv.rotation.x = 0.12; g.add(cv); g.position.set(ex, ey, ez); g.rotation.y = ia + Math.PI; scene.add(g); addCirc(ex, ez, 0.4); }
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
  if (n.daySeat && hour > 6.5 && hour < 19.5) { const st = claim(n, n.daySeat); if (st) { const e = seatExit(st); return { key: 'dseat', x: e.x, z: e.z, act: 'sit', spot: st }; } }
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
let odessa, anselmo, celeste, tome, irene, bastiao, marta, joca, tiao, nina, davi;
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
// Nd(fala, opções, ação ao mostrar) · O(texto, próximo nó, ação ao escolher)
const Nd = (line, opts, act) => ({ line, opts, act }), O = (t, go, act) => ({ t, go, act });
const lumesN = () => PLACES.filter(p => S.lumes[p.id]).length;
const BYE = [O('Até mais.', null)];
// conversa casual: percorre as falas em ordem, uma por visita
function chat(id, list, opts = BYE) { const i = S.chat[id] || 0; S.chat[id] = (i + 1) % list.length; return Nd(list[i], opts); }
// ---------- amizades e coisas levadas de uma vila para a outra ----------
const frLevel = (id) => { const p = S.fr[id] || 0; return p >= 8 ? 3 : p >= 4 ? 2 : p >= 1 ? 1 : 0; };
const hearts = (id) => '♥'.repeat(frLevel(id)) + '♡'.repeat(3 - frLevel(id));
function friend(id, k) { const before = frLevel(id); S.fr[id] = Math.min(12, (S.fr[id] || 0) + k); if (frLevel(id) > before && before > 0) toast('Amizade · ' + CAST[id].name, hearts(id)); save(); }
function chatDaily(id) { if (!S.met[id]) return; if (S.frDay[id] !== S.day) { S.frDay[id] = S.day; friend(id, 1); } }
const has = (k) => !!S.inv[k];
function give(k) { S.inv[k] = 1; toast('Recebido', ITEMS[k].split(' (')[0]); Sound.page(); save(); }
function take(k) { delete S.inv[k]; S.fav[k] = 1; save(); }
const metOnce = (id, k = 1) => () => { if (!S.met[id]) { S.met[id] = 1; friend(id, k); } save(); };
// fala que acontece uma vez só (reações a descobertas, conversas sobre a Lia)
const said = (k) => !!(S.said && S.said[k]);
const markSaid = (k) => () => { S.said = S.said || {}; S.said[k] = 1; save(); };
// a primeira reação ainda não dita, na ordem dada: [chave, condição, fala]
function firstReaction(list) { for (const [k, cond, line, act] of list) if (cond && !said(k)) return Nd(line, BYE, () => { markSaid(k)(); act && act(); }); return null; }
// conversa sobre o passado da Lia: abre com amizade (frLevel >= lvl), uma vez; respostas de Lia como opções
function liaTalk(id, lvl, open, opts) { if (frLevel(id) < lvl || said('lia_' + id)) return null; return Nd(open, opts.map(([t, liaLine, reply]) => O(t, () => Nd(liaLine, [O('…', () => Nd(reply, BYE))]), () => { markSaid('lia_' + id)(); friend(id, 2); }))); }
const seen = (k) => !!S.lumes[k];
function talkOdessa() {
  if (!S.met.odessa) return Nd('od_first', [
    O('Você é a maga Odessa?', () => Nd('od_quem', [O('Que tipo de mapa você quer?', mapaOd)])),
    O('Que tipo de mapa você quer?', mapaOd)]);
  if (has('carta')) return Nd('od_carta', [O('Espero.', () => Nd('od_resposta', BYE, () => { give('resposta'); toast('Favor', 'Levar a resposta da Odessa para o Seu Davi, no farol'); }))], () => { take('carta'); S.cartaDay = S.day; friend('odessa', 2); friend('davi', 2); });
  const n = lumesN();
  const alva = O('Que sombra é aquela que passa no céu?', () => Nd('od_alva', BYE), () => { S.flags.alva = 1; save(); });
  if (n >= 8 && !S.told) return Nd('od_todos', [O('Eu volto quando escurecer.', null, () => { S.told = 1; refreshQuest(); save(); })]);
  if (S.told && !S.final) { if (isNight()) return Nd('fim1', [O('Olhar para cima com ela', null, () => { pendingAfterDialog = startFinale; })]); return Nd('od_noite', BYE); }
  // o que ela conta de cada lembrança, na ordem em que a Lia encontrou
  const r = firstReaction([...[...new Set([...(S.lumeOrder || []), ...Object.keys(S.lumes)])].map(k => ['od_' + k, seen(k), 'od_r_' + k]), ['od_fita', S.flags.fitaNo, 'od_fita']]);
  if (r) return r;
  const lia = liaTalk('odessa', 2, 'od_lia1', [['Porque era longe.', 'li_od_longe', 'od_lia2'], ['Porque você pediu um mapa diferente.', 'li_od_mapa', 'od_lia3']]);
  if (lia) return lia;
  if (S.final) { const c = chat('odessa_pos', ['od_pos1', 'od_pos2', 'od_cha']); c.opts = [alva, ...BYE]; return c; }
  return Nd(n >= 6 ? 'od_n4' : ['od_n2', 'od_n3', 'od_cha'][(S.chat.odessa = ((S.chat.odessa || 0) + 1) % 3)], [O('Ainda tem chá?', () => Nd('od_cha', BYE)), alva, O('Vou continuar procurando.', null)]);
}
const mapaOd = () => Nd('od_mapa', [O('Como eu encontro esses lugares?', () => Nd('od_como', [O('Algum jeito certo de olhar?', () => Nd('od_hora', [O('E depois?', () => Nd('od_depois', [O('Combinado.', null, () => { S.met.odessa = 1; friend('odessa', 1); toast('O mapa do que importa', 'Contemple os oito lugares dos Veladores, cada um na sua hora'); refreshQuest(); save(); })]))]))]))]);
function talkAnselmo() {
  if (isNight()) return Nd('an_noite', BYE);
  if (!S.met.anselmo) return Nd('an_first', [O('O senhor conhece os gigantes?', () => Nd('an_gigantes', [O('E os Veladores?', () => Nd('an_veladores', BYE, metOnce('anselmo')))])), O('O que acha que aconteceu com os Veladores?', () => Nd('an_veladores', BYE, metOnce('anselmo')))]);
  const r = firstReaction([['an_monte', seen('monte'), 'an_r_monte'], ['an_lago', seen('lago') || S.pulos > 0, 'an_r_lago']]); if (r) return r;
  const lia = liaTalk('anselmo', 2, 'an_lia1', [['De Ancoradouro, no litoral.', 'li_an1', 'an_lia2'], ['De longe. De vários lugares.', 'li_an1', 'an_lia2']]); if (lia) return lia;
  return chat('anselmo', ['an_c1', 'an_c2', 'an_c3', ...(S.found.mare ? ['an_c4', 'an_c5'] : [])]);
}
function talkCeleste() {
  if (isNight()) return Nd('ce_noite', BYE);
  if (!S.met.celeste) return Nd('ce_first', [O('A Odessa vem sempre aqui?', () => Nd('ce_odessa', [O('E as ruínas? O que você acha?', () => Nd('ce_ruinas', BYE))]), metOnce('celeste')), O('O que você acha das ruínas?', () => Nd('ce_ruinas', BYE), metOnce('celeste'))]);
  if (has('peixe')) return Nd('ce_peixe', BYE, () => { take('peixe'); friend('celeste', 2); });
  if (S.sailed && !S.flags.ceBarco) return Nd('ce_barco', BYE, () => { S.flags.ceBarco = 1; friend('celeste', 1); });
  const r = firstReaction([['ce_rel', seen('relogios'), 'ce_r_relogios']]); if (r) return r;
  const lia = liaTalk('celeste', 2, 'ce_lia1', [['Sabe… mais ou menos.', 'li_ce1', 'ce_lia2'], ['Prefiro não falar disso.', 'li_ce1', 'ce_lia3']]); if (lia) return lia;
  if (!S.fav.pao && !has('pao') && !has('peixe') && (S.found.mare || S.met.marta || (S.chat.celeste || 0) >= 2)) return Nd('ce_cesta', [O('Levo, sim.', null, () => { give('pao'); toast('Favor', 'Levar o pão para a Dona Marta, na Vila da Maré'); }), O('Agora não, desculpa.', null)]);
  return chat('celeste', ['ce_c1', 'ce_c3', 'ce_c2', ...(S.fav.peixe ? ['ce_c4'] : [])]);
}
function talkTome() {
  if (has('concha')) return Nd('to_concha', BYE, () => { take('concha'); friend('tome', 2); });
  if (S.final && !said('to_pos')) return Nd('to_pos', BYE, markSaid('to_pos'));
  if (!S.met.tome) return Nd('to_first', [O('Eu ainda não sei.', () => Nd('to_naosei', BYE), metOnce('tome')), O('Por que você quer saber?', () => Nd('to_porque', BYE), metOnce('tome'))]);
  const r = firstReaction([['to_lago', seen('lago'), 'to_r_lago'], ['to_pulos', (S.pulos || 0) >= 5, 'to_r_pulos']]); if (r) return r;
  const lia = liaTalk('tome', 1, 'to_lia1', [['Tinha. Ele desenhava mapas.', 'li_to1', 'to_lia2']]); if (lia) return lia;
  if (!S.fav.desenho && !has('desenho') && !has('concha') && (S.found.mare || S.met.nina || (S.chat.tome || 0) >= 2)) return Nd('to_nina', [O('Entrego, sim.', null, () => { give('desenho'); toast('Favor', 'Levar o desenho do Tomé para a Nina, na Vila da Maré'); }), O('Hoje não, Tomé.', null)]);
  return chat('tome', ['to_c1', 'to_c2', 'to_c3', ...(S.fav.concha ? ['to_c4'] : [])]);
}
function talkIrene() {
  if (!S.met.irene) return Nd('ir_first', [O('Então por que você continua?', () => Nd('ir_porque', [O('Posso ver?', () => Nd('ir_ver', BYE))]), metOnce('irene')), O('Posso ver?', () => Nd('ir_ver', BYE), metOnce('irene'))]);
  const r = firstReaction([['ir_lago', seen('lago'), 'ir_r_lago']]); if (r) return r;
  const lia = liaTalk('irene', 2, 'ir_lia1', [['Desenhava por gosto. Agora é trabalho.', 'li_ir1', 'ir_lia2']]); if (lia) return lia;
  return chat('irene', ['ir_c1', 'ir_c2', 'ir_c3', ...(S.found.mare ? ['ir_c4'] : [])]);
}
function talkBastiao() {
  if (!S.met.bastiao) return Nd('ba_first', [O('Só vim conhecer.', () => Nd('ba_conhecer', [O('O que você está fazendo?', () => Nd('ba_ponte', BYE))]), metOnce('bastiao')), O('O que você está fazendo?', () => Nd('ba_ponte', BYE), metOnce('bastiao'))]);
  const r = firstReaction([['ba_pronta', S.flags.ponte, 'ba_pronta'], ['ba_escada', seen('escada'), 'ba_r_escada'], ['ba_quase', lumesN() >= 4 && !S.final, 'ba_quase']]); if (r) return r;
  const lia = liaTalk('bastiao', 2, 'ba_lia1', [['Ele desenhava estradas.', 'li_ba1', 'ba_lia2']]); if (lia) return lia;
  return chat('bastiao', ['ba_c1', 'ba_c2', 'ba_c3', ...(S.flags.ponte ? [] : ['ba_c4']), ...(S.found.mare ? ['ba_c5'] : [])]);
}
// ---------- Vila da Maré ----------
function talkMarta() {
  if (has('pao')) { const n = Nd('ma_pao', BYE, () => { take('pao'); friend('marta', 2); give('peixe'); toast('Favor', 'Levar o peixe defumado para a Celeste'); }); if (!S.met.marta) { S.met.marta = 1; friend('marta', 1); } return n; }
  if (isNight()) return Nd('ma_noite', BYE);
  if (!S.met.marta) return Nd('ma_first', [O('A senhora conhece a Odessa?', () => Nd('ma_odessa', BYE), metOnce('marta')), O('Que lugar bonito.', () => Nd('ma_lugar', BYE), metOnce('marta'))]);
  const r = firstReaction([['ma_voo', S.flags.voou, 'ma_voo']]); if (r) return r;
  if (frLevel('marta') >= 2 && !S.flags.martaAmiga) return Nd('ma_amiga', BYE, () => { S.flags.martaAmiga = 1; });
  const lia = liaTalk('marta', 2, 'ma_lia1', [['Mãe viva. Longe.', 'li_ma1', 'ma_lia2']]); if (lia) return lia;
  return chat('marta', ['ma_c1', 'ma_c2', 'ma_c3']);
}
function talkJoca() {
  const barco = O('Aquele barco no fim do píer é seu?', () => Nd('jo_barco', BYE), () => { if (!S.boat) { S.boat = 1; toast('O barco do mestre Elias', 'Agora você pode velejar. Ele fica no fim do píer.'); } S.met.joca = S.met.joca || 1; save(); });
  if (!S.met.joca) return Nd('jo_first', [O('O que você está construindo?', () => Nd('jo_casco', [barco, ...BYE]), metOnce('joca')), barco]);
  if (!S.boat) return Nd('jo_c1', [barco, ...BYE]);
  if (S.sailed && !S.flags.jocaDepois) return Nd('jo_depois', BYE, () => { S.flags.jocaDepois = 1; friend('joca', 1); });
  return chat('joca', ['jo_c1', 'jo_c2', 'jo_c3']);
}
function talkTiao() {
  if (!S.met.tiao) return Nd('ti_first', [O('Está pescando o quê?', () => Nd('ti_pesca', BYE), metOnce('tiao')), O('A Nina é sua filha?', () => Nd('ti_nina', BYE), metOnce('tiao'))]);
  return chat('tiao', ['ti_c1', 'ti_c2', 'ti_c3']);
}
function talkNina() {
  if (has('desenho')) { const n = Nd('ni_desenho', BYE, () => { take('desenho'); friend('nina', 2); give('concha'); toast('Favor', 'Levar a concha da Nina para o Tomé'); }); if (!S.met.nina) { S.met.nina = 1; friend('nina', 1); } return n; }
  if (isNight()) return Nd('ni_noite', BYE);
  if (!S.met.nina) return Nd('ni_first', [O('Pode ser que tenha.', () => Nd('ni_dragao', BYE), metOnce('nina')), O('Baleia canta?', () => Nd('ni_baleia', BYE), metOnce('nina'))]);
  const r = firstReaction([['ni_voo', S.flags.voou, 'ni_voo', () => friend('nina', 1)]]); if (r) return r;
  const lia = liaTalk('nina', 2, 'ni_lia1', [['Sabe… mais ou menos.', 'li_ni1', 'ni_lia2']]); if (lia) return lia;
  return chat('nina', ['ni_c1', 'ni_c2', 'ni_c3']);
}
function talkDavi() {
  if (!S.met.davi) return Nd('da_first', [O('Faz tempo que o senhor está aqui?', () => Nd('da_tempo', BYE), metOnce('davi')), O('O que o senhor vê lá de cima?', () => Nd('da_ve', BYE), metOnce('davi'))]);
  if (has('resposta')) return Nd('da_resposta', BYE, () => { take('resposta'); friend('davi', 3); S.blinkFrom = S.day; save(); });
  // a Odessa pisca de volta na primeira noite depois da resposta; no dia seguinte ele conta
  const r = firstReaction([['da_piscou', S.fav.resposta && S.blinkSeen, 'da_piscou']]); if (r) return r;
  if (!S.fav.carta && !has('carta') && frLevel('davi') >= 1 && (S.chat.davi || 0) >= 1) return Nd('da_carta', [O('Levo, sim.', null, () => { give('carta'); toast('Favor', 'Levar a carta do Seu Davi para a Odessa'); }), O('Outra hora.', null)]);
  const lia = liaTalk('davi', 2, 'da_lia1', [['Devo uma pra minha mãe.', 'li_da1', 'da_lia2']]);
  if (lia) { const o = lia.opts[0]; const act0 = o.act; o.act = () => { act0(); setTimeout(() => give('papel'), 800); }; return lia; }
  if (isNight()) return Nd('da_noite', BYE);
  return chat('davi', ['da_c1', 'da_c2', 'da_c3']);
}
const met = (id) => () => { S.met[id] = 1; save(); };
let dlgNPC = null, dlgNode = null, pendingAfterDialog = null;
function openDialog(n) { if (n.finale) return; document.body.classList.add('cine'); dlgNPC = n; state = 'dialog'; post.bokeh.enabled = settings.quality !== 'baixa' && !isTouch; chatDaily(n.id); const node = n.talk(); Voice.prefetch([node.line]); showNode(node); }
function showNode(node) {
  if (!node) { closeDialog(); return; } dlgNode = node; $('dialog').hidden = false; $('prompt').hidden = true; if (node.act) { const a = node.act; node.act = null; a(); }
  const sp = LINES[node.line] ? LINES[node.line][0] : null; const who = CAST[sp] || { name: dlgNPC.name || '', role: '' };
  $('dlgName').textContent = who.name; $('dlgRole').textContent = (who.role || '') + (S.met[sp] && FRIENDS[sp] ? '  ·  ' + hearts(sp) : ''); $('dlgText').textContent = lineText(node.line); $('dlgText').classList.remove('in'); void $('dlgText').offsetWidth; $('dlgText').classList.add('in');
  Voice.say(node.line, {});
  if (dlgNPC && dlgNPC.h) dlgNPC.h.nod = 1;
  const box = $('dlgOpts'); box.innerHTML = ''; node.opts.forEach((o, i) => { const b = document.createElement('button'); b.innerHTML = `<b>${i + 1}</b>`; b.appendChild(document.createTextNode(o.t)); b.onclick = (e) => { e.stopPropagation(); choose(i); }; box.appendChild(b); });
  // pré-carrega as próximas falas
  for (const o of node.opts) if (typeof o.go === 'function') { try { const nx = o.go(); if (nx && nx.line) Voice.prefetch([nx.line]); } catch (e) { } }
}
function choose(i) { const o = dlgNode && dlgNode.opts[i]; if (!o) return; Sound.click(); if (o.act) o.act(); const nx = typeof o.go === 'function' ? o.go() : o.go; showNode(nx || null); refreshQuest(); }
function closeDialog() { Voice.stop(); document.body.classList.remove('cine'); $('dialog').hidden = true; dlgNode = null; if (state === 'dialog') state = 'play'; post.bokeh.enabled = false; const after = pendingAfterDialog; pendingAfterDialog = null; setTimeout(() => { if (state === 'play') dlgNPC = null; if (after) after(); }, 300); }
// pensamento da Lia, sem caixa de diálogo: só legenda
let thinkTok = 0;
function think(id, after) { const el = $('thought'); const tok = ++thinkTok; el.textContent = lineText(id); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); el.hidden = false; Voice.say(id, { onEnd: () => { setTimeout(() => { if (tok === thinkTok) { el.classList.remove('show'); setTimeout(() => { if (tok === thinkTok) el.hidden = true; }, 900); } after && after(); }, 900); } }); }

// =====================================================================
// lumes, caderno, descobertas
// =====================================================================
let lume = null, lumePlace = null;
// cada lugar lembra numa faixa de horas (pode atravessar a meia-noite)
const inHours = (pl) => { const h = pl.hours; if (!h) return true; return h[0] <= h[1] ? (hour >= h[0] && hour < h[1]) : (hour >= h[0] || hour < h[1]); };
function contemplate(place) {
  const sp = SPOTS[place.place]; if (!sp) return;
  if (!inHours(place)) { sitAt(spAt(sp), () => think(place.wait || 'li_sentar2', () => { if (!player.sit) return; $('lapseHint').hidden = false; $('lapseHint').textContent = 'T · deixar o tempo passar até a hora deste lugar'; player.sit.waitPlace = place; })); return; }
  sitAt(spAt(sp), () => startLume(place));
}
const spAt = (sp) => ({ x: sp.x, z: sp.z, yaw: sp.yaw, y: sp.y });
function startLume(place) {
  const sp = SPOTS[place.place]; lumePlace = place; state = 'lume'; document.body.classList.add('cine'); timeLapse = 0; $('lapseHint').hidden = true;
  const fwd = V3(Math.sin(sp.yaw), 0, Math.cos(sp.yaw)); const c = { x: sp.x + fwd.x * 3.2, z: sp.z + fwd.z * 3.2 };
  if (place.id === 'escada') { c.x = sp.x + fwd.x * 1.2; c.z = sp.z + fwd.z * 1.2; }
  const ri = place.reflectIf; const seenAny = ri && [].concat(ri.seen).some(k => S.lumes[k]);
  lume = new Lume(place, c, { yaw: sp.yaw + Math.PI, top: sp.top, reflect: seenAny ? ri.line : place.reflect, onPeak: () => captureSketch(place.id) }, () => finishLume(place));
  Music.stop(4); setTimeout(() => Music.play('memory', { fade: 3, vol: 0.8 }), 600);
}
function finishLume(place) {
  lume = null; state = 'play'; document.body.classList.remove('cine'); S.lumes[place.id] = 1; S.lumeOrder = S.lumeOrder || []; if (!S.lumeOrder.includes(place.id)) S.lumeOrder.push(place.id); placeDone(place);
  // desenha a cena no caderno
  if (!sketches[place.id]) captureSketch(place.id); Sound.page();
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
// uma anotação pode mudar depois que a Lia descobre algo (o poço da Ilsa, a ponte pronta)
function noteNow(id) { const n = NOTES[id], c = n.lineIf; if (c && ((c.flag && S.flags[c.flag]) || (c.seen && S.lumes[c.seen]))) return { title: c.title || n.title, line: c.line, alt: true }; return { title: n.title, line: n.line }; }
function readNote(id) { const n = noteNow(id); const k = n.alt ? id + '_2' : id; if (!S.notes[id] || (n.alt && !S.notes[k])) { S.notes[id] = 1; if (n.alt) S.notes[k] = 1; Sound.page(); save(); toast('Anotado no caderno', n.title); } think(n.line); }
// perguntas do caderno: aparecem quando algo as levanta e se respondem com as descobertas
const QUESTIONS = [
  { q: 'Por que a Odessa mora aqui há seiscentos anos?', when: () => S.met.odessa, a: () => (seen('relogios') && said('od_relogios')) ? 'Prometeu ao Teo cuidar do jardim dos relógios até eles voltarem. Depois, ficou porque gostava.' : null },
  { q: 'Quem é a menina que o mestre Auren chamou de Dessa?', when: () => seen('circulo'), a: () => said('od_circulo') ? 'A própria Odessa, aos nove anos de elfa.' : null },
  { q: 'Por que a Ilsa não partiu com o povo?', when: () => seen('torre') || seen('monte') || seen('escada'), a: () => seen('escada') ? '"Eu sei que você me carrega. É por isso que eu não posso ir." Ela não tinha terminado de olhar.' : null },
  { q: 'O Teo voltou?', when: () => seen('monte') || seen('escada'), a: () => seen('rosto') ? 'Voltou, velho e sozinho. Esculpiu o rosto dela e foi até o lago jogar uma pedra.' : null },
  { q: 'De quem é o rosto entre as flores?', when: () => seen('rosto'), a: () => ['lago', 'monte', 'escada', 'arvore'].some(seen) ? 'Da Ilsa, sorrindo. O Teo esculpiu.' : null },
  { q: 'Quem são os gigantes?', when: () => S.met.anselmo, a: () => seen('monte') && seen('rosto') ? 'A Moça do monte é a Ilsa, que ficou "só mais um pouco". O do lago, de mão erguida, deve ser o Teo.' : seen('monte') ? 'A gigante do monte é a Ilsa. E os outros?' : null },
];
// o que a Lia já contou de si (aparece em "Sobre mim")
const ABOUT = [['lia_anselmo', 'Sou de Ancoradouro, no litoral. Minha mãe tem uma papelaria lá.'], ['lia_odessa', 'Meu pai desenhava estradas para a Coroa. Morreu há dois invernos.'], ['lia_irene', 'Quando eu era pequena, desenhava bichos e gente nas margens dos mapas dele.'], ['lia_bastiao', 'Ele sabia de cor onde cada ponte tinha caído.'], ['lia_celeste', 'Faz um ano que eu não escrevo para a minha mãe.'], ['lia_davi', 'O Seu Davi me deu papel de carta. Disse para não deixar virar quarenta anos.']];
function openJournal() {
  const list = $('journalList'); list.innerHTML = ''; const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const H = (t) => { const h = document.createElement('h2'); h.textContent = t; list.appendChild(h); };
  const A = (html, cls) => { const b = document.createElement('article'); if (cls) b.className = cls; b.innerHTML = html; list.appendChild(b); };
  const n = lumesN(); $('journalCount').textContent = `${n} de 8 lugares` + (n > 1 ? ' · em ordem do tempo dos Veladores' : '');
  // os lugares vistos aparecem na ordem em que as coisas aconteceram; os que faltam, no fim, com a dica e a hora
  const seenP = PLACES.filter(p => S.lumes[p.id]).sort((a, b) => a.order - b.order), rest = PLACES.filter(p => !S.lumes[p.id]);
  for (const pl of seenP) { const ri = pl.reflectIf; const refl = ri && [].concat(ri.seen).some(k => S.lumes[k]) ? ri.line : pl.reflect;
    A(`<div class="era">${esc(pl.era)} · ${esc(pl.time)}</div>${sketches[pl.id] ? `<img alt="" src="${sketches[pl.id]}">` : ''}<h3>${esc(pl.name)}</h3><p class="cap">${esc(pl.sketch)}</p><p>${esc(lineText(refl))}</p>`); }
  for (const pl of rest) A(`<h3 class="unk">Um lugar ainda não visto</h3><p class="cap">${esc(pl.hint)}</p>`);
  const vel = Object.values(VELADORES).filter(v => v.seen.some(k => S.lumes[k])); if (vel.length) { H('As pessoas das lembranças'); for (const v of vel) A(`<h3>${esc(v.name)}</h3><p>${esc(v.note)}</p>`); }
  const qs = QUESTIONS.filter(q => q.when()); if (qs.length) { H('Perguntas'); for (const q of qs) { const a = q.a(); A(`<h3 class="q${a ? ' done' : ''}">${esc(q.q)}</h3>${a ? `<p>${esc(a)}</p>` : '<p class="cap">Ainda não sei.</p>'}`); } }
  const rib = RIBBONS.filter(r => S.ribbons && S.ribbons[r.id]); if (rib.length || S.ribbons?.lia) { H('Fitas da árvore'); for (const r of rib) A(`<h3>${esc(r.title)}</h3><p class="cap">${esc(ribbonWho(r))}</p><p>${esc(r.text)}</p>`); if (S.ribbons?.lia) A(`<h3>A minha fita</h3><p class="cap">Amarrada perto da pedra furada.</p><p>Não vou contar o que pedi. Senão não vale.</p>`); }
  const notes = Object.keys(NOTES).filter(k => S.notes[k]); if (notes.length || S.pulos) { H('Anotações'); for (const k of notes) { const nn = noteNow(k); A(`<h3>${esc(nn.title)}</h3><p>${esc(lineText(nn.line))}</p>`); } if (S.pulos) A(`<h3>Pedras no lago</h3><p>Meu recorde: ${S.pulos} ${S.pulos === 1 ? 'pulo' : 'pulos'}. O Teo fez sete. Ainda.</p>`); }
  const inv = Object.keys(S.inv); if (inv.length) { H('Comigo'); for (const k of inv) A(`<h3>${esc(ITEMS[k].split(' (')[0])}</h3><p class="cap">${esc(ITEMS[k].split(' (')[1]?.replace(')', '') || '')}</p>`); }
  const fr = Object.keys(FRIENDS).filter(k => S.met[k]); if (fr.length) { H('Amizades'); for (const k of fr) A(`<h3>${esc(CAST[k].name)} <span class="hearts">${hearts(k)}</span></h3><p class="cap">${esc(CAST[k].role)}</p><p>${esc(FRIENDS[k])}</p>`); }
  const ab = ABOUT.filter(([k]) => said(k)); H('Sobre mim'); A(`<p>${ab.length ? ab.map(([, t]) => esc(t)).join(' ') : 'A bússola do meu pai puxa para o leste. O resto, ainda não escrevi.'}${S.flags.cartaMae ? ' <br><br><i>Escrevi para a minha mãe.</i>' : ''}</p>`, 'about');
  $('journal').hidden = false; if (state === 'play') state = 'journal';
}
function closeJournal() { $('journal').hidden = true; if (state === 'journal') state = 'play'; }

// =====================================================================
// a árvore das fitas: ler os pedidos, amarrar o seu, refazer o nó da fita da Ilsa
// =====================================================================
const escH = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function ribbonWho(r) { return (!r.needs || r.needs.some(seen)) ? 'Amarrada por: ' + r.whoName : 'Não sei de quem é. Ainda.'; }
const rib = { sel: 0, wish: false };
function openRibbons() { state = 'ribbons'; document.body.classList.add('cine'); $('prompt').hidden = true; $('ribbons').hidden = false; rib.wish = false; const first = !S.flags.fitasVistas; S.flags.fitasVistas = 1; renderRibbons(); if (first) $('ribHint').textContent = lineText('li_fitas'); }
function closeRibbons() { $('ribbons').hidden = true; document.body.classList.remove('cine'); if (state === 'ribbons') state = 'play'; save(); }
const canRetie = () => (seen('lago') || seen('arvore')) && !S.flags.fitaNo;
function renderRibbons() {
  const row = $('ribRow'); row.innerHTML = '';
  RIBBONS.forEach((r, i) => { const b = document.createElement('button'); b.className = 'ribw' + (i === rib.sel ? ' sel' : ''); b.setAttribute('aria-label', r.title);
    b.style.cssText = `--c:${r.cloth};--age:${r.age};--len:${(0.6 + ((i * 7) % 5) / 6).toFixed(2)};--d:${(-i * 0.7).toFixed(1)}s`; b.innerHTML = '<span class="rib"></span>' + (r.id === 'ilsa' ? '<span class="stone"></span>' : '');
    b.onclick = (e) => { e.stopPropagation(); rib.sel = i; rib.wish = false; readRibbon(); }; row.appendChild(b); });
  if (S.ribbons.lia) { const b = document.createElement('div'); b.className = 'ribw'; b.style.cssText = '--c:#3d8a6a;--age:0;--len:0.9;--d:-2s;cursor:default'; b.title = 'A minha'; b.innerHTML = '<span class="rib"></span>'; row.appendChild(b); }
  readRibbon(true);
}
function readRibbon(quiet) {
  const r = RIBBONS[rib.sel]; [...$('ribRow').children].forEach((el, i) => el.classList.toggle('sel', i === rib.sel)); const card = $('ribCard');
  if (!quiet || S.ribbons[r.id]) { if (!S.ribbons[r.id]) { S.ribbons[r.id] = 1; Sound.page(); } }
  const acts = []; if (!S.ribbons.lia) acts.push(['1', 'Amarrar o meu pedido', 'wish']); if (canRetie()) acts.push(['2', 'Refazer o nó da fita vermelha', 'retie']); acts.push(['Esc', 'Voltar', 'close']);
  if (rib.wish) card.innerHTML = `<h3>O meu pedido</h3><div class="who">Ninguém vai ler. Mas eu vou saber.</div><div class="ribacts">${LIA_WISHES.map((w, i) => `<button data-w="${i}">${isTouch ? '' : `<b>${i + 1}</b>`}${escH(w.t)}</button>`).join('')}<button data-a="back">${isTouch ? '' : '<b>Esc</b>'}Deixar pra depois</button></div>`;
  else card.innerHTML = `<h3>${escH(r.title)}</h3><div class="who">${escH(ribbonWho(r))}</div><div class="txt h-${r.hand}" style="--ink-c:${r.ink || '#3b2e20'}">${escH(r.text)}</div><div class="ribacts">${acts.map(([k, t, a]) => `<button data-a="${a}">${isTouch ? '' : `<b>${k}</b>`}${t}</button>`).join('')}</div>`;
  card.querySelectorAll('button').forEach(b => b.onclick = (e) => { e.stopPropagation(); if (b.dataset.w) tieWish(+b.dataset.w); else ribAction(b.dataset.a); });
  $('ribHint').textContent = isTouch ? 'Toque numa fita para ler' : '← → escolher a fita · 1 · 2 · Esc';
}
function ribAction(a) { if (a === 'close') closeRibbons(); else if (a === 'back') { rib.wish = false; readRibbon(true); } else if (a === 'wish' && !S.ribbons.lia) { rib.wish = true; readRibbon(true); } else if (a === 'retie' && canRetie()) retie(); }
function tieWish(i) { if (S.ribbons.lia || !LIA_WISHES[i]) return; S.ribbons.lia = LIA_WISHES[i].id; Sound.knot(); storySpots.ribbonTree && storySpots.ribbonTree.showLia(); toast('Fita amarrada', 'Perto da pedra furada'); closeRibbons(); setTimeout(() => think('li_fita_minha'), 600); save(); }
function retie() { S.flags.fitaNo = 1; Sound.knot(); storySpots.ribbonTree && storySpots.ribbonTree.retie(); toast('Nó refeito', 'A fita da Ilsa aguenta mais uns cem anos'); closeRibbons(); setTimeout(() => think('li_fita_no'), 600); save(); }
function ribbonKey(e) {
  if (e.code === 'Escape' || e.code === 'KeyE' && !rib.wish) { if (rib.wish) { rib.wish = false; readRibbon(true); } else closeRibbons(); return; }
  if (rib.wish) { const m = e.code.match(/^(Digit|Numpad)([1-3])$/); if (m) tieWish(+m[2] - 1); return; }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { rib.sel = (rib.sel + 1) % RIBBONS.length; readRibbon(); }
  else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { rib.sel = (rib.sel + RIBBONS.length - 1) % RIBBONS.length; readRibbon(); }
  else if (e.code === 'Digit1' || e.code === 'Numpad1') ribAction('wish'); else if (e.code === 'Digit2' || e.code === 'Numpad2') ribAction('retie');
}

// =====================================================================
// pedras no lago: escolher, lançar no tempo certo, acompanhar os pulos (sem placar obrigatório)
// =====================================================================
const STONES = [
  { id: 'chata', t: 'Chata e leve', sub: 'pula bem, se entrar baixinho', maxAng: 0.42, minV: 3.0, keep: 0.82, size: [0.085, 0.022, 0.07] },
  { id: 'redonda', t: 'Redonda', sub: 'pula pouco', maxAng: 0.3, minV: 4.2, keep: 0.68, size: [0.07, 0.045, 0.065] },
  { id: 'pesada', t: 'Pesada', sub: 'faz um barulho bonito', maxAng: 0.2, minV: 6.5, keep: 0.5, size: [0.12, 0.06, 0.1] },
];
let skip = null, stoneMesh = null;
function lakeThrowSpot() {
  if (Math.hypot(player.x - POI.lake.x, player.z - POI.lake.z) > 130 || player.swim) return null;
  if (WATER - groundH(player.x, player.z) > 0.25) return null;
  const fx = Math.sin(player.h), fz = Math.cos(player.h); for (const d of [2.5, 4, 6]) { if (WATER - groundH(player.x + fx * d, player.z + fz * d) > 0.35) return { x: player.x + fx * 2.2, z: player.z + fz * 2.2 }; }
  return null;
}
function enterSkip() {
  $('prompt').hidden = true; state = 'skip'; document.body.classList.add('cine'); player.speed = 0; skip = { phase: 'choose', t: 0, n: 0 }; pH.play('idle', 0.3);
  if (!stoneMesh) { stoneMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), M.stone); stoneMesh.castShadow = true; stoneMesh.visible = false; scene.add(stoneMesh); }
  if (!S.flags.pedraVista) { S.flags.pedraVista = 1; think('li_pedra_achar'); }
  $('skipHud').hidden = false; $('skipCount').textContent = ''; skipChooseUI();
}
function skipChooseUI() {
  const box = $('skipStones'); box.innerHTML = ''; $('skipMeter').hidden = true;
  STONES.forEach((st, i) => { const b = document.createElement('button'); b.innerHTML = `${isTouch ? '' : `<b>${i + 1}</b>`}${st.t}<small>${st.sub}</small>`; b.onclick = (e) => { e.stopPropagation(); skipPick(i); }; box.appendChild(b); });
  { const b = document.createElement('button'); b.innerHTML = `${isTouch ? '' : '<b>Esc</b>'}Voltar<small>guardar as pedras</small>`; b.onclick = (e) => { e.stopPropagation(); exitSkip(); }; box.appendChild(b); }
  $('skipTip').textContent = isTouch ? 'Escolha uma pedra' : '1 · 2 · 3 escolher a pedra   ·   Esc sair';
}
function skipPick(i) { if (!skip || skip.phase !== 'choose') return; skip.kind = STONES[i]; skip.phase = 'aim'; skip.t = 0; $('skipStones').innerHTML = ''; $('skipMeter').hidden = false; $('skipTip').textContent = isTouch ? 'Toque em Usar quando a barra chegar na marca' : 'E ou Espaço quando a barra chegar na marca   ·   Esc sair'; Sound.click(); }
function skipThrow() {
  if (!skip || skip.phase !== 'aim') return; const p = skip.meter; skip.phase = 'wind'; skip.t = 0; pH.play('throw', 0.15);
  const q = clamp(1 - Math.abs(p - 0.78) / 0.32, 0, 1); skip.q = q; skip.power = p; $('skipMeter').hidden = true; $('skipTip').textContent = '';
}
function skipRelease() {
  const k = skip.kind, q = skip.q, p = skip.power; const hp = pH.handPos('r'); const yaw = player.h + (rand() - 0.5) * 0.12 * (1 - q);
  const vh = 6 + p * 11; skip.p = V3(hp.x, Math.max(hp.y, WATER + 0.6), hp.z); skip.v = V3(Math.sin(yaw) * vh, 0.6 + (1 - q) * 3.6 + p * 0.4, Math.cos(yaw) * vh);
  stoneMesh.scale.set(...k.size); stoneMesh.position.copy(skip.p); stoneMesh.visible = true; skip.phase = 'fly'; skip.n = 0; skip.t = 0; $('skipCount').textContent = '';
}
function skipEnd(sink) {
  skip.phase = 'after'; skip.t = 0; const n = skip.n; const first = !S.pulos;
  if (n > (S.pulos || 0)) S.pulos = n;
  $('skipCount').textContent = n ? `${n} ${n === 1 ? 'pulo' : 'pulos'}` : (sink ? 'Ploc.' : '');
  if (n >= 8 && !S.flags.pulos8) { S.flags.pulos8 = 1; toast(`${n} pulos`, 'Mais que o Teo. Não conta pra ele.'); }
  else if (n >= 7 && !S.flags.pulos7) { S.flags.pulos7 = 1; toast('Sete pulos', 'Igual ao Teo.'); setTimeout(() => think('li_pulos_bom'), 1200); }
  else if (n === 0 && !S.flags.pulos0) { S.flags.pulos0 = 1; setTimeout(() => think('li_pulos_zero'), 900); }
  if (first && n) Sound.page(); save();
}
function exitSkip() { if (!skip) return; skip = null; document.body.classList.remove('cine'); if (stoneMesh) stoneMesh.visible = false; $('skipHud').hidden = true; if (state === 'skip') state = 'play'; }
function updateSkip(dt) {
  if (!skip) return; skip.t += dt;
  pH.root.position.set(player.x, player.y, player.z); pH.root.rotation.y = player.h; if (skip.phase !== 'wind' || pH.done()) { if (pH.currentName === 'throw' && pH.done()) pH.play('idle', 0.3); }
  pH.locomote(0); pH.update(dt);
  if (skip.phase === 'aim') { skip.meter = 0.5 - 0.5 * Math.cos(skip.t * Math.PI * 2 / 1.5); $('skipMeter').querySelector('i').style.width = (skip.meter * 100).toFixed(1) + '%'; }
  else if (skip.phase === 'wind') { if (skip.t > 0.42) skipRelease(); }
  else if (skip.phase === 'fly') {
    const P = skip.p, Vv = skip.v; Vv.y -= 9.8 * dt; P.addScaledVector(Vv, dt); stoneMesh.position.copy(P); stoneMesh.rotation.y += dt * 25;
    const gh = groundH(P.x, P.z);
    if (gh > P.y - 0.02 && gh > WATER - 0.05) { Sound.plop(P.x, P.z, 0.6); stoneMesh.visible = false; skipEnd(false); return; } // bateu na margem
    if (P.y <= WATER + 0.01 && Vv.y < 0) {
      const h = Math.hypot(Vv.x, Vv.z), ang = Math.atan2(-Vv.y, h), k = skip.kind;
      if (ang < k.maxAng && h > k.minV && skip.n < 16) {
        skip.n++; Vv.y = -Vv.y * 0.48 + 0.5; Vv.x *= k.keep; Vv.z *= k.keep; P.y = WATER + 0.01;
        ripple(P.x, P.z, 0.45 + 0.1 * Math.min(4, skip.n)); for (let i = 0; i < 6; i++) dust.emit({ x: P.x + rr(-0.1, 0.1), y: WATER + 0.03, z: P.z + rr(-0.1, 0.1), vx: Vv.x * 0.05 + rr(-0.4, 0.4), vy: rr(0.8, 1.6), vz: Vv.z * 0.05 + rr(-0.4, 0.4), g: 9, drag: 0.5, life: rr(0.3, 0.5), s0: 0.04, s1: 0.08, c: [0.85, 0.9, 0.92], a0: 0.5, wind: 0 });
        Sound.plip(P.x, P.z, skip.n); $('skipCount').textContent = String(skip.n);
      } else {
        ripple(P.x, P.z, 1.3); ripple(P.x + 0.2, P.z, 0.8); const big = k.id === 'pesada' ? 1.6 : 1; for (let i = 0; i < 14 * big; i++) dust.emit({ x: P.x + rr(-0.15, 0.15), y: WATER + 0.03, z: P.z + rr(-0.15, 0.15), vx: rr(-0.7, 0.7), vy: rr(1.4, 2.6) * big, vz: rr(-0.7, 0.7), g: 9, drag: 0.5, life: rr(0.4, 0.7), s0: 0.05, s1: 0.11, c: [0.85, 0.9, 0.92], a0: 0.55, wind: 0 });
        Sound.plop(P.x, P.z, big); stoneMesh.visible = false; skipEnd(true);
      }
    }
    if (skip && skip.phase === 'fly' && skip.t > 9) { stoneMesh.visible = false; skipEnd(true); }
  } else if (skip.phase === 'after' && skip.t > 2.6) { skip.phase = 'choose'; skipChooseUI(); }
}
// a câmera acompanha a pedra de lado e volta para a Lia depois
function skipCamera(dt) {
  const fwd = V3(Math.sin(player.h), 0, Math.cos(player.h)), side = V3(fwd.z, 0, -fwd.x);
  let look = V3(player.x, player.y + 1.3, player.z).addScaledVector(fwd, 6), want = V3(player.x, player.y + 2.1, player.z).addScaledVector(fwd, -3.4).addScaledVector(side, 1.2);
  if (skip && (skip.phase === 'fly' || (skip.phase === 'after' && skip.t < 1.6)) && skip.p) { const sp = skip.p; look = V3(sp.x, WATER + 0.3, sp.z); const d = Math.hypot(sp.x - player.x, sp.z - player.z); want = V3(player.x, player.y + 2.4 + d * 0.06, player.z).addScaledVector(fwd, -3 + d * 0.45).addScaledVector(side, 2.2 + d * 0.12); }
  want.y = Math.max(want.y, groundH(want.x, want.z) + 0.8, WATER + 0.8);
  cam.cur.lerp(want, 1 - Math.exp(-dt * 2.2)); cam.look = cam.look || V3(); cam.look.lerp(look, 1 - Math.exp(-dt * 3)); camera.position.copy(cam.cur); camera.lookAt(cam.look); camera.fov = lerp(camera.fov, 55, dt * 2); camera.updateProjectionMatrix();
}

// =====================================================================
// final: a Chuva de Lumes
// =====================================================================
let finale = null;
function startFinale() {
  state = 'finale'; document.body.classList.add('cine'); Music.stop(3); timeLapse = 0;
  const c = storySpots.finale; const fwd = V3(Math.sin(odessa.day[2]), 0, Math.cos(odessa.day[2]));
  const ring = [[odessa, 1.2, 0], [anselmo, -1.8, 1.6], [celeste, -2.6, -0.4], [tome, 2.2, 1.8], [irene, 0.6, 2.8], [bastiao, 3.0, -0.8],
    // a Vila da Maré também sobe para ver a Chuva de Lumes
    [marta, -3.6, 1.2], [davi, 3.9, 1.5], [nina, 1.5, 3.4], [tiao, -1.0, 3.7], [joca, 4.6, 0.3]].filter(r => r[0]);
  const rgt = V3(fwd.z, 0, -fwd.x);
  for (const [n, a, b] of ring) { n.finale = true; n.inside = false; n.x = c.x + rgt.x * a + fwd.x * b; n.z = c.z + rgt.z * a + fwd.z * b; n.yaw = Math.atan2(fwd.x, fwd.z); n.finaleIdle = n === odessa ? 'idle' : n === anselmo ? 'fold' : 'idle'; n.h.root.visible = true; }
  player.x = c.x - rgt.x * 0.4; player.z = c.z - rgt.z * 0.4; player.h = Math.atan2(fwd.x, fwd.z); player.y = probe(player.x, player.z, groundH(player.x, player.z) + 0.5).h; player.speed = 0;
  const lines = FINALE.slice(); let i = -1; let t = 0, waiting = false;
  finale = { speaker: null, t: 0, rain: null, camera: (dt) => { finale.t += dt; const a = finale.t * 0.03; const center = V3(c.x, groundH(c.x, c.z), c.z); const up = smooth(10, 26, finale.t); const want = center.clone().add(V3(Math.sin(odessa.yaw + Math.PI + a) * lerp(7, 9, up), lerp(1.8, 1.2, up), Math.cos(odessa.yaw + Math.PI + a) * lerp(7, 9, up))); cam.cur.lerp(want, 1 - Math.exp(-dt * 1.2)); camera.position.copy(cam.cur); const look = center.clone().add(V3(fwd.x * 6, lerp(1.4, 7.5, up), fwd.z * 6)); camera.lookAt(look); camera.fov = lerp(camera.fov, 50, dt); camera.updateProjectionMatrix(); },
    update: (dt) => { t += dt; if (finale.rain) finale.rain.update(dt); pH.root.position.set(player.x, player.y, player.z); pH.root.rotation.y = player.h; pH.locomote(0); pH.lookAtPoint(V3(player.x + fwd.x * 6, player.y + 8, player.z + fwd.z * 6), 0.9); pH.update(dt);
      if (!waiting && t > 2.5) { i++; const id = lines[i]; if (!id) { finale.end(); return; } const [sp] = LINES[id]; finale.speaker = sp; showSub(id); waiting = true;
        if (id === 'fim5') { odessa.finaleIdle = 'spellIn'; setTimeout(() => { odessa.finaleIdle = 'spell'; }, 1500); }
        if (id === 'fim6') { finale.rain = new LumeRain(c); sky.meteors = 1; Music.play('finale', { fade: 2, vol: 1 });
          // a Vésper vem ver também (se já é amiga da Lia)
          if (alva && S.flags.voou && !alva.rider) { const spot = alvaSpot(c.x, c.z); if (spot) alva.callTo(spot); } }
        Voice.say(id, { onEnd: () => { waiting = false; t = id === 'fim5' ? -3 : 0.6; } }); } },
    end: () => { hideSub(); finale.speaker = null; odessa.finaleIdle = 'idle'; S.final = 1; S.flags.ponte = 1; if (storySpots.bridgeDone) storySpots.bridgeDone.visible = true; save(); refreshQuest(); finalAmbience(); $('ending').hidden = false; setTimeout(() => $('ending').classList.add('show'), 50);
      // depois do narrador, a carta que a Lia devia à mãe (se o Seu Davi deu o papel)
      setTimeout(() => think('fim11', () => { if (has('papel')) setTimeout(() => think('li_carta_mae', () => { take('papel'); S.flags.cartaMae = 1; toast('Carta escrita', 'Para a minha mãe, em Ancoradouro'); save(); }), 1500); }), 1200); } };
}
function finalAmbience() { for (const g of giants) g.target = 0.6; for (let i = 0; i < 4; i++) addSiteSpirits(V3(rr(-40, 40), groundH(0, 0), rr(-40, 40)), 6, 14, 6); }
function endFinale() { if (finale && finale.rain) { const r = finale.rain; let t = 0; const fade = () => { t += 0.05; r.update(0.05); r.mat.opacity = Math.max(0, 0.95 * (1 - t / 6)); if (t < 6) setTimeout(fade, 50); else { scene.remove(r.pts); r.pts.geometry.dispose(); r.mat.dispose(); } }; fade(); }
  $('ending').hidden = true; $('ending').classList.remove('show'); document.body.classList.remove('cine'); for (const n of npcs) n.finale = false; state = 'play'; finale = null; sky.meteors = 0.25; cam.mode = 'follow'; requestLock(); }
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
  // ler as fitas (embaixo do galho baixo da árvore)
  if (storySpots.ribbonTree) { const rs = storySpots.ribbonTree.readSpot; if (Math.abs(rs.x - player.x) < 4 && Math.abs(rs.z - player.z) < 4) out.push({ x: rs.x, z: rs.z, r: 2.6, label: S.flags.fitasVistas ? 'Ler as fitas' : 'Olhar as fitas de perto', act: openRibbons }); }
  // jogar pedra no lago (de qualquer ponto da margem)
  { const ls = lakeThrowSpot(); if (ls) out.push({ x: ls.x, z: ls.z, r: 3, label: 'Procurar uma pedra e jogar no lago', act: enterSkip }); }
  for (const k in NOTES) { const sp = storySpots[k]; if (sp) out.push({ x: sp.x, z: sp.z, r: 2.4, label: S.notes[k] ? 'Olhar de novo' : 'Observar', act: () => readNote(k) }); }
  // a Alva
  if (alva && (alva.mode === 'rest' || alva.mode === 'ground')) { const d = Math.hypot(alva.x - player.x, alva.z - player.z); if (d < 21) { if (!S.alva) out.push({ x: alva.x, z: alva.z, r: 19, label: 'Aproximar-se devagar da dragoa', act: () => { if (player.speed > 2.2 || alva.alert > 0.5) { think('li_alva_corre'); return; } alva.bow = 1; think('li_alva1', () => { think('li_alva2'); S.alva = 1; alva.trust = 1; save(); setTimeout(() => { if (alva) alva.bow = 0; }, 8000); }); } }); else out.push({ x: alva.x, z: alva.z, r: 19, label: 'Montar na Vésper e voar', act: mountDragon }); } }
  // o barco
  if (boat && !boat.sailing) { const at = boatAtDock() ? storySpots.barco : { x: boat.x, z: boat.z }; if (Math.abs(at.x - player.x) < 6 && Math.abs(at.z - player.z) < 6) out.push({ x: at.x, z: at.z, r: boatAtDock() ? 2.4 : 4.5, label: S.boat ? 'Velejar no barco do mestre Elias' : 'Olhar o barco', act: () => S.boat ? startSailing() : think('li_barco0') }); }
  // cadeiras, bancos e camas (dentro e fora das casas)
  for (const st of seats) { if (st.npcOnly || Math.abs(st.x - player.x) > 2 || Math.abs(st.z - player.z) > 2 || Math.abs(st.y - SIT_H - player.y) > 0.8 || taken.get(st)) continue; out.push({ x: st.x, z: st.z, r: 1.25, label: st.kind === 'chair' ? 'Sentar na cadeira' : st.outdoor ? 'Sentar no banco' : 'Sentar à mesa', act: () => sitAt({ x: st.x, z: st.z, y: st.y, yaw: st.yaw, seat: st }, st.outdoor ? sitThought : () => { $('lapseHint').hidden = false; }) }); }
  for (const b of beds) { if (Math.abs(b.x - player.x) > 2.6 || Math.abs(b.z - player.z) > 2.6 || Math.abs(b.y - 0.5 - player.y) > 0.9 || taken.get(b)) continue; out.push({ x: b.side.x, z: b.side.z, r: 1.6, label: 'Deitar na cama', act: () => lieAt(b) }); }
  return out;
}
const sitThought = () => { const ids = ['li_sentar1', 'li_sentar2', 'li_sentar4', 'li_sentar3']; think(ids[S.sat++ % 4]); $('lapseHint').hidden = false; save(); };
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
let mapBase = null; const MAPV = 1500; // metros cobertos pelo mapa
function buildMapBase() {
  // mapa pintado: relevo sombreado, curvas de nível, mar e lagos por profundidade, areia, mata e rocha
  const R = 1100; const c = document.createElement('canvas'); c.width = c.height = R; const ctx = c.getContext('2d'); const img = ctx.createImageData(R, R); const sc = MAPV / R;
  const H = (x, z) => groundH(x, z);
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    const x = i * sc - MAPV / 2, z = j * sc - MAPV / 2; const h = H(x, z); const k = (j * R + i) * 4;
    const hx = H(x + sc, z) - H(x - sc, z), hz = H(x, z + sc) - H(x, z - sc); const nx = -hx / (2 * sc), nz = -hz / (2 * sc); const shade = clamp(0.82 + (nx * -0.7 + nz * -0.7) * 0.55, 0.45, 1.25);
    let col;
    if (h < WATER) { const d = clamp((WATER - h) / 18, 0, 1); col = [lerp(0.55, 0.16, d), lerp(0.74, 0.34, d), lerp(0.72, 0.5, d)]; if (WATER - h < 0.35) col = col.map(v => v * 0.6 + 0.4); }
    else {
      const sp = splatAt(x, z), sand = sandAt(x, z), fd = forestDensity(x, z); const t = clamp(h / 140, 0, 1);
      col = [lerp(0.6, 0.66, t), lerp(0.7, 0.64, t), lerp(0.42, 0.5, t)];
      if (fd > 0.08) { const f = clamp((fd - 0.08) * 4, 0, 0.75); const dot = (hash2(Math.floor(x / 6), Math.floor(z / 6)) > 0.45 ? 0.82 : 1); col = col.map((v, q) => lerp(v, [0.32, 0.45, 0.28][q] * dot, f)); }
      col = col.map((v, q) => lerp(v, [0.78, 0.66, 0.48][q], sp[0] * 0.7)); col = col.map((v, q) => lerp(v, [0.62, 0.6, 0.56][q], sp[1])); col = col.map((v, q) => lerp(v, [0.95, 0.95, 0.93][q], sp[2]));
      col = col.map((v, q) => lerp(v, [0.9, 0.82, 0.62][q], clamp(sand * 1.3, 0, 1)));
      col = col.map(v => v * shade); const ct = Math.abs(((h % 10) + 10) % 10 - 5); if (ct > 4.82) col = col.map(v => v * 0.86); if (Math.abs(((h % 50) + 50) % 50 - 25) > 24.75) col = col.map(v => v * 0.75);
    }
    img.data[k] = clamp(col[0], 0, 1) * 255; img.data[k + 1] = clamp(col[1], 0, 1) * 255; img.data[k + 2] = clamp(col[2], 0, 1) * 255; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // textura de papel por cima
  ctx.globalAlpha = 0.08; for (let i = 0; i < 9000; i++) { ctx.fillStyle = Math.random() < 0.5 ? '#3b2e20' : '#fff6e0'; ctx.fillRect(Math.random() * R, Math.random() * R, 1.5, 1.5); } ctx.globalAlpha = 1;
  mapBase = c;
}
function drawMap() {
  const cv = $('mapCv'), ctx = cv.getContext('2d'); const W = cv.width; const sc = W / MAPV; const tx = x => (x + MAPV / 2) * sc, tz = z => (z + MAPV / 2) * sc;
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(0, 0, W, W); ctx.drawImage(mapBase, 0, 0, W, W);
  ctx.strokeStyle = 'rgba(96,66,40,.75)'; ctx.lineWidth = 2.5; ctx.setLineDash([9, 7]); for (const p of PATHS) { ctx.beginPath(); p.forEach(([x, z], i) => i ? ctx.lineTo(tx(x), tz(z)) : ctx.moveTo(tx(x), tz(z))); ctx.stroke(); } ctx.setLineDash([]);
  // casas
  ctx.fillStyle = '#6b3a28'; for (const h of interiors) { ctx.save(); ctx.translate(tx(h.x), tz(h.z)); ctx.rotate(-h.rot); ctx.fillRect(-h.hw * sc - 2, -h.hd * sc - 2, h.hw * 2 * sc + 4, h.hd * 2 * sc + 4); ctx.restore(); }
  const label = (text, x, y, size = 24, color = '#3a2c1c') => { ctx.font = `italic 600 ${size}px "Cormorant Garamond",Georgia,serif`; ctx.textAlign = 'center'; ctx.strokeStyle = 'rgba(250,244,228,.9)'; ctx.lineWidth = 4; ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y); };
  for (const k in POI) { const p = POI[k]; const known = k === 'village' || S.found[k]; if (!known || k === 'ninho') continue; ctx.fillStyle = '#3a2c1c'; ctx.beginPath(); ctx.arc(tx(p.x), tz(p.z), 5, 0, 7); ctx.fill(); label(p.name, tx(p.x), tz(p.z) - 13); }
  for (const pl of PLACES) { const sp = SPOTS[pl.place]; if (!sp || !S.lumes[pl.id]) continue; ctx.fillStyle = '#c9902f'; ctx.beginPath(); ctx.arc(tx(sp.x), tz(sp.z), 9, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 2.5; ctx.stroke(); }
  // a Vésper (sempre marcada), o barco e a jogadora
  if (alva) { const x = tx(alva.x), y = tz(alva.z); ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#5a2a4a'; ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(10, -14, 22, -4); ctx.quadraticCurveTo(10, -2, 0, 8); ctx.quadraticCurveTo(-10, -2, -22, -4); ctx.quadraticCurveTo(-10, -14, 0, -12); ctx.fill(); ctx.stroke(); ctx.restore(); label(alva.onGround && Math.hypot(alva.x - NINHO.x, alva.z - NINHO.z) < 40 ? 'Vésper (no ninho)' : alva.target ? 'Vésper (vindo até você)' : 'Vésper', x, y + 30, 22, '#5a2a4a'); }
  if (boat) { const x = tx(boat.x), y = tz(boat.z); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI - boat.yaw); ctx.fillStyle = '#2f5d85'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore(); if (S.boat) label('barco', x, y + 22, 17, '#2f5d85'); }
  ctx.save(); ctx.translate(tx(player.x), tz(player.z)); ctx.rotate(Math.PI - player.h); ctx.fillStyle = '#b23a22'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10, 11); ctx.lineTo(0, 5); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  // rosa dos ventos
  ctx.save(); ctx.translate(W - 70, 80); ctx.fillStyle = '#3a2c1c'; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(8, 0); ctx.lineTo(0, 38); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill(); ctx.font = '600 22px "Cormorant Garamond",Georgia,serif'; ctx.textAlign = 'center'; ctx.fillText('N', 0, -46); ctx.restore();
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
// a Odessa pisca de volta para o farol (depois que o Seu Davi recebe a resposta): três piscadas a cada tanto
let obsBlink = null;
function updateObsBlink(dt) {
  const on = S.fav.resposta && isNight() && storySpots.obsTop; if (!obsBlink && storySpots.obsTop) { obsBlink = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffe2a8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); obsBlink.position.copy(storySpots.obsTop); obsBlink.scale.setScalar(7); scene.add(obsBlink); }
  if (!obsBlink) return; if (!on) { obsBlink.visible = false; return; }
  const t = elapsed % 14, b = (t < 0.45 || (t > 0.9 && t < 1.35) || (t > 1.8 && t < 2.25)) ? 1 : 0; obsBlink.visible = b > 0; obsBlink.material.opacity = 0.95;
  S.blinkT = (S.blinkT || 0) + dt; if (!S.blinkSeen && S.blinkT > 40) { S.blinkSeen = 1; save(); }
}
function buildLamps() {
  const mat = new THREE.SpriteMaterial({ map: GLOW, color: 0xffc27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const p of lamps) { const s = new THREE.Sprite(mat); s.position.copy(p); s.scale.setScalar(0.9); scene.add(s); lampSprites.push(s); }
  lampLights = lamps.map(() => new VLight(0xffb565, 0, 9, 1.8));
}
function updateLamps() {
  const on = smooth(0.25, 0.7, sky.nightF); for (const s of lampSprites) { s.visible = on > 0.02; s.material.opacity = on * (0.85 + 0.1 * Math.sin(elapsed * 9)); }
  lampLights.forEach((l, k) => { l.position.copy(lamps[k]); l.intensity = on < 0.02 ? 0 : 3 * on; });
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
  const light = new VLight(0xffd29a, 0, 14, 1.6, 50).attach(g, V3(0, -0.16, 0));
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
function pauseGame() { if (!['play', 'dialog', 'sail', 'fly'].includes(state)) return; prevState = state; state = 'paused'; $('pause').hidden = false; $('pauseInfo').textContent = `São ${$('clock').textContent} no vale. ${lumesN()} de 8 lugares no caderno. O progresso fica salvo neste navegador.`; }
function resume() { $('pause').hidden = true; state = prevState === 'dialog' && dlgNode ? 'dialog' : (prevState === 'sail' || prevState === 'fly') ? prevState : 'play'; if (state === 'play') { $('dialog').hidden = true; post.bokeh.enabled = false; } requestLock(); }
let drag = null;
canvas.addEventListener('mousedown', (e) => { window.focus(); if (state !== 'play') return; if (!locked && !lockFailed && !isTouch) requestLock(); if (!locked) drag = { x: e.clientX, y: e.clientY }; });
addEventListener('mouseup', () => { drag = null; });
addEventListener('mousemove', (e) => { if (state !== 'play' && state !== 'sail' && state !== 'fly') return; let mx = 0, my = 0; if (locked) { mx = e.movementX; my = e.movementY; } else if (drag) { mx = e.clientX - drag.x; my = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; } else return; mx = clamp(mx, -200, 200); my = clamp(my, -200, 200); const s = 0.0019 * (locked ? 1 : 1.6) * settings.sens; cam.yaw -= mx * s; cam.pitch = clamp(cam.pitch - my * s, -1.1, 0.9); cam.boatT = 0; cam.flyT = 0; if (cam.mode === 'sit') cam.sitK = Math.max(0, (cam.sitK || 0) - 0.02); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if ((state === 'lume' || state === 'finale') && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { if (lume) lume.skip(); else Voice.stop(); return; }
  if (state === 'intro' && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { Voice.stop(); return; }
  if (state === 'paused' && e.code === 'KeyP' && !e.repeat) { resume(); return; }
  if (e.code === 'KeyF' && !e.repeat && !['dialog'].includes(state)) { toggleFullscreen(); return; }
  if (e.code === 'KeyJ' && !e.repeat) { if (state === 'journal') closeJournal(); else if (state === 'play') openJournal(); return; }
  if (state === 'journal' && e.code === 'Escape') { closeJournal(); return; }
  if (state === 'ribbons') { if (!e.repeat) ribbonKey(e); return; }
  if (state === 'skip') { if (e.repeat) return; const m = e.code.match(/^(Digit|Numpad)([1-3])$/); if (m) skipPick(+m[2] - 1); else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); skipThrow(); } else if (e.code === 'Escape' || e.code === 'KeyQ') exitSkip(); else if (/^Key[WASD]$/.test(e.code) && skip && (skip.phase === 'choose' || skip.phase === 'aim')) exitSkip(); return; }
  if (/^Arrow|Space/.test(e.code) && (state === 'play' || state === 'sail' || state === 'fly')) e.preventDefault(); if (e.repeat) return;
  if (state === 'dialog') { const m = e.code.match(/^(Digit|Numpad)([1-9])$/); if (m) choose(+m[2] - 1); else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { if (Voice.playing) Voice.stop(); else if (dlgNode && dlgNode.opts.length === 1) choose(0); } else if (e.code === 'Escape') closeDialog(); return; }
  if (state === 'fly') { if (e.code === 'KeyE') { if (!alva.requestLand()) toast('Aqui não dá para pousar', 'Procure um chão firme e plano, longe da água'); } if (e.code === 'KeyM') $('mapView').hidden = !$('mapView').hidden; if ((e.code === 'Escape' && lockFailed) || e.code === 'KeyP') pauseGame(); return; }
  if (state === 'sail') { if (e.code === 'KeyE') stopSailing(); if (e.code === 'KeyM') $('mapView').hidden = !$('mapView').hidden; if ((e.code === 'Escape' && lockFailed) || e.code === 'KeyP') pauseGame(); return; }
  if (state !== 'play') return;
  if (e.code === 'KeyL') toggleLantern();
  if (e.code === 'KeyV' && !e.repeat) whistle();
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyT' && player.sit) { if (player.sit.lie && isNight()) sleepUntilMorning(); else { timeLapse = timeLapse ? 0 : 1; $('lapseHint').classList.toggle('on', !!timeLapse); } }
  if (e.code === 'KeyM') $('mapView').hidden = !$('mapView').hidden;
  if ((e.code === 'Escape' && lockFailed) || e.code === 'KeyP') pauseGame();
});
// Shift não fica 'preso' (ex.: soltou o Shift com a janela sem foco): qualquer tecla solta sem Shift o libera
addEventListener('keyup', (e) => { keys[e.code] = false; if (!e.shiftKey) keys.ShiftLeft = keys.ShiftRight = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.addEventListener('visibilitychange', () => { for (const k in keys) keys[k] = false; });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post && post.setSize(innerWidth, innerHeight); });
$('resumeBtn').onclick = (e) => { e.stopPropagation(); resume(); };
// ---------- tela cheia e menu dentro do jogo ----------
function toggleFullscreen() {
  const d = document; if (!d.fullscreenElement) { const r = d.documentElement.requestFullscreen ? d.documentElement.requestFullscreen({ navigationUI: 'hide' }) : null; if (r && r.then) r.then(() => { if (state === 'play' || state === 'sail' || state === 'fly') requestLock(); }).catch(() => toast('Tela cheia', 'O navegador não permitiu. Tente F11.')); }
  else d.exitFullscreen && d.exitFullscreen();
}
document.addEventListener('fullscreenchange', () => { const on = !!document.fullscreenElement; for (const id of ['fsBtn', 'fsBtn0']) { const b = $(id); if (b) b.textContent = on ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'; } });
for (const id of ['fsBtn', 'fsBtn0']) { const b = $(id); if (b) b.onclick = (e) => { e.stopPropagation(); toggleFullscreen(); }; }
const VOL = JSON.parse(store.get('aldren-vol') || '{"mus":55,"amb":90,"vox":100,"sens":100}');
function applyVol() { Sound.vol.music = VOL.mus / 100; Sound.vol.amb = VOL.amb / 100; Sound.vol.voice = VOL.vox / 100; if (Sound.mus) Sound.mus.gain.value = Sound.vol.music; if (Sound.vox) Sound.vox.gain.value = Sound.vol.voice; if (Sound.sfx) Sound.sfx.gain.value = 0.85 * VOL.amb / 90; settings.sens = VOL.sens / 100; store.set('aldren-vol', JSON.stringify(VOL)); }
for (const [id, k] of [['volMus', 'mus'], ['volAmb', 'amb'], ['volVox', 'vox'], ['sens', 'sens']]) { const el = $(id); el.value = VOL[k]; el.addEventListener('input', () => { VOL[k] = +el.value; applyVol(); }); el.addEventListener('click', (e) => e.stopPropagation()); }
applyVol();
$('pauseKeys').innerHTML = $('keysList').innerHTML;
$('reloadQ2').onclick = () => location.reload();
let resetArm = false; $('resetBtn').onclick = (e) => { e.stopPropagation(); if (!resetArm) { resetArm = true; $('resetConfirm').hidden = false; return; } store.del(SAVE_KEY); for (const pl of PLACES) store.del('aldren-sketch-' + pl.id); location.reload(); };
$('mapView').addEventListener('click', () => { $('mapView').hidden = true; });
$('journal').addEventListener('click', (e) => { if (e.target.id === 'journal') closeJournal(); });
document.querySelectorAll('.quality button[data-q]').forEach(b => { b.setAttribute('aria-pressed', b.dataset.q === settings.quality); b.addEventListener('click', (e) => { e.stopPropagation(); settings.quality = b.dataset.q; store.set('aldren2-q', settings.quality); $('qualNote').hidden = false; $('pauseQualNote').hidden = false; document.querySelectorAll('.quality button[data-q]').forEach(x => x.setAttribute('aria-pressed', x.dataset.q === settings.quality)); }); });
$('reloadQ').onclick = () => location.reload();
$('voiceToggle').onclick = (e) => { e.stopPropagation(); Voice.enabled = !Voice.enabled; $('voiceToggle').textContent = Voice.enabled ? 'Vozes: ligadas' : 'Vozes: desligadas'; store.set('aldren-vox', Voice.enabled ? '1' : '0'); };
if (store.get('aldren-vox') === '0') { Voice.enabled = false; $('voiceToggle').textContent = 'Vozes: desligadas'; }
$('endBtn').onclick = (e) => { e.stopPropagation(); endFinale(); };
function setupTouch() {
  document.body.classList.add('touchmode'); $('touch').hidden = false; if (S.flags.voou) $('tbWhistle').hidden = false; $('keysList').hidden = true; let joyId = null, lookId = null, jx = 0, jy = 0, lx = 0, ly = 0; const joy = $('joy'), knob = $('joyKnob');
  addEventListener('touchstart', (e) => { if (state !== 'play') return; for (const t of e.changedTouches) { if (t.target.closest('button')) continue; if (t.clientX < innerWidth * 0.45 && joyId === null) { joyId = t.identifier; jx = t.clientX; jy = t.clientY; joy.style.left = (jx - 60) + 'px'; joy.style.top = (jy - 60) + 'px'; joy.style.bottom = 'auto'; } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; } } }, { passive: true });
  addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { if (t.identifier === joyId) { let dx = t.clientX - jx, dy = t.clientY - jy; const d = Math.hypot(dx, dy); if (d > 50) { dx *= 50 / d; dy *= 50 / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; touch.mx = dx / 50; touch.my = -dy / 50; } else if (t.identifier === lookId && state === 'play') { cam.yaw -= (t.clientX - lx) * 0.005; cam.pitch = clamp(cam.pitch - (t.clientY - ly) * 0.005, -1.1, 0.9); lx = t.clientX; ly = t.clientY; } } }, { passive: true });
  const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === joyId) { joyId = null; touch.mx = touch.my = 0; knob.style.transform = ''; } if (t.identifier === lookId) lookId = null; } }; addEventListener('touchend', end); addEventListener('touchcancel', end);
  const tb = (id, fn) => { const b = $(id); b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); };
  tb('tbUse', () => { if (state === 'dialog') { if (dlgNode && dlgNode.opts.length === 1) choose(0); } else if (state === 'lume' && lume) lume.skip(); else if (state === 'skip') skipThrow(); else if (state === 'ribbons') closeRibbons(); else interact(); }); tb('tbJump', () => { touch.jump = true; }); tb('tbMap', () => { $('mapView').hidden = !$('mapView').hidden; }); tb('tbRun', () => { touch.run = !touch.run; $('tbRun').classList.toggle('on', touch.run); }); tb('tbLamp', toggleLantern); tb('tbWhistle', () => { if (state === 'play') whistle(); }); tb('tbBook', () => { if (state === 'journal') closeJournal(); else openJournal(); }); tb('tbTime', () => { if (player.sit) { if (player.sit.lie && isNight()) sleepUntilMorning(); else { timeLapse = timeLapse ? 0 : 1; $('lapseHint').classList.toggle('on', !!timeLapse); } } });
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
  const closeLetter = () => { if ($('letter').hidden) return; $('letter').classList.remove('show'); setTimeout(() => { $('letter').hidden = true; }, 900); cam.intro = 0; document.body.classList.remove('cine'); state = 'play'; S.letter = 1; save(); refreshQuest(); requestLock(); setTimeout(() => think('chegada', () => setTimeout(() => think('li_bussola'), 1800)), 1500); };
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
  return; // a qualidade escolhida fica fixa o tempo todo (antes caía sozinha quando o fps baixava)
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
  if (player.sit && player.sit.waitPlace && inHours(player.sit.waitPlace) && state === 'play') { const pl = player.sit.waitPlace; player.sit.waitPlace = null; timeLapse = 0; $('lapseHint').classList.remove('on'); $('lapseHint').hidden = true; $('lapseHint').textContent = lapseText; startLume(pl); }
  if (timeLapse && hour > 5.5 && hour < 5.6) { timeLapse = 0; $('lapseHint').classList.remove('on'); }
  sky.setHour(hour);
  if (state === 'skip') {
    updateSkip(dt); updateNPCs(dt); skipCamera(dt); post.grade.uniforms.letterbox.value = lerp(post.grade.uniforms.letterbox.value, 0, 1 - Math.exp(-dt * 2));
  } else if (state === 'lume' || state === 'journal' || state === 'ribbons' || state === 'intro' || state === 'finale') {
    if (state === 'lume') { if (player.sit) updateSitting(dt); else { pH.locomote(0); pH.update(dt); } } else if (state === 'finale') { finale.update(dt); } else { pH.locomote(0); pH.update(dt); }
    updateNPCs(dt); if (lume) lume.update(dt, camera.position);
    updateCamera(dt); post.grade.uniforms.letterbox.value = lerp(post.grade.uniforms.letterbox.value, state === 'journal' ? 0 : 1, 1 - Math.exp(-dt * 2));
  } else if (state === 'fly') {
    updateFlying(dt); updateNPCs(dt); updateCamera(dt); post.grade.uniforms.letterbox.value = lerp(post.grade.uniforms.letterbox.value, 0, 1 - Math.exp(-dt * 2)); checkDiscover();
  } else if (state === 'sail') {
    updateSailing(dt); updateNPCs(dt); updateCamera(dt); post.grade.uniforms.letterbox.value = lerp(post.grade.uniforms.letterbox.value, 0, 1 - Math.exp(-dt * 2)); saveT += dt; if (saveT > 12) { saveT = 0; S.boatPos = { x: boat.x, z: boat.z, yaw: boat.yaw }; save(); }
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
  updateCuriosities(dt, elapsed, (o) => dust.emit(o)); updateAnimals(dt, player, sky.nightF); updateFauna(dt, elapsed, player, sky.dayF, (x, z, s) => { ripple(x, z, s); for (let i = 0; i < 10; i++) dust.emit({ x: x + rr(-0.15, 0.15), y: WATER + 0.05, z: z + rr(-0.15, 0.15), vx: rr(-0.8, 0.8), vy: rr(1, 2.4), vz: rr(-0.8, 0.8), g: 9, drag: 0.4, life: rr(0.4, 0.7), s0: 0.05, s1: 0.12, c: [0.9, 0.94, 0.95], a0: 0.55, wind: 0 }); });
  updateDoors(dt); updateInteriorLights(dt); updateLantern(dt); updateRipples(dt); updateLamps(); updateObsBlink(dt);
  if (alva && state !== 'fly' && alva.target && alva.mode === 'auto' && Math.hypot(player.x - alva.target.px, player.z - alva.target.pz) > 35 && (!alva.retT || elapsed - alva.retT > 2)) { alva.retT = elapsed; const sp = alvaSpot(player.x, player.z); if (sp) alva.target = sp; }
  if (alva && state !== 'fly') { alva.update(dt, null, player); if (alva.alert > 0.9 && state === 'play' && !S.alva && (!alva.spookT || elapsed - alva.spookT > 40)) { alva.spookT = elapsed; think('li_alva_corre'); } }
  updateOcean(); updateHarbor(dt, elapsed, scene); if (boat && state !== 'sail') boat.update(dt, null, elapsed); updateGiants(dt, elapsed); const obj = state !== 'menu' ? objectives()[0] : null; updateSpirits(dt, elapsed, player, obj ? obj.tgt : null, sky.nightF, player.speed > 0.3); if (motes) motes.update(elapsed, camera.position.x, camera.position.z, sky.dayF, sky.nightF, U.wind.value);
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
  const ruins = state !== 'sail' && state !== 'fly' && ['tower', 'stones', 'garden', 'stairs', 'head', 'peaks', 'shrine', 'bridge'].some(k => Math.hypot(player.x - POI[k].x, player.z - POI[k].z) < 45);
  Sound.update(dt, { x: camera.position.x, z: camera.position.z, y: player.y, yaw: cam.yaw, windStr: U.windStrength.value, fire: fireNear, trees: clamp(forestDensity(player.x, player.z) * 3 + 0.3, 0, 1), day: sky.dayF, night: sky.nightF, inside: inK > 0.5, lake: clamp(1 - lakeD / 140, 0, 1), sea: surfNear(camera.position.x, camera.position.z), shore: state === 'sail' ? 0.35 + clamp(boat.speed / 4, 0, 0.5) : clamp(1 - Math.abs(gw - 0.3) / 2.5, 0, 1) * (gw < 3 ? 1 : 0) * (1 - surfNear(player.x, player.z)), village: clamp(1 - Math.hypot(player.x, player.z) / 70, 0, 1), hour, flying: state === 'fly' ? clamp(alva.speed / 25, 0.2, 1) : 0, ruins, cinematic: ['lume', 'finale', 'intro', 'menu'].includes(state) });
  scene.updateMatrixWorld(); LightPool.update();
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
window.__game = { keys, get alva() { return alva; }, mountDragon, FAUNA, get boat() { return boat; }, startSailing, stopSailing, harbor, storySpots, groundH, probe, get nav() { return nav; }, npcPlan, planRoute, sky: () => sky, post: () => post, camera, scene, player, S, npcs, cam, renderer, trees, grass, SPOTS, PLACES, get state() { return state; }, set state(v) { state = v; }, setHour: (h) => { hour = h; }, get hour() { return hour; }, tick: (dt, n = 1) => { for (let i = 0; i < n; i++) frame(dt); }, startLume: (i) => startLume(PLACES[i]), lieAt, seats, beds, Human, startFinale: () => startFinale(), openJournal, openDialog, choose, get pH() { return pH; }, toggleLantern, sitAt, interiors, think, Voice, Music };
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); store.set('aldren2-q', settings.quality === 'alta' ? 'media' : 'baixa'); $('loading').textContent = 'A placa de vídeo reiniciou. Recarregando com gráficos mais leves…'; $('menu').hidden = false; $('loadBar').parentElement.hidden = true; setTimeout(() => location.reload(), 1500); });
document.addEventListener('visibilitychange', () => { if (Sound.ctx) { if (document.hidden) Sound.ctx.suspend(); else Sound.ctx.resume(); } if (document.hidden && state === 'play') pauseGame(); });
boot().catch((e) => { console.error(e); $('loading').textContent = 'Falha ao carregar: ' + e.message; });
