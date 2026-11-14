// O mar da enseada: malha polar que acompanha a câmera, ondas de Gerstner (as mesmas calculadas na CPU
// para o barco boiar), água transparente no raso (dá para ver a areia e os peixes), espuma na
// arrebentação e nas cristas, reflexo do céu pelo mapa de ambiente e brilho do sol.
import { THREE, U, camera, clamp, smooth } from '../core.js';
import { HGT, NV, N, HALF, WSIZE, WATER, coastInfo, SEA_DIR } from './terrain.js';

// ondas: [direção (graus, a partir do mar em direção à praia), comprimento (m), amplitude (m), velocidade relativa]
const towardShore = Math.atan2(-SEA_DIR.z, -SEA_DIR.x);
const WAVES = [[0, 23, 0.32, 1], [-0.42, 11.5, 0.15, 1], [0.55, 6.3, 0.075, 1], [0.15, 3.1, 0.035, 1], [-0.9, 1.9, 0.018, 1]].map(([da, L, A]) => {
  const a = towardShore + da; const k = 2 * Math.PI / L; const w = Math.sqrt(9.81 * k); const Q = 0.55 / (k * A * 5);
  return { dx: Math.cos(a), dz: Math.sin(a), k, w, A, Q: Math.min(Q, 0.9 / (k * A * 5)) };
});
// altura do terreno (o mesmo do relevo) para saber a profundidade
export function depthAt(x, z) { const gx = clamp((x + HALF) / (WSIZE / N), 0, N - 1e-3), gz = clamp((z + HALF) / (WSIZE / N), 0, N - 1e-3); const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j; const h = (HGT[j * NV + i] * (1 - fx) + HGT[j * NV + i + 1] * fx) * (1 - fz) + (HGT[(j + 1) * NV + i] * (1 - fx) + HGT[(j + 1) * NV + i + 1] * fx) * fz; return WATER - h; }
// altura da superfície do mar e normal aproximada (para o barco, os respingos e a câmera)
export function seaSurface(x, z, t) {
  const dep = depthAt(x, z); const amp = smooth(0.15, 5, dep); let y = 0, nx = 0, nz = 0;
  for (const W of WAVES) { const ph = W.k * (W.dx * x + W.dz * z) - W.w * t; const c = Math.cos(ph), s = Math.sin(ph); y += W.A * s; nx -= W.dx * W.k * W.A * c; nz -= W.dz * W.k * W.A * c; }
  return { y: WATER + y * amp, nx: nx * amp, nz: nz * amp, depth: dep };
}

const GLSL_WAVES = WAVES.map((W, i) => `const vec4 W${i} = vec4(${W.dx.toFixed(5)}, ${W.dz.toFixed(5)}, ${W.k.toFixed(5)}, ${W.w.toFixed(5)}); const vec2 P${i} = vec2(${W.A.toFixed(5)}, ${W.Q.toFixed(5)});`).join('\n');
const GER = WAVES.map((_, i) => ` { float ph = W${i}.z*dot(W${i}.xy, wp) - W${i}.w*uTime; float c = cos(ph), s = sin(ph); float a = P${i}.x*amp; disp.xz += W${i}.xy*(P${i}.y*a*c); disp.y += a*s; crest += a*s; dN.x -= W${i}.x*W${i}.z*a*c; dN.y -= W${i}.y*W${i}.z*a*c; }`).join('\n');

