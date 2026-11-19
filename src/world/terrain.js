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
// trilha da montanha: da torre partida até o mirante da gigante (traçada por A* sobre o relevo, rampa ≤ ~30%)
export const MIRANTE = { x: -46, z: -503 };
export const TRAIL = [[68, -256], [84, -284], [76, -306], [80, -322], [100, -334], [116, -358], [106, -368], [96, -390], [90, -412], [80, -421], [76, -438], [84, -462], [76, -482], [70, -496], [48, -502], [28, -510], [4, -506], [-20, -510], [-38, -505], [MIRANTE.x, MIRANTE.z]];
PATHS.push(TRAIL);
// leito de um riacho que secou há séculos (atravessado pela ponte partida dos Veladores)
export const CREEK = [[118, -10], [132, 30], [146, 70], [154, 96], [168, 130], [196, 168], [214, 200]];
export function creekDist(x, z) { let best = 1e9; for (let i = 0; i < CREEK.length - 1; i++) { const [x1, z1] = CREEK[i], [x2, z2] = CREEK[i + 1]; const dx = x2 - x1, dz = z2 - z1; const t = clamp(((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz), 0, 1); const d = Math.hypot(x1 + dx * t - x, z1 + dz * t - z); if (d < best) best = d; } return best; }
export function pathDist(x, z) {
  let best = 1e9;
  for (const s of SEGS) { const dx = s[2] - s[0], dz = s[3] - s[1]; const t = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / (dx * dx + dz * dz), 0, 1); const px = s[0] + dx * t - x, pz = s[1] + dz * t - z; const d = px * px + pz * pz; if (d < best) best = d; }
  return Math.sqrt(best) + fbm(x * 0.08, z * 0.08, 2) * 0.9;
}
export const WATER = 0;
let TRAIL_H = null; // alturas-alvo dos nós da trilha (relevo suavizado)
function trailInfo(x, z) {
  let best = 1e9, bh = 0; for (let i = 0; i < TRAIL.length - 1; i++) { const [x1, z1] = TRAIL[i], [x2, z2] = TRAIL[i + 1]; const dx = x2 - x1, dz = z2 - z1; const t = clamp(((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz), 0, 1); const d = Math.hypot(x1 + dx * t - x, z1 + dz * t - z); if (d < best) { best = d; bh = TRAIL_H[i] + (TRAIL_H[i + 1] - TRAIL_H[i]) * t; } }
  return [best, bh];
}
// ---------------- litoral: uma enseada aberta para o mar a sudeste ----------------
export const SEA_DIR = { x: 0.6, z: 0.8 };
// coordenadas da enseada: u = em direção ao mar, v = ao longo da praia
export const fromUV = (u, v) => [u * SEA_DIR.x + v * SEA_DIR.z, u * SEA_DIR.z - v * SEA_DIR.x];
export const HARBOR = { u: 360, v: -100 }; // Vila da Maré
export const SEA_ROT = Math.atan2(SEA_DIR.x, SEA_DIR.z); // casas com a frente para o mar
// estrada do jardim até a Vila da Maré
PATHS.push([[120, 70], [118, 150], [fromUV(HARBOR.u - 30, HARBOR.v + 4)[0], fromUV(HARBOR.u - 30, HARBOR.v + 4)[1]], fromUV(HARBOR.u + 8, HARBOR.v + 2)]);
const SEGS = []; for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) SEGS.push([p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]]);
// distância (com sinal) até a linha da praia: >0 terra, <0 mar; bay = quanto este ponto pertence à enseada
export function coastInfo(x, z) {
  const u = x * SEA_DIR.x + z * SEA_DIR.z, v = x * SEA_DIR.z - z * SEA_DIR.x;
  const uc = 405 + v * v / 950 + fbm(v * 0.011 + 3.3, 0.7, 3) * 22;
  const bay = 1 - smooth(270, 390, Math.abs(v));
  return { s: uc - u, bay, u, v };
}
function coastProfile(s, v, x, z) {
  // praia de areia com cordão de dunas; mar com fundo arenoso que desce até ~26 m
  let h = 0.35 + s * 0.042;
  if (s > 0) h += 1.3 * smooth(16, 32, s) * (1 - smooth(44, 72, s)) * (0.6 + 0.5 * fbm(x * 0.04, z * 0.04, 2));
  else h -= smooth(-12, -130, s) * 24 + fbm(x * 0.02, z * 0.02, 2) * 1.2 * smooth(-8, -40, s);
  return h;
}
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
  // enseada: substitui as montanhas pela praia e pelo mar dentro do setor da baía
  const c = coastInfo(x, z); if (c.bay > 0 && c.s < 240) { const w = c.bay * (c.s < 0 ? 1 : 1 - smooth(70, 230, c.s)); if (w > 0) h = lerp(h, coastProfile(c.s, c.v, x, z), w); }
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
{ const [hx, hz] = fromUV(HARBOR.u, HARBOR.v); FLAT.push({ x: hx, z: hz, r0: 21, r1: 40 }); }
// platô atrás do mirante (a gigante senta nele); o mirante fica na borda, olhando o vale lá embaixo
{ const l = Math.hypot(MIRANTE.x, MIRANTE.z); FLAT.push({ x: MIRANTE.x + MIRANTE.x / l * 7, z: MIRANTE.z + MIRANTE.z / l * 7, r0: 9.5, r1: 19 }); }
for (const f of FLAT) if (f.t === undefined) f.t = Math.max(baseHeight(f.x, f.z), 4);
// ninho da Alva: uma plataforma na mesma altura do mirante, a oeste dele
export const NINHO = (() => { const l = Math.hypot(MIRANTE.x, MIRANTE.z); const px = MIRANTE.z / l, pz = -MIRANTE.x / l; const m = FLAT[FLAT.length - 1]; return { x: MIRANTE.x + MIRANTE.x / l * 10 + px * 34, z: MIRANTE.z + MIRANTE.z / l * 10 + pz * 34, t: m.t }; })();
FLAT.push({ x: NINHO.x, z: NINHO.z, r0: 14, r1: 30, t: NINHO.t });
{ // alturas da trilha: relevo amostrado, suavizado, e rampa limitada a 28% entre nós
  let h = TRAIL.map(([x, z]) => baseHeight(x, z)); for (let it = 0; it < 3; it++) h = h.map((v, i) => i === 0 || i === h.length - 1 ? v : (h[i - 1] + 2 * v + h[i + 1]) / 4);
  h[0] = FLAT[1].t; h[h.length - 1] = FLAT[FLAT.length - 1].t;
  for (let pass = 0; pass < 4; pass++) for (let i = 1; i < h.length; i++) { const L = Math.hypot(TRAIL[i][0] - TRAIL[i - 1][0], TRAIL[i][1] - TRAIL[i - 1][1]); const mx = L * 0.28; if (h[i] - h[i - 1] > mx) h[i] = h[i - 1] + mx; if (h[i - 1] - h[i] > mx) h[i - 1] = h[i] + mx; }
  TRAIL_H = h;
}
export function heightFn(x, z) {
  let h = baseHeight(x, z);
  for (const f of FLAT) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r1) h = lerp(h, f.t, 1 - smooth(f.r0, f.r1, d)); }
  // gentle undulation inside the village so it isn't a table
  const dv = Math.hypot(x, z); if (dv < 100) h += fbm(x * 0.03 + 4, z * 0.03, 2) * 1.1 * (1 - smooth(60, 100, dv)) + 0.0;
  // trilha da montanha: corta/aterra a encosta numa faixa caminhável
  if (z < -240 && x > -80 && x < 140) { const [td, th] = trailInfo(x, z); if (td < 11) h = lerp(h, th, 1 - smooth(2.6, 11, td)); }
  const pd = pathDist(x, z); if (pd < 3) h -= 0.14 * (1 - pd / 3);
  // riacho seco: um vale estreito com fundo de cascalho
  const cd = creekDist(x, z) + fbm(x * 0.05, z * 0.05, 2) * 1.5; if (cd < 13) h -= 4.2 * (1 - smooth(2.0, 13, cd));
  return h;
}
export const forestDensity = (x, z) => fbm(x * 0.006 + 50, z * 0.006 - 20, 3);

