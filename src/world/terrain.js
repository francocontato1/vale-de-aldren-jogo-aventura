import { THREE, clamp, lerp, smooth, fbm, ridged, Simplex, U, loadTex } from '../core.js';

export const POI = {
  village: { x: 0, z: 0, name: 'Aldren' },
  lake: { x: -170, z: 120, name: 'Lago Espelhado' },
  tower: { x: 70, z: -270, name: 'A Torre Partida' },
  garden: { x: 250, z: 150, name: 'Jardim dos Relógios de Sol' },
  stones: { x: -240, z: -150, name: 'Círculo das Estrelas' },
  peaks: { x: -80, z: -560, name: 'Mirante da Gigante' },
  observatory: { x: 64, z: -116, name: 'Observatório de Odessa' },
  stairs: { x: 176, z: -36, name: 'Escada para o Céu' },
  head: { x: 108, z: 22, name: 'O Rosto entre as Flores' },
  tree: { x: -152, z: -80, name: 'Árvore das Fitas' },
  shrine: { x: -118, z: -34, name: 'Santuário da Floresta' },
  bridge: { x: 152, z: 92, name: 'A Ponte Partida' },
};
export const PATHS = [
  [[0, -28], [8, -90], [34, -160], [56, -220], [68, -256]],
  [[12, 8], [60, 30], [120, 70], [180, 110], [236, 142]],
  [[-18, 14], [-70, 50], [-118, 84]],
  [[-28, -10], [-110, -60], [-190, -120], [-226, -142]],
  [[0, 26], [4, 60], [-10, 110]],
  [[8, -90], [36, -104], [58, -112]],
  [[60, 30], [110, 8], [150, -14], [170, -30]],
];
// leito de um riacho que secou há séculos (atravessado pela ponte partida dos Veladores)
export const CREEK = [[118, -10], [132, 30], [146, 70], [154, 96], [168, 130], [196, 168], [214, 200]];
export function creekDist(x, z) { let best = 1e9; for (let i = 0; i < CREEK.length - 1; i++) { const [x1, z1] = CREEK[i], [x2, z2] = CREEK[i + 1]; const dx = x2 - x1, dz = z2 - z1; const t = clamp(((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz), 0, 1); const d = Math.hypot(x1 + dx * t - x, z1 + dz * t - z); if (d < best) best = d; } return best; }
const SEGS = []; for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) SEGS.push([p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]]);
export function pathDist(x, z) {
  let best = 1e9;
  for (const s of SEGS) { const dx = s[2] - s[0], dz = s[3] - s[1]; const t = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / (dx * dx + dz * dz), 0, 1); const px = s[0] + dx * t - x, pz = s[1] + dz * t - z; const d = px * px + pz * pz; if (d < best) best = d; }
  return Math.sqrt(best) + fbm(x * 0.08, z * 0.08, 2) * 0.9;
}
export const WATER = 0;
function baseHeight(x, z) {
  const d = Math.hypot(x, z);
  let h = fbm(x * 0.0022 + 3.1, z * 0.0022 - 7.3, 5) * 26 + 10;
  h += fbm(x * 0.013, z * 0.013, 3) * 2.4;
  const wx = x + fbm(x * 0.004 + 9, z * 0.004, 3) * 70, wz = z + fbm(x * 0.004, z * 0.004 - 5, 3) * 70;
  const r = ridged(wx * 0.0032, wz * 0.0032, 6);
  h += Math.pow(r, 1.6) * 38 * smooth(120, 420, d);
  const mtn = Math.pow(clamp(0.55 + 0.6 * fbm(wx * 0.0021 - 3, wz * 0.0021 + 8, 6), 0, 1.4), 1.7);
  h += smooth(380, 700, d) * (40 + 150 * mtn) + smooth(380, 700, d) * r * 30;
  const ld = Math.hypot(x - POI.lake.x, (z - POI.lake.z) * 1.3);
  h = lerp(h, -8, 1 - smooth(28, 108, ld));
  return h;
}
const FLAT = [
  { x: 0, z: 0, r0: 52, r1: 100, t: 6 },
  { x: POI.tower.x, z: POI.tower.z, r0: 12, r1: 30 },
  { x: POI.garden.x, z: POI.garden.z, r0: 22, r1: 46 },
  { x: POI.stones.x, z: POI.stones.z, r0: 14, r1: 32 },
  { x: POI.observatory.x, z: POI.observatory.z, r0: 11, r1: 24 },
  { x: POI.stairs.x, z: POI.stairs.z, r0: 9, r1: 22 },
  { x: POI.shrine.x, z: POI.shrine.z, r0: 5, r1: 12 },
];
for (const f of FLAT) if (f.t === undefined) f.t = Math.max(baseHeight(f.x, f.z), 4);
export function heightFn(x, z) {
  let h = baseHeight(x, z);
  for (const f of FLAT) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r1) h = lerp(h, f.t, 1 - smooth(f.r0, f.r1, d)); }
  // gentle undulation inside the village so it isn't a table
  const dv = Math.hypot(x, z); if (dv < 100) h += fbm(x * 0.03 + 4, z * 0.03, 2) * 1.1 * (1 - smooth(60, 100, dv)) + 0.0;
  const pd = pathDist(x, z); if (pd < 3) h -= 0.14 * (1 - pd / 3);
  // riacho seco: um vale estreito com fundo de cascalho
  const cd = creekDist(x, z) + fbm(x * 0.05, z * 0.05, 2) * 1.5; if (cd < 13) h -= 4.2 * (1 - smooth(2.0, 13, cd));
  return h;
}
export const forestDensity = (x, z) => fbm(x * 0.006 + 50, z * 0.006 - 20, 3);

