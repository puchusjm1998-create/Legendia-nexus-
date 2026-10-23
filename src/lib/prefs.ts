// Preferencias de combate/gráficos. Se guardan en localStorage (disponibles ya en
// la pantalla de login) y se sincronizan con los ajustes de la cuenta del servidor.
import type { PlayerSettings } from "@/db/schema";

export interface CombatPrefs {
  animSpeed: 1 | 1.5 | 2;
  skipUlt: boolean;
  quality: "auto" | "high" | "low" | "2d";
}
const KEY = "legendia_combat_v1";
export const DEFAULT_COMBAT_PREFS: CombatPrefs = { animSpeed: 1, skipUlt: false, quality: "auto" };

export function getCombatPrefs(): CombatPrefs {
  if (typeof window === "undefined") return DEFAULT_COMBAT_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_COMBAT_PREFS;
    const p = JSON.parse(raw) as Partial<CombatPrefs>;
    return {
      animSpeed: p.animSpeed === 1.5 || p.animSpeed === 2 ? p.animSpeed : 1,
      skipUlt: !!p.skipUlt,
      quality: p.quality === "high" || p.quality === "low" || p.quality === "2d" ? p.quality : "auto",
    };
  } catch { return DEFAULT_COMBAT_PREFS; }
}
export function setCombatPrefs(p: Partial<CombatPrefs>): CombatPrefs {
  const next = { ...getCombatPrefs(), ...p };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  return next;
}
export function mergeServerPrefs(s: PlayerSettings) {
  const patch: Partial<CombatPrefs> = {};
  if (s.animSpeed) patch.animSpeed = s.animSpeed;
  if (typeof s.skipUlt === "boolean") patch.skipUlt = s.skipUlt;
  if (s.quality) patch.quality = s.quality;
  if (Object.keys(patch).length) setCombatPrefs(patch);
}
