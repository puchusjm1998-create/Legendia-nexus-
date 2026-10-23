// Estado serializable y motor puro del combate. El servidor es el único que
// ejecuta las acciones; los fotogramas sólo describen lo que ha ocurrido.
import {
  aiDecide, aoeTargets, applyEffect, battleStars, calcDamage, checkBossPhase,
  dist, gainEnergy, hasStatus, healAmount, makeAlly, makeEnemy,
  reachableTiles, tickStatuses, type OwnedLike, type StatMult, type Unit,
} from "./combat";
import type { MissionDef } from "./missions";
import type { StatusType } from "./catalog";
import { combineBonus, evaluateSynergies } from "./synergy";

export type BattlePhase = "playing" | "victory" | "defeat" | "retreated";
export interface BattleSnapshot {
  units: Unit[];
  round: number;
  order: number[];
  cursor: number;
  currentUid: number | null;
  phase: BattlePhase;
  revision: number;
  /** Sinergias aplicadas al equipo aliado (opcional: partidas guardadas antes de v1.2 no lo tienen). */
  synergies?: { id: string; name: string; icon: string; desc: string }[];
}
export type BattleCommand =
  | { type: "move"; x: number; y: number; revision: number }
  | { type: "attack" | "skill" | "ultimate"; targetUid: number; revision: number }
  | { type: "wait"; revision: number };

export interface BattleEvent {
  kind: "turn" | "round" | "move" | "damage" | "heal" | "status" |
    "stun" | "wait" | "ultimate" | "bossPhase" | "end";
  uid?: number;
  targetUid?: number;
  /** Qué acción originó el evento (permite vincular la animación al resultado real). */
  action?: "attack" | "skill" | "ultimate";
  amount?: number;
  crit?: boolean;
  advantage?: number;
  combo?: number;
  label?: string;
}
export interface BattleFrame { state: BattleSnapshot; event: BattleEvent }
export interface EngineResult { state: BattleSnapshot; frames: BattleFrame[] }

export class BattleRuleError extends Error {
  constructor(message: string) { super(message); this.name = "BattleRuleError"; }
}

const copy = (s: BattleSnapshot): BattleSnapshot => structuredClone(s);
const frame = (s: BattleSnapshot, out: BattleFrame[], event: BattleEvent) =>
  out.push({ state: copy(s), event });

const turnOrder = (units: Unit[]) => units.filter((u) => u.alive)
  .sort((a, b) => b.spd - a.spd || (a.side === "ally" ? -1 : 1))
  .map((u) => u.uid);

export function createBattle(members: OwnedLike[], mission: MissionDef,
  overrides: { charKey: string; mult: StatMult }[]): EngineResult {
  const allies = members.map((m, i) => makeAlly(m, i + 1, i, overrides.find((o) => o.charKey === m.charKey)?.mult));
  if (!allies.length || allies.length > 4) throw new BattleRuleError("Equipo inválido.");
  const enemies = mission.enemies.map((e, i) => makeEnemy(e, 1000 + i, i));
  // Sinergias de formación: bonificación porcentual de stats a todo el equipo aliado.
  const synergies = evaluateSynergies(allies.map((a) => a.key));
  const bonus = combineBonus(synergies);
  for (const a of allies) {
    a.maxHp = Math.round(a.maxHp * (1 + bonus.hp)); a.hp = a.maxHp;
    a.atk = Math.round(a.atk * (1 + bonus.atk));
    a.def = Math.round(a.def * (1 + bonus.def));
    a.spd = Math.round(a.spd * (1 + bonus.spd));
  }
  const units = [...allies, ...enemies];
  const state: BattleSnapshot = {
    units, round: 1, order: turnOrder(units), cursor: -1,
    currentUid: null, phase: "playing", revision: 0,
    synergies: synergies.map(({ id, name, icon, desc }) => ({ id, name, icon, desc })),
  };
  const frames: BattleFrame[] = [];
  advance(state, frames);
  return { state, frames };
}

function ended(s: BattleSnapshot, frames: BattleFrame[]) {
  const livingAllies = s.units.some((u) => u.side === "ally" && u.alive);
  const livingEnemies = s.units.some((u) => u.side === "enemy" && u.alive);
  if (livingAllies && livingEnemies) return false;
  s.phase = livingAllies ? "victory" : "defeat";
  s.currentUid = null;
  frame(s, frames, { kind: "end", label: s.phase });
  return true;
}

function effectLabel(type: StatusType): string {
  return ({ burn: "QUEMADO 🔥", stun: "ATURDIDO 💫", atkUp: "ATK ↑",
    defUp: "DEF ↑", defDown: "DEF ↓", regen: "REGEN 💚" })[type];
}

