// ============================================================
// LEGENDIA NEXUS — Lógica de servidor (validación autoritativa)
// Todas las recompensas, invocaciones y costes se calculan aquí.
// ============================================================
import { randomBytes, randomInt } from "crypto";
import { db } from "@/db";
import {
  players, ownedChars, summonLog, missionProgress, battleSessions,
  banners, gameEvents, charOverrides, users, errorLogs, sessions,
  type PlayerSettings,
} from "@/db/schema";
import { and, desc, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import {
  CHARACTERS, CHAR_MAP, RARITY_CAP, levelUpCost, skillUpCost,
  XP_FOR_PLAYER_LEVEL, maxStamina, STAMINA_REGEN_MINUTES, ACHIEVEMENTS,
  statsFor, powerOf,
} from "@/game/catalog";
import { ALL_MISSIONS, MISSION_MAP } from "@/game/missions";
import { makeEnemy } from "@/game/combat";
import { applyPlayerAction, BattleRuleError, createBattle, resultStars, type BattleSnapshot } from "@/game/battle-engine";

import { GameError } from "./errors";
import { getAfkState } from "./afk";
export { GameError };

let seeded = false;
export async function ensureSeed() {
  if (seeded) return;
  const existing = await db.select().from(banners).limit(1);
  if (!existing.length) {
    await db.insert(banners).values([
      {
        key: "nexus", name: "Nexus Eterno", kind: "normal",
        description: "Banner permanente con los 16 guardianes del Nexus.",
        rates: { r5: 3, r4: 17, r3: 80 }, pityLimit: 50, featured: [],
        costSingle: 50, costMulti: 450, active: true,
      },
      {
        key: "eclipse", name: "Eclipse Umbral", kind: "special",
        description: "¡Probabilidad aumentada para Kagero y Kaion! 50% del 5★ obtenido será destacado.",
        rates: { r5: 3, r4: 17, r3: 80 }, pityLimit: 50, featured: ["kagero", "kaion"],
        costSingle: 50, costMulti: 450, active: true,
      },
      {
        key: "eidolon", name: "Canto del Eidolón", kind: "event",
        description: "Banner de evento: Lyra y Aurelia destacan entre las invocaciones.",
        rates: { r5: 4, r4: 18, r3: 78 }, pityLimit: 40, featured: ["lyra", "aurelia"],
        costSingle: 50, costMulti: 450, active: true,
      },
    ]);
    await db.insert(gameEvents).values([
      {
        name: "Festival del Eclipse",
        description: "El eidolón Prime se ha desbocado. Supera su prueba para ganar recompensas del festival. ¡Banner 'Canto del Eidolón' con pity reducido!",
        active: true, missionId: "ev-1", rewardGems: 150, rewardGold: 3000,
      },
    ]);
  }
  seeded = true;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function visibleEventFilter() {
  return and(eq(gameEvents.active, true),
    or(isNull(gameEvents.endsAt), gt(gameEvents.endsAt, new Date())));
}

async function syncStaminaTx(tx: Tx, p: typeof players.$inferSelect) {
  const cap = maxStamina(p.level);
  const elapsedMin = (Date.now() - new Date(p.staminaAt).getTime()) / 60000;
  const regen = Math.floor(elapsedMin / STAMINA_REGEN_MINUTES);
  if (p.stamina >= cap) {
    if (regen > 0) await tx.update(players).set({ staminaAt: new Date() }).where(eq(players.userId, p.userId));
    return p.stamina;
  }
  if (regen <= 0) return p.stamina;
  const next = Math.min(cap, p.stamina + regen);
  await tx.update(players).set({ stamina: next, staminaAt: new Date() }).where(eq(players.userId, p.userId));
  return next;
}

export async function getFullState(userId: number) {
  await ensureSeed();
  const stamina = await db.transaction(async (tx) => {
    const [player] = await tx.select().from(players)
      .where(eq(players.userId, userId)).for("update");
    if (!player) throw new GameError("Jugador no encontrado.", 404);
    return syncStaminaTx(tx, player);
  });
  const [p] = await db.select().from(players).where(eq(players.userId, userId));
  p.stamina = stamina;
  const chars = await db.select().from(ownedChars).where(eq(ownedChars.userId, userId));
  const progress = await db.select().from(missionProgress).where(eq(missionProgress.userId, userId));
  const history = await db.select().from(summonLog).where(eq(summonLog.userId, userId)).orderBy(desc(summonLog.id)).limit(60);
  const bannerList = await db.select().from(banners).where(eq(banners.active, true));
  const events = await db.select().from(gameEvents).where(visibleEventFilter());
  const overrides = await db.select().from(charOverrides);
  const [active] = await db.select({ missionId: battleSessions.missionId })
    .from(battleSessions)
    .where(and(eq(battleSessions.userId, userId), eq(battleSessions.used, false),
      isNotNull(battleSessions.state), gt(battleSessions.startedAt, battleCutoff())))
    .orderBy(desc(battleSessions.startedAt)).limit(1);
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  const clearedIds = new Set(progress.map((m) => m.missionId));
  const activeEventMissions = new Set(events.map((e) => e.missionId).filter(Boolean) as string[]);
  const missions = ALL_MISSIONS.map((m) => {
    const prog = progress.find((x) => x.missionId === m.id);
    let unlocked = !m.unlockAfter || clearedIds.has(m.unlockAfter);
    if (m.difficulty === "event") unlocked = activeEventMissions.has(m.id);
    return { id: m.id, unlocked, clears: prog?.clears || 0, stars: prog?.stars || 0 };
  });

  const achStats = { wins: p.wins, summonCount: p.summonCount, level: p.level, charCount: chars.length };
  const achievements = ACHIEVEMENTS.map((a) => ({
    key: a.key, name: a.name, desc: a.desc, reward: a.reward,
    done: a.check(achStats), claimed: p.achievements.includes(a.key),
  }));

  return {
    player: {
      username: user.username, isAdmin: user.isAdmin,
      level: p.level, xp: p.xp, xpNext: XP_FOR_PLAYER_LEVEL(p.level),
      gold: p.gold, gems: p.gems, stardust: p.stardust,
      stamina: p.stamina, staminaMax: maxStamina(p.level),
      materials: p.materials, teams: p.teams, settings: p.settings,
      dailyAvailable: p.lastDaily !== todayStr(), dailyStreak: p.dailyStreak,
      wins: p.wins, summonCount: p.summonCount, pity: p.pity,
    },
    chars, missions, history, banners: bannerList, events, overrides, achievements,
    afk: await getAfkState(userId),
    activeBattle: active ? { missionId: active.missionId } : null,
  };
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------- INVOCACIONES (resultado decidido en servidor) ----------------

function rollRarity(rates: { r5: number; r4: number; r3: number }): 3 | 4 | 5 {
  const r = randomInt(0, 10000) / 100;
  if (r < rates.r5) return 5;
  if (r < rates.r5 + rates.r4) return 4;
  return 3;
}

export async function doSummon(userId: number, bannerKey: string, count: number) {
  await ensureSeed();
  if (count !== 1 && count !== 10) throw new GameError("Cantidad inválida (1 o 10).");
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    const [banner] = await tx.select().from(banners).where(eq(banners.key, bannerKey));
    if (!banner || !banner.active) throw new GameError("Banner no disponible.");
    const cost = count === 1 ? banner.costSingle : banner.costMulti;
    if (p.gems < cost) throw new GameError("Gemas insuficientes.");

    let pity = p.pity[bannerKey] || 0;
    const owned = await tx.select().from(ownedChars).where(eq(ownedChars.userId, userId));
    const ownedMap = new Map(owned.map((c) => [c.charKey, c]));
    const results: { charKey: string; rarity: number; isNew: boolean; stardust: number }[] = [];
    let stardustGain = 0;
    const rarities: (3 | 4 | 5)[] = [];

    for (let i = 0; i < count; i++) {
      pity++;
      let rarity = rollRarity(banner.rates);
      if (pity >= banner.pityLimit) rarity = 5;
      // multi garantiza al menos un 4★
      if (count === 10 && i === count - 1 && !rarities.some((r) => r >= 4) && rarity < 4) rarity = 4;
      rarities.push(rarity);
      if (rarity === 5) pity = 0;

      const pool = CHARACTERS.filter((c) => c.rarity === rarity);
      let pick = pool[randomInt(0, pool.length)];
      if (rarity === 5 && banner.featured.length) {
        const feat = banner.featured.filter((k) => CHAR_MAP[k]?.rarity === 5);
        if (feat.length && randomInt(0, 100) < 50) pick = CHAR_MAP[feat[randomInt(0, feat.length)]];
      }
      const existing = ownedMap.get(pick.key);
      let isNew = false, dust = 0;
      if (!existing) {
        const [row] = await tx.insert(ownedChars).values({ userId, charKey: pick.key, level: 1 }).returning();
        ownedMap.set(pick.key, row);
        isNew = true;
      } else {
        dust = rarity === 5 ? 25 : rarity === 4 ? 10 : 3;
        stardustGain += dust;
        await tx.update(ownedChars).set({ resonance: existing.resonance + 1 }).where(eq(ownedChars.id, existing.id));
        existing.resonance += 1;
      }
      await tx.insert(summonLog).values({ userId, bannerKey, charKey: pick.key, rarity, isNew });
      results.push({ charKey: pick.key, rarity, isNew, stardust: dust });
    }

    // auto-añadir nuevos a equipo con huecos
    const teams = p.teams.map((t) => ({ ...t, members: [...t.members] }));
    for (const r of results.filter((r) => r.isNew)) {
      const id = ownedMap.get(r.charKey)!.id;
      const team = teams.find((t) => t.members.length < 4 && t.members.length > 0) || teams.find((t) => t.members.length < 4);
      if (team && !team.members.includes(id)) team.members.push(id);
    }

    await tx.update(players).set({
      gems: p.gems - cost,
      stardust: p.stardust + stardustGain,
      summonCount: p.summonCount + count,
      pity: { ...p.pity, [bannerKey]: pity },
      teams,
    }).where(eq(players.userId, userId));

    return { results, pity, cost, stardustGain };
  });
}

// ---------------- COMBATE AUTORITATIVO ----------------

// Una sesión se puede recuperar durante 12 horas tras iniciarla.
const BATTLE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
function battleCutoff() { return new Date(Date.now() - BATTLE_MAX_AGE_MS); }

export async function startBattle(userId: number, missionId: string, teamIndex: number) {
  const mission = MISSION_MAP[missionId];
  if (!mission) throw new GameError("Misión desconocida.");
  if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex > 2)
    throw new GameError("Equipo inválido.");
  return db.transaction(async (tx) => {
    // Bloquear al jugador serializa dos peticiones de inicio simultáneas.
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);
    const [active] = await tx.select({ token: battleSessions.token }).from(battleSessions)
      .where(and(eq(battleSessions.userId, userId), eq(battleSessions.used, false),
        isNotNull(battleSessions.state), gt(battleSessions.startedAt, battleCutoff()))).limit(1);
    if (active) throw new GameError("Tienes una batalla en curso. Reanúdala desde Inicio o retírate.", 409);
    if (mission.unlockAfter) {
      const req = await tx.select().from(missionProgress)
        .where(and(eq(missionProgress.userId, userId), eq(missionProgress.missionId, mission.unlockAfter)));
      if (!req.length || req[0].clears < 1) throw new GameError("Misión bloqueada.");
    }
    if (mission.difficulty === "event") {
      const ev = await tx.select().from(gameEvents)
        .where(and(visibleEventFilter(), eq(gameEvents.missionId, missionId)));
      if (!ev.length) throw new GameError("El evento no está activo o ha finalizado.");
    }
    const stamina = await syncStaminaTx(tx, p);
    if (stamina < mission.staminaCost) throw new GameError("Energía insuficiente.");
    const team = p.teams[teamIndex];
    if (!team || !team.members.length) throw new GameError("El equipo está vacío.");
    const members = await tx.select().from(ownedChars)
      .where(and(eq(ownedChars.userId, userId), inArray(ownedChars.id, team.members.slice(0, 4))));
    const ordered = team.members.slice(0, 4)
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is typeof members[number] => !!m);
    if (ordered.length !== Math.min(4, team.members.length)) throw new GameError("Formación no válida. Guárdala de nuevo.");

    const overrides = await tx.select().from(charOverrides);
    const { state: snapshot } = createBattle(ordered, mission, overrides);
    const token = randomBytes(24).toString("hex");
    const enemyPower = mission.enemies.map((e, i) => makeEnemy(e, 1000 + i, i))
      .reduce((acc, e) => acc + powerOf({ hp: e.maxHp, atk: e.atk, def: e.def, spd: e.spd }), 0);
    await tx.update(players).set({ stamina: stamina - mission.staminaCost }).where(eq(players.userId, userId));
    await tx.insert(battleSessions).values({ token, userId, missionId, enemyPower,
      state: snapshot, used: snapshot.phase !== "playing" });
    return { token, mission, snapshot, enemyPower };
  });
}

