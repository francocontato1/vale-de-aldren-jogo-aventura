// Céu: dispersão atmosférica (dia), nuvens cúmulos, e um céu noturno de verdade:
// ~5 mil estrelas reais (catálogo Hipparcos via d3-celestial) com cor por temperatura, Via Láctea,
// lua com fases e estrelas cadentes. O céu gira como visto de 23° de latitude sul.
import { THREE, clamp, smooth, U, renderer, setFogSun, fog, Q, resolveURL, rand, lerp } from '../core.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { waterSky } from './water.js';

const LAT = THREE.MathUtils.degToRad(-23);
// base equatorial no mundo (y para cima, norte = -z, leste = +x)
const P = new THREE.Vector3(0, Math.sin(LAT), -Math.cos(LAT)), Qm = new THREE.Vector3(0, Math.cos(LAT), Math.sin(LAT)), E = new THREE.Vector3(1, 0, 0);
const SKY_GLSL = `
uniform vec3 uP, uQ, uE; uniform float uLST;
vec3 eqToWorld(float ra, float dec){ float H = uLST - ra; return cos(dec)*cos(H)*uQ - cos(dec)*sin(H)*uE + sin(dec)*uP; }
vec2 worldToEq(vec3 d){ float dec = asin(clamp(dot(d,uP),-1.,1.)); float H = atan(-dot(d,uE), dot(d,uQ)); return vec2(uLST - H, dec); }
`;

