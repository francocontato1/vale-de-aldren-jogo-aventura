// Rede de segurança de desempenho (o que os jogos chamam de "dynamic resolution" + orçamento de quadro).
//
// A qualidade escolhida no menu NÃO muda sozinha: grama, árvores, distância de visão e efeitos ficam como estão.
// Quando o tempo de quadro fica alto por alguns segundos seguidos, este módulo alivia a GPU nesta ordem,
// do que menos se nota para o que mais se nota:
//   nível 1: o mapa de sombras do sol é redesenhado a cada 2 quadros (a 60 qps a diferença é invisível);
//   nível 2-4: a resolução interna cai para 90%, 80% e no mínimo 70% da resolução da qualidade escolhida.
// Quando sobra folga por bastante tempo, volta um passo. Se ficar oscilando, trava no nível estável.
// No celular começa no nível 1 (sombras a cada 2 quadros), o resto só se precisar.
//
// Cuidados: mudar a resolução recria os buffers do pós-processamento e do canvas (no Safari do iPhone, mudar o
// tamanho do canvas pode vazar memória), por isso há um limite de trocas por sessão e um intervalo mínimo entre elas.
import { renderer, isTouch, Q, store } from './core.js';

const RES = [1, 1, 0.9, 0.8, 0.7];
const SLOW_MS = 1000 / 42;   // abaixo de ~42 qps por 2 janelas seguidas: alivia um passo
const FAST_MS = 1000 / 57;   // acima de ~57 qps por 4 janelas seguidas: devolve um passo
const WINDOW_MS = 1500;
const MAX_RES_CHANGES = 10;

// ?manual=1 (testes automáticos) e ?noadapt=1 desligam a adaptação; o nível inicial (sombras) continua valendo
const off = /noadapt=1|manual=1/.test(location.search) || store.get('aldren-adapt') === '0';
const noShadowSkip = /noadapt=1/.test(location.search) || store.get('aldren-adapt') === '0';
const minLevel = isTouch ? 1 : 0;

export const Perf = {
  level: noShadowSkip ? 0 : minLevel, frameNo: 0, last: 0, acc: 0, n: 0, winStart: 0, slow: 0, fast: 0, cool: 0,
  lockAt: -1, lastUpT: -1e9, resChanges: 0, appliedRes: 1, ms: 0, hitches: 0,
  // chamado uma vez por quadro, logo antes de desenhar (Post.render)
  frame(post) {
    const now = performance.now(); this.frameNo++;
    const dt = this.last ? now - this.last : 0; this.last = now;
    // sombras: com nível >= 1, redesenha o mapa a cada 2 quadros (o anterior continua válido: a matriz da luz só
    // é atualizada junto com o mapa, então nada "escorrega")
    const sm = renderer.shadowMap;
    if (this.level >= 1) { sm.autoUpdate = false; sm.needsUpdate = this.frameNo < 3 || (this.frameNo & 1) === 0; }
    else if (!sm.autoUpdate) { sm.autoUpdate = true; }
    if ((this.frameNo & 511) === 0) this.watchMem();
    if (off || document.hidden) return;
    // quadro muito longo isolado = engasgo (carregamento, pausa, aba escondida): não conta. Vários seguidos = aparelho lento: conta.
    if (dt > 250 && dt < 3000) { this.hitches++; this.longRun = (this.longRun || 0) + 1; } else this.longRun = 0;
    if (dt <= 0 || dt >= 3000 || (dt > 250 && this.longRun < 3)) { if (dt >= 3000 || dt <= 0) { this.winStart = now; this.acc = 0; this.n = 0; } return; }
    this.acc += Math.min(dt, 100); this.n++;
    if (now - this.winStart < WINDOW_MS || this.n < 8) return;
    const ms = this.acc / this.n; this.ms = ms; this.acc = 0; this.n = 0; this.winStart = now;
    if (this.cool > 0) { this.cool--; return; }
    if (ms > SLOW_MS) { this.slow++; this.fast = 0; } else if (ms < FAST_MS) { this.fast++; this.slow = 0; } else { this.slow = 0; this.fast = 0; }
    if (this.slow >= 2 && this.level < RES.length - 1) {
      // caiu de novo logo depois de subir: este é o nível que o aparelho aguenta; não tenta mais subir
      if (now - this.lastUpT < 12000) this.lockAt = this.level + 1;
      this.set(this.level + 1, post); this.slow = 0; this.cool = 1;
    } else if (this.fast >= 4 && this.level > minLevel && (this.lockAt < 0 || this.level - 1 >= this.lockAt)) {
      this.set(this.level - 1, post); this.fast = 0; this.cool = 2; this.lastUpT = now;
    }
  },
  set(level, post) {
    const res = RES[level];
    if (res !== this.appliedRes) {
      if (this.resChanges >= MAX_RES_CHANGES) return; // chega de trocar o tamanho do canvas nesta sessão
      this.resChanges++; this.appliedRes = res;
      renderer.setPixelRatio(Q().pr * res); post.setSize(innerWidth, innerHeight);
    }
    this.level = level;
  },
  // vigia de memória: anota quantas geometrias/texturas existem na GPU; se crescer sem parar (vazamento), avisa uma vez no console
  watchMem() {
    const m = renderer.info.memory, now = performance.now();
    if (!this.memBase) { if (this.frameNo > 600) this.memBase = { g: m.geometries, t: m.textures }; return; }
    if (!this.memWarned && (m.textures > this.memBase.t * 1.5 + 150 || m.geometries > this.memBase.g * 1.5 + 600)) { this.memWarned = true; console.warn('memória da GPU crescendo:', { inicio: this.memBase, agora: { g: m.geometries, t: m.textures } }); }
  },
  stats() { const m = renderer.info.memory; return { level: this.level, res: this.appliedRes, ms: +this.ms.toFixed(1), resChanges: this.resChanges, locked: this.lockAt, hitches: this.hitches, geometries: m.geometries, textures: m.textures, memBase: this.memBase || null }; },
};
window.__perf = Perf;