export const WSIZE = 1600, N = 400, CELL = WSIZE / N, HALF = WSIZE / 2, NV = N + 1;
export const HGT = new Float32Array(NV * NV), NRM = new Float32Array(NV * NV * 3), SPLAT = new Float32Array(NV * NV * 4), SAND = new Float32Array(NV * NV);
export function sandAt(x, z) { const i = clamp(Math.round((x + HALF) / CELL), 0, N), j = clamp(Math.round((z + HALF) / CELL), 0, N); return SAND[j * NV + i]; }
export function seaAt(x, z) { const c = coastInfo(x, z); return c.bay > 0.5 && c.s < 0; }
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
    const cc = coastInfo(x, z); const sand = cc.bay > 0 ? clamp(cc.bay * 1.4 - 0.2, 0, 1) * (1 - smooth(48 + n1 * 14, 78 + n1 * 14, cc.s)) * (1 - smooth(0.32, 0.5, slope)) : 0;
    SAND[k] = sand;
    SPLAT[k * 4] = clamp(dirt, 0, 1) * (1 - sand); SPLAT[k * 4 + 1] = rock * (1 - sand * 0.85); SPLAT[k * 4 + 2] = snow; SPLAT[k * 4 + 3] = clamp(shore, 0, 1) * (1 - sand);
  }
}

