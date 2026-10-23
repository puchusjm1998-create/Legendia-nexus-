// Sistema de animación por poses clave para el esqueleto articulado provisional.
// Cada clip es una lista de poses (fotogramas clave) o una función del tiempo.
// Los modelos .glb definitivos usan sus propios clips (ver models.ts) con los mismos nombres.
export type ClipName =
  | "idle" | "run" | "melee" | "shoot" | "skill" | "ultCharge" | "ultRelease"
  | "hit" | "guard" | "buff" | "heal" | "defeat" | "victory" | "stun" | "intro";

export type Pose = Partial<Record<PoseKey, number>>;
export type PoseKey =
  | "bodyX" | "bodyY" | "bodyZ" | "bodyRX" | "bodyRY" | "bodyRZ"
  | "spineX" | "spineY" | "spineZ" | "headX" | "headY" | "headZ"
  | "aLx" | "aLy" | "aLz" | "eL" | "aRx" | "aRy" | "aRz" | "eR"
  | "lLx" | "lLz" | "kL" | "lRx" | "lRz" | "kR";

export const POSE_KEYS: PoseKey[] = [
  "bodyX", "bodyY", "bodyZ", "bodyRX", "bodyRY", "bodyRZ", "spineX", "spineY", "spineZ",
  "headX", "headY", "headZ", "aLx", "aLy", "aLz", "eL", "aRx", "aRy", "aRz", "eR",
  "lLx", "lLz", "kL", "lRx", "lRz", "kR",
];

export const REST: Required<Pose> = {
  bodyX: 0, bodyY: 0, bodyZ: 0, bodyRX: 0, bodyRY: 0, bodyRZ: 0, spineX: 0, spineY: 0, spineZ: 0,
  headX: 0, headY: 0, headZ: 0, aLx: 0, aLy: 0, aLz: 0.14, eL: -0.18, aRx: 0, aRy: 0, aRz: -0.14, eR: -0.18,
  lLx: 0, lLz: 0.03, kL: 0, lRx: 0, lRz: -0.03, kR: 0,
};

export interface ClipDef {
  dur: number;
  loop: boolean;
  /** Instante (s) en que el golpe/efecto "conecta"; el escenario sincroniza el daño con él. */
  impact?: number;
  kf?: [number, Pose][];
  fn?: (t: number) => Pose;
}

const sm = (x: number) => x * x * (3 - 2 * x);
const S = Math.sin;

