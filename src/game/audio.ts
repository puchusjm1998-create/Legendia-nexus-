// ============================================================
// LEGENDIA NEXUS — Audio original procedural (WebAudio)
// Música épica/melancólica de menú y tema de batalla,
// más efectos de sonido sintetizados. Sin assets con copyright.
// ============================================================

type Track = "menu" | "battle" | null;

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Progresión Am — F — C — G — Dm — Am — E (melancólica, cinematográfica)
const MENU_CHORDS: number[][] = [
  [57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67],
  [50, 57, 62, 65], [57, 60, 64, 69], [52, 56, 59, 64], [52, 56, 59, 64],
];
// Melodía original sobre la progresión (MIDI, -1 = silencio)
const MENU_MELODY: number[] = [
  76, -1, 74, 72, 69, -1, 72, -1, 74, -1, 72, 69, 67, -1, 64, -1,
  65, -1, 69, 72, 76, -1, 74, -1, 72, -1, 71, 69, 68, -1, -1, -1,
];
const BATTLE_BASS: number[] = [45, 45, 52, 45, 41, 41, 48, 41, 43, 43, 50, 43, 40, 40, 47, 52];
const BATTLE_ARP: number[] = [69, 72, 76, 81, 65, 69, 72, 77, 67, 71, 74, 79, 64, 68, 71, 76];

class NexusAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private track: Track = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  musicVol = 0.6;
  sfxVol = 0.8;

  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVol * 0.5;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this.master);
  }

  setVolumes(music: number, sfx: number) {
    this.musicVol = music; this.sfxVol = sfx;
    if (this.musicGain) this.musicGain.gain.value = music * 0.5;
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
  }

  playMusic(track: Track) {
    this.init();
    if (!this.ctx) return;
    if (this.track === track) return;
    this.track = track;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (!track) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 120);
  }

  private schedule() {
    if (!this.ctx || !this.track) return;
    const stepDur = this.track === "menu" ? 60 / 72 / 2 : 60 / 132 / 2;
    while (this.nextTime < this.ctx.currentTime + 0.4) {
      if (this.track === "menu") this.menuStep(this.step, this.nextTime, stepDur);
      else this.battleStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest?: GainNode) {
    if (!this.ctx || !this.musicGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.musicGain);
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
    // arpa suave
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

  private noise(t: number, dur: number, vol: number, freq: number, dest?: GainNode) {
    if (!this.ctx || !this.musicGain) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(dest || this.musicGain);
    src.start(t);
  }

  sfx(name: "click" | "hit" | "crit" | "heal" | "ult" | "summon3" | "summon4" | "summon5" | "victory" | "defeat" | "move" | "levelup") {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const d = this.sfxGain;
    switch (name) {
      case "click": this.tone(880, t, 0.07, "sine", 0.15, d); break;
      case "move": this.tone(520, t, 0.06, "sine", 0.1, d); break;
      case "hit":
        this.noise(t, 0.12, 0.35, 700, d); this.tone(160, t, 0.12, "square", 0.12, d); break;
      case "crit":
        this.noise(t, 0.2, 0.45, 1400, d); this.tone(110, t, 0.22, "sawtooth", 0.18, d); this.tone(1320, t, 0.1, "sine", 0.12, d); break;
      case "heal":
        [660, 880, 1100].forEach((f, i) => this.tone(f, t + i * 0.08, 0.25, "sine", 0.1, d)); break;
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
}

let instance: NexusAudio | null = null;
export function getAudio(): NexusAudio {
  if (!instance) instance = new NexusAudio();
  return instance;
}