// areia procedural (sem emendas): grãos finos, conchinhas e ondulações deixadas pelo vento
function sandTextures() {
  const S = 512; const H = new Float32Array(S * S); const col = new Uint8ClampedArray(S * S * 4);
  const per = (x, y, f, ph) => Math.sin((x / S) * Math.PI * 2 * f + ph) * Math.cos((y / S) * Math.PI * 2 * Math.round(f * 0.7) + ph * 1.3);
  let seed = 7; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const warp = per(x, y, 3, 0.4) * 0.6 + per(y, x, 5, 1.1) * 0.3;
    const ripple = Math.sin((x / S) * Math.PI * 2 * 14 + (y / S) * Math.PI * 2 * 4 + warp * 3.4) * (0.55 + 0.45 * per(x, y, 2, 2.2));
    const grain = R() - 0.5; const k = y * S + x;
    H[k] = ripple * 0.32 + grain * 0.45 + per(x, y, 9, 2.0) * 0.2;
    const tone = 0.93 + per(x, y, 4, 0.7) * 0.05 + grain * 0.12 + ripple * 0.012;
    col[k * 4] = 196 * tone; col[k * 4 + 1] = 174 * tone; col[k * 4 + 2] = 136 * tone; col[k * 4 + 3] = 255;
  }
  for (let i = 0; i < 900; i++) { const x = (R() * S) | 0, y = (R() * S) | 0, k = y * S + x; const w = R() < 0.6 ? [245, 238, 226] : [120, 104, 88]; for (const d of [0, 1, S, S + 1]) { const q = (k + d) % (S * S); col[q * 4] = w[0]; col[q * 4 + 1] = w[1]; col[q * 4 + 2] = w[2]; } }
  const nrm = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const k = y * S + x; const hx = H[y * S + ((x + 1) % S)] - H[y * S + ((x - 1 + S) % S)], hy = H[((y + 1) % S) * S + x] - H[((y - 1 + S) % S) * S + x]; const nx = -hx * 1.4, ny = -hy * 1.4, nz = 1, l = Math.hypot(nx, ny, nz); nrm[k * 4] = (nx / l * 0.5 + 0.5) * 255; nrm[k * 4 + 1] = (ny / l * 0.5 + 0.5) * 255; nrm[k * 4 + 2] = (nz / l * 0.5 + 0.5) * 255; nrm[k * 4 + 3] = 255; }
  const mk = (d, srgb) => { const t = new THREE.DataTexture(d, S, S); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  return [mk(col, true), mk(nrm, false)];
}
export async function buildTerrain(scene, rockMaps) {
  const [sandC, sandN] = sandTextures();
  const [grassC, grassN, dirtC, gravelC, gravelN] = await Promise.all([
    loadTex('a/tex/grass_c.jpg'), loadTex('a/tex/grass_n.jpg', { srgb: false }), loadTex('a/tex/dirt_c.jpg'), loadTex('a/tex/gravel_c.jpg'), loadTex('a/tex/gravel_n.jpg', { srgb: false }),
  ]);
  const pos = new Float32Array(NV * NV * 3);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) { const k = j * NV + i; pos[k * 3] = i * CELL - HALF; pos[k * 3 + 1] = HGT[k]; pos[k * 3 + 2] = j * CELL - HALF; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(NRM, 3));
  g.setAttribute('splat', new THREE.BufferAttribute(SPLAT, 4));
  g.setAttribute('sandw', new THREE.BufferAttribute(SAND, 1));
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { tGrass: { value: grassC }, tGrassN: { value: grassN }, tDirt: { value: dirtC }, tGravel: { value: gravelC }, tGravelN: { value: gravelN }, tRock: { value: rockMaps.map }, tRockN: { value: rockMaps.normalMap }, tMacro: U.macro, tSand: { value: sandC }, tSandN: { value: sandN } });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 splat; attribute float sandw; varying vec4 vSplat; varying float vSand; varying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vSplat = splat; vSand = sandw; vWPos = (modelMatrix*vec4(position,1.)).xyz; vWNrm = normal;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D tGrass,tGrassN,tDirt,tGravel,tGravelN,tRock,tRockN,tMacro,tSand,tSandN; varying vec4 vSplat; varying float vSand; varying vec3 vWPos; varying vec3 vWNrm;
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
 // areia da praia (seca e úmida), com variação em duas escalas
 vec3 sandC = mix(texture2D(tSand, uv*0.28).rgb, texture2D(tSand, uv*0.061+0.3).rgb, 0.4) * mix(vec3(1.02,0.98,0.92), vec3(0.94,0.92,0.9), mac.g);
 float sandW = smoothstep(0.0, 1.0, clamp(vSand*1.35 - 0.15 + (mac2.r-0.5)*0.4, 0., 1.));
 col = mix(col, sandC, sandW);
 float rk = smoothstep(0.0,1.0, clamp(rockW*1.5 - 0.25 + (dot(rock,vec3(.33))-0.4), 0., 1.));
 col = mix(col, rock, rk);
 vec3 snowC = vec3(0.86,0.9,0.95) * (0.9 + 0.1*texture2D(tGravel, uv*0.11).r);
 col = mix(col, snowC, snowW);
 float wetness = max(smoothstep(0.6, -0.4, vWPos.y), sandW * smoothstep(0.9, 0.15, vWPos.y)); col *= mix(1.0, mix(0.55, 0.62, sandW), wetness);
 diffuseColor.rgb *= col;
 terrRough = mix(0.92, 0.98, dirtW); terrRough = mix(terrRough, 0.95, sandW); terrRough = mix(terrRough, 0.82, rk); terrRough = mix(terrRough, 0.55, snowW); terrRough = mix(terrRough, 0.35, wetness);
 // detail normals (world space, up-facing approximation + triplanar for rock)
 vec3 nG = texture2D(tGrassN, uv*0.6).xyz*2.-1.; vec3 nV = texture2D(tGravelN, uv*0.22).xyz*2.-1.;
 vec3 nR = (tri(tRockN, vWPos, bw, 0.09).xyz*2.-1.);
 vec3 dn = mix(nG*vec3(0.6,0.6,1.), nV, max(dirtW*0.8, shoreW)); dn = mix(dn, (texture2D(tSandN, uv*0.28).xyz*2.-1.)*vec3(0.9,0.9,1.) * vec3(vec2(mix(1.0, 0.25, smoothstep(1.2, 0.3, vWPos.y))), 1.), sandW); dn = mix(dn, nR*vec3(1.4,1.4,1.), rk); dn = mix(dn, vec3(0.,0.,1.), snowW*0.7);
 dn.xy *= 1.0 - smoothstep(60., 220., camD)*0.7;
 vec3 T = normalize(cross(wn, vec3(0.,0.,1.))); vec3 B = normalize(cross(T, wn));
 terrNW = normalize(T*dn.x + B*dn.y + wn*dn.z);