export async function getActiveBattle(userId: number) {
  const [b] = await db.select().from(battleSessions)
    .where(and(eq(battleSessions.userId, userId), eq(battleSessions.used, false),
      isNotNull(battleSessions.state), gt(battleSessions.startedAt, battleCutoff())))
    .orderBy(desc(battleSessions.startedAt)).limit(1);
  if (!b || !b.state) throw new GameError("No tienes una batalla en curso.", 404);
  return { token: b.token, mission: MISSION_MAP[b.missionId], snapshot: b.state, enemyPower: b.enemyPower };
}

async function grantBattleRewards(tx: Tx, userId: number, missionId: string, snapshot: BattleSnapshot) {
  const mission = MISSION_MAP[missionId];
  const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
  const existing = await tx.select().from(missionProgress)
    .where(and(eq(missionProgress.userId, userId), eq(missionProgress.missionId, mission.id)));
  const firstClear = !existing.length || existing[0].clears === 0;
  const stars = resultStars(snapshot);
  const r = mission.rewards;
  const mats = { ...p.materials };
  for (const [k, v] of Object.entries(r.materials)) mats[k] = (mats[k] || 0) + v;
  let gems = r.gems + (firstClear ? r.firstGems : 0);
  let gold = r.gold;
  if (mission.difficulty === "event") {
    const ev = await tx.select().from(gameEvents)
      .where(and(eq(gameEvents.active, true), eq(gameEvents.missionId, mission.id)));
    if (ev.length && firstClear) { gems += ev[0].rewardGems; gold += ev[0].rewardGold; }
  }
  let xp = p.xp + r.xp;
  let level = p.level;
  while (xp >= XP_FOR_PLAYER_LEVEL(level)) { xp -= XP_FOR_PLAYER_LEVEL(level); level++; }
  const levelUp = level > p.level;
  const bonusGems = levelUp ? (level - p.level) * 20 : 0;
  if (firstClear) {
    await tx.insert(missionProgress).values({ userId, missionId, clears: 1, stars })
      .onConflictDoUpdate({ target: [missionProgress.userId, missionProgress.missionId],
        set: { clears: 1, stars } });
  } else {
    await tx.update(missionProgress)
      .set({ clears: existing[0].clears + 1, stars: Math.max(existing[0].stars, stars) })
      .where(eq(missionProgress.id, existing[0].id));
  }
  await tx.update(players).set({
    gold: p.gold + gold, gems: p.gems + gems + bonusGems,
    materials: mats, xp, level, wins: p.wins + 1,
    stamina: levelUp ? maxStamina(level) : p.stamina,
  }).where(eq(players.userId, userId));
  return { victory: true, stars, firstClear, levelUp, newLevel: level,
    rewards: { gold, gems: gems + bonusGems, xp: r.xp, materials: r.materials } };
}

