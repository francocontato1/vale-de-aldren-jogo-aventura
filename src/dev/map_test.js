import { computeTerrainData, HGT, NV, N, CELL, HALF, POI, PATHS, forestDensity, WATER, groundH } from '../world/terrain.js';
computeTerrainData();
const c = document.createElement('canvas'); c.width = c.height = NV; const g = c.getContext('2d'); const im = g.createImageData(NV, NV);
for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) { const k = j * NV + i, h = HGT[k]; const x = i * CELL - HALF, z = j * CELL - HALF; const f = forestDensity(x, z);
  let r, gg, b; if (h < WATER) { r = 40; gg = 70; b = 110; } else { const t = Math.min(1, h / 120); r = 90 + t * 150; gg = 120 + t * 110 - f * 60; b = 70 + t * 160; if (f > 0.2) { gg -= 30; r -= 30; } }
  const band = Math.abs((h % 10) - 0) < 0.6 ? 0.75 : 1; im.data[k * 4] = r * band; im.data[k * 4 + 1] = gg * band; im.data[k * 4 + 2] = b * band; im.data[k * 4 + 3] = 255; }
g.putImageData(im, 0, 0); g.strokeStyle = '#a60'; for (const p of PATHS) { g.beginPath(); p.forEach(([x, z], i) => { const X = (x + HALF) / CELL, Z = (z + HALF) / CELL; i ? g.lineTo(X, Z) : g.moveTo(X, Z); }); g.stroke(); }
g.fillStyle = '#f00'; g.font = '9px sans-serif'; for (const k in POI) { const X = (POI[k].x + HALF) / CELL, Z = (POI[k].z + HALF) / CELL; g.fillRect(X - 2, Z - 2, 4, 4); g.fillText(k, X + 3, Z); }
g.fillStyle = '#fff'; for (let x = -800; x <= 800; x += 100) { g.fillText(x, (x + HALF) / CELL, 8); g.fillText(x, 0, (x + HALF) / CELL); }
const img = document.createElement('img'); img.src = c.toDataURL(); img.style.width = '1000px'; img.style.imageRendering = 'pixelated'; document.body.appendChild(img);
const pts = { v: [0, 0], obs: [40, -110], obs2: [70, -120], obs3: [-60, -110], garden: [250, 150], stairs: [160, -110], stairs2: [180, -40], head: [108, 22], aq1: [-40, 120], shrine: [-120, -40] };
window.DONE = JSON.stringify(Object.fromEntries(Object.entries(pts).map(([k, [x, z]]) => [k, +groundH(x, z).toFixed(1)])));
