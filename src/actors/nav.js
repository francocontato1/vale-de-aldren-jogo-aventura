// Navegação dos moradores: grade fina (A*) calculada sob demanda sobre as colisões do mundo.
// Antes eles andavam em linha reta até o destino e, quando batiam numa parede ou cerca, ficavam
// "andando no lugar" para sempre. Agora cada trajeto é planejado contornando casas, móveis, cercas,
// árvores, pedras e água, e suavizado (só mantém as curvas necessárias).
import { groundH, normalY, WATER } from '../world/terrain.js';

const CELL = 0.4;
const key = (i, j) => (i + 32768) * 65536 + (j + 32768);

export class Nav {
  // boxes: [{x,z,hw,hd,c,s,rad,y0,y1}] · circles(x,z,cb): itera círculos próximos · extra(x,z): bloqueio adicional
  constructor({ boxes, circles, extra }) {
    this.circles = circles; this.extra = extra; this.cache = new Map();
    // grade espacial das caixas (as casas têm centenas de paredes e móveis)
    this.bgrid = new Map(); this.BG = 8;
    for (const b of boxes) { const r = b.rad + 0.5; for (let i = Math.floor((b.x - r) / this.BG); i <= Math.floor((b.x + r) / this.BG); i++) for (let j = Math.floor((b.z - r) / this.BG); j <= Math.floor((b.z + r) / this.BG); j++) { const k = i + ',' + j; let a = this.bgrid.get(k); if (!a) this.bgrid.set(k, a = []); a.push(b); } }
  }
  invalidate() { this.cache.clear(); }
  // célula livre para um morador de raio ~0.3 andando no chão
  free(x, z) {
    const i = Math.floor(x / CELL), j = Math.floor(z / CELL); const k = key(i, j); const c = this.cache.get(k); if (c !== undefined) return c;
    const v = this.test((i + 0.5) * CELL, (j + 0.5) * CELL); this.cache.set(k, v); return v;
  }
  test(x, z) {
    const y = groundH(x, z); if (y < WATER + 0.12) return false; if (normalY(x, z) < 0.72) return false;
    const arr = this.bgrid.get(Math.floor(x / this.BG) + ',' + Math.floor(z / this.BG));
    if (arr) for (const b of arr) { if (b.found || y + 1.7 < b.y0 || y > b.y1) continue; const dx = x - b.x, dz = z - b.z; const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.hw + 0.22 && Math.abs(lz) < b.hd + 0.22) return false; }
    let hit = false; this.circles(x, z, (cx, cz, r) => { if (!hit && (x - cx) ** 2 + (z - cz) ** 2 < (r + 0.26) ** 2) hit = true; }); if (hit) return false;
    if (this.extra && this.extra(x, z)) return false;
    return true;
  }
  // linha de visão: o segmento inteiro passa por células livres
  los(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az); const n = Math.max(1, Math.ceil(d / (CELL * 0.5))); for (let s = 0; s <= n; s++) { const t = s / n; if (!this.free(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
  // célula livre mais próxima (para pontos de partida/chegada encostados em algo)
  nearestFree(x, z, maxR = 3) { if (this.free(x, z)) return [x, z]; for (let r = CELL; r <= maxR; r += CELL) { const n = Math.ceil(r * 2 * Math.PI / CELL); for (let a = 0; a < n; a++) { const t = a / n * Math.PI * 2; const px = x + Math.cos(t) * r, pz = z + Math.sin(t) * r; if (this.free(px, pz)) return [px, pz]; } } return null; }
  // caminho de (ax,az) até (bx,bz): lista de pontos [x,z] (sem o ponto inicial) ou null
  path(ax, az, bx, bz, maxNodes) {
    const s = this.nearestFree(ax, az), g = this.nearestFree(bx, bz); if (!s || !g) return null;
    if (!maxNodes) maxNodes = Math.min(60000, Math.max(6000, Math.hypot(bx - ax, bz - az) * 500));
    if (this.los(s[0], s[1], g[0], g[1])) return [[g[0], g[1]], [bx, bz]].filter((p, i) => i === 0 || Math.hypot(p[0] - g[0], p[1] - g[1]) > 0.05);
    const si = Math.floor(s[0] / CELL), sj = Math.floor(s[1] / CELL), gi = Math.floor(g[0] / CELL), gj = Math.floor(g[1] / CELL);
    const open = new Heap(); const gs = new Map(), from = new Map(), closed = new Set();
    const h = (i, j) => { const dx = Math.abs(i - gi), dz = Math.abs(j - gj); return (Math.max(dx, dz) + 0.414 * Math.min(dx, dz)) * 1.15; };
    const sk = key(si, sj); gs.set(sk, 0); open.push(sk, h(si, sj)); const ij = new Map([[sk, [si, sj]]]);
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = null, n = 0;
    while (open.size && n++ < maxNodes) {
      const k = open.pop(); if (closed.has(k)) continue; closed.add(k); const [i, j] = ij.get(k);
      if (i === gi && j === gj) { found = k; break; }
      const gk = gs.get(k);
      for (const [di, dj, c] of D) {
        const ni = i + di, nj = j + dj; const nk = key(ni, nj); if (closed.has(nk)) continue;
        if (!this.free((ni + 0.5) * CELL, (nj + 0.5) * CELL)) continue;
        if (di && dj && !this.free((i + di + 0.5) * CELL, (j + 0.5) * CELL) && !this.free((i + 0.5) * CELL, (j + dj + 0.5) * CELL)) continue;
        const ng = gk + c; const old = gs.get(nk); if (old !== undefined && old <= ng) continue;
        gs.set(nk, ng); from.set(nk, k); ij.set(nk, [ni, nj]); open.push(nk, ng + h(ni, nj));
      }
    }
    if (!found) return null;
    const cells = []; for (let k = found; k !== undefined; k = from.get(k)) { const [i, j] = ij.get(k); cells.push([(i + 0.5) * CELL, (j + 0.5) * CELL]); } cells.reverse(); cells[0] = s; cells[cells.length - 1] = g;
    // suavização: pula pontos enquanto houver linha de visão
    const out = []; let a = 0;
    while (a < cells.length - 1) { let b = cells.length - 1; while (b > a + 1 && !this.los(cells[a][0], cells[a][1], cells[b][0], cells[b][1])) b--; out.push(cells[b]); a = b; }
    if (Math.hypot(bx - g[0], bz - g[1]) > 0.05) out.push([bx, bz]);
    return out;
  }
}

class Heap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(k, p) { const K = this.k, P = this.p; let i = K.length; K.push(k); P.push(p); while (i > 0) { const q = (i - 1) >> 1; if (P[q] <= p) break; K[i] = K[q]; P[i] = P[q]; i = q; } K[i] = k; P[i] = p; }
  pop() { const K = this.k, P = this.p; const top = K[0]; const lk = K.pop(), lp = P.pop(); if (K.length) { let i = 0; const n = K.length; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && P[c + 1] < P[c]) c++; if (P[c] >= lp) break; K[i] = K[c]; P[i] = P[c]; i = c; } K[i] = lk; P[i] = lp; } return top; }
}