export const WSIZE = 1600, N = 400, CELL = WSIZE / N, HALF = WSIZE / 2, NV = N + 1;
export const HGT = new Float32Array(NV * NV), NRM = new Float32Array(NV * NV * 3), SPLAT = new Float32Array(NV * NV * 4);
export function groundH(x, z) {
  let gx = (x + HALF) / CELL, gz = (z + HALF) / CELL; gx = clamp(gx, 0, N - 1e-4); gz = clamp(gz, 0, N - 1e-4);
  const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j;
  const ha = HGT[j * NV + i], hb = HGT[(j + 1) * NV + i], hc = HGT[(j + 1) * NV + i + 1], hd = HGT[j * NV + i + 1];
  return fx + fz <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fz : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
}
export function normalAt(x, z) { const i = clamp(Math.round((x + HALF) / CELL), 0, N), j = clamp(Math.round((z + HALF) / CELL), 0, N); const k = (j * NV + i) * 3; return [NRM[k], NRM[k + 1], NRM[k + 2]]; }
export const normalY = (x, z) => normalAt(x, z)[1];
export function splatAt(x, z) { const i = clamp(Math.round((x + HALF) / CELL), 0, N), j = clamp(Math.round((z + HALF) / CELL), 0, N); const k = (j * NV + i) * 4; return [SPLAT[k], SPLAT[k + 1], SPLAT[k + 2], SPLAT[k + 3]]; }

export function computeTerrainData(extraDirt) {
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) HGT[j * NV + i] = heightFn(i * CELL - HALF, j * CELL - HALF);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) {
    const k = j * NV + i; const x = i * CELL - HALF, z = j * CELL - HALF, h = HGT[k];
    const hl = HGT[j * NV + Math.max(i - 1, 0)], hr = HGT[j * NV + Math.min(i + 1, N)], hd = HGT[Math.max(j - 1, 0) * NV + i], hu = HGT[Math.min(j + 1, N) * NV + i];
    let nx = hl - hr, ny = 2 * CELL, nz = hd - hu; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    NRM[k * 3] = nx; NRM[k * 3 + 1] = ny; NRM[k * 3 + 2] = nz;
    const slope = 1 - ny; const n1 = fbm(x * 0.02, z * 0.02, 3), n2 = Simplex(x * 0.09, z * 0.09);
    const pd = pathDist(x, z);
    let dirt = 1 - smooth(1.4, 3.2, pd);
    dirt = Math.max(dirt, extraDirt ? extraDirt(x, z) : 0);
    dirt = Math.max(dirt, smooth(0.25, 0.6, n2 * 0.5 + n1) * 0.35 * (1 - smooth(20, 60, h)));
    const rock = clamp(smooth(0.22, 0.4, slope + n2 * 0.05) + smooth(58, 88, h + n1 * 14) * 0.85, 0, 1);
    const snow = smooth(100, 130, h + n1 * 16) * (1 - smooth(0.42, 0.6, slope));
    const shore = Math.max(1 - smooth(0.3, 1.8, h + n2 * 0.4), 1 - smooth(2.5, 5.5, creekDist(x, z) + n2 * 1.2));
    SPLAT[k * 4] = clamp(dirt, 0, 1); SPLAT[k * 4 + 1] = rock; SPLAT[k * 4 + 2] = snow; SPLAT[k * 4 + 3] = clamp(shore, 0, 1);
  }
}

export async function buildTerrain(scene, rockMaps) {
  const [grassC, grassN, dirtC, gravelC, gravelN] = await Promise.all([
    loadTex('a/tex/grass_c.jpg'), loadTex('a/tex/grass_n.jpg', { srgb: false }), loadTex('a/tex/dirt_c.jpg'), loadTex('a/tex/gravel_c.jpg'), loadTex('a/tex/gravel_n.jpg', { srgb: false }),
  ]);
  const pos = new Float32Array(NV * NV * 3);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) { const k = j * NV + i; pos[k * 3] = i * CELL - HALF; pos[k * 3 + 1] = HGT[k]; pos[k * 3 + 2] = j * CELL - HALF; }
  const idx = new Uint32Array(N * N * 6); let o = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * NV + i, b = (j + 1) * NV + i, c = (j + 1) * NV + i + 1, d = j * NV + i + 1; idx[o++] = a; idx[o++] = b; idx[o++] = d; idx[o++] = b; idx[o++] = c; idx[o++] = d; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(NRM, 3));
  g.setAttribute('splat', new THREE.BufferAttribute(SPLAT, 4));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { tGrass: { value: grassC }, tGrassN: { value: grassN }, tDirt: { value: dirtC }, tGravel: { value: gravelC }, tGravelN: { value: gravelN }, tRock: { value: rockMaps.map }, tRockN: { value: rockMaps.normalMap }, tMacro: U.macro });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 splat; varying vec4 vSplat; varying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vSplat = splat; vWPos = (modelMatrix*vec4(position,1.)).xyz; vWNrm = normal;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D tGrass,tGrassN,tDirt,tGravel,tGravelN,tRock,tRockN,tMacro; varying vec4 vSplat; varying vec3 vWPos; varying vec3 vWNrm;