const CLOUD_FRAG = `
uniform float time; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; uniform vec3 skyTint; uniform float cover;
varying vec3 vDir;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float s=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<6;i++){s+=a*vn(p);p=m*p+vec2(1.7,9.2);a*=.5;}return s;}
float dens(vec2 p){ vec2 w = p + vec2(time*0.005, time*0.0018); float big = fb(w*0.32); float det = fb(w*1.9 - vec2(time*0.01,0.)); float c = big*0.85 + det*0.3; return smoothstep(0.62 - cover, 0.92 - cover, c); }
void main(){
 vec3 d = normalize(vDir); if(d.y < 0.0) discard;
 vec2 uv = d.xz/(d.y+0.12)*0.8;
 float c = dens(uv); if(c < 0.003) discard;
 vec2 sd = normalize(sunDir.xz + 1e-4) * 0.05; float occ = 0.0;
 for(int i=1;i<6;i++){ occ += dens(uv + sd*float(i)); }
 float lit = exp(-occ*0.75);
 float sunUp = smoothstep(-0.14, 0.12, sunDir.y);
 vec3 amb = skyTint*1.05 + vec3(0.05,0.055,0.07);
 vec3 litCol = mix(vec3(0.03,0.035,0.05), sunCol*1.25, sunUp);
 float base = 1.0 - c; // fundo das nuvens mais escuro
 vec3 col = amb*(0.62+0.38*base) + litCol*lit*(0.55+0.45*base);
 float sil = pow(max(dot(d, sunDir),0.), 10.)*sunUp; col += sunCol*sil*(1.-c)*2.2;
 col = mix(col, vec3(0.018,0.02,0.03) + skyTint*0.4, night*0.95);
 float hz = smoothstep(0.0, 0.16, d.y);
 gl_FragColor = vec4(col, c*hz*0.96*(1.0 - night*0.45));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export class SkySystem {
  constructor(scene) {
    this.scene = scene; this.meteors = 0.2; this.LST = 0;
    this.sky = new Sky(); this.sky.scale.setScalar(3000); this.sky.material.depthWrite = false; this.sky.renderOrder = -3;
    const su = this.sky.material.uniforms; su.turbidity.value = 1.4; su.rayleigh.value = 2.4; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.86;
    const patchSky = (m, k) => { m.uniforms.skyScale = { value: 1 }; m.uniforms.warm = { value: 0 }; m.fragmentShader = m.fragmentShader.replace('uniform vec3 up;', 'uniform vec3 up; uniform float skyScale; uniform float warm;').replace('gl_FragColor = vec4( retColor, 1.0 );', `vec3 rc = retColor * ${k} * skyScale; float hz = 1.0 - smoothstep(0.0, 0.35, direction.y); rc = mix(rc, rc*vec3(1.08,0.98,0.86), hz*0.5); rc += vec3(1.0,0.55,0.3)*warm*hz*hz*0.12*skyScale; gl_FragColor = vec4( rc, 1.0 );`); m.needsUpdate = true; };
    patchSky(this.sky.material, '0.24'); this._patchSky = patchSky;
    scene.add(this.sky);
    this.skyU = { uP: { value: P }, uQ: { value: Qm }, uE: { value: E }, uLST: { value: 0 } };
    // ---- cúpula noturna: Via Láctea, brilho do ar, lua, estrelas cadentes ----
    const mwTex = new THREE.TextureLoader().load(resolveURL('a/sky/milkyway.webp')); mwTex.colorSpace = THREE.NoColorSpace; mwTex.wrapS = THREE.RepeatWrapping;
    this.met = Array.from({ length: 6 }, () => ({ a: new THREE.Vector4(0, 1, 0, -1), b: new THREE.Vector4(0, 0, 1, 0), life: 0, t: 1 }));
    this.nightU = Object.assign({ night: { value: 0 }, sunDir: U.sunDir, time: U.time, tMW: { value: mwTex }, moonDir: { value: new THREE.Vector3() }, metA: { value: this.met.map(m => m.a) }, metB: { value: this.met.map(m => m.b) } }, this.skyU);
    this.night = new THREE.Mesh(new THREE.SphereGeometry(2800, 64, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, fog: false, uniforms: this.nightU,
      vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: SKY_GLSL + `uniform float night,time; uniform vec3 sunDir, moonDir; uniform sampler2D tMW; uniform vec4 metA[6]; uniform vec4 metB[6]; varying vec3 vDir;
      float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float vn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm3(vec3 p){ float s=0., a=0.5; for(int i=0;i<5;i++){ s+=a*vn3(p); p*=2.07; a*=0.5; } return s; }
      void main(){ vec3 d=normalize(vDir); if(d.y<-0.05) discard; vec3 col=vec3(0.);
        // Via Láctea (mapa em RA/Dec) com faixas de poeira e grãos de estrelas
        vec2 eq = worldToEq(d); vec2 uv = vec2(fract((eq.x*57.2958+180.)/360.), 0.5 - eq.y/3.14159);
        float mw = texture2D(tMW, uv).r; vec3 q = vec3(eq.x*3.0, eq.y*3.0, 0.); vec3 dq = d*7.0;
        float dustN = fbm3(d*26.0 + 3.1)*0.65 + fbm3(d*70.0)*0.35; float dust = smoothstep(0.5, 0.78, dustN) * smoothstep(0.12, 0.45, mw);
        float grain = fbm3(d*140.0)*0.6 + fbm3(d*380.0)*0.4;
        vec3 mwc = mix(vec3(0.55,0.62,0.85), vec3(1.0,0.86,0.66), smoothstep(0.25,0.75,mw));
        col += mwc * pow(mw, 1.6) * (0.3 + 1.0*grain) * (1.0 - dust*0.6) * 0.26;
        // estrelinhas de fundo (não resolvidas), concentradas na Via Láctea
        vec3 sp = d*560.; vec3 c = floor(sp); float hh = h3(c); if(hh > 0.955 - mw*0.06){ vec3 o = vec3(h3(c+1.3),h3(c+2.1),h3(c+3.7))-0.5; float r = length(fract(sp)-0.5-o*0.5); col += vec3(0.8,0.85,1.0) * smoothstep(0.32,0.0,r) * (0.12 + 0.3*h3(c+9.)); }
        // brilho do ar perto do horizonte
        float hz = exp(-max(d.y,0.)*9.0); col += vec3(0.05,0.075,0.06)*hz*0.55 + vec3(0.03,0.03,0.06)*exp(-max(d.y,0.)*3.)*0.4;
        // lua com fase (iluminada pelo sol)
        float ms = dot(d, moonDir); if (ms > 0.9985) { vec3 mx = normalize(cross(moonDir, vec3(0,1,0))); vec3 my = cross(mx, moonDir); vec2 mp = vec2(dot(d,mx), dot(d,my)) / 0.0172; float r2 = dot(mp,mp); if (r2 < 1.0) { vec3 nrm = normalize(mx*mp.x + my*mp.y + moonDir*sqrt(1.0-r2)); float lit = smoothstep(-0.08, 0.12, dot(nrm, sunDir)); float maria = 0.72 + 0.28*smoothstep(0.45,0.6,fbm3(nrm*3.0+5.)) ; float crat = 0.9 + 0.1*vn3(nrm*40.); col = mix(col, vec3(0.98,0.96,0.9)*maria*crat*(0.05 + 2.6*lit), smoothstep(1.0, 0.92, r2)); } }
        col += vec3(0.25,0.28,0.36)*pow(max(ms,0.),900.)*0.5 + vec3(0.05,0.06,0.09)*pow(max(ms,0.),16.)*0.7;
        // estrelas cadentes
        for (int i=0;i<6;i++){ vec4 a = metA[i]; vec4 b = metB[i]; if (a.w < 0.0) continue; float len = b.w; vec3 dirm = b.xyz; float t = dot(d - a.xyz, dirm); float tc = clamp(t, 0.0, len*a.w); vec3 cp = a.xyz + dirm*tc; float dist = length(d - cp); float tail = smoothstep(0.0, len*a.w, tc); float k = exp(-dist*dist/(0.000012)) * tail * smoothstep(1.0, 0.75, a.w); col += vec3(1.0,0.95,0.85)*k*2.5; }
        gl_FragColor=vec4(col*night*smoothstep(-0.05,0.1,d.y),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }));
    this.night.renderOrder = -2; scene.add(this.night);
    this.buildStars(scene);
    this.cloudU = { time: U.time, sunDir: U.sunDir, sunCol: { value: new THREE.Color() }, night: { value: 0 }, skyTint: { value: new THREE.Color() }, cover: { value: 0 } };
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(2600, 64, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, uniforms: this.cloudU,
      vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: CLOUD_FRAG,
    }));
    this.clouds.renderOrder = 0; scene.add(this.clouds);
    // luzes
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0002; this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd4ff, 0x4a4030, 0.0); scene.add(this.hemi);
    // luz ambiente (IBL) gerada de uma cena só com o céu
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envSky = new Sky(); this.envSky.scale.setScalar(1000); patchSky(this.envSky.material, '0.4'); this.envScene.add(this.envSky);
    this.envGround = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), new THREE.MeshBasicMaterial({ color: 0x3a4030, side: THREE.BackSide }));
    this.envScene.add(this.envGround);
    this.envRT = null; this.lastEnvSun = new THREE.Vector3(9, 9, 9);
    this.hour = 8.5; this.nightF = 0; this.dayF = 1;
    this.applyShadowQuality();
  }
  async buildStars(scene) {
    let buf; try { buf = await (await fetch(resolveURL('a/sky/stars.bin'))).arrayBuffer(); } catch (e) { return; }
    const f = new Float32Array(buf); const n = f.length / 4; const pos = new Float32Array(n * 3), mag = new Float32Array(n), col = new Float32Array(n * 3), seed = new Float32Array(n);
    const bvToRGB = (bv) => { const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)); const c = new THREE.Color(); const k = clamp((t - 2500) / 9000, 0, 1); c.setRGB(lerp(1.0, 0.72, k), lerp(0.62, 0.82, k) + 0.12 * Math.sin(k * 3.1), lerp(0.35, 1.0, k)); return c; };
    for (let i = 0; i < n; i++) { const ra = f[i * 4] * Math.PI / 180, dec = f[i * 4 + 1] * Math.PI / 180; pos[i * 3] = ra; pos[i * 3 + 1] = dec; pos[i * 3 + 2] = 0; mag[i] = f[i * 4 + 2]; const c = bvToRGB(f[i * 4 + 3]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; seed[i] = rand() * 100; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('mag', new THREE.BufferAttribute(mag, 1)); g.setAttribute('scol', new THREE.BufferAttribute(col, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.starU = Object.assign({ night: this.nightU.night, time: U.time, pxScale: { value: renderer.getPixelRatio() } }, this.skyU);
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: this.starU,
      vertexShader: SKY_GLSL + `attribute float mag; attribute vec3 scol; attribute float seed; uniform float night, time, pxScale; varying vec3 vC; varying float vA;
        void main(){ vec3 d = eqToWorld(position.x, position.y); vec4 mv = modelViewMatrix * vec4(d*2700.0, 1.0); gl_Position = projectionMatrix * mv;
          float b = pow(2.512, 3.6 - mag); // brilho relativo (mag 3.6 = 1)
          float ext = smoothstep(-0.02, 0.25, d.y); // extinção atmosférica
          float tw = 0.75 + 0.25*sin(time*(2.0+fract(seed)*5.0) + seed) * (1.0 - smoothstep(0.1, 0.6, d.y)*0.7);
          vA = clamp(0.22 + b*0.9, 0.0, 1.6) * night * ext * tw; vC = scol * (1.0 + clamp(b-1.0, 0.0, 3.0)*0.25);
          gl_PointSize = clamp(1.6 + sqrt(b)*1.6, 1.6, 8.0) * pxScale; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); float a = smoothstep(0.5, 0.0, r); a = a*a + smoothstep(0.12,0.0,r)*0.6; gl_FragColor = vec4(vC * vA * a * 1.6, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
    this.stars = new THREE.Points(g, m); this.stars.frustumCulled = false; this.stars.renderOrder = -1; scene.add(this.stars);
  }
  applyShadowQuality() {
    const q = Q(); const s = this.sun.shadow;
    if (s.mapSize.x !== q.shadow) { s.mapSize.set(q.shadow, q.shadow); if (s.map) { s.map.dispose(); s.map = null; } }
    const r = q.shadowR; Object.assign(s.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 700 }); s.camera.updateProjectionMatrix();
    s.radius = 2; s.blurSamples = 12;
  }
  setHour(h) { this.hour = h; }
  spawnMeteor() {
    const m = this.met.find(m => m.a.w < 0 || m.a.w >= 1); if (!m) return;
    const az = rand() * 6.283, el = 0.35 + rand() * 0.8; const a = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    const dir = new THREE.Vector3(rand() - 0.5, -0.4 - rand() * 0.5, rand() - 0.5); dir.sub(a.clone().multiplyScalar(dir.dot(a))).normalize();
    m.a.set(a.x, a.y, a.z, 0); m.b.set(dir.x, dir.y, dir.z, 0.12 + rand() * 0.2); m.speed = 1.4 + rand() * 1.2;
  }
  update(focus, dt) {
    dt = dt || 0.016;
    const a = (this.hour - 5.5) / 14 * Math.PI;
    const sd = U.sunDir.value.set(Math.cos(a), Math.sin(a) * 0.93, 0.36).normalize();
    const sy = sd.y;
    this.dayF = smooth(-0.2, 0.18, sy); this.nightF = 1 - smooth(-0.2, 0.02, sy);
    const dusk = Math.exp(-Math.pow((sy - 0.05) / 0.14, 2)); this.dusk = dusk;
    const su = this.sky.material.uniforms; su.sunPosition.value.copy(sd);
    su.rayleigh.value = 2.4 + dusk * 1.0; su.turbidity.value = 1.4 + dusk * 3.5; su.warm.value = dusk;
    const ss = 1 - this.nightF * 0.985; su.skyScale.value = ss;
    const eu = this.envSky.material.uniforms; eu.skyScale.value = Math.max(ss, 0.06); eu.warm.value = dusk; for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) eu[k].value = su[k].value; eu.sunPosition.value.copy(sd);
    // sol e lua
    const sc = U.sunColor.value;
    const warm = new THREE.Color(1.0, 0.5, 0.24), white = new THREE.Color(1.0, 0.95, 0.86);
    sc.copy(warm).lerp(white, smooth(0.03, 0.45, sy));
    const moon = new THREE.Color(0.55, 0.65, 0.95);
    const md = new THREE.Vector3(-sd.x * 0.8, Math.max(-sd.y, 0.0) * 0.9 + 0.35, -sd.z + 0.4).normalize(); this.nightU.moonDir.value.copy(md);
    let ld;
    if (sy > -0.05) { this.sun.color.copy(sc); this.sun.intensity = 4.0 * smooth(-0.05, 0.16, sy); ld = sd; }
    else { this.sun.color.copy(moon); this.sun.intensity = 0.42 * smooth(-0.05, -0.25, sy) + 0.15; ld = md; }
    this.lightDir = ld;
    const q = Q(); const tex = (q.shadowR * 2) / q.shadow;
    const fx = Math.round(focus.x / tex) * tex, fz = Math.round(focus.z / tex) * tex;
    this.sun.target.position.set(fx, focus.y, fz); this.sun.position.copy(this.sun.target.position).addScaledVector(ld, 300);
    this.sun.target.updateMatrixWorld();
    // tons do céu para nuvens, névoa e água
    const skyTint = new THREE.Color(0.4, 0.56, 0.78).multiplyScalar(0.25 + 0.75 * this.dayF).lerp(new THREE.Color(0.95, 0.56, 0.38), dusk * 0.55);
    skyTint.lerp(new THREE.Color(0.02, 0.03, 0.06), this.nightF);
    this.cloudU.skyTint.value.copy(skyTint); this.cloudU.sunCol.value.copy(sc); this.cloudU.night.value = this.nightF; this.cloudU.cover.value = 0.04 + 0.05 * Math.sin(U.time.value * 0.003);
    this.nightU.night.value = this.nightF;
    waterSky.color.copy(skyTint).multiplyScalar(0.9); waterSky.night.value = this.nightF;
    // névoa: perspectiva aérea azulada de dia, dourada no fim da tarde, neblina de manhã cedo
    const fc = new THREE.Color(0.5, 0.62, 0.78).lerp(new THREE.Color(1.0, 0.66, 0.44), dusk * 0.6).multiplyScalar(0.12 + 0.88 * this.dayF);
    fc.lerp(new THREE.Color(0.02, 0.026, 0.045), this.nightF * 0.95);
    fog.color.copy(fc);
    fog.near = (0.0006 + dusk * 0.0007 + this.nightF * 0.0004 + smooth(5.0, 6.5, this.hour) * (1 - smooth(6.5, 8.6, this.hour)) * 0.0045);
    setFogSun(sd);
    // rotação do céu: o núcleo da galáxia passa pelo meridiano por volta das 22h
    this.LST = THREE.MathUtils.degToRad(266 + (this.hour - 22) * 15.04); this.skyU.uLST.value = this.LST;
    if (this.starU) this.starU.pxScale.value = renderer.getPixelRatio();
    // estrelas cadentes
    if (this.nightF > 0.5 && rand() < dt * this.meteors * 0.12 * (this.meteors > 0.5 ? 12 : 1)) this.spawnMeteor();
    for (const m of this.met) { if (m.a.w < 0) continue; m.a.w += dt * (m.speed || 2) * 0.9; if (m.a.w >= 1.2) m.a.w = -1; }
    // luz ambiente
    this.envCool = (this.envCool || 0) - dt;
    if (!this.envRT || (this.lastEnvSun.distanceTo(sd) > 0.03 && this.envCool <= 0)) { this.envCool = 4;
      this.envGround.material.color.setRGB(0.14, 0.15, 0.1).multiplyScalar(0.2 + 0.8 * this.dayF);
      const rt = this.pmrem.fromScene(this.envScene, 0.04, 1, 2000);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt; this.scene.environment = rt.texture; this.lastEnvSun.copy(sd);
    }
    this.scene.environmentIntensity = 0.72 * (0.14 + 0.86 * this.dayF) + this.nightF * 0.32;
    renderer.toneMappingExposure = 0.9 + this.nightF * 0.5 + dusk * 0.1;
    const cp = focus.camPos || focus; this.sky.position.copy(cp); this.night.position.copy(cp); this.clouds.position.copy(cp); if (this.stars) this.stars.position.copy(cp);
  }
}
