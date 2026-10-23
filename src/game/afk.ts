// ============================================================
// LEGENDIA NEXUS — Expediciones AFK (configuración y fórmulas)
// Módulo compartido: el SERVIDOR lo usa para calcular y validar las
// recompensas; el cliente sólo lo usa para mostrar estimaciones.
//
// Todo lo ajustable vive en AFK_CONFIG / EXPEDITIONS: tasas por hora,
// duraciones, requisitos, bonificaciones y límites de economía.
// ============================================================
import {
  CHARACTERS, CHAR_MAP, statsFor, powerOf,
  type Element, type Universe,
} from "./catalog";

/** Límite DURO por expedición. Ninguna definición puede superarlo. */
export const AFK_MAX_HOURS = 12;
export const AFK_MAX_MS = AFK_MAX_HOURS * 3600_000;

export type AfkResource =
  | "gold" | "charXp" | "esencia" | "pergamino" | "cristal" | "stardust" | "fragments";

export const AFK_RESOURCES: Record<AfkResource, { name: string; icon: string }> = {
  gold: { name: "Oro", icon: "🪙" },
  charXp: { name: "EXP de personaje", icon: "📘" },
  esencia: { name: "Esencia Nexus", icon: "🧪" },
  pergamino: { name: "Pergamino Antiguo", icon: "📜" },
  cristal: { name: "Cristal Estelar", icon: "💎" },
  stardust: { name: "Polvo Estelar", icon: "✨" },
  fragments: { name: "Fragmentos de héroe", icon: "🧩" },
};
export const AFK_RESOURCE_ORDER: AfkResource[] =
  ["gold", "charXp", "esencia", "pergamino", "cristal", "stardust", "fragments"];

export interface ExpeditionDef {
  key: string;
  name: string;
  icon: string;
  desc: string;
  hours: number;            // duración total (≤ AFK_MAX_HOURS)
  minPlayerLevel: number;   // requisito de nivel de cuenta
  minPower: number;         // poder total mínimo del escuadrón
  recommendedPower: number; // poder recomendado (afecta un poco a la tasa)
  perHour: Partial<Record<AfkResource, number>>; // tasa base por hora
  specialty: { universe?: Universe; element?: Element; roles?: string[] };
  fragmentRarities: (3 | 4 | 5)[]; // rarezas posibles de los fragmentos
  color: string;
}

export const AFK_CONFIG = {
  /** Multiplicador global de economía: bájalo si el AFK desequilibra la partida. */
  economyScale: 1,
  /** Máximo de expediciones simultáneas según nivel de cuenta. */
  slotsByLevel: [
    { level: 1, slots: 2 }, { level: 10, slots: 3 }, { level: 20, slots: 4 },
  ],
  maxSquad: 3,
  extraMemberBonus: 0.15,        // +15% por cada miembro adicional
  specialist: { element: 0.12, universe: 0.08, role: 0.08, cap: 0.5 },
  mastery: { perLevel: 0.03, maxLevel: 10 }, // nivel de expedición (por clave)
  powerFactor: { min: 0.8, max: 1.15 },
  totalMultiplierCap: 2,
  /** EXP de personaje: curva y reparto. */
  charXpNeeded: (level: number) => 80 + level * 40,
  /** Fragmentos: peso de rareza y coste de uso. */
  fragmentWeights: { 3: 60, 4: 30, 5: 10 } as Record<number, number>,
  squadFragmentBoost: 3,
  fragmentCostResonance: { 3: 20, 4: 40, 5: 80 } as Record<number, number>,
  fragmentCostUnlock: { 3: 40, 4: 80, 5: 160 } as Record<number, number>,
  maxResonance: 5,
};

