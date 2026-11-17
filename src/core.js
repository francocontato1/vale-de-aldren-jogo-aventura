import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export { THREE };
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const rand = mulberry32(20261113);
export const rr = (a, b) => a + (b - a) * rand();
export const hash2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
export const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
export const lerpAng = (a, b, t) => a + angDiff(b, a) * clamp(t, 0, 1);

export const Simplex = (() => {
  const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i; const r = mulberry32(42);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return function (xin, yin) {
    let n0 = 0, n1 = 0, n2 = 0; const s = (xin + yin) * F2; const i = Math.floor(xin + s), j = Math.floor(yin + s); const t = (i + j) * G2; const x0 = xin - (i - t), y0 = yin - (j - t);
    let i1, j1; if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2; const ii = i & 255, jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0) { const g = grad[perm[ii + perm[jj]] & 7]; t0 *= t0; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0) { const g = grad[perm[ii + i1 + perm[jj + j1]] & 7]; t1 *= t1; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0) { const g = grad[perm[ii + 1 + perm[jj + 1]] & 7]; t2 *= t2; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * (n0 + n1 + n2);
  };
})();
export function fbm(x, z, o) { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { s += a * Simplex(x * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }
export function ridged(x, z, o) { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { let v = 1 - Math.abs(Simplex(x * f + 31.7, z * f - 12.1)); v *= v; s += a * v; n += a; a *= 0.5; f *= 2.1; } return s / n; }

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};

export const isTouch = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
export const QUAL = {
  ultra: { lights: 8, pr: Math.min(devicePixelRatio, 2), shadow: 4096, shadowR: 75, grassR: 52, grassDen: 72, msaa: 0, ao: false, bloom: true, treeNear: 170, view: 1400, fur: 16, sharpen: 0.32 },
  alta: { lights: 8, pr: Math.min(devicePixelRatio, 1.5), shadow: 4096, shadowR: 62, grassR: 44, grassDen: 64, msaa: 0, ao: false, bloom: true, treeNear: 130, view: 1150, fur: 16, sharpen: 0.28 },
  media: { lights: 6, sharpen: 0.2, pr: Math.min(devicePixelRatio, 1.0), shadow: 2048, shadowR: 50, grassR: 34, grassDen: 45, msaa: 0, ao: false, bloom: true, treeNear: 85, view: 850, fur: 12 },
  baixa: { lights: 4, pr: 0.75, shadow: 1024, shadowR: 38, grassR: 22, grassDen: 22, msaa: 0, ao: false, bloom: false, treeNear: 55, view: 600, fur: 6 },
};
export const settings = { quality: store.get('aldren2-q') || (isTouch ? 'baixa' : 'media'), grassK: 1, treeK: 1, sens: 1 };
if (!QUAL[settings.quality]) settings.quality = 'media';
export const Q = () => QUAL[settings.quality];

// ---------- renderer / scene ----------
export const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 4000);
camera.rotation.order = 'YXZ';
camera.layers.enable(1); // camada 1: grama, plantas e partículas (fora do reflexo da água)
scene.add(camera);

// ---------- atmospheric fog (global shader chunk override) ----------
// THREE.Fog is used as a carrier: near = density, far = packed sun angles
export const fog = new THREE.Fog(0xa8bccc, 0.0015, 0);
scene.fog = fog;
export function setFogSun(dir) { const az = Math.atan2(dir.z, dir.x); const el = Math.asin(clamp(dir.y, -1, 1)); const a = Math.round(((az + Math.PI * 2) % (Math.PI * 2)) * 100); const e = Math.round((el + 2) * 100); fog.far = a * 1000 + e; }
THREE.ShaderChunk.fog_pars_vertex = `#ifdef USE_FOG
 varying vec3 vFogWorld;
#endif`;
THREE.ShaderChunk.fog_vertex = `#ifdef USE_FOG
 vFogWorld = cameraPosition + transpose(mat3(viewMatrix)) * mvPosition.xyz;
#endif`;
THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
 uniform vec3 fogColor; varying vec3 vFogWorld; uniform float fogNear; uniform float fogFar;
 vec3 applyAtmos(vec3 col){
  vec3 fd = vFogWorld - cameraPosition; float dist = max(length(fd), 0.001); vec3 dir = fd / dist;
  float az = floor(fogFar / 1000.0) / 100.0; float el = mod(fogFar, 1000.0) / 100.0 - 2.0;
  vec3 sunD = vec3(cos(el) * cos(az), sin(el), cos(el) * sin(az));
  float k = 0.0055; float h0 = cameraPosition.y - 4.0; float h1 = vFogWorld.y - 4.0; float dh = h1 - h0;
  float tt = abs(dh) > 0.05 ? (exp(-k * max(h0, -50.0)) - exp(-k * max(h1, -50.0))) / (k * dh) : exp(-k * max(h0, -50.0));
  float amount = 1.0 - exp(-fogNear * dist * clamp(tt, 0.0, 6.0));
  float haze = 1.0 - exp(-dist * 0.00011);
  amount = clamp(max(amount, haze * 0.5), 0.0, 1.0);
  float sunAmt = pow(max(dot(dir, sunD), 0.0), 6.0) * smoothstep(-0.12, 0.08, el);
  vec3 fc = fogColor + vec3(1.0, 0.72, 0.42) * sunAmt * 0.55 * fogColor;
  return mix(col, fc, amount);
 }