export async function actBattle(userId: number, token: string, command: unknown) {
  return db.transaction(async (tx) => {
    const [b] = await tx.select().from(battleSessions)
      .where(and(eq(battleSessions.token, token), eq(battleSessions.userId, userId))).for("update");
    if (!b) throw new GameError("Batalla no encontrada.", 404);
    if (b.used || !b.state) throw new GameError("Batalla finalizada o incompatible con la versión actual.", 409);
    if (b.startedAt < battleCutoff()) throw new GameError("La batalla ha caducado (12 horas).", 410);
    let outcome: ReturnType<typeof applyPlayerAction>;
    try { outcome = applyPlayerAction(b.state, command); }
    catch (e) {
      if (e instanceof BattleRuleError)
        throw new GameError(e.message, e.message.includes("desactualizado") ? 409 : 400);
      throw e;
    }
    const done = outcome.state.phase !== "playing";
    const result = outcome.state.phase === "victory"
      ? await grantBattleRewards(tx, userId, b.missionId, outcome.state)
      : done ? { victory: false, rewards: null, levelUp: false } : null;
    await tx.update(battleSessions).set({ state: outcome.state, used: done })
      .where(eq(battleSessions.token, token));
    return { snapshot: outcome.state, frames: outcome.frames, result };
  });
}

