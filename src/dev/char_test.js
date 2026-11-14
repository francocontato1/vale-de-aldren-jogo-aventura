import { THREE, renderer, scene, camera, U, makeMacroTexture, loadGLTF } from '../core.js';
import { computeTerrainData, buildTerrain, groundH } from '../world/terrain.js';
import { SkySystem } from '../world/sky.js';
import { Post } from '../post.js';
import { loadHumanLibrary, Human } from '../actors/human.js';
const q = new URLSearchParams(location.search);
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
makeMacroTexture(); computeTerrainData();
const rock = await loadGLTF('a/rock1.glb.wasm'); let rm; rock.scene.traverse(o => { if (o.isMesh) rm = o.material; });
await buildTerrain(scene, rm);
const sky = new SkySystem(scene); sky.setHour(+(q.get('h') || 10));
await loadHumanLibrary();
const keys = (q.get('who') || 'player,bento,iago,tomas,mateus,corvo,bandit1,bandit2,bandit3').split(',');
const hs = keys.map((k, i) => { const h = new Human(k); const x = (i - (keys.length - 1) / 2) * 1.1, z = 30; h.root.position.set(x, groundH(x, z), z); h.root.rotation.y = +(q.get('ry') || 0); scene.add(h.root); return h; });
const anim = q.get('anim'); const mode = q.get('mode') || '';
const target = new THREE.Vector3(+(q.get('lx') || 0), groundH(0, 30) + 1.6, +(q.get('lz') || 34));
for (const h of hs) { if (anim) h.play(anim, 0); h.mixer.update(+(q.get('t') || 0.7)); if (mode === 'aim') { h.aimW = 1; h.aimDir.set(0, 0, 1); } if (q.get('look')) h.lookAtPoint(target, 1); h.lookW = 1; }
for (let i = 0; i < 3; i++) for (const h of hs) h.update(0.016);
const cx = +(q.get('cx') || 0), cy = +(q.get('cy') || 1.4), cz = +(q.get('cz') || 36.5);
camera.position.set(cx, groundH(cx, cz) + cy, cz); camera.lookAt(+(q.get('tx') || 0), groundH(0, 30) + +(q.get('ty') || 1.0), 30); camera.fov = +(q.get('fov') || 40); camera.updateProjectionMatrix();
sky.update({ x: 0, y: groundH(0, 30), z: 30, camPos: camera.position }, 0);
const post = new Post(); post.setSize(innerWidth, innerHeight); post.render(0.016, 1); window.DONE = 1;
const V = (v) => v.toArray().map(n => +n.toFixed(3)).join(',');
const info = {};
for (const h of hs.slice(0, 2)) { const B = h.bones; const wp = (b) => V(b.getWorldPosition(new THREE.Vector3()));
  info[h.key] = { root: V(h.root.position), shoulderR: B.RightShoulder && wp(B.RightShoulder), armR: wp(B.RightArm), handR: wp(B.RightHand), handL: wp(B.LeftHand), head: wp(B.Head), rifle: h.rifle && V(h.rifle.getWorldPosition(new THREE.Vector3())), rifleParent: h.rifle && h.rifle.parent.name, armScale: V(B.Hips.getWorldScale(new THREE.Vector3())) };
  h.meshes.forEach(m => { info[h.key]['mesh_' + m.name] = m.material.name + '|' + (m.material.map ? (m.material.map.isCanvasTexture ? 'canvas' : 'orig') : 'nomap'); }); }
window.DONE = JSON.stringify(info);
