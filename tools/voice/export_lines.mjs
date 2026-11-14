// Exporta todas as falas de src/story.js para tools/voice/lines.json (entrada do gerador de vozes)
import { LINES } from '../../src/story.js';
import { writeFileSync } from 'node:fs';
const out = Object.entries(LINES).map(([id, [speaker, text, emotion]]) => ({ id, speaker, text, emotion }));
writeFileSync(new URL('./lines.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(out.length, 'falas', out.reduce((a, l) => a + l.text.length, 0), 'caracteres');
