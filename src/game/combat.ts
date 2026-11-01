// ============================================================
// LEGENDIA NEXUS — Motor táctico de combate (Reglas, IA y Cálculos)
// ============================================================
import {
  CHAR_MAP, ELEMENTS, statsFor, type CharDef, type Element,
  type SkillDef, type StatusType, type UltimateDef,
} from "./catalog";

export const GRID_W = 7;
export const GRID_H = 5;

export interface StatMult {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface OwnedLike {
  charKey: string;
  level: number;
  resonance: number;
  transformed: boolean;
  skillLevel: number;
}

export interface UnitStatus {
  type: StatusType;
  turns: number;
}

export interface Unit {
  uid: number;
  key: string;
  name: string;
  side: "ally" | "enemy";
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  move: number;
  range: number;
  basicPower: number;
  skillLevel: number;
  x: number;
  y: number;
  alive: boolean;
  chakra: number;
  maxChakra: number;
  energy: number;
  cd: number;
  movedThisTurn: boolean;
  statuses: UnitStatus[];
  transformed: boolean;
  boss?: boolean;
  phase: number;
  color: string;
  element: Element;
  basic: { name: string; power: number };
  skill: SkillDef & { aoe?: number };
  ultimate: UltimateDef & { aoe?: number };
  passive: { name: string; desc: string; type?: "lifesteal" | "regen" | "none"; value?: number };
}

export interface EnemyDef {
  key: string;
  charKey?: string;
  name: string;
  level: number;
  hpMult?: number;
  atkMult?: number;
  boss?: boolean;
  element?: Element;
}

export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const ALLY_SPAWNS = [
  { x: 0, y: 1 },
  { x: 0, y: 3 },
  { x: 1, y: 2 },
  { x: 1, y: 4 },
];

const ENEMY_SPAWNS = [
  { x: 6, y: 2 },
  { x: 5, y: 1 },
  { x: 6, y: 3 },
  { x: 5, y: 4 },
  { x: 6, y: 0 },
];

export function makeAlly(m: OwnedLike, uid: number, index: number, overrideMult?: StatMult): Unit {
  const def = CHAR_MAP[m.charKey] || CHAR_MAP["ryuen"];
  const s = statsFor(def, m.level, m.resonance, m.transformed, overrideMult);
  const spawn = ALLY_SPAWNS[index % ALLY_SPAWNS.length];

  return {
    uid,
    key: def.key,
    name: m.transformed ? def.transform.name : def.name,
    side: "ally",
    level: m.level,
    hp: s.hp,
    maxHp: s.hp,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    move: def.move,
    range: def.range,
    basicPower: def.basic.power,
    skillLevel: m.skillLevel || 1,
    x: spawn.x,
    y: spawn.y,
    alive: true,
    chakra: 4,
    maxChakra: 6,
    energy: 25,
    cd: 0,
    movedThisTurn: false,
    statuses: [],
    transformed: m.transformed,
    boss: false,
    phase: 1,
    color: def.color,
    element: def.element,
    basic: def.basic,
    skill: def.skill,
    ultimate: def.ultimate,
    passive: {
      name: def.passive.name,
      desc: def.passive.desc,
      type: def.passive.name.includes("Sed") ? "lifesteal" : def.passive.name.includes("Vida") ? "regen" : "none",
      value: 0.15,
    },
  };
}

export function makeEnemy(e: EnemyDef, uid: number, index: number): Unit {
  const template = CHAR_MAP[e.key] || CHAR_MAP["kaion"];
  const level = e.level || 5;
  const s = statsFor(template, level, 0, false);
  const hpMult = (e.hpMult || 1) * (e.boss ? 2.5 : 1);
  const atkMult = (e.atkMult || 1) * (e.boss ? 1.3 : 1);
  const maxHp = Math.round(s.hp * hpMult);
  const spawn = ENEMY_SPAWNS[index % ENEMY_SPAWNS.length];

  return {
    uid,
    key: template.key,
    name: e.name || template.name,
    side: "enemy",
    level,
    hp: maxHp,
    maxHp,
    atk: Math.round(s.atk * atkMult),
    def: Math.round(s.def * (e.boss ? 1.25 : 1)),
    spd: Math.round(s.spd * (e.boss ? 1.1 : 0.95)),
    move: template.move,
    range: template.range,
    basicPower: template.basic.power,
    skillLevel: 1,
    x: spawn.x,
    y: spawn.y,
    alive: true,
    chakra: 3,
    maxChakra: 6,
    energy: e.boss ? 50 : 20,
    cd: 0,
    movedThisTurn: false,
    statuses: [],
    transformed: !!e.boss,
    boss: !!e.boss,
    phase: 1,
    color: e.boss ? "#ef4444" : template.color,
    element: e.element || template.element,
    basic: template.basic,
    skill: template.skill,
    ultimate: template.ultimate,
    passive: {
      name: template.passive.name,
      desc: template.passive.desc,
      type: "none",
      value: 0,
    },
  };
}

export function reachableTiles(actor: Unit, units: Unit[]): { x: number; y: number }[] {
  const occupied = new Set(units.filter((u) => u.alive && u.uid !== actor.uid).map((u) => `${u.x},${u.y}`));
  const visited = new Set([`${actor.x},${actor.y}`]);
  const queue = [{ x: actor.x, y: actor.y, depth: 0 }];
  const out: { x: number; y: number }[] = [];

  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur.depth > 0) out.push({ x: cur.x, y: cur.y });
    if (cur.depth >= actor.move) continue;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && !visited.has(key) && !occupied.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, depth: cur.depth + 1 });
      }
    }
  }
  return out;
}

