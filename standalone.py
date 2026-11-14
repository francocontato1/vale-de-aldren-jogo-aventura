# Gera jogar-offline.html: um único arquivo com o jogo e todos os recursos embutidos.
# Uso: python3 standalone.py   (depois de npm run build)
import os, base64, json, re
root = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
m = re.search(r'<script type="module" src="(game-[0-9a-f]+\.js)"></script>', html)
js = open(os.path.join(root, m.group(1)), encoding='utf-8').read().replace('</script', '<\\/script')
types = {'.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.json': 'application/json', '.wasm': 'application/octet-stream', '.bin': 'application/octet-stream'}
D = {}
for r, d, fs in os.walk(os.path.join(root, 'a')):
    d[:] = [x for x in d if not x.startswith('_')]
    for f in fs:
        p = os.path.join(r, f); rel = os.path.relpath(p, root).replace(os.sep, '/')
        D[rel] = [types.get(os.path.splitext(f)[1], 'application/octet-stream'), base64.b64encode(open(p, 'rb').read()).decode()]
loader = '<script>window.__ASSET_URLS={};(function(){var D=' + json.dumps(D) + ';for(var k in D){var b=atob(D[k][1]);var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__ASSET_URLS[k]=URL.createObjectURL(new Blob([u],{type:D[k][0]}));}})();</script>'
out = html.replace(m.group(0), loader + '<script type="module">' + js + '</script>')
open(os.path.join(root, 'jogar-offline.html'), 'w', encoding='utf-8').write(out)
print(round(len(out) / 1e6, 1), 'MB', len(D), 'recursos')
