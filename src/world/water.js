import { THREE, U, loadTex } from '../core.js';
import { WSIZE, groundH, WATER } from './terrain.js';

export async function buildWater(scene) {
  const nrm = await loadTex('a/tex/water_n.jpg', { srgb: false });
  // only build water geometry where it can be seen (cells near or below water level)
  const g = new THREE.PlaneGeometry(WSIZE, WSIZE, 256, 256); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; const dep = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) dep[i] = WATER - groundH(p.getX(i), p.getZ(i));
  g.setAttribute('depth', new THREE.BufferAttribute(dep, 1));
  // drop triangles that are well above ground everywhere
  const idx = g.index.array; const keep = [];
  for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; if (Math.max(dep[a], dep[b], dep[c]) > -1.5) keep.push(a, b, c); }
  g.setIndex(keep);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b2a2e, roughness: 0.07, metalness: 0.0, transparent: true, normalMap: nrm, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.0 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.time = U.time; s.uniforms.tN = { value: nrm };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float depth; varying float vDepth; varying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vDepth = depth; vWP = (modelMatrix*vec4(position,1.)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float time; uniform sampler2D tN; varying float vDepth; varying vec3 vWP;')
      .replace('#include <normal_fragment_maps>', `
 vec2 wuv = vWP.xz;
 vec3 n1 = texture2D(tN, wuv*0.045 + vec2(time*0.012, time*0.007)).xyz*2.-1.;
 vec3 n2 = texture2D(tN, wuv*0.11 - vec2(time*0.017, -time*0.011)).xyz*2.-1.;
 vec3 n3 = texture2D(tN, wuv*0.31 + vec2(-time*0.02, time*0.025)).xyz*2.-1.;
 vec3 wn = normalize(vec3(n1.xy*0.5 + n2.xy*0.35 + n3.xy*0.2, 1.0));
 vec3 wnW = normalize(vec3(wn.x*0.35, 1.0, wn.y*0.35));
 normal = normalize((viewMatrix*vec4(wnW,0.)).xyz);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
 float dz = clamp(vDepth, 0., 20.);
 diffuseColor.rgb = mix(vec3(0.16,0.2,0.14), vec3(0.012,0.05,0.055), smoothstep(0.0, 3.5, dz));
 diffuseColor.a = mix(0.55, 0.97, smoothstep(0.0, 2.5, dz)) * smoothstep(-0.05, 0.25, vDepth);`)
      .replace('#include <opaque_fragment>', `
 float foam = (1.0 - smoothstep(0.0, 0.5, vDepth)) * (0.5 + 0.5*sin(time*1.3 + vWP.x*0.8 + vWP.z*0.6));
 outgoingLight = mix(outgoingLight, vec3(0.75,0.78,0.78)*(0.25+0.75*length(directLight_dummy())), 0.0);
 outgoingLight += foam*0.06;
 #include <opaque_fragment>`.replace('outgoingLight = mix(outgoingLight, vec3(0.75,0.78,0.78)*(0.25+0.75*length(directLight_dummy())), 0.0);\n', ''));
  };
  const mesh = new THREE.Mesh(g, mat); mesh.position.y = WATER + 0.02; mesh.renderOrder = 3; mesh.receiveShadow = true; mesh.name = 'water';
  scene.add(mesh);
  return mesh;
}