export function elementalAdvantage(attEl: Element, defEl: Element): number {
  if (attEl === "fire" && defEl === "wind") return 1.3;
  if (attEl === "wind" && defEl === "earth") return 1.3;
  if (attEl === "earth" && defEl === "lightning") return 1.3;
  if (attEl === "lightning" && defEl === "water") return 1.3;
  if (attEl === "water" && defEl === "fire") return 1.3;
  if (attEl === "light" && defEl === "dark") return 1.35;
  if (attEl === "dark" && defEl === "light") return 1.35;

  if (defEl === "fire" && attEl === "wind") return 0.8;
  if (defEl === "wind" && attEl === "earth") return 0.8;
  if (defEl === "earth" && attEl === "lightning") return 0.8;
  if (defEl === "lightning" && attEl === "water") return 0.8;
  if (defEl === "water" && attEl === "fire") return 0.8;

  return 1.0;
}

export function hasStatus(u: Unit, type: StatusType): boolean {
  return u.statuses.some((s) => s.type === type && s.turns > 0);
}

export function calcDamage(
  att: Unit,
  target: Unit,
  power: number,
  allies: Unit[],
  isSpecial: boolean,
  skillLevel = 1
): { dmg: number; crit: boolean; combo: number; mult: number } {
  let effectiveAtk = att.atk;
  if (hasStatus(att, "atkUp")) effectiveAtk *= 1.3;

  let effectiveDef = target.def;
  if (hasStatus(target, "defUp")) effectiveDef *= 1.35;
  if (hasStatus(target, "defDown")) effectiveDef *= 0.7;

  const advantage = elementalAdvantage(att.element, target.element);
  const critChance = 0.15 + (att.spd / 300);
  const crit = Math.random() < Math.min(0.65, critChance);
  const critMult = crit ? 1.5 : 1.0;

  // Bono por aliados adyacentes al atacante (Combo táctico de equipo)
  const adjacentAllies = allies.filter((a) => a.uid !== att.uid && a.alive && dist(a, target) <= 1).length;
  const comboMult = 1.0 + adjacentAllies * 0.12;

  const skillBoost = 1.0 + (skillLevel - 1) * 0.08;
  const mitigation = effectiveAtk / (effectiveAtk + effectiveDef * 0.85);
  const raw = effectiveAtk * (power || 1.0) * skillBoost * mitigation * advantage * critMult * comboMult;
  const variance = 0.95 + Math.random() * 0.1;
  const dmg = Math.max(15, Math.round(raw * variance));

  return { dmg, crit, combo: adjacentAllies, mult: advantage };
}

export function healAmount(att: Unit, power = 1.0, skillLevel = 1): number {
  let effectiveAtk = att.atk;
  if (hasStatus(att, "atkUp")) effectiveAtk *= 1.25;
  const skillBoost = 1.0 + (skillLevel - 1) * 0.1;
  const base = effectiveAtk * 1.4 * (power || 1.0) * skillBoost;
  return Math.round(base * (0.95 + Math.random() * 0.1));
}

export function applyEffect(unit: Unit, effect: { type: StatusType; turns: number; chance?: number }) {
  if (effect.chance !== undefined && Math.random() > effect.chance) return false;
  const existing = unit.statuses.find((s) => s.type === effect.type);
  if (existing) {
    existing.turns = Math.max(existing.turns, effect.turns);
  } else {
    unit.statuses.push({ type: effect.type, turns: effect.turns });
  }
  return true;
}

