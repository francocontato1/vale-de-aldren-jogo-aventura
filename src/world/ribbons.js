// A Árvore das Fitas: centenas de pedidos amarrados nos galhos, balançando com o vento.
// Tudo num só InstancedMesh (uma chamada de desenho), com o balanço calculado no vertex shader.
// O galho baixo, virado para o banco de contemplar, guarda a fita da Ilsa com a pedra furada; a fita da
// Lia aparece ao lado depois que ela amarra o pedido dela.
import { THREE, U, rr, rand } from '../core.js';
import { M } from './village.js';

const ribbonMat = () => {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time; sh.uniforms.uWind = U.wind; sh.uniforms.uWindStr = U.windStrength;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec2 uWind; uniform float uWindStr;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
 // uv.y = 1 no nó, 0 na ponta: a ponta solta balança mais
 float k = 1.0 - uv.y; k = k * k;
 vec3 ip = vec3(0.);
 #ifdef USE_INSTANCING
  ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
 #endif
 float ph = ip.x * 1.7 + ip.z * 2.3 + ip.y * 3.1;
 float sw = sin(uTime * 1.9 + ph) * 0.6 + sin(uTime * 3.7 + ph * 1.3) * 0.25;
 transformed.x += (uWind.x * 0.5 + sw) * k * 0.16 * (0.4 + uWindStr);
 transformed.z += (uWind.y * 0.5 + cos(uTime * 2.3 + ph) * 0.5) * k * 0.12 * (0.4 + uWindStr);`);
  };
  m.customProgramCacheKey = () => 'ribbon';
  return m;
};

// tecido: cor base + idade (desbota e acinzenta)
const CLOTH = ['#9b3b32', '#c9a646', '#5b6e8c', '#e8d6b0', '#6f8a52', '#b65a2e', '#8b6aa0', '#d98c8c', '#e9e2d0', '#3f8f5a', '#22344f', '#c25a6a'];
function aged(hex, age) { const c = new THREE.Color(hex); const g = (c.r + c.g + c.b) / 3; c.lerp(new THREE.Color(g, g, g * 0.95), age * 0.6).lerp(new THREE.Color(0.78, 0.74, 0.66), age * 0.35); return c; }

export function buildRibbonTree(scene, root, face) {
  // geometria de uma fita: tira estreita com 6 segmentos para dobrar
  const geo = new THREE.PlaneGeometry(0.055, 1, 1, 6); geo.translate(0, -0.5, 0); // nó em y=0, ponta em y=-1
  const N = 150; const mat = ribbonMat();
  const im = new THREE.InstancedMesh(geo, mat, N + 2); im.castShadow = false; im.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let i = 0;
  const add = (x, y, z, len, col, yaw = rand() * 6.28, tilt = rr(-0.12, 0.12)) => { e.set(tilt, yaw, rr(-0.1, 0.1)); q.setFromEuler(e); s.set(rr(0.85, 1.3), len, 1); p.set(x, y, z); m4.compose(p, q, s); im.setMatrixAt(i, m4); im.setColorAt(i, col); return i++; };
  // copa: fitas espalhadas sob os galhos, mais densas do lado do banco
  for (let k = 0; k < N - 16; k++) { const a = k < 50 ? face + rr(-0.9, 0.9) : rr(0, 6.28), r = rr(1.4, 4.0), h = rr(2.5, 4.6); add(root.x + Math.cos(a) * r, root.y + h, root.z + Math.sin(a) * r, rr(0.35, 0.9), aged(CLOTH[k % CLOTH.length], rand())); }
  // o galho baixo: sai do tronco na direção do banco
  const dx = Math.cos(face), dz = Math.sin(face), BL = 2.6, by = 2.15;
  const g = new THREE.Group();
  { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, BL, 7), M.bark); br.position.set(root.x + dx * BL / 2, root.y + by + 0.25, root.z + dz * BL / 2); br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, 0.2, dz).normalize()); br.castShadow = true; g.add(br); }
  const along = (t, h = 0) => new THREE.Vector3(root.x + dx * BL * t, root.y + by + 0.25 + BL * t * 0.2 * 0.98 - 0.05 + h, root.z + dz * BL * t);
  for (let k = 0; k < 14; k++) { const t = 0.25 + k / 14 * 0.7; const a = along(t); add(a.x, a.y, a.z, rr(0.4, 0.8), aged(CLOTH[(k * 5) % CLOTH.length], rand() * 0.8)); }
  // a fita da Ilsa (lã vermelha, quase fio) e a pedra furada
  const ip = along(0.62); const ilsa = add(ip.x, ip.y, ip.z, 0.62, aged('#9b3b32', 0.85), face + 1.2, 0.02);
  const stone = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.028, 8, 14), M.stone); stone.scale.set(1, 1, 0.45); stone.position.set(ip.x, ip.y - 0.66, ip.z); stone.rotation.y = face; stone.castShadow = true; g.add(stone);
  // a fita da Lia (escondida até ela amarrar)
  const lp = along(0.7); const liaI = add(lp.x, lp.y, lp.z, 0.7, new THREE.Color('#3d8a6a'), face + 0.6, -0.03);
  const hideM = new THREE.Matrix4().makeScale(0, 0, 0); const liaM = new THREE.Matrix4(); im.getMatrixAt(liaI, liaM); im.setMatrixAt(liaI, hideM);
  im.count = i; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere(); im.frustumCulled = true; g.add(im); scene.add(g);
  const ilsaM = new THREE.Matrix4(); im.getMatrixAt(ilsa, ilsaM);
  return {
    // onde a Lia lê as fitas: embaixo da ponta do galho
    readSpot: along(0.62, -2.4), stone,
    showLia() { im.setMatrixAt(liaI, liaM); im.instanceMatrix.needsUpdate = true; },
    // refazer o nó: a fita da Ilsa fica um pouco mais curta e firme, e a pedra sobe junto
    retie() { const p2 = new THREE.Vector3(), q2 = new THREE.Quaternion(), s2 = new THREE.Vector3(); ilsaM.decompose(p2, q2, s2); s2.y = 0.5; ilsaM.compose(p2, q2, s2); im.setMatrixAt(ilsa, ilsaM); im.instanceMatrix.needsUpdate = true; stone.position.y = ip.y - 0.53; },
  };
}
