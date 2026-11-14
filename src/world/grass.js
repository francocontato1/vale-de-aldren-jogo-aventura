import { THREE, U, Q, settings, mulberry32, clamp, smooth, GLSL_NOISE, fbm } from '../core.js';
import { groundH, normalY, splatAt, WATER, forestDensity } from './terrain.js';

const TILE = 12;

function bladeGeometry(segs) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i < segs; i++) { const t = i / segs; pos.push(-0.5, t, 0, 0.5, t, 0); uv.push(0, t, 1, t); }
  pos.push(0, 1, 0); uv.push(0.5, 1);
  for (let i = 0; i < segs - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const a = (segs - 1) * 2; idx.push(a, a + 1, segs * 2);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

const VERT_HEAD = `
attribute vec4 iPos; attribute vec4 iShape;
uniform float uTime; uniform vec2 uWind; uniform float uWindStr; uniform vec3 uPlayer; uniform sampler2D tMacro;
varying float vT; varying float vSeed; varying vec3 vMacro; varying vec3 vGW;
${GLSL_NOISE}
`;
const VERT_BODY = `
 float t = position.y; float side = position.x;
 float H = iShape.x, Wd = iShape.y;
 float c = cos(iPos.w), s = sin(iPos.w);
 vec3 rgt = vec3(c, 0., -s); vec3 fwd = vec3(s, 0., c);
 vec2 wp = iPos.xz;
 float gust = snoise(wp*0.035 - uWind*uTime*0.22)*0.5+0.5;
 gust = gust*gust;
 float flutter = sin(uTime*2.6 + iPos.x*0.9 + iPos.z*0.7)*0.12 + sin(uTime*4.3 + iPos.z*1.7)*0.05;
 vec2 dp = wp - uPlayer.xz; float dd = length(dp);
 float push = (1.0 - smoothstep(0.15, 1.1, dd)) * step(abs(iPos.y - uPlayer.y), 2.5);
 vec2 wdir = normalize(uWind);
 vec2 bdir2 = fwd.xz*iShape.z + wdir*(gust*1.1 + flutter)*uWindStr + (dp/(dd+1e-3))*push*2.5;
 float bl = length(bdir2) + 1e-4; vec3 bdir = vec3(bdir2.x, 0., bdir2.y)/bl;
 float bend = clamp(bl*0.55, 0.0, 1.35);
 float a = bend * t;
 vec3 up = vec3(0.,1.,0.);
 vec3 spine = (up*sin(1.5708 - a*0.9) + bdir*cos(1.5708 - a*0.9));
 vec3 p = iPos.xyz + rgt*side*Wd*(1.0 - t*0.92) + (up*(t - 0.45*bend*t*t) + bdir*(0.55*bend*t*t))*H;
 vec3 tang = normalize(up + bdir*bend*t*1.1);
 vec3 nrm = normalize(cross(rgt, tang));
 nrm = normalize(mix(nrm, up, 0.62) + rgt*side*0.55);
 vT = t; vSeed = iShape.w; vGW = p;
 vMacro = textureLod(tMacro, iPos.xz*0.0021, 0.).rgb;
`;

export class Grass {
  constructor(scene, opts) {
    this.scene = scene; this.opts = opts; this.tiles = new Map(); this.queue = [];
    this.geo = bladeGeometry(4);
    this.uniforms = { uTime: U.time, uWind: U.wind, uWindStr: U.windStrength, uPlayer: U.player, tMacro: U.macro, uSunDir: U.sunDir, uSunCol: U.sunColor, uSunI: { value: 1 } };
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, side: THREE.DoubleSide });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.uniforms);
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_HEAD)
        .replace('#include <beginnormal_vertex>', VERT_BODY + '\n vec3 objectNormal = nrm;')
        .replace('#include <begin_vertex>', 'vec3 transformed = p;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunI; varying float vT; varying float vSeed; varying vec3 vMacro; varying vec3 vGW;`)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
 vec3 base = vec3(0.05,0.085,0.025);
 vec3 tip = mix(vec3(0.17,0.26,0.065), vec3(0.27,0.30,0.10), vSeed);
 tip *= mix(vec3(1.04,0.98,0.78), vec3(0.82,0.95,0.86), vMacro.r);
 tip = mix(tip, vec3(0.40,0.36,0.17), smoothstep(0.55,0.85,vMacro.b)*0.55 + step(0.93, vSeed)*0.35);
 vec3 gcol = mix(base, tip, smoothstep(0.0, 0.95, vT));
 gcol *= mix(0.55, 1.0, smoothstep(0.0, 0.5, vT));
 vec4 diffuseColor = vec4(gcol, 1.0);`)
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 vec3 sunV = normalize((viewMatrix*vec4(uSunDir,0.)).xyz);
 float back = pow(max(dot(normalize(-vViewPosition), sunV), 0.0), 3.0);
 totalEmissiveRadiance += gcol * uSunCol * back * vT * 0.7 * uSunI;`);
    };
    mat.customProgramCacheKey = () => 'grass1';
    this.mat = mat;
    // depth material so blades can receive/cast correct shapes in shadow pass (cast disabled by default)
  }
  makeTile(tx, tz) {
    const q = Q(); const den = q.grassDen * (settings.grassK || 1); const r = mulberry32((tx * 73856093) ^ (tz * 19349663));
    const n = Math.round(TILE * TILE * den); const pos = new Float32Array(n * 4), shp = new Float32Array(n * 4); let c = 0;
    const x0 = tx * TILE, z0 = tz * TILE;
    let cx = 0, cz = 0, cLean = 0, cRot = 0, left = 0, cH = 1;
    for (let i = 0; i < n; i++) {
      if (left <= 0) { cx = x0 + r() * TILE; cz = z0 + r() * TILE; left = 6 + (r() * 14) | 0; cLean = r() * Math.PI * 2; cH = 0.7 + r() * 0.6; }
      left--; const ca = r() * Math.PI * 2, cr = Math.sqrt(r()) * 0.22;
      const x = cx + Math.cos(ca) * cr, z = cz + Math.sin(ca) * cr;
      const y = groundH(x, z); if (y < WATER + 0.35) continue;
      if (normalY(x, z) < 0.8) continue;
      const sp = splatAt(x, z); const dirt = sp[0], rock = sp[1], snow = sp[2], shore = sp[3];
      if (rock > 0.35 + r() * 0.3 || snow > 0.25 || shore > 0.45 + r() * 0.3) continue;
      if (dirt > 0.25 + r() * 0.5) continue;
      if (this.opts.exclude && this.opts.exclude(x, z)) continue;
      const meadow = 0.5 + 0.5 * fbm(x * 0.02 + 3, z * 0.02 - 7, 2);
      const forest = clamp(forestDensity(x, z) * 2, 0, 1);
      let H = (0.2 + r() * 0.32) * (0.55 + 0.9 * meadow) * (1 - dirt * 0.8) * (1 - forest * 0.35);
      H *= cH; if (r() < 0.04) H *= 1.6;
      const dv = Math.hypot(x, z); if (dv < 70) { H *= 0.45 + 0.55 * smooth(35, 70, dv); if (dv < 40 && r() < 0.45) continue; }
      pos[c * 4] = x; pos[c * 4 + 1] = y - 0.02; pos[c * 4 + 2] = z; pos[c * 4 + 3] = cLean + (r() - 0.5) * 1.6;
      shp[c * 4] = H; shp[c * 4 + 1] = 0.028 + r() * 0.022; shp[c * 4 + 2] = 0.12 + r() * 0.35; shp[c * 4 + 3] = r();
      c++;
    }
    const g = new THREE.InstancedBufferGeometry();
    g.index = this.geo.index; g.attributes.position = this.geo.attributes.position; g.attributes.normal = this.geo.attributes.normal; g.attributes.uv = this.geo.attributes.uv;
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos.subarray(0, c * 4), 4));
    g.setAttribute('iShape', new THREE.InstancedBufferAttribute(shp.subarray(0, c * 4), 4));
    g.instanceCount = c; g.userData.max = c;
    const cy = groundH(x0 + TILE / 2, z0 + TILE / 2);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(x0 + TILE / 2, cy, z0 + TILE / 2), TILE * 0.75 + 3);
    g.boundingBox = new THREE.Box3(new THREE.Vector3(x0, cy - 20, z0), new THREE.Vector3(x0 + TILE, cy + 20, z0 + TILE));
    const m = new THREE.Mesh(g, this.mat); m.frustumCulled = true; m.receiveShadow = true; m.castShadow = false;
    m.userData.cx = x0 + TILE / 2; m.userData.cz = z0 + TILE / 2;
    this.scene.add(m); return m;
  }
  clear() { for (const m of this.tiles.values()) { this.scene.remove(m); m.geometry.dispose(); } this.tiles.clear(); }
  update(cx, cz, budget = 3) {
    const R = Q().grassR * (settings.grassK || 1); const r = Math.ceil(R / TILE) + 1;
    const ti = Math.floor(cx / TILE), tj = Math.floor(cz / TILE);
    const want = [];
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const x = (ti + i + 0.5) * TILE, z = (tj + j + 0.5) * TILE; const d = Math.hypot(x - cx, z - cz);
      if (d < R + TILE * 0.7) want.push([ti + i, tj + j, d]);
    }
    want.sort((a, b) => a[2] - b[2]);
    const keep = new Set();
    for (const [i, j, d] of want) {
      const k = i + ',' + j; keep.add(k); let m = this.tiles.get(k);
      if (!m) { if (budget-- <= 0) continue; m = this.makeTile(i, j); this.tiles.set(k, m); }
      const f = 1 - smooth(8, R + TILE * 0.5, d);
      m.geometry.instanceCount = Math.floor(m.geometry.userData.max * (0.06 + 0.94 * f * f));
    }
    for (const [k, m] of this.tiles) if (!keep.has(k)) { this.scene.remove(m); m.geometry.dispose(); this.tiles.delete(k); }
    this.uniforms.uSunI.value = 1;
  }
}