export const EXPEDITIONS: ExpeditionDef[] = [
  {
    key: "bosque", name: "Bosque Susurrante", icon: "🌲", color: "#43e0a0",
    desc: "Patrullas rápidas por los senderos del bosque. Ideal para empezar.",
    hours: 2, minPlayerLevel: 1, minPower: 0, recommendedPower: 1500,
    perHour: { gold: 140, charXp: 40, esencia: 1.0, fragments: 0.5 },
    specialty: { universe: "shinobi", element: "viento" }, fragmentRarities: [3],
  },
  {
    key: "ruinas", name: "Ruinas del Monasterio", icon: "🏯", color: "#fde68a",
    desc: "Los monjes dejaron tesoros y pergaminos entre las ruinas.",
    hours: 4, minPlayerLevel: 3, minPower: 2200, recommendedPower: 3200,
    perHour: { gold: 200, charXp: 55, esencia: 1.2, pergamino: 0.4, fragments: 0.6 },
    specialty: { universe: "ki", element: "luz" }, fragmentRarities: [3, 4],
  },
  {
    key: "costa", name: "Costa de los Eidolones", icon: "🌊", color: "#67e8f9",
    desc: "Los eidolones dejan cristales en la marea. Requiere un escuadrón fuerte.",
    hours: 6, minPlayerLevel: 6, minPower: 3600, recommendedPower: 5000,
    perHour: { gold: 260, charXp: 75, esencia: 1.4, pergamino: 0.5, cristal: 0.05, fragments: 0.7 },
    specialty: { universe: "arcano", element: "agua" }, fragmentRarities: [3, 4, 5],
  },
  {
    key: "forja", name: "Forja del Volcán", icon: "🌋", color: "#ff6b35",
    desc: "Extraer minerales del corazón del volcán es peligroso, pero rentable.",
    hours: 8, minPlayerLevel: 10, minPower: 5200, recommendedPower: 7000,
    perHour: { gold: 330, charXp: 100, esencia: 1.6, pergamino: 0.6, cristal: 0.08, stardust: 0.3, fragments: 0.8 },
    specialty: { element: "fuego", roles: ["Berserker", "Destructor", "Atacante"] }, fragmentRarities: [3, 4, 5],
  },
  {
    key: "cumbre", name: "Cumbre del Trueno", icon: "⛈️", color: "#ffd93c",
    desc: "Tormentas eternas que cargan de energía a quien las resiste.",
    hours: 10, minPlayerLevel: 15, minPower: 7500, recommendedPower: 9500,
    perHour: { gold: 410, charXp: 130, esencia: 1.8, pergamino: 0.7, cristal: 0.11, stardust: 0.5, fragments: 0.9 },
    specialty: { element: "rayo", roles: ["Tanque", "Duelista", "Guerrera"] }, fragmentRarities: [4, 5],
  },
  {
    key: "abismo", name: "Abismo del Nexus", icon: "🌀", color: "#b18cff",
    desc: "La expedición más larga y peligrosa: 12 horas en el corazón del Nexus.",
    hours: 12, minPlayerLevel: 20, minPower: 10000, recommendedPower: 12500,
    perHour: { gold: 500, charXp: 170, esencia: 2.0, pergamino: 0.8, cristal: 0.15, stardust: 0.7, fragments: 1.0 },
    specialty: { element: "oscuridad", universe: "arcano", roles: ["Archimago", "Mago", "Asesino"] }, fragmentRarities: [4, 5],
  },
];
export const EXPEDITION_MAP: Record<string, ExpeditionDef> =
  Object.fromEntries(EXPEDITIONS.map((e) => [e.key, e]));

/** Duración efectiva en ms: nunca por encima del límite global. */
export const durationMs = (def: ExpeditionDef) =>
  Math.min(def.hours, AFK_MAX_HOURS) * 3600_000;

export function slotsForLevel(level: number): number {
  let s = 1;
  for (const t of AFK_CONFIG.slotsByLevel) if (level >= t.level) s = t.slots;
  return s;
}

export function masteryLevel(completions: number): number {
  return Math.min(AFK_CONFIG.mastery.maxLevel, Math.floor(Math.sqrt(Math.max(0, completions))));
}

export interface SquadMember {
  charKey: string; level: number; resonance: number; transformed: boolean;
  mult?: { hp: number; atk: number; def: number; spd: number };
}

export function memberPower(m: SquadMember): number {
  const def = CHAR_MAP[m.charKey];
  if (!def) return 0;
  return powerOf(statsFor(def, m.level, m.resonance, m.transformed, m.mult));
}

export interface SquadBonus {
  power: number;
  specialist: number;   // 0..cap
  specialists: { charKey: string; reasons: string[] }[];
  extraMembers: number;
  mastery: number;
  powerFactor: number;
  mult: number;          // multiplicador final aplicado a TODAS las tasas
}

