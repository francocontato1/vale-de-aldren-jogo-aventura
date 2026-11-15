// Enxuga os GLBs de pedras e flores (rodar uma vez; os arquivos em a/ já saem otimizados):
// - rock2/rock3 tinham cópias idênticas das texturas da rock1 (~330 KB cada); o jogo só usa as da rock1.
// - as folhas das flores vinham em PNG; viram WebP (com transparência).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, prune } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
for (const n of ['rock2', 'rock3']) {
  const f = `a/${n}.glb.wasm`, before = kb(f); const doc = await io.readBinary(fs.readFileSync(f));
  for (const m of doc.getRoot().listMaterials()) { m.setBaseColorTexture(null); m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); }
  for (const t of doc.getRoot().listTextures()) t.dispose();
  await doc.transform(prune({ keepAttributes: true, keepLeaves: true })); fs.writeFileSync(f, await io.writeBinary(doc)); console.log(n, before, '->', kb(f));
}
for (const n of ['flower_white', 'flower_yellow', 'flower_blue']) {
  const f = `a/${n}.glb.wasm`, before = kb(f); const doc = await io.readBinary(fs.readFileSync(f));
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90 }), prune({ keepAttributes: true, keepLeaves: true }));
  fs.writeFileSync(f, await io.writeBinary(doc)); console.log(n, before, '->', kb(f));
}
