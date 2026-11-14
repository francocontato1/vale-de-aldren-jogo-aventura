// Converte o dragão "Tarisland Dragon" (CC-BY 4.0, autor "Dr A" via Sketchfab: https://skfb.ly/oPPnU)
// para o GLB leve usado pelo jogo em a/dragon/dragon.glb.wasm (conteúdo é um GLB normal).
//
// Uso: node tools/chars/dragon.mjs <caminho/tarisland_dragon_high_poly.glb>
//
// O que faz:
//  - converte o material spec/gloss (KHR_materials_pbrSpecularGlossiness) para metal/rough puro, sem as extensões
//    KHR_materials_ior/specular que o metalRough() adiciona (assim o three.js cria MeshStandardMaterial);
//  - mantém só os clips úteis para um dragão montável, renomeados (idle, walk, takeoff, land, turnL, turnR, roar,
//    hover) e cria dois clips em loop "no lugar" a partir do voo cinematográfico Qishilong_fly2 (fly e glide);
//  - no export original todos os clips estão numa linha do tempo única (cada um começa onde o anterior acabou),
//    então cada clip é deslocado para começar em t=0;
//  - resample, dedup, prune, texturas webp (1024², sem redução) e meshopt nível medium. A malha NÃO é decimada.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, meshopt, textureCompress, metalRough } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { Quaternion, Vector3 } from 'three';
import sharp from 'sharp';
import { writeFileSync, mkdirSync, statSync } from 'node:fs';

const SRC = process.argv[2];
if (!SRC) { console.error('uso: node tools/chars/dragon.mjs <tarisland_dragon_high_poly.glb>'); process.exit(1); }
const OUT = 'a/dragon/dragon.glb.wasm';

// Clips mantidos como estão (só deslocados para t=0 e renomeados).
// takeoff/land: up01/down01 terminam/começam na mesma altura do pairar (skill08); up/down vão 11 u mais alto e
// as variantes *_dz têm um deslocamento fixo de root_02 (-1864,0,-2221.5 + 45° de giro), inúteis aqui.
// roar: skill02 = empina, abre as asas, ergue a cabeça e mantém a mandíbula aberta (~60°) por ~2,5 s.
// hover: skill08 = bater de asas parado no ar (loop perfeito de 1,67 s).
const KEEP = {
  idle: 'Qishilong_stand', walk: 'Qishilong_walk', takeoff: 'Qishilong_up01', land: 'Qishilong_down01',
  turnL: 'Qishilong_turnleft', turnR: 'Qishilong_turnright', roar: 'Qishilong_skill02', hover: 'Qishilong_skill08',
};
// Clips derivados do voo cinematográfico (36,6 s percorrendo centenas de metros): recorta um trecho, tira o
// deslocamento/rumo do Bip001 (fica no lugar, de frente para +Z) e fecha o loop.
//   fly: um ciclo de batida de asas em voo nivelado (2,9 s → 4,467 s), fecho do loop com mistura de 0,25 s.
//   glide: asas abertas e paradas (25,4 s → 26,05 s), tocado ida-e-volta (ping-pong) para durar 1,3 s; com
//          still=true a posição do Bip001 fica fixa (sem o mergulho do trecho original) e pitch levanta o nariz (graus).
const DERIVED = {
  fly: { from: 'Qishilong_fly2', a: 2.9, b: 4.4667, mode: 'loop', blend: 0.25, pitch: 0 },
  glide: { from: 'Qishilong_fly2', a: 25.4, b: 26.05, mode: 'pingpong', pitch: 20, still: true },
};
// turnleft/turnright giram root_02 em ±45° durante 1 s (root motion de rotação). Com true esse giro é removido
// para o clip virar só o "passinho" de virar no lugar e o jogo gira o objeto (≈45°/s) por código.
const TURN_IN_PLACE = true;
const ROOT = 'Bip001_03', ROOT2 = 'root_02';
const FPS = 30;

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(SRC);
const root = doc.getRoot();
const buffer = root.listBuffers()[0];

