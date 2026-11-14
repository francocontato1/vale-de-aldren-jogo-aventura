// Converte os animais CC0 da Quaternius (Ultimate Animated Animals e a ovelha do pacote de fazenda) para a/animals/
// Uso: node tools/chars/animals.mjs <pasta com Sheep.gltf, Deer.gltf, Fox.gltf>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const SRC = process.argv[2]; mkdirSync('a/animals', { recursive: true });
for (const n of ['Sheep', 'Deer', 'Fox']) {
  const doc = await io.read(path.join(SRC, n + '.gltf'));
  await doc.transform(dedup(), resample({ tolerance: 0.0008 }), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  writeFileSync(`a/animals/${n.toLowerCase()}.glb.wasm`, await io.writeBinary(doc)); console.log(n);
}