/** Calcula el multiplicador del escuadrón. Se congela al iniciar la expedición. */
export function squadBonus(def: ExpeditionDef, squad: SquadMember[], completions: number): SquadBonus {
  const power = squad.reduce((a, m) => a + memberPower(m), 0);
  let spec = 0;
  const specialists: SquadBonus["specialists"] = [];
  for (const m of squad) {
    const c = CHAR_MAP[m.charKey];
    if (!c) continue;
    const reasons: string[] = [];
    if (def.specialty.element && c.element === def.specialty.element) { spec += AFK_CONFIG.specialist.element; reasons.push("elemento"); }
    if (def.specialty.universe && c.universe === def.specialty.universe) { spec += AFK_CONFIG.specialist.universe; reasons.push("universo"); }
    if (def.specialty.roles?.includes(c.role)) { spec += AFK_CONFIG.specialist.role; reasons.push("rol"); }
    if (reasons.length) specialists.push({ charKey: m.charKey, reasons });
  }
  spec = Math.min(AFK_CONFIG.specialist.cap, spec);
  const extra = Math.max(0, squad.length - 1) * AFK_CONFIG.extraMemberBonus;
  const mast = masteryLevel(completions) * AFK_CONFIG.mastery.perLevel;
  const pf = Math.max(AFK_CONFIG.powerFactor.min, Math.min(AFK_CONFIG.powerFactor.max,
    Math.sqrt(power / Math.max(1, def.recommendedPower))));
  const mult = Math.min(AFK_CONFIG.totalMultiplierCap,
    (1 + spec + extra + mast) * pf) * AFK_CONFIG.economyScale;
  return { power, specialist: spec, specialists, extraMembers: extra, mastery: mast, powerFactor: pf, mult };
}

/** Tiempo transcurrido efectivo, acotado a [0, duración]. `nowMs` es la hora del SERVIDOR. */
export function effectiveElapsedMs(def: ExpeditionDef, startedAtMs: number, nowMs: number): number {
  const e = nowMs - startedAtMs;
  if (!Number.isFinite(e) || e <= 0) return 0;
  return Math.min(e, durationMs(def));
}

/**
 * Total acumulado de cada recurso tras `elapsedMs` (acotado a la duración).
 * Es una función acumulativa y monótona: lo reclamado = total(t) − ya concedido,
 * de modo que reclamar muchas veces nunca produce más que reclamar una vez.
 */
export function totalsAt(def: ExpeditionDef, mult: number, elapsedMs: number): Record<AfkResource, number> {
  const ms = Math.max(0, Math.min(elapsedMs, durationMs(def)));
  const hours = ms / 3600_000;
  const out = {} as Record<AfkResource, number>;
  for (const r of AFK_RESOURCE_ORDER) {
    const rate = def.perHour[r] || 0;
    out[r] = Math.floor(rate * mult * hours + 1e-9);
  }
  return out;
}

// ---------- Fragmentos: reparto determinista ----------

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Candidatos de fragmentos de una expedición, con su peso. */
export function fragmentPool(def: ExpeditionDef, squadKeys: string[]): { key: string; weight: number }[] {
  let pool = CHARACTERS.filter((c) => def.fragmentRarities.includes(c.rarity as 3 | 4 | 5));
  if (def.specialty.universe) {
    const u = pool.filter((c) => c.universe === def.specialty.universe || squadKeys.includes(c.key));
    if (u.length) pool = u;
  }
  return pool.map((c) => ({
    key: c.key,
    weight: AFK_CONFIG.fragmentWeights[c.rarity] * (squadKeys.includes(c.key) ? AFK_CONFIG.squadFragmentBoost : 1),
  }));
}

/** A qué héroe corresponde el fragmento nº `index` (1-based) de la expedición `expId`. */
export function fragmentRecipient(expId: number, index: number, pool: { key: string; weight: number }[]): string {
  const rnd = mulberry32((expId * 7919 + index * 104729) >>> 0);
  const total = pool.reduce((a, p) => a + p.weight, 0);
  let r = rnd() * total;
  for (const p of pool) { r -= p.weight; if (r <= 0) return p.key; }
  return pool[pool.length - 1].key;
}

/** Aplica EXP a un personaje respetando el tope de nivel. Devuelve nuevo nivel/xp y xp usada. */
export function applyCharXp(level: number, xp: number, gain: number, cap: number) {
  let lv = level, cur = xp, left = gain, used = 0;
  while (left > 0 && lv < cap) {
    const need = AFK_CONFIG.charXpNeeded(lv) - cur;
    if (left >= need) { left -= need; used += need; cur = 0; lv++; }
    else { cur += left; used += left; left = 0; }
  }
  if (lv >= cap) cur = 0;
  return { level: lv, xp: cur, used };
}

// ---------- Tipos de estado para el cliente ----------

export interface AfkExpeditionState {
  id: number;
  expKey: string;
  charIds: number[];
  startedAt: number;   // ms (hora del servidor)
  endsAt: number;
  granted: Record<string, number>;
  mult: number;
  power: number;
  memberKeys: string[];
  status: "active" | "closed";
}
export interface AfkState {
  serverNow: number;
  slots: number;
  expeditions: AfkExpeditionState[];
  mastery: Record<string, number>; // completados por expedición
}
export interface AfkClaimResult {
  gained: Partial<Record<AfkResource, number>>;
  fragments: Record<string, number>;
  levelUps: { charKey: string; level: number }[];
  wastedXp: number;
  finished: boolean;
}