export async function retreatBattle(userId: number, token: string) {
  return db.transaction(async (tx) => {
    const [b] = await tx.select().from(battleSessions)
      .where(and(eq(battleSessions.token, token), eq(battleSessions.userId, userId))).for("update");
    if (!b) throw new GameError("Batalla no encontrada.", 404);
    if (b.used) throw new GameError("La batalla ya terminó.", 409);
    const state: BattleSnapshot | null = b.state
      ? { ...b.state, phase: "retreated", currentUid: null } : null;
    await tx.update(battleSessions).set({ used: true, state })
      .where(eq(battleSessions.token, token));
    return { victory: false, rewards: null, levelUp: false };
  });
}

// ---------------- PROGRESIÓN ----------------

export async function levelUpChar(userId: number, charId: number, times: number) {
  const n = Math.max(1, Math.min(10, times || 1));
  return db.transaction(async (tx) => {
    const [c] = await tx.select().from(ownedChars)
      .where(and(eq(ownedChars.id, charId), eq(ownedChars.userId, userId))).for("update");
    if (!c) throw new GameError("Personaje no encontrado.");
    const def = CHAR_MAP[c.charKey];
    const cap = RARITY_CAP[def.rarity];
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    let level = c.level, gold = p.gold;
    const mats = { ...p.materials };
    let applied = 0;
    for (let i = 0; i < n && level < cap; i++) {
      const cost = levelUpCost(level);
      if (gold < cost.gold || (mats.esencia || 0) < cost.esencia) break;
      gold -= cost.gold; mats.esencia -= cost.esencia; level++; applied++;
    }
    if (!applied) throw new GameError(level >= cap ? "Nivel máximo alcanzado." : "Recursos insuficientes.");
    await tx.update(ownedChars).set({ level }).where(eq(ownedChars.id, charId));
    await tx.update(players).set({ gold, materials: mats }).where(eq(players.userId, userId));
    return { level, applied };
  });
}

