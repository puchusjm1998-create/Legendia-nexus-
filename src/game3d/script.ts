// Convierte los BattleFrame (resultado REAL calculado por el servidor) en "beats"
// reproducibles. La animación nunca decide nada: sólo lee los frames. Cada impacto
// lleva el snapshot exacto posterior al golpe, de modo que HP/energía/estados que se
// muestran siempre coinciden con el estado del servidor.
import type { BattleEvent, BattleFrame, BattleSnapshot } from "@/game/battle-engine";

export type ActionKind = "attack" | "skill" | "ultimate";

export interface Hit {
  targetUid: number;
  kind: "damage" | "heal" | "status";
  amount: number;
  crit: boolean;
  advantage: number;
  combo: number;
  statuses: string[];
  /** Snapshot completo tras este impacto. */
  state: BattleSnapshot;
  killed: boolean;
}

export type Beat =
  | { t: "turn"; uid: number; label: string; state: BattleSnapshot }
  | { t: "round"; label: string; state: BattleSnapshot }
  | { t: "move"; uid: number; state: BattleSnapshot }
  | { t: "wait"; uid: number; guard: boolean; state: BattleSnapshot }
  | { t: "stun"; uid: number; label: string; state: BattleSnapshot }
  | { t: "tick"; uid: number; kind: "damage" | "heal"; amount: number; label: string; state: BattleSnapshot }
  | { t: "bossPhase"; uid: number; label: string; state: BattleSnapshot }
  | { t: "end"; label: string; state: BattleSnapshot }
  | { t: "action"; uid: number; action: ActionKind; ultName?: string; hits: Hit[]; state: BattleSnapshot };

export function buildBeats(frames: BattleFrame[]): Beat[] {
  const beats: Beat[] = [];
  let group: { uid: number; action: ActionKind; ultName?: string; hits: Map<number, Hit>; state: BattleSnapshot } | null = null;
  const flush = () => {
    if (!group) return;
    beats.push({ t: "action", uid: group.uid, action: group.action, ultName: group.ultName, hits: [...group.hits.values()], state: group.state });
    group = null;
  };
  const hitFor = (g: NonNullable<typeof group>, e: BattleEvent, state: BattleSnapshot): Hit => {
    const id = e.targetUid ?? -1;
    let h = g.hits.get(id);
    if (!h) {
      h = { targetUid: id, kind: "status", amount: 0, crit: false, advantage: 1, combo: 0, statuses: [], state, killed: false };
      g.hits.set(id, h);
    }
    h.state = state;
    return h;
  };

  for (const f of frames) {
    const e = f.event, s = f.state;
    const inAction = e.action && (e.kind === "damage" || e.kind === "heal" || e.kind === "status" || e.kind === "ultimate");
    if (inAction) {
      if (group && (group.uid !== e.uid || (e.kind === "ultimate" ? true : group.action !== e.action))) flush();
      if (!group) group = { uid: e.uid ?? -1, action: e.action!, hits: new Map(), state: s };
      group.state = s;
      if (e.kind === "ultimate") { group.ultName = e.label; continue; }
      const h = hitFor(group, e, s);
      if (e.kind === "status") { if (e.label) h.statuses.push(e.label); }
      else if (e.kind === "damage" || e.kind === "heal") {
        h.kind = e.kind; h.amount = e.amount ?? 0; h.crit = !!e.crit;
        h.advantage = e.advantage ?? 1; h.combo = e.combo ?? 0;
        h.killed = e.kind === "damage" && !s.units.find((u) => u.uid === e.targetUid)?.alive;
      }
      continue;
    }
    flush();
    switch (e.kind) {
      case "turn": beats.push({ t: "turn", uid: e.uid ?? -1, label: e.label ?? "", state: s }); break;
      case "round": beats.push({ t: "round", label: e.label ?? "", state: s }); break;
      case "move": beats.push({ t: "move", uid: e.uid ?? -1, state: s }); break;
      case "wait": beats.push({ t: "wait", uid: e.uid ?? -1, guard: e.label === "guard", state: s }); break;
      case "stun": beats.push({ t: "stun", uid: e.uid ?? -1, label: e.label ?? "", state: s }); break;
      case "damage": case "heal":
        beats.push({ t: "tick", uid: e.targetUid ?? e.uid ?? -1, kind: e.kind, amount: e.amount ?? 0, label: e.label ?? "", state: s }); break;
      case "bossPhase": beats.push({ t: "bossPhase", uid: e.uid ?? -1, label: e.label ?? "", state: s }); break;
      case "end": beats.push({ t: "end", label: e.label ?? "", state: s }); break;
      default: break;
    }
  }
  flush();
  return beats;
}