export let ocean = null;
export function buildOcean(scene, envNormal) {
  // textura com altura do relevo (R) e máscara do mar (G): o oceano só aparece na enseada e além do mapa
  const data = new Float32Array(NV * NV * 4);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) { const k = j * NV + i; const x = i * (WSIZE / N) - HALF, z = j * (WSIZE / N) - HALF; const c = coastInfo(x, z); data[k * 4] = HGT[k]; data[k * 4 + 1] = c.bay > 0 ? clamp((c.bay - 0.15) * 2, 0, 1) * (1 - smooth(20, 45, c.s)) : 0; data[k * 4 + 3] = 1; }
  const hd = new Uint16Array(data.length); for (let i = 0; i < data.length; i++) hd[i] = THREE.DataUtils.toHalfFloat(data[i]);
  const tH = new THREE.DataTexture(hd, NV, NV, THREE.RGBAFormat, THREE.HalfFloatType); tH.magFilter = tH.minFilter = THREE.LinearFilter; tH.wrapS = tH.wrapT = THREE.ClampToEdgeWrapping; tH.needsUpdate = true;
  // malha polar: anéis cada vez mais espaçados até o horizonte
  const SEG = 180, RINGS = 120; const pos = []; const idx = [];
  pos.push(0, 0, 0);
  for (let r = 1; r <= RINGS; r++) { const rad = r <= 40 ? r * 0.75 : 30 * Math.pow(1.055, r - 40); for (let s = 0; s < SEG; s++) { const a = s / SEG * Math.PI * 2; pos.push(Math.cos(a) * rad, 0, Math.sin(a) * rad); } }
  for (let s = 0; s < SEG; s++) idx.push(0, 1 + (s + 1) % SEG, 1 + s);
  for (let r = 1; r < RINGS; r++) for (let s = 0; s < SEG; s++) { const a = 1 + (r - 1) * SEG + s, b = 1 + (r - 1) * SEG + (s + 1) % SEG, c = 1 + r * SEG + s, d = 1 + r * SEG + (s + 1) % SEG; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((v, i) => i % 3 === 1 ? 1 : 0), 3)); g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a2a32, roughness: 0.06, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 0.8 });
  const uni = { uTime: U.time, tH: { value: tH }, tN: { value: envNormal }, uSunDir: U.sunDir, uSunCol: U.sunColor, uHalf: { value: HALF }, uSize: { value: WSIZE } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
uniform float uTime, uHalf, uSize; uniform sampler2D tH; varying vec3 vW; varying float vDepth, vCrest, vSea, vDist;
${GLSL_WAVES}`)
      .replace('#include <beginnormal_vertex>', `
 vec3 wp0 = (modelMatrix*vec4(position,1.)).xyz; vec2 wp = wp0.xz;
 vec4 th = texture2D(tH, (wp + uHalf)/uSize); float inMap = step(abs(wp.x), uHalf) * step(abs(wp.y), uHalf);
 float depth = mix(40.0, -th.r, inMap); float sea = mix(1.0, th.g, inMap);
 float dist = length(wp0 - cameraPosition);
 float amp = smoothstep(0.15, 5.0, depth) * (1.0 - smoothstep(350.0, 1400.0, dist));
 vec3 disp = vec3(0.); vec2 dN = vec2(0.); float crest = 0.;
${GER}
 vec3 objectNormal = normalize(vec3(dN.x, 1.0, dN.y));
 vDepth = depth; vCrest = crest / 0.45; vSea = sea; vDist = dist;`)
      .replace('#include <begin_vertex>', `vec3 transformed = position + disp; vW = wp0 + disp;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime; uniform sampler2D tN; uniform vec3 uSunDir, uSunCol; varying vec3 vW; varying float vDepth, vCrest, vSea, vDist; float oAlpha; vec3 oFoam;`)
      .replace('#include <map_fragment>', `
 if (vSea < 0.02) discard;
 float dz = max(vDepth, 0.0);
 // cor da água: turquesa no raso (areia por baixo), azul-petróleo profundo
 vec3 shallow = vec3(0.035, 0.16, 0.15), deep = vec3(0.004, 0.025, 0.035);
 vec3 wc = mix(shallow, deep, smoothstep(0.4, 9.0, dz));
 // espuma: linhas da arrebentação que avançam para a praia + cristas das ondas
 vec2 fuv = vW.xz*0.09; float nA = texture2D(tN, fuv + vec2(uTime*0.012, -uTime*0.008)).r, nB = texture2D(tN, fuv*2.3 - vec2(uTime*0.02, uTime*0.015)).g;
 float surf = (1.0 - smoothstep(0.1, 1.0, dz)) * smoothstep(0.78, 0.97, sin(dz*8.0 - uTime*1.35 + nA*3.0)*0.5+0.5) * smoothstep(0.0, 0.06, dz);
 float edge = (1.0 - smoothstep(0.0, 0.12, dz)) * (0.55 + 0.45*sin(uTime*0.9 + vW.x*0.15 + vW.z*0.11));
 float whitecap = smoothstep(0.55, 0.95, vCrest + (nB-0.5)*0.6) * smoothstep(1.2, 5.0, dz) * 0.5;
 float foam = clamp(max(surf*0.85, edge*0.9) + whitecap, 0.0, 1.0) * smoothstep(0.35, 0.65, nA*0.6 + nB*0.6);
 oFoam = vec3(foam);
 diffuseColor.rgb = mix(wc, vec3(0.93, 0.95, 0.95), foam);
 oAlpha = mix(0.16, 0.95, smoothstep(0.2, 9.0, dz));
 oAlpha = max(oAlpha, foam);
 oAlpha *= smoothstep(-0.05, 0.06, dz) * smoothstep(0.02, 0.25, vSea);`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.06, 0.6, oFoam.x) + smoothstep(60.0, 900.0, vDist)*0.1;')
      .replace('#include <normal_fragment_maps>', `
 vec2 ruv = mat2(0.8, -0.6, 0.6, 0.8) * vW.xz; vec3 n1 = texture2D(tN, ruv*0.021 + vec2(uTime*0.012, uTime*0.008)).xyz*2.-1.;
 vec3 n2 = texture2D(tN, vW.xz*0.13 - vec2(uTime*0.03, -uTime*0.021)).xyz*2.-1.;
 vec3 n3 = texture2D(tN, vW.xz*0.37 + vec2(-uTime*0.04, uTime*0.05)).xyz*2.-1.;
 float far = 1.0 - smoothstep(30.0, 600.0, vDist);
 vec2 pert = (n1.xy*0.35 + n2.xy*0.4*mix(0.4, 1.0, far) + n3.xy*0.3*far) * mix(0.1, 0.24, far);
 vec3 nW = normalize(vec3(0.,1.,0.) + vec3(pert.x, 0., pert.y));
 normal = normalize(normal + (viewMatrix*vec4(nW - vec3(0.,1.,0.), 0.)).xyz);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 // luz atravessando a crista das ondas (subsurface) quando se olha contra o sol
 vec3 Vw = normalize(cameraPosition - vW); float back = pow(max(dot(-Vw, normalize(vec3(uSunDir.x, 0.15, uSunDir.z))), 0.0), 3.0);
 totalEmissiveRadiance += vec3(0.05, 0.3, 0.26) * uSunCol * back * clamp(vCrest*1.6 + 0.15, 0.0, 1.0) * smoothstep(-0.05, 0.2, uSunDir.y) * 0.5 * (1.0 - oFoam.x);`)
      .replace('#include <opaque_fragment>', `
 vec3 Vv = normalize(vViewPosition); float fres = pow(1.0 - clamp(dot(normal, Vv), 0.0, 1.0), 5.0);
 gl_FragColor = vec4(outgoingLight, clamp(oAlpha + fres * (1.0 - oAlpha) * 0.9, 0.0, 1.0) * smoothstep(-0.05, 0.06, dz) * smoothstep(0.02, 0.25, vSea));`);
  };
  mat.customProgramCacheKey = () => 'ocean';
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.name = 'ocean'; scene.add(mesh);
  ocean = { mesh, mat };
  return ocean;
}
export function updateOcean() { if (!ocean) return; const s = 4; ocean.mesh.position.set(Math.round(camera.position.x / s) * s, WATER, Math.round(camera.position.z / s) * s); }
// quanto a câmera/jogadora está perto da arrebentação (para o som do mar)
export function surfNear(x, z) { let best = 0; for (const [dx, dz] of [[0, 0], [25, 0], [-25, 0], [0, 25], [0, -25], [50, 0], [-50, 0], [0, 50], [0, -50]]) { const c = coastInfo(x + dx, z + dz); if (c.bay < 0.3) continue; const k = c.bay * Math.exp(-Math.abs(c.s) / 30) * (1 - Math.hypot(dx, dz) / 80); if (k > best) best = k; } return clamp(best, 0, 1); }