`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = terrRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix*vec4(terrNW,0.)).xyz);');
  };
  // O relevo é desenhado em 5x5 pedaços que compartilham os mesmos vértices (só os índices são separados):
  // os pedaços fora do campo de visão (atrás da câmera, fora do reflexo do lago) deixam de ser desenhados.
  const mesh = new THREE.Group(); mesh.name = 'terrain';
  const CH = 80, attrs = g.attributes;
  for (let cj = 0; cj < N; cj += CH) for (let ci = 0; ci < N; ci += CH) {
    const ci1 = Math.min(N, ci + CH), cj1 = Math.min(N, cj + CH); const cidx = new Uint32Array((ci1 - ci) * (cj1 - cj) * 6); let q = 0;
    const box = new THREE.Box3(); const v = new THREE.Vector3();
    for (let j = cj; j < cj1; j++) for (let i = ci; i < ci1; i++) { const a = j * NV + i, b = (j + 1) * NV + i, c = (j + 1) * NV + i + 1, d = j * NV + i + 1; cidx[q++] = a; cidx[q++] = b; cidx[q++] = d; cidx[q++] = b; cidx[q++] = c; cidx[q++] = d; }
    for (let j = cj; j <= cj1; j++) for (let i = ci; i <= ci1; i++) { const k = j * NV + i; box.expandByPoint(v.set(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2])); }
    const cg = new THREE.BufferGeometry(); for (const k in attrs) cg.setAttribute(k, attrs[k]); cg.setIndex(new THREE.BufferAttribute(cidx, 1));
    cg.boundingBox = box; cg.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const cm = new THREE.Mesh(cg, mat); cm.receiveShadow = true; cm.name = 'terrain'; mesh.add(cm);
  }
  scene.add(mesh);
  // paredão na borda do mapa: o terreno não termina mais 'no ar' visto do mar
  { const sp = [], si = []; const edge = (k) => { const out = []; for (let t = 0; t <= N; t++) { const [i, j] = k === 0 ? [t, 0] : k === 1 ? [N, t] : k === 2 ? [N - t, N] : [0, N - t]; out.push([i * CELL - HALF, HGT[j * NV + i], j * CELL - HALF]); } return out; };
    for (let k = 0; k < 4; k++) { const e = edge(k); const b = sp.length / 3; for (const [x, y, z] of e) sp.push(x, y, z, x, -90, z); for (let t = 0; t < e.length - 1; t++) { const a0 = b + t * 2; si.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); } }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setIndex(si); sg.computeVertexNormals();
    const sm = new THREE.MeshStandardMaterial({ color: 0x6f6a60, roughness: 1, side: THREE.DoubleSide }); const skirt = new THREE.Mesh(sg, sm); skirt.receiveShadow = true; scene.add(skirt); }
  return mesh;
}