// ---------- material: spec/gloss -> metal/rough sem extensões extras ----------
await doc.transform(metalRough());
for (const m of root.listMaterials()) { m.setExtension('KHR_materials_ior', null); m.setExtension('KHR_materials_specular', null); }
for (const e of root.listExtensionsUsed()) if (['KHR_materials_ior', 'KHR_materials_specular'].includes(e.extensionName)) e.dispose();
// as duas texturas de cor não têm alfa: tudo OPAQUE; o material das asas precisa de doubleSided (já vem true).
for (const m of root.listMaterials()) m.setAlphaMode('OPAQUE').setDoubleSided(true);

// ---------- utilidades de amostragem ----------
const anims = Object.fromEntries(root.listAnimations().map(a => [a.getName(), a]));
const startOf = a => Math.min(...a.listSamplers().map(s => s.getInput().getMin([])[0]));
function sample(sampler, t) {
  const T = sampler.getInput().getArray(), V = sampler.getOutput().getArray(), k = sampler.getOutput().getElementSize();
  if (sampler.getInterpolation() !== 'LINEAR') throw new Error('interpolação não suportada: ' + sampler.getInterpolation());
  if (t <= T[0]) return Array.from(V.slice(0, k));
  if (t >= T[T.length - 1]) return Array.from(V.slice((T.length - 1) * k, T.length * k));
  let lo = 0, hi = T.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid; else hi = mid; }
  const u = (t - T[lo]) / (T[hi] - T[lo]);
  if (k === 4) { const o = [0, 0, 0, 0]; Quaternion.slerpFlat(o, 0, V, lo * 4, V, hi * 4, u); return o; }
  return Array.from({ length: k }, (_, j) => V[lo * k + j] * (1 - u) + V[hi * k + j] * u);
}
const mix = (x, y, w) => x.length === 4
  ? (() => { const o = [0, 0, 0, 0]; Quaternion.slerpFlat(o, 0, x, 0, y, 0, w); return o; })()
  : x.map((v, i) => v * (1 - w) + y[i] * w);
const accessor = (arr, type) => doc.createAccessor().setType(type).setArray(new Float32Array(arr)).setBuffer(buffer);

// ---------- clips mantidos: desloca para t=0 e renomeia ----------
const out = [];
for (const [name, srcName] of Object.entries(KEEP)) {
  const a = anims[srcName]; if (!a) throw new Error('clip não encontrado: ' + srcName);
  const t0 = startOf(a), done = new Map();
  for (const s of a.listSamplers()) {
    let c = done.get(s.getInput());
    if (!c) { c = s.getInput().clone(); c.setArray(c.getArray().map(t => t - t0)); done.set(s.getInput(), c); }
    s.setInput(c);
  }
  if (TURN_IN_PLACE && name.startsWith('turn'))
    for (const ch of a.listChannels()) if (ch.getTargetNode()?.getName() === ROOT2 && ch.getTargetPath() === 'rotation') { ch.getSampler().dispose(); ch.dispose(); }
  a.setName(name); out.push(a);
}

// ---------- clips derivados do voo ----------
// Espaço do pai do Bip001 (root_02): +Z = cima no mundo, -Y = frente do dragão (que no mundo olha para +Z).
const bip = root.listNodes().find(n => n.getName() === ROOT);
const qRest = new Quaternion(...bip.getRotation());
const bodyFwd = new Vector3(0, -1, 0).applyQuaternion(qRest.clone().invert()); // eixo "frente" no espaço do Bip001
const heading = q => { const f = bodyFwd.clone().applyQuaternion(new Quaternion(...q)); return Math.atan2(f.x, -f.y); };
// posição do Bip001 no fim do takeoff = posição do pairar; fly/glide ficam nessa mesma altura (sem saltos).
const P0 = (() => { const s = anims[KEEP.takeoff].listChannels().find(c => c.getTargetNode() === bip && c.getTargetPath() === 'translation').getSampler(); const T = s.getInput().getArray(); return sample(s, T[T.length - 1]); })();

