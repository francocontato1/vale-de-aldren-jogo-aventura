// Extrai clipes avulsos da Universal Animation Library (Quaternius, CC0) para a/chars/anims_extra.glb.wasm
// (só esqueleto + animações, sem malha). Uso: node tools/chars/extra_anims.mjs <UAL1_Standard.glb> [clipes...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, resample, dedup, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { writeFileSync } from 'node:fs';
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [src, ...want] = process.argv.slice(2); const keep = new Set(want.length ? want : ['Driving_Loop']);
const doc = await io.read(src); const root = doc.getRoot();
for (const a of root.listAnimations()) if (!keep.has(a.getName())) { for (const c of a.listChannels()) c.dispose(); for (const s of a.listSamplers()) s.dispose(); a.dispose(); }
for (const m of root.listMeshes()) m.dispose();
for (const n of root.listNodes()) if (n.getMesh()) n.setMesh(null);
for (const s of root.listSkins()) s.dispose();
await doc.transform(resample({ tolerance: 0.0005 }), prune({ keepLeaves: true }), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
writeFileSync('a/chars/anims_extra.glb.wasm', await io.writeBinary(doc)); console.log(root.listAnimations().map(a => a.getName()));