export function tickStatuses(u: Unit): Array<{ type: StatusType; amount: number }> {
  if (!u.alive) return [];
  const events: Array<{ type: StatusType; amount: number }> = [];

  for (const st of u.statuses) {
    if (st.type === "burn") {
      const burnDmg = Math.max(20, Math.round(u.maxHp * 0.07));
      u.hp = Math.max(0, u.hp - burnDmg);
      events.push({ type: "burn", amount: burnDmg });
      if (u.hp === 0) u.alive = false;
    } else if (st.type === "regen") {
      const heal = Math.max(25, Math.round(u.maxHp * 0.08));
      u.hp = Math.min(u.maxHp, u.hp + heal);
      events.push({ type: "regen", amount: heal });
    }
    st.turns--;
  }
  u.statuses = u.statuses.filter((st) => st.turns > 0);
  return events;
}

export function checkBossPhase(u: Unit): boolean {
  if (!u.boss) return false;
  const hpRatio = u.hp / u.maxHp;
  if (u.phase === 1 && hpRatio <= 0.5) {
    u.phase = 2;
    u.atk = Math.round(u.atk * 1.25);
    u.energy = 100;
    return true;
  }
  return false;
}

export function gainEnergy(u: Unit, amount: number) {
  u.energy = Math.min(100, u.energy + amount);
}

export function aoeTargets(center: Unit, radius: number, units: Unit[], side: "ally" | "enemy"): Unit[] {
  return units.filter((u) => u.alive && u.side === side && dist(center, u) <= radius);
}

export function battleStars(allies: Unit[]): number {
  const living = allies.filter((u) => u.alive).length;
  if (living === allies.length) return 3;
  if (living >= 2) return 2;
  return 1;
}

export function aiDecide(actor: Unit, units: Unit[]): {
  moveTo: { x: number; y: number };
  action: "attack" | "skill" | "ultimate" | "wait";
  targetUid: number | null;
} {
  const foes = units.filter((u) => u.side !== actor.side && u.alive);
  const allies = units.filter((u) => u.side === actor.side && u.alive);
  let bestMove = { x: actor.x, y: actor.y };

  if (!foes.length) {
    return { moveTo: bestMove, action: "wait", targetUid: null };
  }

  // Si puede moverse, elegir casilla que lo acerque al enemigo más débil o lo ponga a rango
  if (!actor.movedThisTurn) {
    const tiles = reachableTiles(actor, units);
    if (tiles.length) {
      tiles.sort((a, b) => {
        const minA = Math.min(...foes.map((f) => dist(a, f)));
        const minB = Math.min(...foes.map((f) => dist(b, f)));
        return minA - minB;
      });
      bestMove = tiles[0];
    }
  }

  // 1. Usar definitiva si está al 100% y hay un rival al alcance
  if (actor.energy >= 100) {
    const inRange = foes.filter((f) => dist(bestMove, f) <= actor.ultimate.range);
    if (inRange.length) {
      const target = inRange.sort((a, b) => a.hp - b.hp)[0];
      return { moveTo: bestMove, action: "ultimate", targetUid: target.uid };
    }
  }

  // 2. Usar habilidad de soporte / curación
  if (actor.skill.target === "ally" && actor.cd === 0 && actor.chakra >= actor.skill.cost) {
    const wounded = allies.filter((a) => a.hp / a.maxHp < 0.65 && dist(bestMove, a) <= actor.skill.range)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (wounded) return { moveTo: bestMove, action: "skill", targetUid: wounded.uid };
  }

  // 3. Usar habilidad ofensiva
  if (actor.skill.target === "enemy" && actor.cd === 0 && actor.chakra >= actor.skill.cost) {
    const target = foes.filter((f) => dist(bestMove, f) <= actor.skill.range).sort((a, b) => a.hp - b.hp)[0];
    if (target) return { moveTo: bestMove, action: "skill", targetUid: target.uid };
  }

  // 4. Ataque básico
  const attackTarget = foes.filter((f) => dist(bestMove, f) <= actor.range).sort((a, b) => a.hp - b.hp)[0];
  if (attackTarget) return { moveTo: bestMove, action: "attack", targetUid: attackTarget.uid };

  return { moveTo: bestMove, action: "wait", targetUid: null };
}
