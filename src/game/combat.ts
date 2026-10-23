// ============================================================
// LEGENDIA NEXUS — Motor de combate táctico por turnos
// Cuadrícula 7x5, movimiento por casillas, combos, estados,
// afinidades elementales, IA enemiga y jefes con fases.
// ============================================================
import {
  ADVANTAGE, CHAR_MAP, statsFor,
  type CharDef, type Element, type PassiveDef, type SkillDef, type SkillEffect, type StatusType,
} from "./catalog";
import type { EnemyDef } from "./missions";

export const GRID_W = 7;
export const GRID_H = 5;

export interface Status { type: StatusType; turns: number; value: number }

export interface Unit {
  uid: number;
  side: "ally" | "enemy";
  key: string;
  name: string;
  element: Element;
  rarity: number;
  level: number;
  color: string;
  portrait: { sheet: number; quad: number };
  transformed: boolean;
  x: number; y: number;
  hp: number; maxHp: number;
  atk: number; def: number; spd: number;
  energy: number; // 0..100 → definitiva
  chakra: number; maxChakra: number;
  move: number; range: number;
  basicName: string; basicPower: number;
  skill: SkillDef;
  ultimate: SkillDef & { color: string };
  passive: PassiveDef;
  skillLevel: number;
  statuses: Status[];
  cd: number;
  alive: boolean;
  boss: boolean;
  phase: number;
  movedThisTurn?: boolean;
}

export interface OwnedLike {
  id: number; charKey: string; level: number; resonance: number;
  transformed: boolean; skillLevel: number;
}

export type StatMult = { hp: number; atk: number; def: number; spd: number };

export const ALLY_SPAWNS = [ { x: 1, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 3 }, { x: 1, y: 0 }, { x: 1, y: 4 } ];
export const ENEMY_SPAWNS = [ { x: 5, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 3 }, { x: 5, y: 0 }, { x: 6, y: 4 } ];

export function makeAlly(o: OwnedLike, uid: number, idx: number, mult?: StatMult): Unit {
  const def = CHAR_MAP[o.charKey];
  const s = statsFor(def, o.level, o.resonance, o.transformed, mult);
  const p = ALLY_SPAWNS[idx % ALLY_SPAWNS.length];
  return {
    uid, side: "ally", key: def.key, name: o.transformed ? def.transform.name.split("—")[1]?.trim() || def.name : def.name,
    element: def.element, rarity: def.rarity, level: o.level, color: def.color,
    portrait: def.portrait, transformed: o.transformed,
    x: p.x, y: p.y, hp: s.hp, maxHp: s.hp, atk: s.atk, def: s.def, spd: s.spd,
    energy: 20, chakra: 4, maxChakra: 10, move: def.move, range: def.range,
    basicName: def.basic.name, basicPower: def.basic.power,
    skill: def.skill, ultimate: def.ultimate, passive: def.passive, skillLevel: o.skillLevel,
    statuses: [], cd: 0, alive: true, boss: false, phase: 1,
  };
}

export function makeEnemy(e: EnemyDef, uid: number, idx: number): Unit {
  const def: CharDef = CHAR_MAP[e.charKey];
  const s = statsFor(def, e.level, 0, false, { hp: e.hpMult, atk: e.atkMult, def: 0.9, spd: 1 });
  const p = ENEMY_SPAWNS[idx % ENEMY_SPAWNS.length];
  return {
    uid, side: "enemy", key: def.key, name: e.name,
    element: e.element, rarity: def.rarity, level: e.level, color: def.color,
    portrait: def.portrait, transformed: false,
    x: p.x, y: p.y, hp: s.hp, maxHp: s.hp, atk: s.atk, def: s.def, spd: s.spd,
    energy: 0, chakra: 4, maxChakra: 10, move: Math.min(def.move, 3), range: def.range,
    basicName: def.basic.name, basicPower: def.basic.power,
    skill: def.skill, ultimate: def.ultimate, passive: def.passive, skillLevel: 1,
    statuses: [], cd: 0, alive: true, boss: !!e.boss, phase: 1,
  };
}

export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function elementMult(a: Element, d: Element): number {
  if (ADVANTAGE[a] === d) return 1.5;
  if (ADVANTAGE[d] === a) return 0.75;
  return 1;
}

export function hasStatus(u: Unit, t: StatusType): Status | undefined {
  return u.statuses.find((s) => s.type === t);
}