export async function transformChar(userId: number, charId: number) {
  return db.transaction(async (tx) => {
    const [c] = await tx.select().from(ownedChars)
      .where(and(eq(ownedChars.id, charId), eq(ownedChars.userId, userId))).for("update");
    if (!c) throw new GameError("Personaje no encontrado.");
    if (c.transformed) throw new GameError("Ya transformado.");
    const def = CHAR_MAP[c.charKey];
    if (c.level < def.transform.reqLevel) throw new GameError(`Requiere nivel ${def.transform.reqLevel}.`);
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    const mats = { ...p.materials };
    for (const [k, v] of Object.entries(def.transform.materials)) {
      if ((mats[k] || 0) < v) throw new GameError("Materiales insuficientes.");
    }
    for (const [k, v] of Object.entries(def.transform.materials)) mats[k] -= v;
    await tx.update(ownedChars).set({ transformed: true }).where(eq(ownedChars.id, charId));
    await tx.update(players).set({ materials: mats }).where(eq(players.userId, userId));
    return { ok: true };
  });
}

export async function skillUpChar(userId: number, charId: number) {
  return db.transaction(async (tx) => {
    const [c] = await tx.select().from(ownedChars)
      .where(and(eq(ownedChars.id, charId), eq(ownedChars.userId, userId))).for("update");
    if (!c) throw new GameError("Personaje no encontrado.");
    if (c.skillLevel >= 5) throw new GameError("Habilidad al máximo (Nv.5).");
    const cost = skillUpCost(c.skillLevel);
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (p.gold < cost.gold || (p.materials.pergamino || 0) < cost.pergamino)
      throw new GameError("Recursos insuficientes.");
    await tx.update(ownedChars).set({ skillLevel: c.skillLevel + 1 }).where(eq(ownedChars.id, charId));
    await tx.update(players).set({
      gold: p.gold - cost.gold,
      materials: { ...p.materials, pergamino: p.materials.pergamino - cost.pergamino },
    }).where(eq(players.userId, userId));
    return { skillLevel: c.skillLevel + 1 };
  });
}