for (const [name, o] of Object.entries(DERIVED)) {
  const src = anims[o.from]; const t0 = startOf(src); const A = t0 + o.a, B = t0 + o.b, L = B - A;
  const chans = src.listChannels().filter(c => c.getTargetNode());
  const rotS = src.listChannels().find(c => c.getTargetNode() === bip && c.getTargetPath() === 'rotation').getSampler();
  const posS = src.listChannels().find(c => c.getTargetNode() === bip && c.getTargetPath() === 'translation').getSampler();
  const hA = heading(sample(rotS, A)); let hB = heading(sample(rotS, B));
  while (hB - hA > Math.PI) hB -= 2 * Math.PI; while (hB - hA < -Math.PI) hB += 2 * Math.PI;
  const pA = sample(posS, A), pB = sample(posS, B);
  const qPitch = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -o.pitch * Math.PI / 180);
  // valor de um canal no instante t (tempo absoluto do clip fonte), já com o Bip001 posto "no lugar"
  const value = (ch, t) => {
    const v = sample(ch.getSampler(), t);
    if (ch.getTargetNode() !== bip) return v;
    const u = (t - A) / L, d = -(hA + (hB - hA) * u); // tira o rumo (tendência linear), mantém balanço/inclinação
    const qz = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), d);
    if (ch.getTargetPath() === 'rotation') return qPitch.clone().multiply(qz).multiply(new Quaternion(...v)).toArray();
    if (ch.getTargetPath() === 'translation') {
      const r = new Vector3(...v.map((x, i) => x - (pA[i] + (pB[i] - pA[i]) * u))).applyQuaternion(qz);
      return o.still ? [...P0] : [P0[0] + r.x, P0[1] + r.y, P0[2] + r.z];
    }
    return v;
  };
  const n = Math.round(L * FPS), times = [];
  let frames = Array.from({ length: n + 1 }, (_, i) => A + L * i / n);
  if (o.mode === 'pingpong') frames = frames.concat(frames.slice(0, -1).reverse());
  for (let i = 0; i < frames.length; i++) times.push(i / FPS);
  const anim = doc.createAnimation(name); const input = accessor(times, 'SCALAR');
  for (const ch of chans) {
    if (ch.getTargetPath() === 'scale' && ch.getTargetNode() === bip) continue;
    const vals = [];
    for (const t of frames) {
      let v = value(ch, t);
      if (o.mode === 'loop' && t > B - o.blend) { // fecha o loop: mistura com o ciclo anterior (t - L)
        const w = (t - (B - o.blend)) / o.blend, s = w * w * (3 - 2 * w);
        v = mix(v, value(ch, t - L), s);
      }
      vals.push(...v);
    }
    const k = vals.length / frames.length;
    const smp = doc.createAnimationSampler().setInput(input).setOutput(accessor(vals, k === 4 ? 'VEC4' : 'VEC3')).setInterpolation('LINEAR');
    anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(ch.getTargetNode()).setTargetPath(ch.getTargetPath()).setSampler(smp));
  }
  out.push(anim);
}

// ---------- remove todos os outros clips ----------
for (const a of root.listAnimations()) if (!out.includes(a)) { for (const s of a.listSamplers()) s.dispose(); for (const c of a.listChannels()) c.dispose(); a.dispose(); }

// ---------- otimização ----------
await doc.transform(
  prune(), dedup(),
  resample({ tolerance: 0.0005 }),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^baseColorTexture$/, quality: 88, resize: [2048, 2048] }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^normalTexture$/, quality: 95, resize: [2048, 2048] }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
mkdirSync('a/dragon', { recursive: true });
writeFileSync(OUT, await io.writeBinary(doc));
for (const a of root.listAnimations()) console.log(a.getName().padEnd(8), Math.max(...a.listSamplers().map(s => s.getInput().getMax([])[0])).toFixed(3) + ' s');
console.log(OUT, (statSync(OUT).size / 1048576).toFixed(2) + ' MB');