function perform(s: BattleSnapshot, frames: BattleFrame[], att: Unit,
  kind: "attack" | "skill" | "ultimate", targetUid: number) {
  const definition = kind === "attack" ? null : kind === "skill" ? att.skill : att.ultimate;
  const side = definition && definition.target !== "enemy" ? att.side : att.side === "ally" ? "enemy" : "ally";
  const target = s.units.find((u) => u.uid === targetUid && u.alive && u.side === side);
  if (!target) throw new BattleRuleError("Selecciona un objetivo válido.");
  const range = definition?.range ?? att.range;
  if (dist(att, target) > range) throw new BattleRuleError("Objetivo fuera de alcance. Muévete primero.");
  if (definition?.target === "self" && target.uid !== att.uid)
    throw new BattleRuleError("Esta habilidad sólo puede usarse sobre el propio héroe.");
  if (kind === "skill") {
    if (att.cd > 0) throw new BattleRuleError("La habilidad aún está en recarga.");
    if (att.chakra < att.skill.cost) throw new BattleRuleError("Chakra insuficiente.");
    att.chakra -= att.skill.cost;
    // En el próximo turno se resta 1: CD 2 implica saltar un turno propio.
    att.cd = att.skill.cooldown + 1;
  }
  if (kind === "ultimate") {
    if (att.energy < 100) throw new BattleRuleError("La técnica definitiva necesita 100% de energía.");
    att.energy = 0;
    frame(s, frames, { kind: "ultimate", uid: att.uid, action: "ultimate", label: att.ultimate.name });
  }

  const targets = definition?.aoe && definition.aoe > 0
    ? aoeTargets(target, definition.aoe, s.units, side)
    : [target];
  const allies = s.units.filter((u) => u.side === att.side && u.alive);
  const power = kind === "attack" ? att.basicPower : definition!.power;
  for (const victim of targets) {
    if (definition && definition.target !== "enemy") {
      if (power > 0) {
        const before = victim.hp;
        victim.hp = Math.min(victim.maxHp, victim.hp + healAmount(att, power, att.skillLevel));
        frame(s, frames, { kind: "heal", uid: att.uid, targetUid: victim.uid, action: kind, amount: victim.hp - before });
      }
      if (definition.effect && applyEffect(victim, definition.effect))
        frame(s, frames, { kind: "status", uid: att.uid, targetUid: victim.uid, action: kind, label: effectLabel(definition.effect.type) });
    } else {
      const result = calcDamage(att, victim, power, allies, kind !== "attack", att.skillLevel);
      victim.hp = Math.max(0, victim.hp - result.dmg);
      if (att.passive.type === "lifesteal")
        att.hp = Math.min(att.maxHp, att.hp + Math.round(result.dmg * att.passive.value));
      gainEnergy(victim, 10);
      if (definition?.effect && victim.hp > 0 && applyEffect(victim, definition.effect))
        frame(s, frames, { kind: "status", uid: att.uid, targetUid: victim.uid, action: kind, label: effectLabel(definition.effect.type) });
      if (victim.hp === 0) victim.alive = false;
      frame(s, frames, {
        kind: "damage", uid: att.uid, targetUid: victim.uid, action: kind, amount: result.dmg,
        crit: result.crit, combo: result.combo, advantage: result.mult,
      });
      if (checkBossPhase(victim))
        frame(s, frames, { kind: "bossPhase", uid: victim.uid, label: `${victim.name}: ¡FASE 2!` });
    }
  }
  gainEnergy(att, definition && definition.target !== "enemy" ? 20 : kind === "attack" ? 25 : 15);
  // La muerte por daño debe evaluarse antes de avanzar la iniciativa.
  ended(s, frames);
}

