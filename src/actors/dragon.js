// Vésper, a dragoa dos Veladores (no código, 'alva'). Modelo "Tarisland Dragon" de Dr A (CC-BY 4.0), convertido em
// tools/chars/dragon.mjs. Ela descansa no ninho ao lado da gigante do monte; deixa a Lia chegar perto
// se ela vier andando devagar. Montada, voa com física simples mas honesta: velocidade, sustentação,
// perda de velocidade ao subir e ganho ao mergulhar, inclinação nas curvas, batidas de asa quando falta
// fôlego e planeio quando sobra. Sem cavaleira, fica onde pousou; depois do primeiro voo, atende ao assovio da
// Lia: decola, voa até ela de onde estiver e pousa ao lado.
import { THREE, scene, camera, loadGLTF, clamp, lerp, smooth, rand, rr, angDiff, lerpAng } from '../core.js';
import { groundH, normalY, WATER, NINHO } from '../world/terrain.js';

const S = 0.24;            // escala do modelo: ~15 m de comprimento, ~32 m de envergadura
const AIR = 34.1 * S;      // nos clipes aéreos o corpo fica 34 unidades acima da origem
const BODY = 14 * S;       // altura do corpo (pelve) parada no chão
let G = null;
export async function loadDragon() {
  const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
  const { gltfLoader } = await import('../core.js'); gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  G = await loadGLTF('a/dragon/dragon.glb.wasm');
}

// O modelo vem com texturas realistas (escamas finas, relevo detalhado) que destoavam dos personagens
// estilizados. Aqui a cor é reduzida a 256 px e "pintada" em poucos tons (posterizada, um pouco mais quente e
// saturada), o relevo fino quase some e a superfície fica fosca: a dragoa passa a parecer do mesmo mundo.
// (De quebra, usa bem menos memória de vídeo.)
function stylize(m) {
  const img = m.map && m.map.image; if (img && img.width) {
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, N, N);
    const d = g.getImageData(0, 0, N, N), px = d.data, L = 6;
    for (let i = 0; i < px.length; i += 4) {
      let r = px[i] / 255, gg = px[i + 1] / 255, b = px[i + 2] / 255; const l = (r + gg + b) / 3;
      r = l + (r - l) * 1.25; gg = l + (gg - l) * 1.2; b = l + (b - l) * 1.1; r *= 1.06; b *= 0.95; // um pouco mais de cor, mais quente
      const q = (v) => Math.round(Math.min(1, Math.max(0, v)) * L) / L; // poucos tons, como pintado à mão
      px[i] = q(r * 0.85 + 0.08) * 255; px[i + 1] = q(gg * 0.85 + 0.07) * 255; px[i + 2] = q(b * 0.85 + 0.06) * 255;
    }
    g.putImageData(d, 0, 0); g.globalAlpha = 0.5; g.filter = 'blur(1px)'; g.drawImage(c, 0, 0); // suaviza as bordas entre os tons
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = m.map.flipY; t.wrapS = m.map.wrapS; t.wrapT = m.map.wrapT; t.anisotropy = 4;
    m.map.dispose(); m.map = t;
  }
  if (m.normalMap) m.normalScale.set(0.22, 0.22);
  m.roughness = 0.88; m.metalness = 0; if (m.roughnessMap) { m.roughnessMap = null; } if (m.metalnessMap) m.metalnessMap = null; m.needsUpdate = true;
}

