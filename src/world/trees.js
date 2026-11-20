import { THREE, U, Q, settings, rand, rr, clamp, renderer, GLSL_NOISE } from '../core.js';
import { Tree, ezTexturesReady } from '@dgreenheck/ez-tree';

// Species: preset, seed, target height range, weight per biome
const SPECIES = [
  { key: 'pineA', preset: 'Pine Medium', seed: 4211, h: [15, 22], type: 'pine' },
  { key: 'pineB', preset: 'Pine Large', seed: 913, h: [18, 26], type: 'pine' },
  { key: 'pineC', preset: 'Pine Small', seed: 77, h: [8, 13], type: 'pine' },
  { key: 'oakA', preset: 'Oak Medium', seed: 1203, h: [11, 16], type: 'broad' },
  { key: 'oakB', preset: 'Oak Large', seed: 5521, h: [14, 19], type: 'broad' },
  { key: 'ashA', preset: 'Ash Medium', seed: 333, h: [12, 17], type: 'broad' },
  { key: 'aspenA', preset: 'Aspen Medium', seed: 808, h: [13, 19], type: 'broad' },
  { key: 'bushA', preset: 'Bush 1', seed: 12, h: [1.2, 2.2], type: 'bush' },
  { key: 'bushB', preset: 'Bush 2', seed: 45, h: [1.0, 1.8], type: 'bush' },
];

const LEAF_VERT_HEAD = `uniform float uTime; uniform vec2 uWind; uniform float uWindStr; uniform float uTreeH; varying float vLeafH;
${GLSL_NOISE}`;
// sway: whole-tree bending grows with height^2, plus per-leaf flutter on uv.y
const SWAY = (leaf) => `
 vec3 ip = vec3(0.);
 #ifdef USE_INSTANCING
  ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
 #endif
 float hN = clamp(position.y / uTreeH, 0., 1.);
 float ph = ip.x*0.13 + ip.z*0.11;
 float gust = snoise(ip.xz*0.012 - uWind*uTime*0.08)*0.5+0.5;
 vec2 sw = uWind * (0.35 + gust*0.9) * uWindStr * (sin(uTime*0.9 + ph)*0.5 + 0.6);
 transformed.xz += sw * hN*hN * uTreeH * 0.018;
 ${leaf ? `float fl = (uv.y) * 0.06 * uWindStr * (0.5+gust);
 transformed += vec3(sin(uTime*5.3 + position.x*2.1 + ph), cos(uTime*4.1 + position.z*2.3)*0.6, cos(uTime*5.9 + position.y*1.7 + ph)) * fl;
 vLeafH = hN;` : ''}
`;

export class Trees {
  constructor(scene) { this.scene = scene; this.variants = []; this.items = []; this.grid = new Map(); this.nearCenter = new THREE.Vector3(1e9, 0, 1e9); }

