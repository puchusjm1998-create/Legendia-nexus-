// ============================================================
// LEGENDIA NEXUS — Motor de audio (WebAudio)
//
// • Dos ambientes musicales: "menu" (pantalla inicial + login + menú) y
//   "battle". Cada pista tiene su propio nodo de ganancia; sólo UNA está
//   activa a la vez (la otra se funde y se pausa).
// • La música del menú NO se reinicia al navegar: playMusic("menu") es
//   idempotente y, tras un combate, la pista del menú se REANUDA donde estaba.
// • Pistas procedurales originales por defecto; si existen archivos en
//   /public/audio (ver audio-config.ts) se usan en su lugar.
// • Móviles: desbloqueo en el primer gesto, suspensión al ocultar la pestaña.
// • Volumen de música/efectos/general + silencio, persistidos en localStorage.
// ============================================================
import { MUSIC_FADE, MUSIC_MANIFEST_URL, MUSIC_TRACK_GAIN, type MusicTrack } from "./audio-config";

type Track = MusicTrack | null;
export type SfxName =
  | "click" | "hit" | "crit" | "heal" | "ult" | "summon3" | "summon4" | "summon5"
  | "victory" | "defeat" | "move" | "levelup"
  | "swing" | "cast" | "beam" | "boom" | "charge" | "guard" | "ko" | "whoosh" | "weak" | "buff";

export interface AudioPrefs { music: number; sfx: number; master: number; muted: boolean }
const PREFS_KEY = "legendia_audio_v1";

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Progresión Am — F — C — G — Dm — Am — E (melancólica, cinematográfica)
const MENU_CHORDS: number[][] = [
  [57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67],
  [50, 57, 62, 65], [57, 60, 64, 69], [52, 56, 59, 64], [52, 56, 59, 64],
];
const MENU_MELODY: number[] = [
  76, -1, 74, 72, 69, -1, 72, -1, 74, -1, 72, 69, 67, -1, 64, -1,
  65, -1, 69, 72, 76, -1, 74, -1, 72, -1, 71, 69, 68, -1, -1, -1,
];
const BATTLE_BASS: number[] = [45, 45, 52, 45, 41, 41, 48, 41, 43, 43, 50, 43, 40, 40, 47, 52];
const BATTLE_ARP: number[] = [69, 72, 76, 81, 65, 69, 72, 77, 67, 71, 74, 79, 64, 68, 71, 76];

interface FileTrack { el: HTMLAudioElement; node: MediaElementAudioSourceNode | null }

class NexusAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private trackGain: Partial<Record<MusicTrack, GainNode>> = {};
  private files: Partial<Record<MusicTrack, FileTrack>> = {};
  private fileUrl: Partial<Record<MusicTrack, string | null>> = {};
  private probePromise: Promise<void> | null = null;

  private desired: Track = null;     // pista que se quiere reproducir
  private track: Track = null;       // pista realmente activa
  private transition = 0;            // invalida pausas diferidas obsoletas
  private unlocked = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private steps: Record<MusicTrack, number> = { menu: 0, battle: 0 };
  private dest: GainNode | null = null;
  private hidden = false;
  private starts: Record<MusicTrack, number> = { menu: 0, battle: 0 }; // nº de (re)inicios, para diagnóstico

  musicVol = 0.6;
  sfxVol = 0.8;
  masterVol = 1;
  muted = false;

  constructor() {
    this.loadPrefs();
  }

  // ---------- preferencias ----------
  private loadPrefs() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<AudioPrefs>;
      if (typeof p.music === "number") this.musicVol = p.music;
      if (typeof p.sfx === "number") this.sfxVol = p.sfx;
      if (typeof p.master === "number") this.masterVol = p.master;
      if (typeof p.muted === "boolean") this.muted = p.muted;
    } catch { /* preferencias corruptas: se ignoran */ }
  }
  private savePrefs() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.getPrefs()));
    } catch { /* almacenamiento no disponible */ }
  }
  getPrefs(): AudioPrefs {
    return { music: this.musicVol, sfx: this.sfxVol, master: this.masterVol, muted: this.muted };
  }

  private applyGains() {
    if (!this.ctx || !this.master || !this.musicGain || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9 * this.masterVol, t, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVol * 0.5, t, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.sfxVol, t, 0.03);
  }

  /** Volúmenes (0..1). `persist=false` se usa al sincronizar desde el servidor. */
  setVolumes(music: number, sfx: number, persist = true) {
    this.musicVol = Math.max(0, Math.min(1, music));
    this.sfxVol = Math.max(0, Math.min(1, sfx));
    this.applyGains();
    if (persist) this.savePrefs();
  }
  setMaster(v: number) { this.masterVol = Math.max(0, Math.min(1, v)); this.applyGains(); this.savePrefs(); }
  setMuted(m: boolean) { this.muted = m; this.applyGains(); this.savePrefs(); }

  // ---------- contexto ----------
  init() {
    if (typeof window === "undefined") return;
    if (this.ctx) { if (this.ctx.state === "suspended" && this.unlocked && !this.hidden) void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    for (const t of ["menu", "battle"] as const) {
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.connect(this.musicGain);
      this.trackGain[t] = g;
    }
    this.ctx.addEventListener("statechange", () => {
      // iOS puede dejar el contexto en "interrupted": se reanuda en el siguiente gesto
      if (this.ctx && this.ctx.state !== "running" && this.unlocked && !this.hidden) void this.ctx.resume().catch(() => {});
    });
    this.applyGains();
    this.probe();
  }

  /** Detecta archivos de música aportados por el desarrollador (una vez). */
  private probe(): Promise<void> {
    if (this.probePromise) return this.probePromise;
    this.probePromise = (async () => {
      this.fileUrl = { menu: null, battle: null };
      try {
        const r = await fetch(MUSIC_MANIFEST_URL, { cache: "no-store" });
        if (!r.ok) return;
        const m = (await r.json()) as Partial<Record<MusicTrack, string | null>>;
        for (const t of ["menu", "battle"] as const) {
          const f = m[t];
          if (typeof f !== "string" || !f) continue;
          const url = f.startsWith("/") ? f : `/audio/${f}`;
          try {
            const h = await fetch(url, { method: "HEAD", cache: "no-store" });
            if (h.ok) this.fileUrl[t] = url;
          } catch { /* sin red: procedural */ }
        }
      } catch { /* sin manifiesto: pistas procedurales */ }
    })();
    return this.probePromise;
  }

  /** Primer gesto del usuario: política de autoplay de Chrome/Safari/Android. */
  unlock() {
    if (typeof window === "undefined") return;
    this.init();
    if (!this.ctx) return;
    this.unlocked = true;
    const go = () => { void this.applyDesired(); };
    if (this.ctx.state === "suspended") this.ctx.resume().then(go, go); else go();
  }

  /** Instala los listeners de desbloqueo y de visibilidad (llamar una vez). */
  attachGlobalHandlers() {
    if (typeof window === "undefined" || (this as unknown as { _att?: boolean })._att) return;
    (this as unknown as { _att?: boolean })._att = true;
    const evs = ["pointerdown", "touchend", "keydown", "click"] as const;
    const once = () => { this.unlock(); if (this.unlocked && this.ctx?.state === "running") evs.forEach((e) => window.removeEventListener(e, once, true)); };
    evs.forEach((e) => window.addEventListener(e, once, true));
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.hidden = true;
        void this.ctx.suspend().catch(() => {});
        (Object.values(this.files) as FileTrack[]).forEach((f) => f.el.pause());
      } else {
        this.hidden = false;
        if (this.unlocked) {
          void this.ctx.resume().catch(() => {});
          if (this.track && this.fileUrl[this.track]) void this.files[this.track]?.el.play().catch(() => {});
        }
      }
    });
  }

  // ---------- escenas musicales ----------
  /** Pide una pista. Idempotente: pedir la que ya suena NO la reinicia. */
  playMusic(track: Track) {
    this.desired = track;
    this.init();
    if (!this.unlocked) return; // se aplicará en el primer gesto
    void this.applyDesired();
  }
  setScene(track: Track) { this.playMusic(track); }

  private async applyDesired() {
    if (!this.ctx) return;
    await this.probe();
    const want = this.desired;
    if (want === this.track) {
      // ya suena; si el contexto estaba suspendido y no hay temporizador, se reactiva
      if (want && !this.hidden) this.ensureRunning(want);
      return;
    }
    const prev = this.track;
    this.track = want;
    const id = ++this.transition;
    const t = this.ctx.currentTime;

    if (prev) this.fadeOutAndPause(prev, id);
    if (want) {
      const g = this.trackGain[want]!;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
      g.gain.linearRampToValueAtTime(MUSIC_TRACK_GAIN[want], t + MUSIC_FADE.in);
      this.startTrack(want);
    }
  }

  private ensureRunning(t: MusicTrack) {
    if (this.fileUrl[t]) { const f = this.files[t]; if (f && f.el.paused && !this.hidden) void f.el.play().catch(() => {}); }
    else if (!this.timer) this.startTrack(t);
  }

  private startTrack(t: MusicTrack) {
    if (!this.ctx) return;
    this.starts[t]++;
    if (this.fileUrl[t]) {
      this.stopScheduler();
      const f = this.getFile(t);
      if (f && f.el.paused) void f.el.play().catch(() => {});
    } else {
      // procedural: el menú continúa por el paso en que quedó; el combate empieza de cero
      if (t === "battle") this.steps.battle = 0;
      this.stopScheduler();
      this.nextTime = this.ctx.currentTime + 0.08;
      this.timer = setInterval(() => this.schedule(), 100);
      this.schedule();
    }
  }

  private fadeOutAndPause(t: MusicTrack, _id?: number) {
    if (!this.ctx) return;
    const g = this.trackGain[t]!;
    const now = this.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + MUSIC_FADE.out);
    setTimeout(() => {
      if (this.track === t) return; // volvió a ser la pista activa: no se pausa
      const f = this.files[t];
      if (f) { f.el.pause(); if (t === "battle") f.el.currentTime = 0; }
      if (!this.track) this.stopScheduler();
    }, MUSIC_FADE.out * 1000 + 60);
  }

  private getFile(t: MusicTrack): FileTrack | null {
    if (!this.ctx) return null;
    let f = this.files[t];
    if (!f) {
      const el = new Audio(this.fileUrl[t]!);
      el.loop = true;
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      let node: MediaElementAudioSourceNode | null = null;
      try { node = this.ctx.createMediaElementSource(el); node.connect(this.trackGain[t]!); }
      catch { el.volume = this.musicVol * this.masterVol; }
      f = { el, node };
      this.files[t] = f;
    }
    return f;
  }

  private stopScheduler() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  // ---------- síntesis procedural ----------
  private schedule() {
    if (!this.ctx || !this.track || this.fileUrl[this.track]) return;
    const t = this.track;
    const stepDur = t === "menu" ? 60 / 72 / 2 : 60 / 132 / 2;
    this.dest = this.trackGain[t]!;
    while (this.nextTime < this.ctx.currentTime + 0.4) {
      const step = this.steps[t];
      if (t === "menu") this.menuStep(step, this.nextTime, stepDur);
      else this.battleStep(step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.steps[t] = step + 1;
    }
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest?: GainNode | null) {
    const out = dest || this.dest;
    if (!this.ctx || !out) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private menuStep(step: number, t: number, dur: number) {
    const chordIdx = Math.floor(step / 8) % MENU_CHORDS.length;
    if (step % 8 === 0) {
      for (const n of MENU_CHORDS[chordIdx]) {
        this.tone(NOTE(n), t, dur * 8.5, "sine", 0.055);
        this.tone(NOTE(n - 12), t, dur * 8.5, "triangle", 0.04);
      }
    }
    const arpNote = MENU_CHORDS[chordIdx][step % 4];
    this.tone(NOTE(arpNote + 12), t, dur * 1.8, "sine", 0.028);
    const mel = MENU_MELODY[step % MENU_MELODY.length];
    if (mel > 0) {
      this.tone(NOTE(mel), t, dur * 2.4, "triangle", 0.075);
      this.tone(NOTE(mel) * 1.005, t, dur * 2.4, "sine", 0.03);
    }
  }

  private battleStep(step: number, t: number, dur: number) {
    const bass = BATTLE_BASS[step % 16];
    this.tone(NOTE(bass), t, dur * 0.9, "sawtooth", 0.06);
    const arp = BATTLE_ARP[step % 16];
    this.tone(NOTE(arp), t, dur * 0.8, "square", 0.022);
    if (step % 4 === 0) this.noise(t, 0.08, 0.1, 200);
    if (step % 8 === 4) this.noise(t, 0.12, 0.06, 900);
    if (step % 32 === 0) for (const n of [57, 60, 64]) this.tone(NOTE(n), t, dur * 30, "sine", 0.03);
  }

  private noise(t: number, dur: number, vol: number, freq: number, dest?: GainNode | null, type: BiquadFilterType = "lowpass") {
    const out = dest || this.dest;
    if (!this.ctx || !out) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t);
  }

  /** Barrido de frecuencia (cargas de energía, haces, whoosh). */
  private sweep(f0: number, f1: number, t: number, dur: number, type: OscillatorType, vol: number, dest: GainNode) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.08, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------- efectos ----------
  sfx(name: SfxName) {
    if (typeof window === "undefined") return;
    this.init();
    if (!this.ctx || !this.sfxGain || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    const d = this.sfxGain;
    switch (name) {
      case "click": this.tone(880, t, 0.07, "sine", 0.15, d); break;
      case "move": this.tone(520, t, 0.06, "sine", 0.1, d); break;
      case "hit":
        this.noise(t, 0.12, 0.35, 700, d); this.tone(160, t, 0.12, "square", 0.12, d); break;
      case "crit":
        this.noise(t, 0.2, 0.45, 1400, d); this.tone(110, t, 0.22, "sawtooth", 0.18, d); this.tone(1320, t, 0.1, "sine", 0.12, d); break;
      case "weak":
        this.tone(1760, t, 0.08, "square", 0.08, d); this.tone(2200, t + 0.06, 0.1, "square", 0.07, d); break;
      case "heal":
        [660, 880, 1100].forEach((f, i) => this.tone(f, t + i * 0.08, 0.25, "sine", 0.1, d)); break;
      case "buff":
        [440, 554, 659].forEach((f, i) => this.tone(f, t + i * 0.06, 0.3, "triangle", 0.09, d)); break;
      case "swing": this.sweep(900, 220, t, 0.16, "sawtooth", 0.07, d); this.noise(t, 0.12, 0.12, 2400, d, "highpass"); break;
      case "whoosh": this.sweep(300, 1200, t, 0.22, "triangle", 0.06, d); this.noise(t, 0.2, 0.1, 1800, d, "bandpass"); break;
      case "cast": this.sweep(220, 880, t, 0.35, "sine", 0.1, d); this.tone(1320, t + 0.28, 0.2, "triangle", 0.06, d); break;
      case "beam": this.sweep(140, 90, t, 0.9, "sawtooth", 0.1, d); this.noise(t, 0.9, 0.16, 1200, d, "bandpass"); break;
      case "boom":
        this.noise(t, 0.7, 0.55, 380, d); this.sweep(120, 38, t, 0.7, "sine", 0.34, d); break;
      case "charge": this.sweep(110, 1400, t, 1.1, "sawtooth", 0.07, d); this.sweep(220, 2200, t, 1.1, "sine", 0.06, d); break;
      case "guard": this.tone(300, t, 0.18, "square", 0.1, d); this.tone(450, t + 0.04, 0.18, "triangle", 0.08, d); break;
      case "ko": this.sweep(300, 60, t, 0.6, "sawtooth", 0.12, d); this.noise(t + 0.3, 0.3, 0.2, 300, d); break;
      case "ult":
        this.noise(t, 0.6, 0.5, 400, d);
        this.tone(60, t, 0.7, "sawtooth", 0.22, d);
        [440, 554, 659, 880].forEach((f, i) => this.tone(f, t + 0.15 + i * 0.06, 0.4, "triangle", 0.1, d));
        break;
      case "summon3": this.tone(523, t, 0.3, "sine", 0.14, d); this.tone(659, t + 0.12, 0.3, "sine", 0.14, d); break;
      case "summon4":
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.1, 0.4, "triangle", 0.14, d)); break;
      case "summon5":
        this.noise(t, 0.5, 0.3, 3000, d);
        [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, t + i * 0.09, 0.6, "triangle", 0.16, d));
        this.tone(65, t, 0.8, "sine", 0.2, d);
        break;
      case "victory":
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.14, 0.5, "triangle", 0.16, d));
        [784, 1046, 1318].forEach((f) => this.tone(f, t + 0.6, 1.0, "sine", 0.1, d));
        break;
      case "defeat":
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, t + i * 0.25, 0.6, "triangle", 0.12, d)); break;
      case "levelup":
        [659, 784, 988, 1318].forEach((f, i) => this.tone(f, t + i * 0.07, 0.3, "sine", 0.13, d)); break;
    }
  }

  /** Estado para diagnóstico y pruebas automáticas. */
  debug() {
    const playing = (t: MusicTrack) => this.fileUrl[t]
      ? !!this.files[t] && !this.files[t]!.el.paused
      : this.track === t && !!this.timer;
    return {
      desired: this.desired, track: this.track, unlocked: this.unlocked,
      ctx: this.ctx?.state ?? "none", menuPlaying: playing("menu"), battlePlaying: playing("battle"),
      steps: { ...this.steps }, starts: { ...this.starts }, muted: this.muted,
      sources: { ...this.fileUrl },
      gains: { menu: this.trackGain.menu?.gain.value ?? 0, battle: this.trackGain.battle?.gain.value ?? 0 },
      prefs: this.getPrefs(),
    };
  }
}

let instance: NexusAudio | null = null;
export function getAudio(): NexusAudio {
  if (!instance) {
    instance = new NexusAudio();
    if (typeof window !== "undefined") (window as unknown as { __nexusAudio?: NexusAudio }).__nexusAudio = instance;
  }
  return instance;
}
