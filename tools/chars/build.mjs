// Converte as peças CC0 da Quaternius (Universal Base Characters, Modular Character Outfits - Fantasy,
// Universal Animation Library 1 e 2) para os GLBs leves usados pelo jogo em a/chars/.
//
// Uso: node tools/chars/build.mjs <pasta-fontes>
//   <pasta-fontes>/terra/...                  (edição Source: universal-base-characters/, modular-outfits-fantasy/)
//   <pasta-fontes>/extra/Hair_*.gltf          (cabelos femininos: Long, Bob, Buns)
//   <pasta-fontes>/anim/UAL1_Standard.glb, UAL2_Standard.glb
// Fontes e licenças: ver tools/chars/README.md
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, dedup, prune, textureCompress, quantize, resample, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
if (!SRC) { console.error('uso: node tools/chars/build.mjs <pasta-fontes>'); process.exit(1); }
const OUT = path.resolve('a/chars'); mkdirSync(OUT, { recursive: true }); mkdirSync(path.join(OUT, 'tex'), { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const T = path.join(SRC, 'terra'), O = path.join(T, 'modular-outfits-fantasy'), B = path.join(T, 'universal-base-characters'), X = path.join(SRC, 'extra');

const GROUPS = {
  f_peasant: ['Female_Peasant_Arms', 'Female_Peasant_Body', 'Female_Peasant_Legs', 'Female_Peasant_Feet'].map(n => path.join(O, n + '.gltf')),
  f_ranger: ['Female_Ranger_Arms', 'Female_Ranger_Body', 'Female_Ranger_Legs', 'Female_Ranger_Feet', 'Female_Ranger_Head_Hood', 'Female_Ranger_Acc_Pauldrons'].map(n => path.join(O, n + '.gltf')),
  m_peasant: ['Male_Peasant_Arms', 'Male_Peasant_Body', 'Male_Peasant_Legs', 'Male_Peasant_Feet'].map(n => path.join(O, n + '.gltf')),
  m_ranger: ['Male_Ranger_Arms', 'Male_Ranger_Body', 'Male_Ranger_Legs', 'Male_Ranger_Feet_Boots', 'Male_Ranger_Head_Hood', 'Male_Ranger_Acc_Pauldron'].map(n => path.join(O, n + '.gltf')),
  m_wizard: ['Male_Wizard_Arms', 'Male_Wizard_Body', 'Male_Wizard_Legs', 'Male_Wizard_Feet'].map(n => path.join(O, n + '.gltf')),
  m_noble: ['Male_Noble_Arms', 'Male_Noble_Body', 'Male_Noble_Legs', 'Male_Noble_Feet'].map(n => path.join(O, n + '.gltf')),
  head_f: [path.join(B, 'Regular_Female_OnlyHead.gltf')],
  head_m: [path.join(B, 'Regular_Male_OnlyHead.gltf')],
  hair_f: ['Hair_Long', 'Hair_Bob', 'Hair_Buns'].map(n => path.join(X, n + '.gltf')),
  hair_m: ['Hair_Balding', 'Hair_Buzzed', 'Hair_SimpleParted', 'Hair_SlickBack', 'Hair_Ponytail', 'Hair_Beard', 'Hair_Moustache', 'Hair_MuttonChops'].map(n => path.join(B, n + '.gltf')),
};
const TEX_SIZE = { hair_f: 512, hair_m: 512 };

async function buildGroup(name, files) {
  const doc = await io.read(files[0]);
  for (const f of files.slice(1)) mergeDocuments(doc, await io.read(f));
  // um único buffer
  const root = doc.getRoot(); const buf = root.listBuffers()[0];
  for (const a of root.listAccessors()) a.setBuffer(buf);
  for (const b of root.listBuffers()) if (b !== buf) b.dispose();
  const size = TEX_SIZE[name] || 1024;
  await doc.transform(dedup(), prune({ keepLeaves: true }), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 84 }));
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  writeFileSync(path.join(OUT, name + '.glb.wasm'), await io.writeBinary(doc));
  console.log(name, files.length, 'peças');
}

