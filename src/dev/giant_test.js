// Bancada de teste dos gigantes de pedra e da petrificação (fora do jogo).
//   _giant.html?probe=1            -> lista ossos/malhas
//   _giant.html?g=lago&h=17&cx=..  -> um gigante isolado
import { THREE, renderer, scene, camera, makeMacroTexture, loadGLTF } from '../core.js';
import { computeTerrainData, buildTerrain, groundH, POI, MIRANTE, WATER } from '../world/terrain.js';
import { buildGiant, buildHeadFragment, giants, updateGiants, giantProfile } from '../world/giants.js';
import { buildWater } from '../world/water.js';
import { applyPetrify } from '../world/petrify.js';
import { SkySystem } from '../world/sky.js';
import { Post } from '../post.js';
import { loadHumanLibrary, Human, CHARS, LIB } from '../actors/human.js';
const q = new URLSearchParams(location.search);
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
makeMacroTexture(); computeTerrainData();
await loadHumanLibrary();
if (q.get('probe')) {
  const out = {};
  for (const k of (q.get('who') || 'davi,lia,odessa').split(',')) {
    const h = new Human(k); const bones = Object.keys(h.bones);
    out[k] = { meshes: h.meshes.map(m => [m.name, m.material.name, m.visible, (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, m.geometry.attributes.position.count, Object.keys(m.geometry.attributes).join('|')]) };
  }
  out.clips = Object.keys(LIB.clips.m).map(k => [k, LIB.clips.m[k].duration.toFixed(2)]);
  window.DONE = JSON.stringify(out);
} else if (q.get('poses')) {
  // poses=key:clip:t,key:clip:t...  vista simples sem terreno
  scene.background = new THREE.Color(0x8899aa);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.2)); const dl = new THREE.DirectionalLight(0xffffff, 2); dl.position.set(3, 5, 4); scene.add(dl);
  const list = q.get('poses').split(',');
  list.forEach((s, i) => { const [k, clip, t] = s.split(':'); const h = new Human(k); h.pose(clip, +t, 0); h.mixer.update(0); h.root.position.set((i - (list.length - 1) / 2) * 2.2, 0, 0); h.root.rotation.y = +(q.get('ry') || 0); scene.add(h.root); h.root.updateMatrixWorld(true); });
  const g = new THREE.GridHelper(20, 20); scene.add(g);
  camera.position.set(+(q.get('cx') || 0), +(q.get('cy') || 1.5), +(q.get('cz') || 8)); camera.lookAt(0, 0.8, 0); camera.fov = 40; camera.updateProjectionMatrix();
  renderer.render(scene, camera); window.DONE = 'x';
} else if (q.get('pet')) {
  // pet=odessa:arms:0.6,davi:fingers:0.55  anim=idle t=0.5  cam: cx cy cz tx ty tz
  const rock = await loadGLTF('a/rock1.glb.wasm'); let rm; rock.scene.traverse(o => { if (o.isMesh) rm = o.material; });
  await buildTerrain(scene, rm); const sky = new SkySystem(scene); sky.setHour(+(q.get('h') || 10));
  const list = q.get('pet').split(','); const x0 = 0, z0 = 30; const hs = []; const out = [];
  list.forEach((e, i) => { const [k, reg, am] = e.split(':'); const h = new Human(k, { still: true }); const x = x0 + (i - (list.length - 1) / 2) * +(q.get('sp') || 0.9); h.root.position.set(x, groundH(x, z0), z0); h.root.rotation.y = +(q.get('ry') || 0); scene.add(h.root);
    h.pose(q.get('anim') || 'idle', +(q.get('t') || 0.5), 0); h.mixer.update(0); h.root.updateMatrixWorld(true);
    if (reg) { const hd = applyPetrify(h, { region: reg, amount: +am }); out.push([k, hd.meshes.map(m => m.name), hd.levels(), hd.amount]); } hs.push(h); });
  const tgt = new THREE.Vector3(+(q.get('tx') || 0), groundH(0, z0) + +(q.get('ty') || 1.0), z0 + +(q.get('tz') || 0));
  camera.position.set(+(q.get('cx') || 0), groundH(0, z0) + +(q.get('cy') || 1.1), z0 + +(q.get('cz') || 1.2)); camera.lookAt(tgt); camera.fov = +(q.get('fov') || 35); camera.updateProjectionMatrix();
  sky.update({ x: 0, y: groundH(0, z0), z: z0, camPos: camera.position }, 0);
  const post = new Post(); post.setSize(innerWidth, innerHeight); post.render(0.016, 1); post.render(0.016, 1);
  window.DONE = JSON.stringify(out);
} else if (q.get('g')) {
  // gigantes nos lugares de verdade (cópia do placeGiants do main.js)
  const rock = await loadGLTF('a/rock1.glb.wasm'); let rm; rock.scene.traverse(o => { if (o.isMesh) rm = o.material; });
  await buildTerrain(scene, rm); if (q.get('water')) await buildWater(scene);
  const sky = new SkySystem(scene); sky.setHour(+(q.get('h') || 10));
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z); const t0 = performance.now(); const want = q.get('g');
  const W = {};
  if (/lago|all/.test(want)) { const gx = -176, gz = 128; W.lago = buildGiant(scene, rm, { pose: 'reach', x: gx, y: WATER - 8.6, z: gz, rot: face(gx, gz, 0, 0), seed: 11, id: 'lago' }); }
  if (/circulo|all/.test(want)) { const gx = POI.stones.x - 22, gz = POI.stones.z - 16; W.circulo = buildGiant(scene, rm, { pose: 'kneel', x: gx, y: groundH(gx, gz) - 0.4, z: gz, rot: face(gx, gz, POI.stones.x, POI.stones.z), seed: 23, id: 'circulo' }); }
  if (/torre|all/.test(want)) { const gx = POI.tower.x + 26, gz = POI.tower.z + 18; W.torre = buildGiant(scene, rm, { pose: 'lie', x: gx, y: groundH(gx, gz) - 0.5, z: gz, rot: -0.7, seed: 37, id: 'torre' }); }
  if (/monte|all/.test(want)) { const sx = MIRANTE.x, sz = MIRANTE.z; const fx0 = -sx, fz0 = -sz, fl = Math.hypot(fx0, fz0); const gx = sx - fx0 / fl * 13, gz = sz - fz0 / fl * 13; W.monte = buildGiant(scene, rm, { pose: 'sit', x: gx, y: groundH(gx, gz) - 0.8, z: gz, rot: face(gx, gz, 0, 0), seed: 51, id: 'monte' }); }
  if (/head|all/.test(want)) { buildHeadFragment(scene, rm, POI.head.x, POI.head.z, 0.9); W.head = { x: POI.head.x, z: POI.head.z, S: 2.2, rot: 0.9, root: { position: new THREE.Vector3(POI.head.x, groundH(POI.head.x, POI.head.z), POI.head.z) } }; }
  const ms = performance.now() - t0;
  let avg = null; try { const im = rm.map.image; const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0, 64, 64); const d = cx.getImageData(0, 0, 64, 64).data; const a = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) a[c] += Math.pow(d[i + c] / 255, 2.2); avg = a.map(v => (v / 4096).toFixed(3)); } catch (e) { avg = String(e); }
  const key = want.split(',')[0]; const g = W[key] || Object.values(W)[0];
  const aw = +(q.get('awake') || 0); for (const gg of giants) { gg.target = aw; gg.awake = aw; }
  updateGiants(0.016, 1);
  // câmera: ângulo (relativo à frente do gigante), distância, altura
  const ang = +(q.get('a') || 0) + (g.rot || 0) + (q.get('abs') ? -(g.rot || 0) : 0), dist = +(q.get('d') || 30), up = +(q.get('up') || 4);
  const c = g.root.position.clone(); c.y += +(q.get('ly') || 8);
  const px = c.x + Math.sin(ang) * dist, pz = c.z + Math.cos(ang) * dist;
  camera.position.set(px, Math.max(groundH(px, pz), WATER) + up, pz); camera.lookAt(c); camera.fov = +(q.get('fov') || 45); camera.updateProjectionMatrix();
  sky.update({ x: px, y: groundH(px, pz), z: pz, camPos: camera.position }, 0);
  const post = new Post(); post.setSize(innerWidth, innerHeight); post.render(0.016, 1);
  window.DONE = JSON.stringify({ prof: Object.fromEntries(Object.entries(giantProfile).map(([k, v]) => [k, v.toFixed(0)])), ms: ms.toFixed(0), giants: giants.map(g => ({ id: g.id, tris: g.mesh.geometry.index.count / 3, verts: g.mesh.geometry.attributes.position.count, cols: g.cols.length, hand: g.P.arms[0][2].map(v => +v.toFixed(2)), S: g.S })) });
} else {
  window.DONE = 'x';
}
