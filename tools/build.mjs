// Compila src/ com esbuild.
//   node tools/build.mjs        -> game-<hash>.js minificado e atualiza index.html
//   node tools/build.mjs --dev  -> _dev.js sem minificar (para testes locais)
//
// O ez-tree (árvores) traz 20 texturas embutidas no código como base64 (~3,9 MB, 75% do bundle).
// Aqui elas saem do código: viram arquivos WebP em a/tex/ez/ (baixados em paralelo, com cache do
// navegador), as do salgueiro (que o jogo não usa) são trocadas por um pixel, e o módulo passa a
// exportar `ezTexturesReady`, para as árvores só serem montadas depois que as texturas chegarem.
import * as esbuild from 'esbuild';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dev = process.argv.includes('--dev');
const EZ_DIR = 'a/tex/ez';
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

const ezTree = {
  name: 'ez-tree-textures',
  setup(build) {
    build.onLoad({ filter: /ez-tree\.es\.js$/ }, async (args) => {
      let src = await fs.promises.readFile(args.path, 'utf8');
      const willow = src.match(/willow: \{\s*ao: j\((\w+), !1\),\s*color: j\((\w+)\),\s*normal: j\((\w+), !1\),\s*roughness: j\((\w+), !1\)/);
      if (!willow) throw new Error('ez-tree: não achei as texturas do salgueiro (versão nova da biblioteca?)');
      const skip = new Set(willow.slice(1));
      fs.mkdirSync(path.join(root, EZ_DIR), { recursive: true });
      const re = /(\w+) = "data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)"/g;
      const jobs = []; let n = 0;
      src = src.replace(re, (all, name, kind, b64) => {
        if (skip.has(name)) return `${name} = "${PIXEL}"`;
        // JPEG fica como está (reconverter só perderia qualidade e não diminui); PNG com transparência vira WebP sem perdas se ficar menor
        const id = createHash('md5').update(b64).digest('hex').slice(0, 10), raw = Buffer.from(b64, 'base64');
        const done = ['jpg', 'png', 'webp'].map(e => `${EZ_DIR}/${id}.${e}`).find(f => fs.existsSync(path.join(root, f)));
        if (done) { n++; return `${name} = "${done}"`; }
        let file = `${EZ_DIR}/${id}.${kind === 'png' ? 'png' : 'jpg'}`;
        if (kind === 'png') { const wp = sharp(raw).webp({ lossless: true, effort: 6 }); const p = wp.toBuffer(); jobs.push(p.then(buf => { if (buf.length < raw.length) fs.writeFileSync(path.join(root, `${EZ_DIR}/${id}.webp`), buf); else fs.writeFileSync(path.join(root, file), raw); })); file = null; }
        else fs.writeFileSync(path.join(root, file), raw);
        n++; return file ? `${name} = "${file}"` : `${name} = "@@EZ:${id}@@"`;
      });
      await Promise.all(jobs);
      src = src.replace(/@@EZ:(\w+)@@/g, (m, id) => ['webp', 'png'].map(e => `${EZ_DIR}/${id}.${e}`).find(f => fs.existsSync(path.join(root, f))));
      if (n < 12) throw new Error('ez-tree: esperava ~16 texturas, achei ' + n);
      const mgr = 'const __ezMgr = new B.LoadingManager(); __ezMgr.setURLModifier((u) => (typeof window !== "undefined" && window.__ASSET_URLS && window.__ASSET_URLS[u]) || u);\n' +
        'export const ezTexturesReady = new Promise((r) => { __ezMgr.onLoad = r; __ezMgr.onError = (u) => console.warn("textura das árvores não carregou:", u); });\n';
      const at = src.search(/const \w+ = "(a\/tex\/ez\/|data:image)/);
      src = src.slice(0, at) + mgr + src.slice(at);
      const before = src.length; src = src.replace('= new B.TextureLoader();', '= new B.TextureLoader(__ezMgr);');
      if (src.length === before) throw new Error('ez-tree: não achei o TextureLoader');
      return { contents: src, loader: 'js' };
    });
  },
};

const outfile = path.join(root, dev ? '_dev.js' : 'game.js');
await esbuild.build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, minify: !dev, format: 'esm', target: 'es2020', outfile, logLevel: 'warning', plugins: [ezTree] });
if (!dev) {
  const h = createHash('md5').update(fs.readFileSync(outfile)).digest('hex').slice(0, 8);
  for (const f of fs.readdirSync(root)) if (/^game-[0-9a-f]+\.js$/.test(f)) fs.unlinkSync(path.join(root, f));
  fs.renameSync(outfile, path.join(root, `game-${h}.js`));
  const ip = path.join(root, 'index.html');
  fs.writeFileSync(ip, fs.readFileSync(ip, 'utf8').replace(/<script type="module" src="game[^"]*\.js"><\/script>/, `<script type="module" src="game-${h}.js"></script>`));
  console.log(`game-${h}.js`, (fs.statSync(path.join(root, `game-${h}.js`)).size / 1e6).toFixed(2), 'MB');
}