export const CLIPS: Record<ClipName, ClipDef> = {
  idle: {
    dur: 2, loop: true,
    fn: (t) => ({
      bodyY: S(t * 3) * 0.02, spineX: S(t * 3) * 0.025, headX: S(t * 3 + 1) * 0.03,
      aLz: 0.14 + S(t * 3) * 0.03, aRz: -0.14 - S(t * 3) * 0.03, aLx: S(t * 1.5) * 0.05, aRx: -S(t * 1.5) * 0.05,
    }),
  },
  run: {
    dur: 0.5, loop: true,
    fn: (t) => {
      const p = t * 14;
      return {
        bodyY: Math.abs(S(p)) * 0.09, bodyRX: 0.2, spineX: 0.08,
        lLx: S(p) * 0.9, lRx: -S(p) * 0.9, kL: Math.max(0, -S(p)) * 1.1, kR: Math.max(0, S(p)) * 1.1,
        aLx: -S(p) * 0.8, aRx: S(p) * 0.8, eL: -0.9, eR: -0.9, headX: -0.1,
      };
    },
  },
  melee: {
    dur: 0.85, loop: false, impact: 0.36,
    kf: [
      [0, {}],
      [0.2, { spineY: -0.7, spineX: -0.1, aRx: -2.6, eR: -0.6, aLx: -0.4, lLx: 0.5, lRx: -0.4, bodyRX: -0.1, bodyZ: -0.1 }],
      [0.34, { spineY: 0.8, spineX: 0.5, aRx: -1.1, eR: -0.1, aLx: 0.5, lLx: 0.7, lRx: -0.7, bodyRX: 0.25, bodyZ: 0.2, headX: 0.1 }],
      [0.5, { spineY: 0.6, spineX: 0.35, aRx: -1.0, eR: -0.15, lLx: 0.6, lRx: -0.6, bodyRX: 0.2, bodyZ: 0.15 }],
      [0.85, {}],
    ],
  },
  shoot: {
    dur: 0.95, loop: false, impact: 0.45,
    kf: [
      [0, {}],
      [0.2, { aRx: -1.25, eR: -1.7, aLx: -1.45, eL: -0.2, spineX: -0.12, bodyRX: -0.08, headX: -0.1 }],
      [0.42, { aRx: -1.55, eR: -0.05, aLx: -1.5, eL: -0.1, spineX: 0.18, bodyRX: 0.12, bodyZ: 0.1 }],
      [0.62, { aRx: -1.5, eR: -0.1, aLx: -1.4, spineX: 0.12 }],
      [0.95, {}],
    ],
  },
  skill: {
    dur: 1.15, loop: false, impact: 0.62,
    kf: [
      [0, {}],
      [0.28, { kL: 0.8, kR: 0.8, lLx: -0.4, lRx: -0.4, bodyY: -0.2, aRx: -2.1, aLx: -2.1, eR: -0.7, eL: -0.7, spineX: -0.15 }],
      [0.48, { bodyY: 0.55, aRx: -3.0, aLx: -3.0, eR: -0.1, eL: -0.1, spineX: -0.25, lLx: 0.4, lRx: 0.4, kL: 0.3, kR: 0.3 }],
      [0.64, { bodyY: 0.05, aRx: -1.2, aLx: -1.0, eR: -0.1, spineX: 0.55, bodyRX: 0.2, bodyZ: 0.2, kL: 0.5, kR: 0.2, lLx: -0.5, lRx: 0.2 }],
      [0.9, { spineX: 0.35, bodyRX: 0.15, aRx: -0.9, kL: 0.3, kR: 0.1 }],
      [1.15, {}],
    ],
  },
  ultCharge: {
    dur: 1, loop: true,
    fn: (t) => ({
      bodyY: -0.06 + S(t * 30) * 0.012, kL: 0.4, kR: 0.4, lLx: -0.2, lRx: -0.2, lLz: 0.18, lRz: -0.18,
      aLx: -2.9, aRx: -2.9, aLz: 0.25, aRz: -0.25, eL: -0.35, eR: -0.35, headX: -0.4, spineX: -0.18,
    }),
  },
  ultRelease: {
    dur: 1.0, loop: false, impact: 0.18,
    kf: [
      [0, { aLx: -2.9, aRx: -2.9, headX: -0.4, kL: 0.4, kR: 0.4, spineX: -0.18, bodyY: -0.06 }],
      [0.14, { aLx: -1.55, aRx: -1.55, eL: -0.05, eR: -0.05, aLz: 0.05, aRz: -0.05, spineX: 0.55, bodyRX: 0.2, bodyZ: 0.25, kL: 0.5, kR: 0.1, lLx: -0.6, lRx: 0.4, headX: 0.15 }],
      [0.6, { aLx: -1.5, aRx: -1.5, eL: -0.08, eR: -0.08, spineX: 0.5, bodyRX: 0.2, bodyZ: 0.25, kL: 0.5, kR: 0.1, lLx: -0.6, lRx: 0.4 }],
      [1.0, {}],
    ],
  },
  hit: {
    dur: 0.4, loop: false,
    kf: [
      [0, {}],
      [0.07, { bodyRX: -0.4, bodyZ: -0.28, headX: -0.45, aLx: 0.7, aRx: 0.7, spineX: -0.2, kL: 0.25, kR: 0.25 }],
      [0.4, {}],
    ],
  },
  guard: {
    dur: 0.8, loop: false,
    kf: [
      [0, {}],
      [0.12, { aLx: -1.35, aLz: -0.8, eL: -2.0, aRx: -1.35, aRz: 0.8, eR: -2.0, kL: 0.35, kR: 0.35, bodyY: -0.1, headX: 0.2, spineX: 0.15 }],
      [0.55, { aLx: -1.35, aLz: -0.8, eL: -2.0, aRx: -1.35, aRz: 0.8, eR: -2.0, kL: 0.35, kR: 0.35, bodyY: -0.1, headX: 0.2, spineX: 0.15 }],
      [0.8, {}],
    ],
  },
  buff: {
    dur: 0.95, loop: false, impact: 0.35,
    kf: [
      [0, {}],
      [0.3, { aLz: 2.3, aRz: -2.3, eL: -0.2, eR: -0.2, headX: -0.35, bodyY: 0.08, spineX: -0.1 }],
      [0.5, { aLz: 2.5, aRz: -2.5, aLx: -0.6, aRx: -0.6, headX: -0.4, bodyY: 0.2, spineX: -0.15 }],
      [0.95, {}],
    ],
  },
  heal: {
    dur: 1.0, loop: false, impact: 0.45,
    kf: [
      [0, {}],
      [0.3, { aLx: -1.1, aRx: -1.1, aLz: -0.2, aRz: 0.2, eL: -1.4, eR: -1.4, headX: 0.2, spineX: 0.1 }],
      [0.5, { aLx: -1.5, aRx: -1.5, aLz: 0.45, aRz: -0.45, eL: -0.3, eR: -0.3, headX: -0.15, spineX: 0.05 }],
      [1.0, {}],
    ],
  },
  defeat: {
    dur: 0.9, loop: false,
    kf: [
      [0, {}],
      [0.2, { bodyRX: -0.5, bodyZ: -0.3, headX: -0.5, aLx: 0.8, aRx: 0.8 }],
      [0.9, { bodyRX: -1.5, bodyY: 0.18, bodyZ: -0.45, aLz: 1.1, aRz: -1.1, headX: -0.2, kL: 0.5, kR: 0.2, lLz: 0.25, lRz: -0.25 }],
    ],
  },
  victory: {
    dur: 1.2, loop: true,
    fn: (t) => {
      const j = Math.abs(S(t * 4.5));
      return { bodyY: j * 0.38, aRx: -2.9 + S(t * 9) * 0.12, aLx: -2.6, aLz: 0.3, aRz: -0.25, eR: -0.2, eL: -0.3,
        kL: (1 - j) * 0.5, kR: (1 - j) * 0.5, headX: -0.2, spineX: -0.1 };
    },
  },
  stun: {
    dur: 1, loop: true,
    fn: (t) => ({ headZ: S(t * 7) * 0.35, headX: 0.25, bodyRZ: S(t * 7 + 1) * 0.12, spineX: 0.18, aLx: 0.3, aRx: 0.3, kL: 0.15, kR: 0.15 }),
  },
  intro: {
    dur: 0.95, loop: false,
    kf: [
      [0, { bodyY: -0.35, kL: 1.1, kR: 1.1, lLx: -0.6, lRx: -0.6, spineX: 0.5, aLz: 0.7, aRz: -0.7, headX: 0.4 }],
      [0.4, { bodyY: 0.3, aLz: 1.1, aRz: -1.1, headX: -0.3 }],
      [0.65, { bodyY: -0.03, kL: 0.2, kR: 0.2, aLz: 0.5, aRz: -0.5 }],
      [0.95, {}],
    ],
  },
};

export function samplePose(def: ClipDef, time: number): Required<Pose> {
  const out = { ...REST };
  let src: Pose | undefined;
  if (def.fn) {
    src = def.fn(time % (def.dur || 1));
    for (const k of POSE_KEYS) if (src[k] !== undefined) out[k] = src[k]!;
    return out;
  }
  const kf = def.kf!;
  const t = Math.min(time, kf[kf.length - 1][0]);
  let i = 0;
  while (i < kf.length - 2 && t > kf[i + 1][0]) i++;
  const [t0, p0] = kf[i], [t1, p1] = kf[i + 1];
  const f = t1 > t0 ? sm(Math.max(0, Math.min(1, (t - t0) / (t1 - t0)))) : 1;
  for (const k of POSE_KEYS) {
    const a = p0[k] ?? REST[k], b = p1[k] ?? REST[k];
    out[k] = a + (b - a) * f;
  }
  return out;
}

export function lerpPose(a: Required<Pose>, b: Required<Pose>, f: number): Required<Pose> {
  const out = { ...a };
  for (const k of POSE_KEYS) out[k] = a[k] + (b[k] - a[k]) * f;
  return out;
}