function advance(s: BattleSnapshot, frames: BattleFrame[]) {
  // Saltar muertos/aturdidos y ejecutar turnos de IA hasta un aliado jugable.
  for (let safety = 0; safety < 500 && s.phase === "playing"; safety++) {
    if (ended(s, frames)) return;
    s.cursor++;
    if (s.cursor >= s.order.length) {
      s.round++;
      if (s.round > 60) {
        s.phase = "defeat";
        s.currentUid = null;
        frame(s, frames, { kind: "end", label: "Límite de 60 rondas" });
        return;
      }
      s.order = turnOrder(s.units);
      s.cursor = 0;
      frame(s, frames, { kind: "round", label: `Ronda ${s.round}` });
    }
    const u = s.units.find((unit) => unit.uid === s.order[s.cursor]);
    if (!u || !u.alive) continue;
    s.currentUid = u.uid;
    u.movedThisTurn = false;
    u.chakra = Math.min(u.maxChakra, u.chakra + 1);
    u.cd = Math.max(0, u.cd - 1);
    const stunned = !!hasStatus(u, "stun");
    const effects = tickStatuses(u);
    if (u.alive && u.passive.type === "regen") {
      const heal = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * u.passive.value));
      u.hp += heal;
      if (heal) frame(s, frames, { kind: "heal", uid: u.uid, targetUid: u.uid, amount: heal, label: "Pasiva" });
    }
    for (const e of effects) frame(s, frames, {
      kind: e.type === "burn" ? "damage" : "heal", uid: u.uid, targetUid: u.uid,
      amount: e.amount, label: e.type === "burn" ? "QUEMADURA" : "REGENERACIÓN",
    });
    frame(s, frames, { kind: "turn", uid: u.uid, label: u.name });
    if (ended(s, frames)) return;
    if (!u.alive) continue;
    if (stunned) {
      frame(s, frames, { kind: "stun", uid: u.uid, label: `${u.name} pierde el turno` });
      continue;
    }
    if (u.side === "ally") return;
    const ai = aiDecide(u, s.units);
    if (ai.moveTo.x !== u.x || ai.moveTo.y !== u.y) {
      if (reachableTiles(u, s.units).some((t) => t.x === ai.moveTo.x && t.y === ai.moveTo.y)) {
        u.x = ai.moveTo.x;
        u.y = ai.moveTo.y;
        u.movedThisTurn = true;
        frame(s, frames, { kind: "move", uid: u.uid });
      }
    }
    if (ai.action !== "wait" && ai.targetUid !== null) {
      perform(s, frames, u, ai.action, ai.targetUid);
      if (s.phase !== "playing") return;
    } else {
      gainEnergy(u, 10);
      frame(s, frames, { kind: "wait", uid: u.uid });
    }
  }
  if (s.phase === "playing") {
    s.phase = "defeat";
    s.currentUid = null;
    frame(s, frames, { kind: "end", label: "Combate interrumpido por exceso de turnos" });
  }
}

export function applyPlayerAction(original: BattleSnapshot, raw: unknown): EngineResult {
  if (original.phase !== "playing") throw new BattleRuleError("Esta batalla ya ha terminado.");
  if (!raw || typeof raw !== "object") throw new BattleRuleError("Acción inválida.");
  const command = raw as Partial<BattleCommand>;
  if (!Number.isInteger(command.revision) || command.revision !== original.revision)
    throw new BattleRuleError("Estado desactualizado: vuelve a cargar la batalla.");
  const s = copy(original);
  const actor = s.units.find((u) => u.uid === s.currentUid && u.alive && u.side === "ally");
  if (!actor) throw new BattleRuleError("Espera al turno de tu equipo.");
  const frames: BattleFrame[] = [];
  switch (command.type) {
    case "move": {
      if (!Number.isInteger(command.x) || !Number.isInteger(command.y))
        throw new BattleRuleError("Casilla inválida.");
      if (actor.movedThisTurn) throw new BattleRuleError("Ya te moviste este turno.");
      if (!reachableTiles(actor, s.units).some((t) => t.x === command.x && t.y === command.y))
        throw new BattleRuleError("La casilla no es alcanzable.");
      actor.x = command.x!;
      actor.y = command.y!;
      actor.movedThisTurn = true;
      s.revision++;
      frame(s, frames, { kind: "move", uid: actor.uid });
      break;
    }
    case "attack":
    case "skill":
    case "ultimate": {
      if (!Number.isInteger(command.targetUid)) throw new BattleRuleError("Selecciona un objetivo válido.");
      perform(s, frames, actor, command.type, command.targetUid!);
      s.revision++;
      if (s.phase === "playing") advance(s, frames);
      break;
    }
    case "wait": {
      // «Esperar» = guardia: +10 de energía y DEF +30% hasta su próximo turno.
      gainEnergy(actor, 10);
      applyEffect(actor, { type: "defUp", chance: 1, turns: 1, value: 0.3 });
      s.revision++;
      frame(s, frames, { kind: "wait", uid: actor.uid, label: "guard" });
      advance(s, frames);
      break;
    }
    default: throw new BattleRuleError("Acción desconocida.");
  }
  return { state: s, frames };
}

export function resultStars(state: BattleSnapshot): number {
  return battleStars(state.units.filter((u) => u.side === "ally"));
}
