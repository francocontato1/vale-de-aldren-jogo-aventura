import { THREE, renderer, scene, camera, Q } from './core.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// screen-space light shafts from the sun (works on the HDR scene before tone mapping)
const GodRaysShader = {
  uniforms: { tDiffuse: { value: null }, sun: { value: new THREE.Vector2(0.5, 0.5) }, strength: { value: 0 }, tint: { value: new THREE.Color(1, 0.9, 0.7) }, aspect: { value: 1.7 }, horizon: { value: 0.5 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 sun; uniform float strength, aspect, horizon; uniform vec3 tint; varying vec2 vUv;
  void main(){ vec4 base = texture2D(tDiffuse, vUv); if (strength < 0.001) { gl_FragColor = base; return; }
    vec2 d = (vUv - sun); float dist = length(d * vec2(aspect, 1.0)); vec2 stepv = d / 40.0 * 0.9; vec2 uv = vUv; float illum = 0.0; float decay = 1.0;
    for (int i = 0; i < 40; i++) { uv -= stepv; vec3 c = texture2D(tDiffuse, uv).rgb; float l = max(dot(c, vec3(0.2126,0.7152,0.0722)) - 1.6, 0.0) * smoothstep(horizon - 0.01, horizon + 0.06, uv.y); illum += l * decay; decay *= 0.965; }
    illum /= 40.0; float fall = exp(-dist * 1.6);
    gl_FragColor = vec4(base.rgb + tint * illum * strength * fall, base.a); }`,
};
// film grade: applied after tone mapping (display space)
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.34 }, grain: { value: 0.03 }, letterbox: { value: 0 }, sat: { value: 1.06 }, hurt: { value: 0 }, aspect: { value: 1.7 }, lift: { value: new THREE.Color(0.0, 0.0, 0.0) }, gain: { value: new THREE.Color(1, 1, 1) }, contrast: { value: 0.18 }, fade: { value: 0 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float time,vignette,grain,letterbox,sat,hurt,aspect,contrast,fade;uniform vec3 lift,gain;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){
   vec2 uv=vUv; vec2 c=uv-0.5; float ca=0.0014*dot(c,c)*4.;
   vec3 col; col.r=texture2D(tDiffuse,uv+c*ca).r; col.g=texture2D(tDiffuse,uv).g; col.b=texture2D(tDiffuse,uv-c*ca).b;
   float l=dot(col,vec3(0.2126,0.7152,0.0722));
   col=mix(vec3(l),col,sat);
   col = col*gain + lift*(1.0-col);
   col=mix(col, col*col*(3.-2.*col), contrast);
   float v=1.-dot(c*vec2(aspect*0.6,1.),c*vec2(aspect*0.6,1.))*vignette*1.6; col*=clamp(v,0.,1.);
   col+=(h(uv*vec2(1920.,1080.)+fract(time*7.)*100.)-0.5)*grain;
   col=mix(col, vec3(col.r*1.1+0.08, col.g*0.55, col.b*0.5), hurt*smoothstep(0.15,0.75,length(c)));
   col*=1.0-fade;
   float lb=letterbox*0.105; if(uv.y<lb||uv.y>1.-lb) col=vec3(0.);
   gl_FragColor=vec4(col,1.);}`,
};

export class Post {
  constructor() { this.build(); }
  build() {
    const q = Q();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q.msaa });
    if (this.composer) this.composer.dispose();
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = null;
    this.rays = new ShaderPass(GodRaysShader); this.composer.addPass(this.rays);
    this.bokeh = new BokehPass(scene, camera, { focus: 3.0, aperture: 0.0025, maxblur: 0.006 });
    this.bokeh.enabled = false; this.composer.addPass(this.bokeh);
    this.bloom = null;
    if (q.bloom) { this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.2, 0.6, 0.95); this.composer.addPass(this.bloom); }
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader); this.composer.addPass(this.grade);
    if (!q.msaa) { this.fxaa = new ShaderPass(FXAAShader); this.fxaa.uniforms.resolution.value.set(1 / size.x, 1 / size.y); this.composer.addPass(this.fxaa); } else this.fxaa = null;
  }
  setSize(w, h) {
    this.composer.setSize(w, h);
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (this.fxaa) this.fxaa.uniforms.resolution.value.set(1 / s.x, 1 / s.y);
    this.grade.uniforms.aspect.value = w / h; this.rays.uniforms.aspect.value = w / h;
  }
  // per-frame look: sun shafts + time-of-day grading
  updateLook(sunDir, dayF, nightF, dusk, sunCol) {
    const sp = sunDir.clone().multiplyScalar(1000).add(camera.position).project(camera);
    const onScreen = sp.z < 1 && Math.abs(sp.x) < 1.6 && Math.abs(sp.y) < 1.6;
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); const facing = Math.max(0, fwd.dot(sunDir));
    this.rays.uniforms.sun.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
    this.rays.uniforms.strength.value = onScreen ? facing * facing * (0.5 + 1.6 * dusk) * dayF * 2.2 : 0;
    this.rays.uniforms.tint.value.copy(sunCol);
    const hz = new THREE.Vector3(fwd.x, 0, fwd.z).normalize().multiplyScalar(1000).add(camera.position).project(camera); this.rays.uniforms.horizon.value = hz.y * 0.5 + 0.5;
    const g = this.grade.uniforms;
    g.lift.value.setRGB(0.014 + 0.01 * dusk, 0.014, 0.024 + nightF * 0.03);
    g.gain.value.setRGB(1.03 + dusk * 0.07, 1.0 - nightF * 0.05, 0.96 - dusk * 0.06 + nightF * 0.08);
    g.sat.value = 1.04 + dusk * 0.14 - nightF * 0.3;
    g.contrast.value = 0.2 + dusk * 0.06;
  }
  render(dt, t) { this.grade.uniforms.time.value = t; this.composer.render(dt); }
}