#endif`;
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
 gl_FragColor.rgb = applyAtmos(gl_FragColor.rgb);
#endif`;

// ---------- loaders ----------
// ---------- luzes pontuais "virtuais" ----------
// As fontes de luz do mundo (fogueiras, lareiras, postes, lanterna, lumes, o espírito) não entram na cena.
// Um conjunto FIXO de PointLights reais é repartido a cada quadro entre as fontes que mais importam perto
// da câmera. Assim o número de luzes da cena nunca muda (acender a lanterna ou começar um lume não obriga
// o three.js a recompilar todos os shaders, que era o travamento) e cada pixel calcula poucas luzes.
export const vlights = new Set();
export class VLight {
  constructor(color, intensity = 1, distance = 0, decay = 2, prio = 0) {
    this.color = new THREE.Color(color); this.intensity = intensity; this.distance = distance; this.decay = decay; this.prio = prio;
    this.position = new THREE.Vector3(); this.parent = null; this.offset = null; this._w = new THREE.Vector3(); vlights.add(this);
  }
  attach(obj, offset) { this.parent = obj; this.offset = offset ? offset.clone() : new THREE.Vector3(); return this; }
  dispose() { vlights.delete(this); }
  world() { if (this.parent) { this._w.copy(this.offset); return this.parent.localToWorld(this._w); } return this._w.copy(this.position); }
}
export const LightPool = {
  slots: [],
  init(n) { for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); scene.add(l); this.slots.push({ l, src: null }); } },
  update() {
    const cp = camera.position, cand = [];
    for (const v of vlights) {
      if (!(v.intensity > 0.01)) continue; const p = v.world(); const d = p.distanceTo(cp); const range = v.distance || 30;
      if (d > range * 2.2 + 12) continue; const e = Math.max(0, d - range * 0.6); cand.push({ v, s: v.prio * 1000 + v.intensity * range / (e * e + range) });
    }
    cand.sort((a, b) => b.s - a.s); const chosen = new Set(cand.slice(0, this.slots.length).map(c => c.v));
    // mantém cada fonte na mesma luz real de um quadro para o outro (sem piscar)
    for (const s of this.slots) if (s.src && !chosen.has(s.src)) s.src = null;
    const placed = new Set(this.slots.map(s => s.src).filter(Boolean));
    for (const v of chosen) if (!placed.has(v)) { const s = this.slots.find(s => !s.src); if (s) s.src = v; }
    for (const s of this.slots) { const l = s.l, v = s.src; if (!v) { l.intensity = 0; continue; } l.position.copy(v._w); l.color.copy(v.color); l.intensity = v.intensity; l.distance = v.distance; l.decay = v.decay; }
  },
};

export const resolveURL = (u) => (window.__ASSET_URLS && window.__ASSET_URLS[u]) || u;
THREE.DefaultLoadingManager.setURLModifier(resolveURL);
export const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
export const progress = { total: 0, done: 0, onChange: null };
function track(p) { progress.total++; progress.onChange && progress.onChange(); return p.then(v => { progress.done++; progress.onChange && progress.onChange(); return v; }); }
export function trackP(p) { return track(p); }
export function loadGLTF(url) { return track(gltfLoader.loadAsync(url)); }
export function loadTex(url, { srgb = true, repeat = true } = {}) {
  return track(texLoader.loadAsync(url)).then(t => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  });
}

// ---------- shared uniforms ----------
export const U = {
  time: { value: 0 },
  sunDir: { value: new THREE.Vector3(0, 1, 0) },
  sunColor: { value: new THREE.Color(1, 1, 1) },
  wind: { value: new THREE.Vector2(1, 0.4) },
  windStrength: { value: 1 },
  player: { value: new THREE.Vector3() },
  macro: { value: null },
};

// macro variation texture (tileable noise, 512) used by terrain & grass so they agree
export function makeMacroTexture() {
  const S = 256; const data = new Uint8Array(S * S * 4);
  const layers = [[4, 0.5], [8, 0.3], [16, 0.2]]; const r = mulberry32(7);
  const grids = layers.map(([g]) => { const v = new Float32Array(g * g * 3); for (let i = 0; i < v.length; i++) v[i] = r(); return v; });
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const out = [0, 0, 0];
    layers.forEach(([g, amp], li) => {
      const fx = x / S * g, fy = y / S * g; const ix = fx | 0, iy = fy | 0; let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      for (let c = 0; c < 3; c++) {
        const v = grids[li]; const at = (a, b) => v[(((b % g) * g) + (a % g)) * 3 + c];
        out[c] += amp * lerp(lerp(at(ix, iy), at(ix + 1, iy), tx), lerp(at(ix, iy + 1), at(ix + 1, iy + 1), tx), ty);
      }
    });
    const i = (y * S + x) * 4; data[i] = out[0] * 255; data[i + 1] = out[1] * 255; data[i + 2] = out[2] * 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, S, S); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  U.macro.value = t; return t;
}

// simplex 3D glsl (for wind)
export const GLSL_NOISE = `
vec3 _m289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 _m289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 _perm(vec3 x){return _m289(((x*34.)+1.)*x);}
float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
 vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=_m289(i);
 vec3 p=_perm(_perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
 vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
 vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}
`;