export async function toggleFavorite(userId: number, charId: number) {
  const [c] = await db.select().from(ownedChars)
    .where(and(eq(ownedChars.id, charId), eq(ownedChars.userId, userId)));
  if (!c) throw new GameError("Personaje no encontrado.");
  await db.update(ownedChars).set({ favorite: !c.favorite }).where(eq(ownedChars.id, charId));
  return { favorite: !c.favorite };
}

export async function saveTeams(userId: number, teams: { name: string; members: number[] }[]) {
  if (!Array.isArray(teams) || teams.length > 3) throw new GameError("Equipos inválidos.");
  const owned = await db.select().from(ownedChars).where(eq(ownedChars.userId, userId));
  const ids = new Set(owned.map((c) => c.id));
  const clean = teams.slice(0, 3).map((t, i) => ({
    name: String(t.name || `Equipo ${i + 1}`).slice(0, 24),
    members: [...new Set((t.members || []).filter((m) => ids.has(m)))].slice(0, 4),
  }));
  // un personaje no puede estar en dos equipos
  const used = new Set<number>();
  for (const t of clean) t.members = t.members.filter((m) => (used.has(m) ? false : (used.add(m), true)));
  await db.update(players).set({ teams: clean }).where(eq(players.userId, userId));
  return { teams: clean };
}

export async function claimDaily(userId: number) {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    const today = todayStr();
    if (p.lastDaily === today) throw new GameError("Recompensa diaria ya reclamada.", 409);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = p.lastDaily === yesterday ? p.dailyStreak + 1 : 1;
    const gems = Math.min(150, 60 + streak * 10);
    const gold = 1000 + streak * 200;
    await tx.update(players).set({
      lastDaily: today, dailyStreak: streak,
      gems: p.gems + gems, gold: p.gold + gold,
      materials: { ...p.materials, esencia: (p.materials.esencia || 0) + 5 },
    }).where(eq(players.userId, userId));
    return { gems, gold, esencia: 5, streak };
  });
}

export async function claimAchievement(userId: number, key: string) {
  const def = ACHIEVEMENTS.find((a) => a.key === key);
  if (!def) throw new GameError("Logro desconocido.");
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (p.achievements.includes(key)) throw new GameError("Logro ya reclamado.", 409);
    const count = await tx.select().from(ownedChars).where(eq(ownedChars.userId, userId));
    const done = def.check({ wins: p.wins, summonCount: p.summonCount, level: p.level, charCount: count.length });
    if (!done) throw new GameError("Logro no completado.");
    await tx.update(players).set({
      achievements: [...p.achievements, key],
      gems: p.gems + (def.reward.gems || 0),
      gold: p.gold + (def.reward.gold || 0),
      stardust: p.stardust + (def.reward.stardust || 0),
    }).where(eq(players.userId, userId));
    return { reward: def.reward };
  });
}

