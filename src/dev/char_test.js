import { THREE, renderer, scene, camera, makeMacroTexture, loadGLTF } from '../core.js';
import { computeTerrainData, buildTerrain, groundH } from '../world/terrain.js';
import { SkySystem } from '../world/sky.js';
import { Post } from '../post.js';
import { loadHumanLibrary, Human, CHARS } from '../actors/human.js';
const q = new URLSearchParams(location.search);
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
makeMacroTexture(); computeTerrainData();
const rock = await loadGLTF('a/rock1.glb.wasm'); let rm; rock.scene.traverse(o => { if (o.isMesh) rm = o.material; });
await buildTerrain(scene, rm);
const sky = new SkySystem(scene); sky.setHour(+(q.get('h') || 10));
await loadHumanLibrary();
const keys = (q.get('who') || Object.keys(CHARS).join(',')).split(',');
const sp = +(q.get('sp') || 1.0);
const hs = keys.map((k, i) => { const h = new Human(k); const x = (i - (keys.length - 1) / 2) * sp, z = 30; h.root.position.set(x, groundH(x, z), z); h.root.rotation.y = +(q.get('ry') || 0); scene.add(h.root); return h; });
const anim = q.get('anim');
for (const h of hs) { if (anim) h.play(anim, 0); h.mixer.update(+(q.get('t') || 0.7)); if (q.get('look')) h.lookAtPoint(camera.position, 1); }
const cx = +(q.get('cx') || 0), cy = +(q.get('cy') || 1.2), cz = +(q.get('cz') || 38);
camera.position.set(cx, groundH(cx, cz) + cy, cz); camera.lookAt(+(q.get('tx') || 0), groundH(0, 30) + +(q.get('ty') || 0.9), 30); camera.fov = +(q.get('fov') || 40); camera.updateProjectionMatrix();
for (let i = 0; i < 3; i++) for (const h of hs) h.update(0.016);
sky.update({ x: 0, y: groundH(0, 30), z: 30, camPos: camera.position }, 0);
const post = new Post(); post.setSize(innerWidth, innerHeight); post.render(0.016, 1);
window.DONE = JSON.stringify(hs.map(h => [h.key, h.meshes.map(m => m.name + ':' + m.material.name)]));
window.DONE = JSON.stringify(hs.map(h => [h.key, h.meshes.map(m => [m.name, m.material.name, m.userData.hair, m.material.customProgramCacheKey ? m.material.customProgramCacheKey() : "", m.material.color.getHexString(), !!m.material.map])]));
if (q.get('dbghair')) { for (const h of hs) for (const m of h.meshes) { if (m.userData.hair) m.material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); else if (m.name === 'Eyebrows') m.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); } post.render(0.016, 1); }
