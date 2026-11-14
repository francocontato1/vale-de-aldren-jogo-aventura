# Gera jogar-offline.html: um único arquivo com o jogo e todos os recursos embutidos.
import os, base64, json, re
here=os.path.dirname(os.path.abspath(__file__)); root=here
html=open(root+'/index.html').read()
m=re.search(r'<script type="module" src="(game-[0-9a-f]+\.js)"></script>',html); js=open(root+'/'+m.group(1)).read().replace('</script','<\\/script')
types={'.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg','.wasm':'application/octet-stream'}
D={}
for r,d,fs in os.walk(root+'/a'):
  for f in fs:
    p=os.path.join(r,f); rel=os.path.relpath(p,root).replace(os.sep,'/'); D[rel]=[types.get(os.path.splitext(f)[1],'application/octet-stream'),base64.b64encode(open(p,'rb').read()).decode()]
loader='<script>window.__ASSET_URLS={};(function(){var D='+json.dumps(D)+';for(var k in D){var b=atob(D[k][1]);var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.__ASSET_URLS[k]=URL.createObjectURL(new Blob([u],{type:D[k][0]}));}})();</script>'
out=html.replace(m.group(0), loader+'<script type="module">'+js+'</script>')
open(os.path.join(here,'jogar-offline.html'),'w').write(out)
print(len(out)/1e6,'MB', len(D),'assets')