export const SHOP_ITEMS = [
  { id: "esencia10", name: "Esencia Nexus ×10", icon: "🧪", currency: "gold", price: 1500, give: { materials: { esencia: 10 } } },
  { id: "pergamino5", name: "Pergamino Antiguo ×5", icon: "📜", currency: "gold", price: 2000, give: { materials: { pergamino: 5 } } },
  { id: "cristal1", name: "Cristal Estelar ×1", icon: "💎", currency: "stardust", price: 10, give: { materials: { cristal: 1 } } },
  { id: "stamina40", name: "Energía +40", icon: "⚡", currency: "gold", price: 1000, give: { stamina: 40 } },
  { id: "gems50", name: "Gemas Nexus ×50", icon: "🔷", currency: "stardust", price: 25, give: { gems: 50 } },
  { id: "cristal5", name: "Cristal Estelar ×5", icon: "💠", currency: "stardust", price: 45, give: { materials: { cristal: 5 } } },
] as const;

export async function buyShop(userId: number, itemId: string) {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) throw new GameError("Artículo desconocido.");
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    const cur = item.currency as "gold" | "stardust";
    if (p[cur] < item.price) throw new GameError("Fondos insuficientes.");
    const patch: Partial<typeof players.$inferInsert> = { [cur]: p[cur] - item.price };
    const give = item.give as { gold?: number; gems?: number; stamina?: number; materials?: Record<string, number> };
    if (give.gems) patch.gems = p.gems + give.gems;
    if (give.stamina) patch.stamina = Math.min(maxStamina(p.level) + 40, p.stamina + give.stamina);
    if (give.materials) {
      const mats = { ...p.materials };
      for (const [k, v] of Object.entries(give.materials)) mats[k] = (mats[k] || 0) + v;
      patch.materials = mats;
    }
    await tx.update(players).set(patch).where(eq(players.userId, userId));
    return { ok: true };
  });
}

export async function saveSettings(userId: number, settings: Partial<PlayerSettings>) {
  const [cur] = await db.select({ s: players.settings }).from(players).where(eq(players.userId, userId));
  const clamp01 = (v: unknown, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d;
  };
  const prev: PlayerSettings = cur?.s ?? { music: 0.6, sfx: 0.8 };
  const clean: PlayerSettings = {
    ...prev,
    music: clamp01(settings.music, prev.music),
    sfx: clamp01(settings.sfx, prev.sfx),
  };
  if (typeof settings.muted === "boolean") clean.muted = settings.muted;
  if (typeof settings.skipUlt === "boolean") clean.skipUlt = settings.skipUlt;
  if (settings.animSpeed === 1 || settings.animSpeed === 1.5 || settings.animSpeed === 2) clean.animSpeed = settings.animSpeed;
  if (settings.quality === "auto" || settings.quality === "high" || settings.quality === "low" || settings.quality === "2d")
    clean.quality = settings.quality;
  await db.update(players).set({ settings: clean }).where(eq(players.userId, userId));
  return clean;
}

// ---------------- ADMINISTRACIÓN ----------------

export async function adminData() {
  const us = await db.select({
    id: users.id, username: users.username, isAdmin: users.isAdmin, createdAt: users.createdAt,
    level: players.level, gems: players.gems, gold: players.gold, wins: players.wins,
  }).from(users).leftJoin(players, eq(players.userId, users.id));
  const bs = await db.select().from(banners);
  const evs = await db.select().from(gameEvents);
  const errs = await db.select().from(errorLogs).orderBy(desc(errorLogs.id)).limit(50);
  const ovr = await db.select().from(charOverrides);
  return { users: us, banners: bs, events: evs, errors: errs, overrides: ovr };
}

export async function adminGrant(userId: number, give: { gold?: number; gems?: number; stardust?: number; materials?: Record<string, number> }) {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.");
    const mats = { ...p.materials };
    for (const [k, v] of Object.entries(give.materials || {})) mats[k] = Math.max(0, (mats[k] || 0) + Math.trunc(v));
    await tx.update(players).set({
      gold: Math.max(0, p.gold + Math.trunc(give.gold || 0)),
      gems: Math.max(0, p.gems + Math.trunc(give.gems || 0)),
      stardust: Math.max(0, p.stardust + Math.trunc(give.stardust || 0)),
      materials: mats,
    }).where(eq(players.userId, userId));
    return { ok: true };
  });
}