export function effAtk(u: Unit, allies: Unit[]): number {
  let v = u.atk;
  if (u.passive.type === "atkBoost") v *= 1 + u.passive.value;
  const up = hasStatus(u, "atkUp");
  if (up) v *= 1 + up.value;
  for (const a of allies) {
    if (a.alive && a.side === u.side && a.passive.type === "teamAtk") v *= 1 + a.passive.value;
  }
  if (u.boss && u.phase >= 2) v *= 1.25;
  return v;
}

export function effDef(u: Unit): number {
  let v = u.def;
  if (u.passive.type === "defBoost") v *= 1 + u.passive.value;
  const up = hasStatus(u, "defUp");
  if (up) v *= 1 + up.value;
  const down = hasStatus(u, "defDown");
  if (down) v *= 1 - down.value;
  return Math.max(1, v);
}

export interface DamageResult { dmg: number; crit: boolean; mult: number; combo: number }

export function comboCount(target: Unit, attackers: Unit[]): number {
  return attackers.filter((a) => a.alive && a.uid !== target.uid && a.side !== target.side && dist(a, target) <= 1).length;
}

export function calcDamage(
  att: Unit, target: Unit, power: number,
  alliesOfAttacker: Unit[], isSkill = false, skillLevel = 1, rng: () => number = Math.random
): DamageResult {
  const mult = elementMult(att.element, target.element);
  const combo = comboCount(target, alliesOfAttacker.filter((ally) => ally.uid !== att.uid));
  const comboMult = 1 + Math.min(combo, 3) * 0.1;
  let critChance = 0.08;
  if (att.passive.type === "critBoost") critChance += att.passive.value;
  const crit = rng() < critChance;
  const skillMult = isSkill ? 1 + (skillLevel - 1) * 0.08 : 1;
  const variance = 0.92 + rng() * 0.16;
  const raw = effAtk(att, alliesOfAttacker) * power * skillMult;
  const mitig = raw * (100 / (100 + effDef(target) * 0.9));
  const dmg = Math.max(1, Math.round(mitig * mult * comboMult * (crit ? 1.6 : 1) * variance));
  return { dmg, crit, mult, combo };
}

export function healAmount(healer: Unit, power: number, skillLevel = 1): number {
  return Math.round(effAtk(healer, [healer]) * power * (1 + (skillLevel - 1) * 0.08) * 0.9);
}

export function reachableTiles(u: Unit, units: Unit[]): { x: number; y: number }[] {
  const occupied = new Set(units.filter((v) => v.alive && v.uid !== u.uid).map((v) => `${v.x},${v.y}`));
  const out: { x: number; y: number }[] = [];
  const visited = new Set([`${u.x},${u.y}`]);
  const queue: { x: number; y: number; d: number }[] = [{ x: u.x, y: u.y, d: 0 }];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.d > 0) out.push({ x: cur.x, y: cur.y });
    if (cur.d >= u.move) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cur.x + dx, ny = cur.y + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
      if (visited.has(k) || occupied.has(k)) continue;
      visited.add(k);
      queue.push({ x: nx, y: ny, d: cur.d + 1 });
    }
  }
  return out;
}

export function aoeTargets(center: { x: number; y: number }, radius: number, units: Unit[], side: "ally" | "enemy"): Unit[] {
  if (radius >= 99) return units.filter((u) => u.alive && u.side === side);
  return units.filter((u) => u.alive && u.side === side && dist(u, center) <= radius);
}

export function applyEffect(target: Unit, eff: SkillEffect, rng: () => number = Math.random): boolean {
  if (rng() > eff.chance) return false;
  const existing = target.statuses.find((s) => s.type === eff.type);
  if (existing) { existing.turns = Math.max(existing.turns, eff.turns); existing.value = Math.max(existing.value, eff.value || 0); }
  else target.statuses.push({ type: eff.type, turns: eff.turns, value: eff.value || 0 });
  return true;
}

export interface TickEvent { uid: number; type: "burn" | "regen"; amount: number }

export function tickStatuses(u: Unit): TickEvent[] {
  const events: TickEvent[] = [];
  for (const s of u.statuses) {
    if (s.type === "burn") {
      const dmg = Math.max(1, Math.round(u.maxHp * s.value));
      u.hp = Math.max(0, u.hp - dmg);
      events.push({ uid: u.uid, type: "burn", amount: dmg });
    }
    if (s.type === "regen" && u.hp > 0) {
      const heal = Math.round(u.maxHp * s.value);
      u.hp = Math.min(u.maxHp, u.hp + heal);
      events.push({ uid: u.uid, type: "regen", amount: heal });
    }
    s.turns -= 1;
  }
  u.statuses = u.statuses.filter((s) => s.turns > 0);
  if (u.hp <= 0) u.alive = false;
  return events;
}

