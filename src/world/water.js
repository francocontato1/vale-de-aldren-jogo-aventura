// Lago e lagoas: reflexo planar (céu, montanhas, estrelas, lua), fresnel, cintilação do sol nas ondas
// e transparência rasa na margem.
import { THREE, U, loadTex, camera, renderer, Q } from '../core.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { WSIZE, groundH, WATER, coastInfo } from './terrain.js';

export const waterSky = { color: new THREE.Color(0.4, 0.55, 0.7), night: { value: 0 } };
const WaterShader = {
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { color: { value: new THREE.Color() }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() }, tN: { value: null }, time: { value: 0 }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, skyCol: { value: new THREE.Color() }, night: { value: 0 }, reflOn: { value: 1 } }]),
  vertexShader: `uniform mat4 textureMatrix; attribute float depth; varying vec4 vRefl; varying float vDepth; varying vec3 vWP;
    #include <fog_pars_vertex>
    void main(){ vRefl = textureMatrix * vec4(position, 1.0); vDepth = depth; vWP = (modelMatrix*vec4(position,1.)).xyz; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader: `uniform sampler2D tDiffuse, tN; uniform float time, night, reflOn; uniform vec3 sunDir, sunCol, skyCol; varying vec4 vRefl; varying float vDepth; varying vec3 vWP;
    #include <fog_pars_fragment>
    void main(){
      vec2 p = vWP.xz; float camD = length(cameraPosition - vWP);
      vec3 n1 = texture2D(tN, p*0.035 + vec2(time*0.010, time*0.006)).xyz*2.-1.;
      vec3 n2 = texture2D(tN, p*0.09 - vec2(time*0.014, -time*0.009)).xyz*2.-1.;
      vec3 n3 = texture2D(tN, p*0.27 + vec2(-time*0.02, time*0.024)).xyz*2.-1.;
      float calm = mix(1.0, 0.35, smoothstep(30., 400., camD));
      vec2 nxy = (n1.xy*0.5 + n2.xy*0.35 + n3.xy*0.25*calm) * 0.32;
      vec3 N = normalize(vec3(nxy.x, 1.0, nxy.y));
      vec3 V = normalize(cameraPosition - vWP);
      float fres = 0.02 + 0.98*pow(1.0 - max(dot(V, N), 0.0), 5.0);
      vec4 ru = vRefl; ru.xy += nxy * 6.0 * ru.w * 0.06;
      vec3 refl = texture2DProj(tDiffuse, ru).rgb;
      refl = mix(skyCol, refl, reflOn);
      float dz = clamp(vDepth, 0., 30.);
      vec3 deep = mix(vec3(0.11,0.15,0.11), vec3(0.012,0.04,0.045), smoothstep(0.0, 4.0, dz));
      vec3 body = deep * (skyCol*0.9 + sunCol*max(sunDir.y,0.0)*0.35);
      vec3 col = mix(body, refl, clamp(fres*1.15, 0.0, 1.0));
      // cintilação do sol (e da lua, mais fraca)
      vec3 L = sunDir.y > -0.05 ? sunDir : normalize(vec3(-sunDir.x, max(-sunDir.y, 0.3), -sunDir.z));
      vec3 H = normalize(L + V); float nh = max(dot(N, H), 0.0);
      float glit = pow(nh, 1600.0) * 60.0 + pow(nh, 220.0) * 1.4 + pow(nh, 30.0) * 0.08;
      vec3 lc = sunDir.y > -0.05 ? sunCol * smoothstep(-0.05, 0.08, sunDir.y) : vec3(0.6,0.7,0.95) * 0.35 * night;
      col += lc * glit * (0.6 + 0.4*fres);
      // espuma leve na margem
      float foam = (1.0 - smoothstep(0.0, 0.35, vDepth)) * (0.5 + 0.5*sin(time*1.1 + vWP.x*0.9 + vWP.z*0.7));
      col += foam * 0.05 * (skyCol + sunCol*0.3);
      float a = mix(0.55, 0.98, smoothstep(0.0, 2.0, dz)) * smoothstep(-0.04, 0.22, vDepth);
      gl_FragColor = vec4(col, max(a, fres*0.9*smoothstep(-0.04, 0.22, vDepth)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
};

let mesh = null; let enabled = true;
const LAKES = [[-170, 120, 140], [56, 144, 60], [-226, -180, 90], [214, -175, 60]];
export async function buildWater(scene) {
  const nrm = await loadTex('a/tex/water_n.jpg', { srgb: false });
  // plano no XY local (o Reflector espera normal +Z); só triângulos perto de água
  const g = new THREE.PlaneGeometry(WSIZE, WSIZE, 256, 256);
  const p = g.attributes.position; const dep = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) dep[i] = WATER - groundH(p.getX(i), -p.getY(i));
  g.setAttribute('depth', new THREE.BufferAttribute(dep, 1));
  const idx = g.index.array; const keep = [];
  // o mar da enseada tem a sua própria água (ocean.js); aqui ficam só lagos e lagoas
  const isSea = (i) => { const c = coastInfo(p.getX(i), -p.getY(i)); return c.bay > 0.15 && c.s < 60; };
  for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; if (Math.max(dep[a], dep[b], dep[c]) > -1.5 && !(isSea(a) && isSea(b) && isSea(c))) keep.push(a, b, c); }
  g.setIndex(keep); g.computeBoundingSphere();
  const q = Q(); const res = q.shadow >= 2048 ? 0.5 : 0.33;
  mesh = new Reflector(g, { shader: WaterShader, textureWidth: Math.round(innerWidth * res), textureHeight: Math.round(innerHeight * res), clipBias: 0.02, multisample: 0 });
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = WATER + 0.02; mesh.renderOrder = 3; mesh.name = 'water';
  const m = mesh.material; m.transparent = true; m.fog = true; m.depthWrite = false; m.uniforms.tN.value = nrm; m.uniforms.time = U.time; m.uniforms.sunDir = U.sunDir; m.uniforms.sunCol = U.sunColor; m.uniforms.night = waterSky.night; m.uniforms.skyCol.value = waterSky.color;
  // só calcula o reflexo quando há água por perto da câmera (economiza muito)
  const orig = mesh.onBeforeRender;
  const fwd = new THREE.Vector3();
  mesh.onBeforeRender = function (r, s, c) { if (c !== camera) return; c.getWorldDirection(fwd);
    // reflexo só com água perto e à frente (antes ligava na vila inteira e desenhava a cena duas vezes)
    const near = LAKES.some(([x, z, rad]) => { const dx = x - c.position.x, dz = z - c.position.z, d = Math.hypot(dx, dz); if (d < rad + 25) return true; if (d > rad + 140) return false; return (dx * fwd.x + dz * fwd.z) / d > Math.cos(Math.min(1.4, 0.75 + rad / d)); }); m.uniforms.reflOn.value = near && enabled ? 1 : 0; if (near && enabled) orig.call(this, r, s, c); };
  scene.add(mesh);
  addEventListener('resize', () => { const rt = mesh.getRenderTarget(); rt.setSize(Math.round(innerWidth * res), Math.round(innerHeight * res)); });
  return mesh;
}
export function updateWater() { }
export function setWaterQuality(level) { enabled = level < 3; }
