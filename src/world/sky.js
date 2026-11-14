import { THREE, clamp, smooth, U, renderer, setFogSun, fog, Q } from '../core.js';
import { Sky } from 'three/addons/objects/Sky.js';

const CLOUD_FRAG = `
uniform float time; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; uniform vec3 skyTint;
varying vec3 vDir;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float s=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<6;i++){s+=a*vn(p);p=m*p+vec2(1.7,9.2);a*=.5;}return s;}
float dens(vec2 p){ float base = fb(p*0.55 + vec2(time*0.006,time*0.002)); float det = fb(p*2.3 - vec2(time*0.012,0.)); return smoothstep(0.56, 0.86, base*0.8 + det*0.26); }
void main(){
 vec3 d = normalize(vDir); if(d.y < 0.0) discard;
 vec2 uv = d.xz/(d.y+0.08)*0.75;
 float c = dens(uv);
 if(c < 0.003) discard;
 // light march toward the sun in uv space
 vec2 sd = normalize(sunDir.xz + 1e-4) * 0.06; float occ = 0.0;
 for(int i=1;i<5;i++){ occ += dens(uv + sd*float(i)); }
 float lit = exp(-occ*0.9);
 float sunUp = smoothstep(-0.12, 0.15, sunDir.y);
 vec3 amb = skyTint*0.9 + vec3(0.06,0.07,0.09);
 vec3 litCol = mix(vec3(0.03,0.035,0.05), sunCol*1.15, sunUp);
 vec3 col = amb*(0.55+0.45*(1.-c)) + litCol*lit*(0.6+0.4*(1.-c));
 float sil = pow(max(dot(d, sunDir),0.), 8.)*sunUp; col += sunCol*sil*(1.-c)*1.6; // silver lining
 col = mix(col, vec3(0.012,0.014,0.02), night*0.96);
 float horizonFade = smoothstep(0.0, 0.18, d.y);
 gl_FragColor = vec4(col, c*horizonFade*0.95*(1.0 - night*0.55));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export class SkySystem {
  constructor(scene) {
    this.scene = scene;
    this.sky = new Sky(); this.sky.scale.setScalar(3000); this.sky.material.depthWrite = false; this.sky.renderOrder = -2;
    const su = this.sky.material.uniforms; su.turbidity.value = 2.0; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.0035; su.mieDirectionalG.value = 0.84;
    const patchSky = (m, k) => { m.uniforms.skyScale = { value: 1 }; m.fragmentShader = m.fragmentShader.replace('uniform vec3 up;', 'uniform vec3 up; uniform float skyScale;').replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * ' + k + ' * skyScale, 1.0 );'); m.needsUpdate = true; };
    patchSky(this.sky.material, '0.42');
    this._patchSky = patchSky;
    scene.add(this.sky);
    // night dome: stars + moon, additive over the sky
    this.night = new THREE.Mesh(new THREE.SphereGeometry(2800, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { night: { value: 0 }, sunDir: U.sunDir, time: U.time },
      vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float night,time;uniform vec3 sunDir;varying vec3 vDir;
      float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float vn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float stars(vec3 d, float res, float th, float bright){ vec3 p=d*res; vec3 c=floor(p); vec3 f=fract(p)-0.5; float h=h3(c); if(h<th) return 0.; vec3 o=vec3(h3(c+1.3),h3(c+2.1),h3(c+3.7))-0.5; float r=length(f-o*0.55); float mag=pow(h3(c+4.9),5.)*bright+0.25; float tw=0.65+0.35*sin(time*(1.5+h*4.)+h*90.); return smoothstep(0.42,0.0,r)*mag*tw; }
      void main(){vec3 d=normalize(vDir);if(d.y<-0.02)discard;vec3 col=vec3(0.);
       float s1=stars(d,200.,0.982,9.0)*2.2, s2=stars(d,420.,0.97,1.5)*1.4;
       float hue=h3(floor(d*260.)+9.);
       col+=mix(vec3(0.75,0.82,1.0),vec3(1.0,0.86,0.68),hue)*s1+vec3(0.8,0.85,1.0)*s2*0.7;
       vec3 gp=normalize(vec3(.35,.45,-.82)); float band=exp(-pow(dot(d,gp),2.)*10.);
       float neb=vn3(d*9.)*0.6+vn3(d*23.)*0.3+vn3(d*51.)*0.1; float dust=smoothstep(0.45,0.75,vn3(d*14.+3.));
       col+=vec3(.09,.095,.13)*band*(0.4+neb)*(1.-dust*0.7)*1.6; col+=vec3(.8,.85,1.)*stars(d,700.,0.975,0.6)*band*0.8;
       vec3 md=normalize(vec3(-sunDir.x,abs(sunDir.y)+0.3,-sunDir.z));float ms=dot(d,md);
       float disc=smoothstep(.99935,.99955,ms); float crater=0.82+0.18*vn3(d*900.);
       col+=vec3(.95,.95,1.)*disc*crater*3.2+vec3(.22,.25,.34)*pow(max(ms,0.),90.)*1.2+vec3(.05,.06,.09)*pow(max(ms,0.),8.);
       gl_FragColor=vec4(col*night*smoothstep(-0.02,0.12,d.y),1.);
       #include <tonemapping_fragment>
       #include <colorspace_fragment>
      }`,
    }));
    this.night.renderOrder = -1; scene.add(this.night);
    this.cloudU = { time: U.time, sunDir: U.sunDir, sunCol: { value: new THREE.Color() }, night: { value: 0 }, skyTint: { value: new THREE.Color() } };
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(2600, 64, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, uniforms: this.cloudU,
      vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: CLOUD_FRAG,
    }));
    this.clouds.renderOrder = 0; scene.add(this.clouds);

    // lights
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.00025; this.sun.shadow.normalBias = 0.035;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd4ff, 0x4a4030, 0.0); scene.add(this.hemi);

    // environment (IBL) from a sky-only scene
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envSky = new Sky(); this.envSky.scale.setScalar(1000); patchSky(this.envSky.material, '0.42'); this.envScene.add(this.envSky);
    this.envGround = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), new THREE.MeshBasicMaterial({ color: 0x3a4030, side: THREE.BackSide }));
    this.envScene.add(this.envGround);
    this.envRT = null; this.lastEnvSun = new THREE.Vector3(9, 9, 9);
    this.hour = 8.5; this.nightF = 0; this.dayF = 1;
    this.applyShadowQuality();
  }
  applyShadowQuality() {
    const q = Q(); const s = this.sun.shadow;
    if (s.mapSize.x !== q.shadow) { s.mapSize.set(q.shadow, q.shadow); if (s.map) { s.map.dispose(); s.map = null; } }
    const r = q.shadowR; Object.assign(s.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 700 }); s.camera.updateProjectionMatrix();
    s.radius = 2; s.blurSamples = 12;
  }
  setHour(h) { this.hour = h; }
  update(focus, dt) {
    const a = (this.hour - 5.5) / 14 * Math.PI;
    const sd = U.sunDir.value.set(Math.cos(a), Math.sin(a) * 0.93, 0.36).normalize();
    const sy = sd.y;
    this.dayF = smooth(-0.2, 0.18, sy); this.nightF = 1 - smooth(-0.2, 0.02, sy);
    const dusk = Math.exp(-Math.pow((sy - 0.04) / 0.13, 2)); this.dusk = dusk;
    const su = this.sky.material.uniforms; su.sunPosition.value.copy(sd);
    su.rayleigh.value = 2.2 + dusk * 1.2; su.turbidity.value = 2.0 + dusk * 4;
    const ss = 1 - this.nightF * 0.97; su.skyScale.value = ss;
    const eu = this.envSky.material.uniforms; eu.skyScale.value = Math.max(ss, 0.08); for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) eu[k].value = su[k].value; eu.sunPosition.value.copy(sd);
    // sun / moon light
    const sc = U.sunColor.value;
    const warm = new THREE.Color(1.0, 0.55, 0.28), white = new THREE.Color(1.0, 0.95, 0.88);
    sc.copy(warm).lerp(white, smooth(0.02, 0.4, sy));
    const moon = new THREE.Color(0.55, 0.65, 0.95);
    let ld;
    if (sy > -0.05) { this.sun.color.copy(sc); this.sun.intensity = 3.2 * smooth(-0.05, 0.16, sy); ld = sd; }
    else { this.sun.color.copy(moon); this.sun.intensity = 0.55 * smooth(-0.05, -0.25, sy) + 0.25; ld = new THREE.Vector3(-sd.x, Math.max(-sd.y, 0.3), -sd.z).normalize(); }
    this.lightDir = ld;
    // shadow camera follows focus, snapped to texels
    const q = Q(); const tex = (q.shadowR * 2) / q.shadow;
    const fx = Math.round(focus.x / tex) * tex, fz = Math.round(focus.z / tex) * tex;
    this.sun.target.position.set(fx, focus.y, fz); this.sun.position.copy(this.sun.target.position).addScaledVector(ld, 300);
    this.sun.target.updateMatrixWorld();
    // sky tint for clouds/fog: sample approximations
    const skyTint = new THREE.Color(0.38, 0.55, 0.78).multiplyScalar(0.25 + 0.75 * this.dayF).lerp(new THREE.Color(0.9, 0.55, 0.38), dusk * 0.5);
    skyTint.lerp(new THREE.Color(0.02, 0.03, 0.06), this.nightF);
    this.cloudU.skyTint.value.copy(skyTint); this.cloudU.sunCol.value.copy(sc); this.cloudU.night.value = this.nightF;
    this.night.material.uniforms.night.value = this.nightF;
    // fog colour
    const fc = new THREE.Color(0.42, 0.56, 0.74).lerp(new THREE.Color(0.95, 0.62, 0.42), dusk * 0.55).multiplyScalar(0.12 + 0.88 * this.dayF);
    fc.lerp(new THREE.Color(0.018, 0.024, 0.04), this.nightF * 0.95);
    fog.color.copy(fc);
    fog.near = (0.00055 + dusk * 0.0008 + this.nightF * 0.0005 + smooth(5.0, 6.5, this.hour) * (1 - smooth(6.5, 8.2, this.hour)) * 0.0035);
    setFogSun(sd);
    this.hemi.intensity = 0.0;
    // env map regeneration when sun moved
    this.envCool = (this.envCool || 0) - (dt || 0.016);
    if (!this.envRT || (this.lastEnvSun.distanceTo(sd) > 0.03 && this.envCool <= 0)) { this.envCool = 4;
      this.envGround.material.color.setRGB(0.10, 0.11, 0.08).multiplyScalar(0.2 + 0.8 * this.dayF);
      const rt = this.pmrem.fromScene(this.envScene, 0.04, 1, 2000);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt; this.scene.environment = rt.texture; this.lastEnvSun.copy(sd);
    }
    this.scene.environmentIntensity = 0.85 * (0.12 + 0.88 * this.dayF) + this.nightF * 0.45;
    this.sky.visible = true; this.sky.material.uniforms.up.value.set(0, 1, 0);
    renderer.toneMappingExposure = 0.82 + this.nightF * 0.9;
    this.sky.position.copy(focus.camPos || focus); this.night.position.copy(this.sky.position); this.clouds.position.copy(this.sky.position);
  }
}