export function gainEnergy(u: Unit, base: number) {
  const mult = u.passive.type === "energyBoost" ? 1 + u.passive.value : 1;
  u.energy = Math.min(100, u.energy + Math.round(base * mult));
}

/** IA enemiga: decide movimiento y acción. */
export interface AiDecision {
  moveTo: { x: number; y: number };
  action: "attack" | "skill" | "ultimate" | "wait";
  targetUid: number | null;
}

export function aiDecide(u: Unit, units: Unit[]): AiDecision {
  const foes = units.filter((v) => v.alive && v.side !== u.side);
  if (!foes.length) return { moveTo: { x: u.x, y: u.y }, action: "wait", targetUid: null };
  const friends = units.filter((v) => v.alive && v.side === u.side);
  const tiles = [{ x: u.x, y: u.y }, ...reachableTiles(u, units)];
  const wounded = [...friends].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const canSkill = u.cd <= 0 && u.chakra >= u.skill.cost;
  const canUlt = u.energy >= 100;
  const supportTile = (friend: Unit, range: number) =>
    [...tiles].sort((a, b) => dist(a, friend) - dist(b, friend))
      .find((t) => dist(t, friend) <= range);

  if (canUlt && u.ultimate.target !== "enemy" && wounded) {
    if (u.ultimate.power === 0 || wounded.hp / wounded.maxHp < 0.8) {
      const friend = u.ultimate.target === "self" ? u : wounded;
      const tile = supportTile(friend, u.ultimate.range);
      if (tile) return { moveTo: tile, action: "ultimate", targetUid: friend.uid };
    }
  }
  if (canSkill && u.skill.target === "self" &&
      (!u.skill.effect || !hasStatus(u, u.skill.effect.type)))
    return { moveTo: { x: u.x, y: u.y }, action: "skill", targetUid: u.uid };
  if (canSkill && u.skill.target === "ally" && wounded) {
    const friend = u.skill.power > 0 && wounded.hp / wounded.maxHp < 0.8 ? wounded
      : u.skill.effect?.type === "atkUp"
        ? [...friends].sort((a, b) => b.atk - a.atk).find((f) => !hasStatus(f, "atkUp"))
        : null;
    if (friend) {
      const tile = supportTile(friend, u.skill.range);
      if (tile) return { moveTo: tile, action: "skill", targetUid: friend.uid };
    }
  }

  const healers = foes.filter((f) => f.skill.target === "ally" && f.skill.power > 0);
  const priority = (f: Unit) => f.hp / f.maxHp + dist(u, f) * 0.08 - (healers.includes(f) ? 0.25 : 0);
  const target = [...foes].sort((a, b) => priority(a) - priority(b))[0];
  const canUltAttack = canUlt && u.ultimate.target === "enemy";
  const canSkillAttack = canSkill && u.skill.target === "enemy" && u.skill.power > 0;
  const needRange = canUltAttack ? Math.min(u.ultimate.range, 4) : canSkillAttack ? u.skill.range : u.range;
  let best = tiles[0], bestScore = Infinity;
  for (const t of tiles) {
    const d = dist(t, target);
    const score = Math.abs(d - Math.max(1, needRange)) * 2 + d * 0.3;
    if (score < bestScore) { bestScore = score; best = t; }
  }
  const dAfter = dist(best, target);
  if (canUltAttack && dAfter <= u.ultimate.range) return { moveTo: best, action: "ultimate", targetUid: target.uid };
  if (canSkillAttack && dAfter <= u.skill.range) return { moveTo: best, action: "skill", targetUid: target.uid };
  if (dAfter <= u.range) return { moveTo: best, action: "attack", targetUid: target.uid };
  return { moveTo: best, action: "wait", targetUid: null };
}

export function checkBossPhase(u: Unit): boolean {
  if (u.boss && u.phase === 1 && u.alive && u.hp <= u.maxHp * 0.5) {
    u.phase = 2;
    u.spd += 5;
    u.energy = Math.min(100, u.energy + 40);
    return true;
  }
  return false;
}

export function battleStars(allies: Unit[]): number {
  const aliveCount = allies.filter((a) => a.alive).length;
  if (aliveCount === allies.length) return 3;
  if (aliveCount >= Math.ceil(allies.length / 2)) return 2;
  return 1;
}