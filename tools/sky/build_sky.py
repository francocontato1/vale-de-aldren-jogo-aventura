# Gera a/sky/stars.bin (estrelas reais até magnitude 6) e a/sky/milkyway.webp (Via Láctea em RA/Dec)
# a partir dos dados do d3-celestial (Olaf Frohn, BSD-3; estrelas do catálogo XHIP/Hipparcos).
# Uso: python3 tools/sky/build_sky.py <pasta com stars.6.json e mw.json>
import json, struct, sys, os
from PIL import Image, ImageDraw, ImageFilter
src = sys.argv[1]; out = os.path.join(os.path.dirname(__file__), '..', '..', 'a', 'sky')
st = json.load(open(os.path.join(src, 'stars.6.json')))['features']
rows = []
for f in st:
    ra, dec = f['geometry']['coordinates']; mag = f['properties']['mag']; bv = f['properties'].get('bv') or '0.6'
    try: bv = float(bv)
    except: bv = 0.6
    rows.append((ra, dec, mag, bv))
rows.sort(key=lambda r: r[2])
with open(os.path.join(out, 'stars.bin'), 'wb') as fh:
    for r in rows: fh.write(struct.pack('<4f', *r))
print(len(rows), 'estrelas')
W, H = 2048, 1024
img = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(img)
mw = json.load(open(os.path.join(src, 'mw.json')))['features']
levels = [0, 38, 70, 110, 155, 210]
def ring_px(ring):
    # desenrola a longitude para não "dar a volta" na borda ±180
    out = []; prev = None; acc = 0
    for lon, lat in ring:
        if prev is not None:
            d = lon - prev
            if d > 180: acc -= 360
            elif d < -180: acc += 360
        prev = lon; out.append((((lon + acc) + 180) / 360 * W, (90 - lat) / 180 * H))
    return out
for feat in sorted(mw, key=lambda f: f['id']):
    lvl = int(feat['id'][-1]); val = levels[min(lvl, 5)]; hole = levels[min(lvl, 5) - 1]
    g = feat['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in polys:
        for k, ring in enumerate(poly):
            pts = ring_px(ring)
            xs = [x for x, _ in pts]
            if max(xs) - min(xs) > W * 0.8: continue  # anéis que circundam o céu inteiro: a faixa base é feita abaixo
            for off in (-W, 0, W): dr.polygon([(x + off, y) for x, y in pts], fill=val if k == 0 else hole)
img = img.filter(ImageFilter.GaussianBlur(3))
# faixa difusa da galáxia: brilho em função da latitude galáctica, mais forte perto do centro (Sagitário)
import math
base = Image.new('L', (W, H), 0); px = base.load()
aG, dG = math.radians(192.85948), math.radians(27.12825); aC, dC = math.radians(266.405), math.radians(-28.936)
for y in range(0, H):
    dec = math.radians(90 - (y + 0.5) / H * 180)
    for x in range(0, W):
        ra = math.radians((x + 0.5) / W * 360 - 180)
        sb = math.sin(dec) * math.sin(dG) + math.cos(dec) * math.cos(dG) * math.cos(ra - aG); b = math.degrees(math.asin(max(-1, min(1, sb))))
        cc = math.sin(dec) * math.sin(dC) + math.cos(dec) * math.cos(dC) * math.cos(ra - aC)
        core = max(0.0, cc) ** 6
        px[x, y] = int(min(255, 60 * math.exp(-(b / 11) ** 2) * (0.55 + 0.9 * core) + 70 * core * math.exp(-(b / 7) ** 2)))
from PIL import ImageChops
img = ImageChops.lighter(img, base)
img.convert('RGB').save(os.path.join(out, 'milkyway.webp'), quality=80)
print('via lactea ok')