export async function adminUpdateBanner(key: string, patch: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  if (typeof patch.active === "boolean") clean.active = patch.active;
  if (typeof patch.name === "string") clean.name = patch.name.slice(0, 60);
  if (typeof patch.description === "string") clean.description = patch.description.slice(0, 300);
  if (typeof patch.pityLimit === "number") clean.pityLimit = Math.max(1, Math.min(200, Math.trunc(patch.pityLimit)));
  if (typeof patch.costSingle === "number") clean.costSingle = Math.max(1, Math.trunc(patch.costSingle));
  if (typeof patch.costMulti === "number") clean.costMulti = Math.max(1, Math.trunc(patch.costMulti));
  if (patch.rates && typeof patch.rates === "object") {
    const r = patch.rates as { r5?: number; r4?: number; r3?: number };
    const r5 = Math.max(0, Math.min(100, Number(r.r5) || 0));
    const r4 = Math.max(0, Math.min(100 - r5, Number(r.r4) || 0));
    clean.rates = { r5, r4, r3: 100 - r5 - r4 };
  }
  if (Array.isArray(patch.featured)) clean.featured = patch.featured.filter((k) => typeof k === "string" && CHAR_MAP[k]);
  await db.update(banners).set(clean).where(eq(banners.key, key));
  return { ok: true };
}

export async function adminSaveEvent(ev: { id?: number; name: string; description: string; active: boolean; missionId?: string | null; rewardGems: number; rewardGold: number; endsAt?: string | null }) {
  const endsAt = ev.endsAt ? new Date(ev.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) throw new GameError("Fecha de finalización inválida.");
  const clean = {
    name: String(ev.name || "Evento").slice(0, 80),
    description: String(ev.description || "").slice(0, 400),
    active: !!ev.active,
    missionId: ev.missionId && MISSION_MAP[ev.missionId] ? ev.missionId : null,
    rewardGems: Math.max(0, Math.trunc(ev.rewardGems || 0)),
    rewardGold: Math.max(0, Math.trunc(ev.rewardGold || 0)),
    endsAt,
  };
  if (ev.id) {
    await db.update(gameEvents).set(clean).where(eq(gameEvents.id, ev.id));
    return { id: ev.id };
  }
  const [row] = await db.insert(gameEvents).values(clean).returning();
  return { id: row.id };
}

export async function adminSetOverride(charKey: string, mult: { hp: number; atk: number; def: number; spd: number }) {
  if (!CHAR_MAP[charKey]) throw new GameError("Personaje desconocido.");
  const clamp = (v: number) => Math.max(0.1, Math.min(5, Number(v) || 1));
  const clean = { hp: clamp(mult.hp), atk: clamp(mult.atk), def: clamp(mult.def), spd: clamp(mult.spd) };
  await db.insert(charOverrides).values({ charKey, mult: clean })
    .onConflictDoUpdate({ target: charOverrides.charKey, set: { mult: clean } });
  return { ok: true };
}

export async function adminBackup() {
  const [us, ps, cs, sl, mp, bs, ev, ov, battles] = await Promise.all([
    db.select({ id: users.id, username: users.username, isAdmin: users.isAdmin, createdAt: users.createdAt }).from(users),
    db.select().from(players), db.select().from(ownedChars), db.select().from(summonLog),
    db.select().from(missionProgress), db.select().from(banners), db.select().from(gameEvents),
    db.select().from(charOverrides), db.select().from(battleSessions),
  ]);
  return { createdAt: new Date().toISOString(), users: us, players: ps,
    ownedChars: cs, summonLog: sl, missionProgress: mp, banners: bs,
    events: ev, overrides: ov, battles };
}

export async function adminClearErrors() {
  await db.delete(errorLogs);
  return { ok: true };
}

export async function logoutUser(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export function applyOverrides(members: { charKey: string }[], overrides: { charKey: string; mult: { hp: number; atk: number; def: number; spd: number } }[]) {
  return members.map((m) => overrides.find((o) => o.charKey === m.charKey)?.mult);
}

export { statsFor, powerOf };