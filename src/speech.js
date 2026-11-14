// Spoken dialogue using the browser's speech synthesis (Portuguese voices).
const PROFILES = {
  bento: { pitch: 0.72, rate: 0.86 },
  iago: { pitch: 0.92, rate: 0.98 },
  mateus: { pitch: 0.66, rate: 0.9 },
  tomas: { pitch: 1.0, rate: 1.02 },
  lore: { pitch: 0.85, rate: 0.92 },
  elowen: { pitch: 1.25, rate: 0.88 },
  teodor: { pitch: 0.7, rate: 0.92 },
  iara: { pitch: 1.15, rate: 0.98 },
  bras: { pitch: 0.8, rate: 0.95 },
  kid: { pitch: 1.6, rate: 1.05 },
};
const MALE_HINT = /(daniel|felipe|ricardo|antonio|ant[oô]nio|duarte|cristiano|joaquim|male|mascul|homem|jorge|paulo|fabio|f[aá]bio|thiago|julio|j[uú]lio|helio|h[eé]lio|reed|rocko|eddy|grandpa)/i;
export const Speech = {
  enabled: true, voice: null, ok: typeof window !== 'undefined' && 'speechSynthesis' in window, current: null,
  init() {
    if (!this.ok) return;
    const pick = () => {
      const vs = speechSynthesis.getVoices(); if (!vs.length) return;
      const pt = vs.filter(v => /^pt/i.test(v.lang));
      const br = pt.filter(v => /BR/i.test(v.lang));
      const pool = br.length ? br : pt;
      this.voice = pool.find(v => MALE_HINT.test(v.name)) || pool.find(v => !/female|feminin|luciana|francisca|maria|vit[oó]ria|joana|raquel|fernanda|helena|camila|thalita|let[ií]cia|google/i.test(v.name)) || pool[0] || null;
    };
    pick(); speechSynthesis.onvoiceschanged = pick;
  },
  speak(text, who, onStart, onEnd) {
    this.stop();
    if (!this.ok || !this.enabled) { onEnd && setTimeout(onEnd, Math.min(9000, 600 + text.length * 55)); onStart && onStart(); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/\.\.\./g, ',').replace(/\(.*?\)/g, ''));
    const p = PROFILES[who] || PROFILES.lore; u.lang = this.voice ? this.voice.lang : 'pt-BR'; if (this.voice) u.voice = this.voice; u.pitch = p.pitch; u.rate = p.rate; u.volume = 1;
    let ended = false; const done = () => { if (ended) return; ended = true; onEnd && onEnd(); };
    u.onstart = () => onStart && onStart(); u.onend = done; u.onerror = done;
    this.current = u; speechSynthesis.speak(u);
    // safety: some browsers never fire onend
    setTimeout(done, 1500 + text.length * 90);
  },
  stop() { if (this.ok) { try { speechSynthesis.cancel(); } catch (e) { } } this.current = null; },
};