// cores alternativas das roupas (texturas soltas para trocar em tempo de execução)
async function variants() {
  for (const n of ['Wizard_2', 'Wizard_3', 'Noble_2', 'Noble_3']) {
    await sharp(path.join(O, `T_${n}_BaseColor.png`)).resize(1024, 1024).webp({ quality: 84 }).toFile(path.join(OUT, 'tex', n + '.webp'));
  }
}

// animações: só o esqueleto + clipes escolhidos (sem a malha do manequim)
const CLIPS = {
  UAL1: ['Idle_Loop', 'Idle_Talking_Loop', 'Idle_Torch_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land',
    'Sitting_Enter', 'Sitting_Exit', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Interact', 'PickUp_Table', 'Fixing_Kneeling', 'Spell_Simple_Enter', 'Spell_Simple_Idle_Loop', 'Spell_Simple_Exit', 'Crouch_Idle_Loop', 'Swim_Idle_Loop', 'Swim_Fwd_Loop', 'Dance_Loop'],
  UAL2: ['Idle_Lantern_Loop', 'Idle_FoldArms_Loop', 'Idle_No_Loop', 'Yes', 'Farm_Harvest', 'Farm_PlantSeed', 'Farm_Watering', 'TreeChopping_Loop', 'Walk_Carry_Loop', 'LayToIdle', 'Idle_Rail_Loop', 'Consume', 'OverhandThrow'],
};
async function anims() {
  const doc = await io.read(path.join(SRC, 'anim', 'UAL1_Standard.glb'));
  const d2 = await io.read(path.join(SRC, 'anim', 'UAL2_Standard.glb'));
  const keep1 = new Set(CLIPS.UAL1), keep2 = new Set(CLIPS.UAL2);
  for (const a of doc.getRoot().listAnimations()) if (!keep1.has(a.getName())) a.dispose();
  for (const a of d2.getRoot().listAnimations()) if (!keep2.has(a.getName())) a.dispose();
  // reaponta os canais do UAL2 para os ossos do UAL1 (mesmos nomes)
  const byName = new Map(doc.getRoot().listNodes().map(n => [n.getName(), n]));
  const map = mergeDocuments(doc, d2);
  for (const a of doc.getRoot().listAnimations()) for (const c of a.listChannels()) { const t = c.getTargetNode(); if (t && byName.get(t.getName()) && byName.get(t.getName()) !== t) c.setTargetNode(byName.get(t.getName())); }
  const root = doc.getRoot();
  // tira malhas, materiais e a cena duplicada; mantém só canais de rotação (+ posição da pélvis)
  for (const n of root.listNodes()) { if (n.getMesh()) n.setMesh(null); if (n.getSkin()) n.setSkin(null); }
  for (const m of root.listMeshes()) m.dispose();
  for (const a of root.listAnimations()) for (const c of a.listChannels()) {
    const p = c.getTargetPath(), nm = c.getTargetNode()?.getName();
    if (p === 'scale' || (p === 'translation' && nm !== 'pelvis')) { const s = c.getSampler(); c.dispose(); if (s && !s.listParents().some(x => x.propertyType === 'AnimationChannel')) s.dispose(); }
  }
  for (const s of root.listScenes().slice(1)) s.dispose();
  const buf = root.listBuffers()[0]; for (const x of root.listAccessors()) x.setBuffer(buf); for (const b of root.listBuffers()) if (b !== buf) b.dispose();
  await doc.transform(resample({ tolerance: 0.0005 }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  writeFileSync(path.join(OUT, 'anims.glb.wasm'), await io.writeBinary(doc));
  console.log('anims', root.listAnimations().map(a => a.getName()).length, 'clipes');
}

for (const [k, v] of Object.entries(GROUPS)) await buildGroup(k, v);
await variants();
await anims();