export class Dragon {
  constructor() {
    this.root = new THREE.Group(); this.model = G.scene; this.model.scale.setScalar(S); this.root.add(this.model); scene.add(this.root);
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.material) { stylize(o.material); o.material.envMapIntensity = 0.7; } } });
    this.mixer = new THREE.AnimationMixer(this.model); this.act = {}; for (const c of G.animations) { const a = this.mixer.clipAction(c); if (['takeoff', 'land', 'roar'].includes(c.name)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } this.act[c.name] = a; }
    this.bones = {}; this.model.traverse(o => { if (o.isBone) this.bones[o.name] = o; });
    this.head = this.bones['Bip001-Head_011']; this.neck = this.bones['Bip001-Neck1_09']; this.saddle = this.bones['Bip001-Spine2_07'] || this.bones['Dummy002_0114'];
    this.cur = null; this.play('idle', 0);
    this.home = { x: NINHO.x, z: NINHO.z, yaw: Math.atan2(-NINHO.x, -NINHO.z) };
    this.x = this.home.x; this.z = this.home.z; this.y = groundH(this.x, this.z); this.yaw = this.home.yaw; this.pitch = 0; this.bank = 0; this.speed = 0; this.vy = 0;
    this.mode = 'rest'; this.alert = 0; this.lookAt = null; this.t = 0; this.flapK = 0; this.lastPhase = 0; this.trust = 0;
    this.update(0, null);
  }
  play(name, fade = 0.5, speed = 1) { const a = this.act[name]; if (!a) return; a.timeScale = speed; if (this.cur === a) return; a.reset().setEffectiveWeight(1).play(); if (this.cur && fade > 0) a.crossFadeFrom(this.cur, fade, false); else if (this.cur) this.cur.stop(); this.cur = a; this.curName = name; }
  done() { const a = this.cur; return a && a.loop === THREE.LoopOnce && a.time >= a.getClip().duration - 0.03; }
  // posição (mundo) do lugar da cavaleira, na base do pescoço
  seatMatrix(out) { this.model.updateMatrixWorld(true); const b = this.saddle; const p = new THREE.Vector3(), q = new THREE.Quaternion(); b.getWorldPosition(p); this.root.getWorldQuaternion(q); p.add(new THREE.Vector3(0, 1.0, 0).applyQuaternion(q)); out.p = p; out.q = q; return out; }
  bodyPos() { return new THREE.Vector3(this.x, this.y + (this.airborne ? 0 : BODY), this.z); }
  get airborne() { return this.mode === 'fly' || this.mode === 'auto' || this.mode === 'approach' || this.mode === 'takeoff' || this.mode === 'land'; }
  get onGround() { return this.mode === 'rest' || this.mode === 'ready' || this.mode === 'ground'; }
  // assovio: voar até o ponto {x,z,face} e pousar ali
  callTo(spot) { this.target = spot; if (this.onGround) this.takeoff(); else if (this.mode === 'descend') this.mode = 'auto'; }
  // ---------------------------------------------------------------- comandos
  takeoff() { if (this.mode !== 'rest' && this.mode !== 'ready' && this.mode !== 'ground') return; this.mode = 'takeoff'; this.t = 0; this.play('takeoff', 0.4); this.speed = 0; }
  requestLand() { if (this.mode !== 'fly' && this.mode !== 'auto') return false; const gh = groundH(this.x, this.z); if (gh < WATER + 0.5 || normalY(this.x, this.z) < 0.82) return false; this.landTarget = gh; this.mode = 'descend'; return true; }
  // ---------------------------------------------------------------- simulação
  update(dt, input, player) {
    this.t += dt; const mode = this.mode;
    if (mode === 'rest' || mode === 'ready' || mode === 'ground') {
      // no chão: respira, olha a jogadora; se ela chega correndo, levanta a cabeça e se afasta um pouco
      this.y = groundH(this.x, this.z); this.pitch = lerp(this.pitch, 0, dt * 2); this.bank = lerp(this.bank, 0, dt * 2);
      if (player) { const dp = Math.hypot(player.x - this.x, player.z - this.z); this.lookAt = dp < 40 ? new THREE.Vector3(player.x, player.y + 1.5, player.z) : null;
        if (dp < 22 && player.speed > 2.6 && this.trust < 1) { this.alert = 1; this.spooked = (this.spooked || 0) + dt; } else this.alert = Math.max(0, this.alert - dt * 0.3); }
      this.play('idle', 0.6);
      if (mode === 'ground' && this.t > 2) this.mode = 'rest';
    } else if (mode === 'takeoff') {
      this.y = groundH(this.x, this.z);
      if (this.done() || this.t > 1.6) { this.mode = this.rider ? 'fly' : 'auto'; this.y += AIR; this.speed = 7; this.play('hover', 0.25); this.t = 0;
        // chamada de muito longe: decolou fora da vista; reaparece já a caminho, a uns 300 m, vindo do lado onde estava
        const T = this.target; if (!this.rider && T) { const dx = this.x - T.x, dz = this.z - T.z, d = Math.hypot(dx, dz); if (d > 340) { this.x = T.x + dx / d * 300; this.z = T.z + dz / d * 300; this.y = Math.max(groundH(this.x, this.z), WATER) + AIR + 55; this.yaw = Math.atan2(-dx, -dz); this.speed = 18; this.play('glide', 0.2); } } }
    } else if (mode === 'fly' || mode === 'auto' || mode === 'descend') {
      this.flight(dt, mode === 'fly' ? input : this.autopilot(mode));
    } else if (mode === 'approach') {
      this.approach(dt);
    } else if (mode === 'land') {
      if (this.done() || this.t > 1.9) { this.mode = 'ground'; this.t = 0; this.y = groundH(this.x, this.z); this.play('idle', 0.4); this.landed = true; this.target = null; this.onLand && this.onLand(); }
    }
    // pose final
    const lift = (this.mode === 'fly' || this.mode === 'auto' || this.mode === 'descend' || this.mode === 'approach') ? -AIR : 0;
    this.root.position.set(this.x, this.y + lift, this.z); this.root.rotation.set(0, 0, 0, 'YXZ'); this.root.rotation.order = 'YXZ'; this.root.rotation.set(-this.pitch, this.yaw, this.bank);
    this.mixer.update(dt);
    this.proceduralHead(dt);
  }
  autopilot(mode) {
    // sem cavaleira: voa até o alvo (a Lia que assoviou, ou o ninho), perde altura ao chegar e passa à aproximação final
    // (antes o sinal da curva estava trocado: ela virava para o lado oposto e se perdia longe do vale)
    const T = this.target || this.home; const dx = T.x - this.x, dz = T.z - this.z, d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz); const turn = clamp(-angDiff(want, this.yaw) * 1.6, -1, 1);
    if (mode === 'descend') return { turn: 0, climb: -0.6, thrust: 0.2, brake: 0.6 };
    if (d < 45) { this.mode = 'approach'; this.t = 0; return { turn, climb: 0, thrust: 0, brake: 0 }; }
    const ah = this.y - Math.max(groundH(this.x, this.z), WATER) - AIR; const wantAh = d > 160 ? 45 : 12 + d * 0.2;
    return { turn, climb: clamp((wantAh - ah) * 0.06, -0.7, 0.7), thrust: d > 160 ? 1.4 : 0.5, brake: d < 90 && this.speed > 14 ? 0.8 : 0 };
  }
  approach(dt) {
    // aproximação final: diminui a velocidade, desce pairando e pousa no ponto, virada para a Lia
    const T = this.target || this.home; const dx = T.x - this.x, dz = T.z - this.z, d = Math.hypot(dx, dz);
    this.speed = lerp(this.speed, clamp(d * 0.45, 0, 13), clamp(dt * 1.2, 0, 1));
    if (d > 0.05) { const k = Math.min(1, this.speed * dt / d); this.x += dx * k; this.z += dz * k; }
    const wantYaw = d > 6 ? Math.atan2(dx, dz) : (T.face ?? this.yaw); const prev = this.yaw; this.yaw = lerpAng(this.yaw, wantYaw, clamp(dt * (d > 6 ? 1.4 : 2.2), 0, 1));
    this.turnRate = lerp(this.turnRate || 0, angDiff(prev, this.yaw) / Math.max(dt, 1e-3), clamp(dt * 3, 0, 1));
    this.bank = lerp(this.bank, clamp(-this.turnRate * 0.5, -0.3, 0.3), clamp(dt * 2, 0, 1)); this.pitch = lerp(this.pitch, d > 8 ? -0.06 : 0.08, clamp(dt * 1.5, 0, 1));
    const gh = Math.max(groundH(this.x, this.z), WATER); const wantY = gh + AIR + clamp(d - 2, 0, 50) * 0.55;
    this.y += clamp(wantY - this.y, -7 * dt, 9 * dt); if (this.y < gh + AIR) this.y = gh + AIR;
    this.play(this.speed < 6.5 ? 'hover' : 'glide', 0.8); this.flapSound();
    if (d < 1.2 && this.y - groundH(T.x, T.z) < AIR + 0.7) { this.x = T.x; this.z = T.z; this.mode = 'land'; this.t = 0; this.y = groundH(this.x, this.z); this.pitch = 0; this.flapK = 0; this.bank = 0; this.speed = 0; this.turnRate = 0; this.play('land', 0.3); }
    if (this.t > 40) { this.x = T.x; this.z = T.z; this.y = groundH(T.x, T.z) + AIR + 0.5; } // segurança
  }
  flight(dt, inp) {
    inp = inp || { turn: 0, climb: 0, thrust: 0, brake: 0 };
    // pitch e curva com resposta suave (bicho grande tem inércia)
    const targetPitch = clamp(inp.climb * 0.42 - (this.speed < 6 ? 0.08 : 0), -0.6, 0.5);
    this.pitch = lerp(this.pitch, targetPitch, clamp(dt * 1.3, 0, 1));
    this.turnRate = lerp(this.turnRate || 0, inp.turn * (0.55 + 0.25 * smooth(4, 14, this.speed)), clamp(dt * 1.8, 0, 1));
    this.yaw -= this.turnRate * dt; this.bank = lerp(this.bank, clamp(-this.turnRate * 0.75, -0.42, 0.42), clamp(dt * 1.6, 0, 1));
    // velocidade: empuxo das asas, arrasto, e a gravidade ao longo da trajetória (sobe = perde, mergulha = ganha)
    const effort = clamp(inp.thrust + Math.max(0, inp.climb) * 0.8 + (this.speed < 8 ? 0.6 : 0), 0, 1.4);
    const acc = effort * 6.5 - 0.012 * this.speed * this.speed - 9.8 * Math.sin(this.pitch) * 0.9 - inp.brake * 5;
    this.speed = clamp(this.speed + acc * dt, 2.5, 38);
    let vy = this.speed * Math.sin(this.pitch); if (this.speed < 6) vy -= (6 - this.speed) * 1.2; // perto de estolar, afunda
    this.x += Math.sin(this.yaw) * Math.cos(this.pitch) * this.speed * dt; this.z += Math.cos(this.yaw) * Math.cos(this.pitch) * this.speed * dt; this.y += vy * dt;
    // chão e mar: mantém uma folga mínima; nas bordas do mundo, faz a curva de volta
    const floor = Math.max(groundH(this.x, this.z), WATER) + (this.mode === 'descend' ? AIR * 0.9 : AIR * 0.75 + 4);
    if (this.y < floor) { this.y = lerp(this.y, floor, clamp(dt * 4, 0, 1)); this.pitch = Math.max(this.pitch, 0.15); }
    const r = Math.hypot(this.x, this.z); if (r > 1050) { const back = Math.atan2(-this.x, -this.z); this.yaw = lerpAng(this.yaw, back, dt * 0.4); }
    this.y = Math.min(this.y, 420);
    // asas: batendo quando há esforço (ou subindo), planando quando sobra velocidade
    const flapWant = this.mode === 'descend' ? 0.3 : clamp(effort * 0.8 + (this.pitch > 0.12 ? 0.5 : 0) - (this.pitch < -0.15 ? 0.6 : 0), 0, 1);
    this.flapK = lerp(this.flapK, flapWant, clamp(dt * 1.5, 0, 1));
    const name = this.speed < 6.5 ? 'hover' : this.flapK > 0.35 ? 'fly' : 'glide';
    this.play(name, 0.7, name === 'fly' ? 0.85 + this.flapK * 0.35 : 1);
    // pouso: chegou perto do chão descendo
    if (this.mode === 'descend') { const gh = groundH(this.x, this.z); this.speed = lerp(this.speed, 5.5, clamp(dt * 0.8, 0, 1)); this.pitch = lerp(this.pitch, -0.12, clamp(dt * 2, 0, 1)); this.y -= clamp((this.y - gh - AIR) * 0.4 + 1.5, 1.5, 16) * dt; if (this.y - gh < AIR + 0.4) { this.mode = 'land'; this.t = 0; this.y = gh; this.pitch = 0; this.flapK = 0; this.bank = 0; this.speed = 0; this.play('land', 0.3); } }
    // batida de asa: avisa para tocar o som
    this.flapSound();
  }
  flapSound() { if (this.curName === 'fly' || this.curName === 'hover') { const ph = (this.cur.time / this.cur.getClip().duration); if (ph < this.lastPhase) this.onFlap && this.onFlap(this.speed); this.lastPhase = ph; } }
  proceduralHead(dt) {
    // vira a cabeça para olhar a Lia (no chão) ou na direção da curva (no ar)
    if (!this.head) return; let want = 0, wantP = 0;
    if (!this.airborne && this.lookAt) { const hp = new THREE.Vector3(); this.head.getWorldPosition(hp); const d = this.lookAt.clone().sub(hp); want = clamp(angDiff(Math.atan2(d.x, d.z), this.yaw), -1.0, 1.0); wantP = clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.4); if (this.bow) wantP -= this.bow * 0.5; }
    else if (this.airborne) want = -(this.turnRate || 0) * 0.5;
    this.hy = lerp(this.hy || 0, want * (1 - this.alert * 0.3), clamp(dt * 2, 0, 1)); this.hp = lerp(this.hp || 0, wantP - this.alert * 0.25, clamp(dt * 2, 0, 1));
    for (const [b, k] of [[this.neck, 0.45], [this.head, 0.55]]) { if (!b) continue; const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.hy * k, 0)); const qp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -this.hp * k); const pw = new THREE.Quaternion(); b.parent.getWorldQuaternion(pw); const wq = new THREE.Quaternion(); b.getWorldQuaternion(wq); const rq = new THREE.Quaternion(); this.root.getWorldQuaternion(rq); const yawW = rq.clone().multiply(q).multiply(qp).multiply(rq.clone().invert()); wq.premultiply(yawW); b.quaternion.copy(pw.invert().multiply(wq)); b.updateMatrixWorld(true); }
  }
}