  async build() {
    // as texturas das árvores são arquivos à parte (tools/build.mjs): espera chegarem antes de montar e fotografar os impostores
    await Promise.race([ezTexturesReady, new Promise(r => setTimeout(r, 30000))]);
    for (const sp of SPECIES) {
      const t = new Tree(); t.loadPreset(sp.preset); t.options.seed = sp.seed;
      // performance-minded tweaks
      const o = t.options;
      if (sp.type !== 'bush') { for (const k in o.branch.sections) o.branch.sections[k] = Math.max(3, Math.round(o.branch.sections[k] * 0.75)); for (const k in o.branch.segments) o.branch.segments[k] = Math.max(3, Math.round(o.branch.segments[k] * 0.8)); }
      t.generate();
      const bg = t.branchesMesh.geometry, lg = t.leavesMesh.geometry;
      bg.computeBoundingBox(); const bb = bg.boundingBox; const rawH = bb.max.y - bb.min.y;
      const base = (sp.h[0] + sp.h[1]) / 2; const s = base / rawH;
      bg.scale(s, s, s); lg.scale(s, s, s); bg.translate(0, -bb.min.y * s, 0); lg.translate(0, -bb.min.y * s, 0);
      // leaf normals: blend towards a crown-sphere normal for soft volumetric shading
      lg.computeBoundingBox(); const lb = lg.boundingBox; const cc = lb.getCenter(new THREE.Vector3());
      const lp = lg.attributes.position; const ln = new Float32Array(lp.count * 3);
      for (let i = 0; i < lp.count; i++) { const v = new THREE.Vector3(lp.getX(i) - cc.x, (lp.getY(i) - cc.y) * 0.8, lp.getZ(i) - cc.z).normalize(); ln[i * 3] = v.x; ln[i * 3 + 1] = v.y * 0.8 + 0.25; ln[i * 3 + 2] = v.z; }
      lg.setAttribute('normal', new THREE.BufferAttribute(ln, 3));
      bg.computeBoundingSphere(); lg.computeBoundingSphere();
      const pm = t.branchesMesh.material, lm = t.leavesMesh.material;
      const H = base;
      const bark = new THREE.MeshStandardMaterial({ map: pm.map, normalMap: pm.normalMap, aoMap: pm.aoMap, roughnessMap: pm.roughnessMap, color: pm.color, roughness: 1, normalScale: new THREE.Vector2(1.4, 1.4) });
      bark.color.multiplyScalar(sp.type === 'pine' ? 0.8 : 0.9);
      const leafTint = new THREE.Color(lm.color);
      const leaf = new THREE.MeshStandardMaterial({ map: lm.map, color: leafTint, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7, metalness: 0 });
      const uni = { uTime: U.time, uWind: U.wind, uWindStr: U.windStrength, uTreeH: { value: H }, uSunDir: U.sunDir, uSunCol: U.sunColor };
      bark.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, uni); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + LEAF_VERT_HEAD).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWAY(false)); };
      bark.customProgramCacheKey = () => 'bark-' + sp.key;
      leaf.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, uni);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + LEAF_VERT_HEAD).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWAY(true));
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSunDir; uniform vec3 uSunCol; varying float vLeafH;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 vec3 sunV = normalize((viewMatrix*vec4(uSunDir,0.)).xyz);
 float back = pow(max(dot(normalize(-vViewPosition), sunV), 0.0), 4.0);
 totalEmissiveRadiance += diffuseColor.rgb * uSunCol * back * 1.2 * smoothstep(-0.05,0.2,uSunDir.y);
 diffuseColor.rgb *= mix(0.55, 1.05, vLeafH);`);
      };
      leaf.customProgramCacheKey = () => 'leaf-' + sp.key;
      const depthLeaf = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: lm.map, alphaTest: 0.45 });
      depthLeaf.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, uni); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + LEAF_VERT_HEAD).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWAY(true)); };
      depthLeaf.customProgramCacheKey = () => 'leafd-' + sp.key;
      this.variants.push({ sp, bg, lg, bark, leaf, depthLeaf, H, radius: Math.max(lb.max.x - lb.min.x, lb.max.z - lb.min.z) / 2, crownY: cc.y, near: null, imp: null, list: [] });
      t.branchesMesh.geometry = new THREE.BufferGeometry(); // detach
    }
    this.makeImpostors();
  }

  // Render each variant from 8 directions into an atlas (albedo + alpha), lit flat so we can relight it.
  makeImpostors() {
    const VIEWS = 8, CW = 256, CH = 384;
    const iscene = new THREE.Scene(); 
    const prevTM = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
    const prevEnv = iscene.environment;
    for (const v of this.variants) {
      if (v.sp.type === 'bush') continue;
      const rt = new THREE.WebGLRenderTarget(CW * VIEWS, CH, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
      const bm = new THREE.Mesh(v.bg, new THREE.MeshBasicMaterial({ map: v.bark.map, color: v.bark.color })); const lmesh = new THREE.Mesh(v.lg, new THREE.MeshBasicMaterial({ map: v.leaf.map, color: v.leaf.color, alphaTest: 0.45, side: THREE.DoubleSide }));
      const g = new THREE.Group(); g.add(bm, lmesh); iscene.add(g);
      const w = Math.max(v.radius * 2.2, v.H * 0.5); const h = v.H * 1.05; v.impW = w; v.impH = h;
      const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h, 0, -100, 100);
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
      for (let i = 0; i < VIEWS; i++) {
        const a = i / VIEWS * Math.PI * 2; cam.position.set(Math.sin(a) * 50, 0, Math.cos(a) * 50); cam.lookAt(0, 0, 0); cam.position.y = 0; cam.updateMatrixWorld();
        rt.viewport.set(i * CW, 0, CW, CH); rt.scissor.set(i * CW, 0, CW, CH); rt.scissorTest = true; renderer.setRenderTarget(rt);
        renderer.render(iscene, cam);
      }
      rt.viewport.set(0, 0, CW * VIEWS, CH); rt.scissorTest = false; renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
      iscene.remove(g); bm.material.dispose(); lmesh.material.dispose();
      v.impTex = rt.texture; v.impRT = rt;
    }
    renderer.toneMapping = prevTM;
  }

  scatter(opts) {
    const { avoid, forestDensity, groundH, normalY, maxR = 720 } = opts;
    const pick = (keys) => this.variants.filter(v => keys.includes(v.sp.key));
    const conifers = pick(['pineA', 'pineB', 'pineC']), broad = pick(['oakA', 'oakB', 'ashA', 'aspenA']), bushes = pick(['bushA', 'bushB']);
    const add = (v, x, z, s) => { const y = groundH(x, z); const it = { v, x, y, z, s, rot: rand() * Math.PI * 2 }; this.items.push(it); v.list.push(it); const k = Math.floor(x / 20) + ',' + Math.floor(z / 20); if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(it); opts.onTree && opts.onTree(it); };
    const tryN = (n, f) => { let placed = 0, tries = 0; while (placed < n && tries < n * 15) { tries++; const x = rr(-maxR, maxR), z = rr(-maxR, maxR); if (Math.hypot(x, z) > maxR) continue; if (f(x, z)) placed++; } };
    tryN(2400, (x, z) => { const y = groundH(x, z); if (y < 1.8 || y > 105 || normalY(x, z) < 0.8) return false; const d = forestDensity(x, z); if (d < 0.02 && rand() > 0.06) return false; if (avoid(x, z, 2)) return false; const v = conifers[(rand() * conifers.length) | 0]; add(v, x, z, rr(0.75, 1.2) * (y > 70 ? 0.8 : 1)); return true; });
    tryN(700, (x, z) => { const y = groundH(x, z); if (y < 1.5 || y > 50 || normalY(x, z) < 0.85) return false; const d = forestDensity(x, z); if (d > 0.3 || rand() > 0.65) return false; if (avoid(x, z, 3)) return false; const v = broad[(rand() * broad.length) | 0]; add(v, x, z, rr(0.8, 1.2)); return true; });
    tryN(1800, (x, z) => { const y = groundH(x, z); if (y < 1.0 || y > 60 || normalY(x, z) < 0.8) return false; if (avoid(x, z, 0)) return false; const d = forestDensity(x, z); if (d < -0.15 && rand() > 0.35) return false; add(bushes[(rand() * bushes.length) | 0], x, z, rr(0.7, 1.4)); return true; });
    for (const p of (opts.extra || [])) add(this.variants.find(v => v.sp.key === p[2]), p[0], p[1], p[3] || 1);
    this.buildMeshes();
  }

  buildMeshes() {
    for (const v of this.variants) {
      const n = v.list.length; if (!n) continue;
      const b = new THREE.InstancedMesh(v.bg, v.bark, n); const l = new THREE.InstancedMesh(v.lg, v.leaf, n);
      b.castShadow = l.castShadow = true; b.receiveShadow = l.receiveShadow = true; l.customDepthMaterial = v.depthLeaf;
      b.frustumCulled = l.frustumCulled = false; b.count = l.count = 0;
      // faixa do meio: geometria completa, mas sem projetar sombra (bem mais leve)
      const mb = new THREE.InstancedMesh(v.bg, v.bark, n), ml = new THREE.InstancedMesh(v.lg, v.leaf, n); mb.castShadow = ml.castShadow = false; mb.receiveShadow = ml.receiveShadow = true; mb.frustumCulled = ml.frustumCulled = false; mb.count = ml.count = 0;
      this.scene.add(b, l, mb, ml); v.near = { b, l }; v.mid = { b: mb, l: ml };
      if (v.impTex) {
        const g = new THREE.InstancedBufferGeometry(); const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
        g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
        const ip = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); ip.setUsage(THREE.DynamicDrawUsage); g.setAttribute('iPos', ip);
        const mat = new THREE.ShaderMaterial({
          transparent: false, fog: true,
          uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tImp: { value: null }, size: { value: new THREE.Vector2(v.impW, v.impH) }, sunDir: { value: U.sunDir.value }, sunCol: { value: U.sunColor.value }, amb: { value: new THREE.Color() }, near: { value: 100 } }]),
          vertexShader: `attribute vec4 iPos; uniform vec2 size; uniform float near; varying vec2 vUv; varying vec3 vN; varying float vFade;
            #include <fog_pars_vertex>
            void main(){ float sc = iPos.w; vec3 base = iPos.xyz; vec3 toC = cameraPosition - base; vec2 d2 = normalize(toC.xz + 1e-4);
              vec3 rgt = vec3(d2.y, 0., -d2.x);
              vec3 wp = base + rgt*(position.x*size.x*sc) + vec3(0.,1.,0.)*(position.y*size.y*sc);
              float ang = atan(d2.x, d2.y); float f = fract(ang/6.28318 + 1.0); float idx = floor(f*8.0 + 0.5); idx = mod(idx, 8.0);
              vUv = vec2((uv.x + idx)/8.0, uv.y);
              vN = normalize(rgt*position.x*1.4 + vec3(0.,1.,0.)*(position.y-0.35) + vec3(d2.x,0.,d2.y)*0.6);
              float dist = length(toC.xz); vFade = smoothstep(near*0.92, near*1.08, dist);
              vec4 mvPosition = viewMatrix*vec4(wp,1.); gl_Position = projectionMatrix*mvPosition;
              #include <fog_vertex>
            }`,
          fragmentShader: `uniform sampler2D tImp; uniform vec3 sunDir, sunCol, amb; varying vec2 vUv; varying vec3 vN; varying float vFade;
            #include <fog_pars_fragment>
            float bayer(vec2 p){ return fract(sin(dot(floor(p), vec2(12.9898,78.233)))*43758.5453); }
            void main(){ vec4 c = texture2D(tImp, vUv); if(c.a < 0.5) discard; if(vFade < bayer(gl_FragCoord.xy)) discard;
              vec3 alb = c.rgb; float l = max(dot(normalize(vN), sunDir), 0.)*0.75 + 0.15;
              vec3 col = alb*(amb + sunCol*l*2.4*smoothstep(-0.05,0.2,sunDir.y));
              gl_FragColor = vec4(col, 1.);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
              #include <fog_fragment>
            }`,
        });
        mat.uniforms.tImp.value = v.impTex; mat.uniforms.sunDir = U.sunDir; mat.uniforms.sunCol = U.sunColor;
        const im = new THREE.Mesh(g, mat); im.frustumCulled = false; this.scene.add(im); v.imp = { mesh: im, attr: ip, mat };
      }
    }
  }

  update(cam, ambientColor, fwd) {
    const near = Q().treeNear * (settings.treeK || 1); const shadowR = Math.min(Q().shadowR * 0.75, 36);
    for (const v of this.variants) if (v.imp) { v.imp.mat.uniforms.near.value = near; v.imp.mat.uniforms.amb.value.copy(ambientColor); }
    // só refaz as listas quando a câmera anda ou gira bastante
    const f = fwd ? new THREE.Vector2(fwd.x, fwd.z).normalize() : new THREE.Vector2(0, -1);
    if (cam.distanceTo(this.nearCenter) < 5 && this.lastFwd && this.lastFwd.dot(f) > 0.96) return;
    this.nearCenter.copy(cam); this.lastFwd = f.clone();
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), yAx = new THREE.Vector3(0, 1, 0);
    const bushR = near * 0.7;
    for (const v of this.variants) {
      if (!v.near) continue; let nn = 0, nm = 0, ni = 0; const isBush = v.sp.type === 'bush'; const rad = isBush ? 2.5 : 7;
      for (const it of v.list) {
        const dx = it.x - cam.x, dz = it.z - cam.z, d = Math.hypot(dx, dz);
        if (d < (isBush ? bushR : near * 1.08)) {
          // fora da vista (atrás da câmera) não desenha; perto continua, por causa das sombras
          const inView = d < rad * 2 || (dx * f.x + dz * f.y) / d > -0.25 - rad / d;
          const cast = d < shadowR + rad;
          if (!inView && !cast) continue;
          qt.setFromAxisAngle(yAx, it.rot); sv.set(it.s, it.s, it.s); pv.set(it.x, it.y - 0.15, it.z); m4.compose(pv, qt, sv);
          if (cast) { v.near.b.setMatrixAt(nn, m4); v.near.l.setMatrixAt(nn, m4); nn++; } else { v.mid.b.setMatrixAt(nm, m4); v.mid.l.setMatrixAt(nm, m4); nm++; }
        }
        if (v.imp && d > near * 0.92 && d < 1400 && (dx * f.x + dz * f.y) / d > -0.3) { const a = v.imp.attr.array; a[ni * 4] = it.x; a[ni * 4 + 1] = it.y - 0.2; a[ni * 4 + 2] = it.z; a[ni * 4 + 3] = it.s; ni++; }
      }
      v.near.b.count = v.near.l.count = nn; v.near.b.instanceMatrix.needsUpdate = v.near.l.instanceMatrix.needsUpdate = true;
      v.mid.b.count = v.mid.l.count = nm; v.mid.b.instanceMatrix.needsUpdate = v.mid.l.instanceMatrix.needsUpdate = true;
      if (v.imp) { v.imp.mesh.geometry.instanceCount = ni; v.imp.attr.needsUpdate = true; v.imp.attr.clearUpdateRanges && v.imp.attr.clearUpdateRanges(); }
    }
  }
  // fade near trees out beyond `near` with dithering is handled by count; impostors fade in.
  collidersNear(x, z) { const out = []; const ci = Math.floor(x / 20), cj = Math.floor(z / 20); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const arr = this.grid.get((ci + a) + ',' + (cj + b)); if (arr) out.push(...arr); } return out; }
}