vec3 terrNW; float terrRough;
vec4 tri(sampler2D t, vec3 p, vec3 w, float s){ return texture2D(t,p.zy*s)*w.x + texture2D(t,p.xz*s)*w.y + texture2D(t,p.xy*s)*w.z; }
`)
      .replace('#include <map_fragment>', `
 vec3 wn = normalize(vWNrm); vec3 bw = pow(abs(wn), vec3(4.)); bw /= (bw.x+bw.y+bw.z);
 vec2 uv = vWPos.xz; float camD = length(vWPos - cameraPosition);
 vec4 mac = texture2D(tMacro, uv*0.0021); vec4 mac2 = texture2D(tMacro, uv*0.013+0.37);
 // grass: two scales to break tiling, far scale fades in with distance
 vec3 gA = texture2D(tGrass, uv*0.16).rgb; vec3 gB = texture2D(tGrass, uv*0.031+0.5).rgb;
 vec3 grass = mix(gA, gB, 0.35 + 0.4*smoothstep(25.,140.,camD));
 grass *= mix(vec3(1.04,0.98,0.78), vec3(0.82,0.95,0.86), mac.r); grass *= (0.78 + 0.44*mac2.g) * vec3(0.55,0.57,0.34);
 grass = mix(grass, grass*vec3(1.25,1.08,0.62), smoothstep(0.5,0.85,mac.b)*0.75);
 grass = mix(grass, grass*vec3(0.78,0.9,0.62), smoothstep(18.,70.,camD)*0.55);
 vec3 dirt = mix(texture2D(tDirt, uv*0.21).rgb, texture2D(tDirt, uv*0.047).rgb, 0.4) * vec3(0.78,0.72,0.66);
 vec3 grav = texture2D(tGravel, uv*0.22).rgb * 0.95;
 vec3 rock = tri(tRock, vWPos, bw, 0.09).rgb * mix(0.85,1.08,mac.g);
 vec3 rockB = tri(tRock, vWPos, bw, 0.021).rgb; rock = mix(rock, rockB, 0.35);
 float dirtW = vSplat.x; float rockW = vSplat.y; float snowW = vSplat.z; float shoreW = vSplat.w;
 // height-based blend sharpening using texture luminance
 float lumD = dot(dirt, vec3(.33)); dirtW = smoothstep(0.0, 1.0, clamp(dirtW*1.6 - 0.35 + (lumD-0.35)*0.8, 0., 1.));
 vec3 col = mix(grass, dirt, dirtW);
 col = mix(col, grav*vec3(0.95,0.9,0.82), shoreW);
 float rk = smoothstep(0.0,1.0, clamp(rockW*1.5 - 0.25 + (dot(rock,vec3(.33))-0.4), 0., 1.));
 col = mix(col, rock, rk);
 vec3 snowC = vec3(0.86,0.9,0.95) * (0.9 + 0.1*texture2D(tGravel, uv*0.11).r);
 col = mix(col, snowC, snowW);
 float wetness = smoothstep(0.6, -0.4, vWPos.y); col *= mix(1.0, 0.55, wetness);
 diffuseColor.rgb *= col;
 terrRough = mix(0.92, 0.98, dirtW); terrRough = mix(terrRough, 0.82, rk); terrRough = mix(terrRough, 0.55, snowW); terrRough = mix(terrRough, 0.35, wetness);
 // detail normals (world space, up-facing approximation + triplanar for rock)
 vec3 nG = texture2D(tGrassN, uv*0.6).xyz*2.-1.; vec3 nV = texture2D(tGravelN, uv*0.22).xyz*2.-1.;
 vec3 nR = (tri(tRockN, vWPos, bw, 0.09).xyz*2.-1.);
 vec3 dn = mix(nG*vec3(0.6,0.6,1.), nV, max(dirtW*0.8, shoreW)); dn = mix(dn, nR*vec3(1.4,1.4,1.), rk); dn = mix(dn, vec3(0.,0.,1.), snowW*0.7);
 dn.xy *= 1.0 - smoothstep(60., 220., camD)*0.7;
 vec3 T = normalize(cross(wn, vec3(0.,0.,1.))); vec3 B = normalize(cross(T, wn));
 terrNW = normalize(T*dn.x + B*dn.y + wn*dn.z);
`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = terrRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix*vec4(terrNW,0.)).xyz);');
  };
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; mesh.name = 'terrain';
  scene.add(mesh);
  return mesh;
}
