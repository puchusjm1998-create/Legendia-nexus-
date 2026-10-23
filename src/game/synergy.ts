// ============================================================
// LEGENDIA NEXUS — Sinergias de equipo (compartido cliente/servidor)
// Se evalúan al iniciar el combate (servidor) y se muestran en la pantalla de
// Equipo (cliente). Sólo dependen de la composición del equipo.
// ============================================================
import { CHAR_MAP, UNIVERSES, type Element, type Universe } from "./catalog";

export interface SynergyBonus { hp?: number; atk?: number; def?: number; spd?: number }
export interface Synergy { id: string; name: string; icon: string; desc: string; bonus: SynergyBonus }

const HEALER_ROLES = ["Sanador", "Sanadora", "Apoyo"];
const TANK_ROLES = ["Tanque", "Paladín"];

const pct = (v?: number) => (v ? Math.round(v * 100) : 0);
export function describeBonus(b: SynergyBonus): string {
  return ([["hp", "PV"], ["atk", "ATK"], ["def", "DEF"], ["spd", "VEL"]] as const)
    .filter(([k]) => b[k]).map(([k, n]) => `+${pct(b[k])}% ${n}`).join(" ");
}

/** Evalúa las sinergias activas de una lista de claves de personaje. */
export function evaluateSynergies(charKeys: string[]): Synergy[] {
  const defs = charKeys.map((k) => CHAR_MAP[k]).filter(Boolean);
  const out: Synergy[] = [];
  const add = (id: string, name: string, icon: string, bonus: SynergyBonus, why: string) =>
    out.push({ id, name, icon, bonus, desc: `${why}: ${describeBonus(bonus)}` });

  // Vínculo de universo (mejor tramo aplicable por universo)
  const byUni = new Map<Universe, number>();
  for (const d of defs) byUni.set(d.universe, (byUni.get(d.universe) || 0) + 1);
  for (const [u, n] of byUni) {
    const info = UNIVERSES[u];
    if (n >= 4) add(`uni-${u}`, `Vínculo ${info.name} IV`, info.icon, { atk: 0.12, def: 0.08, spd: 0.05 }, `4 héroes de ${info.name}`);
    else if (n === 3) add(`uni-${u}`, `Vínculo ${info.name} III`, info.icon, { atk: 0.08, def: 0.05 }, `3 héroes de ${info.name}`);
    else if (n === 2) add(`uni-${u}`, `Vínculo ${info.name} II`, info.icon, { atk: 0.05 }, `2 héroes de ${info.name}`);
  }
  // Resonancia elemental
  const byEl = new Map<Element, number>();
  for (const d of defs) byEl.set(d.element, (byEl.get(d.element) || 0) + 1);
  for (const [e, n] of byEl) if (n >= 2) add(`el-${e}`, `Resonancia ${e[0].toUpperCase()}${e.slice(1)}`, "🔗", { hp: n >= 3 ? 0.12 : 0.06 }, `${n} héroes de ${e}`);
  // Eclipse (luz + oscuridad)
  if (byEl.has("luz") && byEl.has("oscuridad")) add("eclipse", "Eclipse", "🌗", { atk: 0.1 }, "Luz y Oscuridad juntas");
  // Ciclo elemental completo
  if (["fuego", "viento", "rayo", "agua"].every((e) => byEl.has(e as Element)))
    add("cycle", "Ciclo Elemental", "♻️", { hp: 0.06, atk: 0.06, def: 0.06, spd: 0.06 }, "Fuego, viento, rayo y agua");
  // Frente sólido (tanque + apoyo)
  if (defs.some((d) => TANK_ROLES.includes(d.role)) && defs.some((d) => HEALER_ROLES.includes(d.role)))
    add("front", "Frente Sólido", "🛡️", { def: 0.1 }, "Tanque + sanador/apoyo");
  // Tres mundos
  if (byUni.size >= 3) add("worlds", "Tres Mundos", "🌌", { spd: 0.05, hp: 0.04 }, "Héroes de los tres universos");
  return out;
}

export function combineBonus(syn: Synergy[]): Required<SynergyBonus> {
  const t = { hp: 0, atk: 0, def: 0, spd: 0 };
  for (const s of syn) for (const k of ["hp", "atk", "def", "spd"] as const) t[k] += s.bonus[k] || 0;
  // límite razonable para no desequilibrar la economía de combate
  for (const k of ["hp", "atk", "def", "spd"] as const) t[k] = Math.min(0.35, t[k]);
  return t;
}
