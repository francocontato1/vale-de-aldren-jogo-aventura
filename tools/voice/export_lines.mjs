// Exporta todas as falas de src/story.js para tools/voice/lines.json (entrada do gerador de vozes).
// O "speaker" exportado é o TIMBRE (CAST[x].voice), não o personagem: o Teo adulto usa a voz eco_m, etc.
// Também escreve redub_ids.txt: as falas sem gravação ou cuja gravação ficou velha (texto ou timbre mudaram).
// Para dublar só essas:  generate.py lines.json --force --ids "$(cat redub_ids.txt)" ...
import { LINES, voiceOf } from '../../src/story.js';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
const out = Object.entries(LINES).map(([id, [speaker, text, emotion]]) => ({ id, speaker: voiceOf(speaker), text, emotion }));
writeFileSync(new URL('./lines.json', import.meta.url), JSON.stringify(out, null, 1));
const manURL = new URL('../../a/vox/manifest.json', import.meta.url);
const man = existsSync(manURL) ? JSON.parse(readFileSync(manURL, 'utf8')) : {};
const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
const redub = out.filter(l => !man[l.id] || norm(man[l.id].text) !== norm(l.text) || man[l.id].speaker !== l.speaker).map(l => l.id);
writeFileSync(new URL('./redub_ids.txt', import.meta.url), redub.join(','));
console.log(out.length, 'falas', out.reduce((a, l) => a + l.text.length, 0), 'caracteres ·', redub.length, 'para dublar (redub_ids.txt)');
