// ============================================================
// LEGENDIA NEXUS — Servidor Autoritativo de Juego
// Lógica de Estado, Combate, Sistema AFK de 12h, Gacha y Progresión
// ============================================================
import { randomBytes, randomInt } from "crypto";
import { db } from "@/db";
import {
  players, ownedChars, summonLog, missionProgress, battleSessions,
  banners, gameEvents, charOverrides, users, errorLogs, sessions,
} from "@/db/schema";
import { and, desc, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import {
  CHARACTERS, CHAR_MAP, RARITY_CAP, levelUpCost, skillUpCost,
  XP_FOR_PLAYER_LEVEL, maxStamina, STAMINA_REGEN_MINUTES, ACHIEVEMENTS,
  statsFor, powerOf, type CharDef,
} from "@/game/catalog";
import { ALL_MISSIONS, MISSION_MAP } from "@/game/missions";
import { makeEnemy } from "@/game/combat";
import {
  applyPlayerAction, BattleRuleError, createBattle, resultStars,
  type BattleSnapshot,
} from "@/game/battle-engine";
import type { AfkRewardState } from "@/lib/api";

export class GameError extends Error {
  status: number;
  constructor(msg: string, status = 400) {
    super(msg);
    this.status = status;
  }
}

let seeded = false;
export async function ensureSeed() {
  if (seeded) return;
  const existing = await db.select().from(banners).limit(1);
  if (!existing.length) {
    await db.insert(banners).values([
      {
        key: "nexus",
        name: "Nexus Eterno",
        kind: "normal",
        description: "Invocación de convergencia permanente con todos los héroes legendarios.",
        rates: { r5: 3, r4: 17, r3: 80 },
        pityLimit: 50,
        featured: [],
        costSingle: 50,
        costMulti: 450,
        active: true,
      },
      {
        key: "naruto_fire",
        name: "Resonancia Ninja: Voluntad de Fuego",
        kind: "special",
        description: "¡Probabilidad aumentada para Naruto, Sasuke, Madara, Kakashi, Itachi y Menma!",
        rates: { r5: 3, r4: 17, r3: 80 },
        pityLimit: 50,
        featured: ["naruto", "sasuke", "madara", "kakashi", "itachi", "menma"],
        costSingle: 50,
        costMulti: 450,
        active: true,
      },
      {
        key: "finalfantasy_mako",
        name: "Fantasía Cristalina: Ecos de Mako",
        kind: "special",
        description: "¡Probabilidad aumentada para Lightning, Cloud, Sephiroth, Noctis y Clive!",
        rates: { r5: 3, r4: 17, r3: 80 },
        pityLimit: 50,
        featured: ["lightning", "cloud", "sephiroth", "noctis", "clive"],
        costSingle: 50,
        costMulti: 450,
        active: true,
      },
      {
        key: "eclipse",
        name: "Eclipse Umbral",
        kind: "special",
        description: "¡Kagero y Kaion emergen del Velo Astral con poderes oscuros despiertos!",
        rates: { r5: 3, r4: 17, r3: 80 },
        pityLimit: 50,
        featured: ["kagero", "kaion"],
        costSingle: 50,
        costMulti: 450,
        active: true,
      },
      {
        key: "eidolon",
        name: "Canto del Eidolón",
        kind: "event",
        description: "Banner festivo con Lyra y Aurelia. ¡Pity reducido a 40 invocaciones!",
        rates: { r5: 4, r4: 18, r3: 78 },
        pityLimit: 40,
        featured: ["lyra", "aurelia"],
        costSingle: 50,
        costMulti: 450,
        active: true,
      },
    ]);

    await db.insert(gameEvents).values([
      {
        name: "Festival del Eclipse y el Eidolón",
        description: "Supera la prueba del Eidolón Prime para ganar gemas, oro y polvo de estrellas.",
        active: true,
        missionId: "ev-1",
        rewardGems: 250,
        rewardGold: 5000,
      },
      {
        name: "Expedición a las Ruinas de Mako Shinobi",
        description: "Investiga la colisión de materias Mako y sellos ninja para recolectar Cristales de Mako y Chakra Residual.",
        active: true,
        missionId: "ev-2",
        rewardGems: 300,
        rewardGold: 6000,
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

// Cálculo del Sistema AFK de 12 horas estrictas
export function calculateAfkRewards(lastClaimDate: Date, playerLevel: number): AfkRewardState {
  const now = Date.now();
  const lastTime = new Date(lastClaimDate).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((now - lastTime) / 60000));
  const MAX_AFK_MINUTES = 12 * 60; // Límite estricto de 12 horas (720 min)
  const accumulatedMinutes = Math.min(MAX_AFK_MINUTES, elapsedMinutes);

  const hours = accumulatedMinutes / 60;
  const gold = Math.floor(accumulatedMinutes * (25 + playerLevel * 3));
  const exp = Math.floor(accumulatedMinutes * (12 + playerLevel * 2));
  const gems = Math.floor(hours * 15);

  const materials: Record<string, number> = {};
  if (accumulatedMinutes >= 15) {
    materials.esencia = Math.floor(accumulatedMinutes / 15);
    materials.pergamino = Math.floor(accumulatedMinutes / 20);
  }
  if (accumulatedMinutes >= 30) {
    materials.mako_crystal = Math.floor(accumulatedMinutes / 45);
    materials.residual_chakra = Math.floor(accumulatedMinutes / 35);
    materials.nexus_coins = Math.floor(accumulatedMinutes / 25);
  }
  if (accumulatedMinutes >= 60) {
    materials.cristal = Math.floor(accumulatedMinutes / 60);
    materials.crystal_fragment = Math.floor(accumulatedMinutes / 50);
  }
  if (accumulatedMinutes >= 120) {
    materials.attire_sphere = Math.floor(accumulatedMinutes / 120);
    materials.stardust = Math.floor(accumulatedMinutes / 90);
  }
  if (accumulatedMinutes >= 240) {
    materials.biju_fragment = Math.floor(accumulatedMinutes / 240);
  }

  return {
    lastClaim: new Date(lastClaimDate).toISOString(),
    accumulatedMinutes,
    maxMinutes: MAX_AFK_MINUTES,
    available: accumulatedMinutes >= 2,
    rewards: {
      gold,
      exp,
      gems,
      materials,
    },
  };
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
  const [u] = await db.select({ username: users.username, isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  p.stamina = stamina;

  const chars = await db.select().from(ownedChars).where(eq(ownedChars.userId, userId));
  const progress = await db.select().from(missionProgress).where(eq(missionProgress.userId, userId));
  const history = await db.select().from(summonLog).where(eq(summonLog.userId, userId)).orderBy(desc(summonLog.id)).limit(60);
  const bannerList = await db.select().from(banners).where(eq(banners.active, true));
  const events = await db.select().from(gameEvents).where(visibleEventFilter());
  const overrides = await db.select().from(charOverrides);

  const [active] = await db.select({ missionId: battleSessions.missionId })
    .from(battleSessions)
    .where(and(eq(battleSessions.userId, userId), eq(battleSessions.used, false)))
    .limit(1);

  // Mapear misiones con estado de desbloqueo ordenado por capítulos
  const clearedSet = new Set(progress.filter((pr) => pr.clears > 0).map((pr) => pr.missionId));
  const missionList = ALL_MISSIONS.map((m, idx) => {
    const pr = progress.find((x) => x.missionId === m.id);
    let unlocked = false;
    if (idx === 0) unlocked = true;
    else {
      const prev = ALL_MISSIONS[idx - 1];
      unlocked = clearedSet.has(prev.id) || m.chapter === 99; // eventos especiales siempre accesibles
    }
    return {
      id: m.id,
      clears: pr?.clears || 0,
      stars: pr?.stars || 0,
      unlocked,
    };
  });

  const afkState = calculateAfkRewards(p.lastAfkClaim || new Date(), p.level);

  return {
    player: {
      userId: p.userId,
      username: u?.username || "Invocador",
      level: p.level,
      xp: p.xp,
      xpNext: XP_FOR_PLAYER_LEVEL(p.level),
      gold: p.gold,
      gems: p.gems,
      stardust: p.stardust,
      stamina: p.stamina,
      staminaMax: maxStamina(p.level),
      materials: (p.materials as Record<string, number>) || {},
      pity: (p.pity as Record<string, number>) || {},
      teams: (p.teams as { name: string; members: number[] }[]) || [],
      settings: (p.settings as { music: number; sfx: number; view3D?: boolean }) || { music: 0.6, sfx: 0.8, view3D: true },
      dailyStreak: p.dailyStreak,
      lastDaily: p.lastDaily,
      dailyAvailable: p.lastDaily !== new Date().toISOString().slice(0, 10),
      achievements: (p.achievements as string[]) || [],
      wins: p.wins,
      summonCount: p.summonCount,
      lastAfkClaim: new Date(p.lastAfkClaim || Date.now()).toISOString(),
      isAdmin: u?.isAdmin || false,
    },
    chars: chars.map((c) => ({
      id: c.id,
      charKey: c.charKey,
      level: c.level,
      resonance: c.resonance,
      favorite: c.favorite,
      transformed: c.transformed,
      skillLevel: c.skillLevel,
    })),
    missions: missionList,
    banners: bannerList.map((b) => ({
      key: b.key,
      name: b.name,
      description: b.description,
      kind: b.kind,
      active: b.active,
      costSingle: b.costSingle,
      costMulti: b.costMulti,
      rates: b.rates as { r5: number; r4: number; r3: number },
      pityLimit: b.pityLimit,
      featured: (b.featured as string[]) || [],
    })),
    events: events.map((ev) => ({
      id: ev.id,
      name: ev.name,
      description: ev.description,
      active: ev.active,
      missionId: ev.missionId,
      rewardGems: ev.rewardGems,
      rewardGold: ev.rewardGold,
      endsAt: ev.endsAt?.toISOString(),
    })),
    history: history.map((h) => ({
      id: h.id,
      bannerKey: h.bannerKey,
      charKey: h.charKey,
      rarity: h.rarity,
      isNew: h.isNew,
      createdAt: h.createdAt.toISOString(),
    })),
    overrides: overrides.map((o) => ({ charKey: o.charKey, mult: o.mult as any })),
    activeBattle: active || null,
    afk: afkState,
    achievements: (() => {
      const claimedSet = new Set((p.achievements as string[]) || []);
      return ACHIEVEMENTS.map((a) => {
        let done = false;
        if (a.id === "win_1") done = p.wins >= 1;
        else if (a.id === "win_10") done = p.wins >= 10;
        else if (a.id === "summon_10") done = p.summonCount >= 10;
        else if (a.id === "level_20") done = p.level >= 20;
        else if (a.id === "transform_1") done = chars.some((c) => c.transformed);
        else if (a.id === "multiverse_c2") done = missionList.some((m) => m.id === "c2-3" && m.clears > 0);
        else if (a.id === "afk_claim_5") done = p.wins >= 5;
        else done = true;
        return {
          id: a.id,
          name: a.name,
          desc: a.desc,
          reward: a.reward,
          claimed: claimedSet.has(a.id),
          done: done || claimedSet.has(a.id),
        };
      });
    })(),
  };
}

// Reclamar recompensas AFK de expedición persistente
export async function claimAfkRewards(userId: number) {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado", 404);

    const afk = calculateAfkRewards(p.lastAfkClaim || new Date(), p.level);
    if (!afk.available || afk.accumulatedMinutes < 2) {
      throw new GameError("Aún no hay suficientes recursos acumulados en la expedición (mínimo 2 minutos).", 400);
    }

    const mat = { ...((p.materials as Record<string, number>) || {}) };
    for (const [k, v] of Object.entries(afk.rewards.materials)) {
      mat[k] = (mat[k] || 0) + v;
    }

    let nextLevel = p.level;
    let nextXp = p.xp + afk.rewards.exp;
    while (nextXp >= XP_FOR_PLAYER_LEVEL(nextLevel)) {
      nextXp -= XP_FOR_PLAYER_LEVEL(nextLevel);
      nextLevel++;
    }

    await tx.update(players).set({
      gold: p.gold + afk.rewards.gold,
      gems: p.gems + afk.rewards.gems,
      xp: nextXp,
      level: nextLevel,
      materials: mat,
      lastAfkClaim: new Date(),
    }).where(eq(players.userId, userId));

    return {
      minutes: afk.accumulatedMinutes,
      rewards: afk.rewards,
    };
  });
}

// Iniciar batalla táctica
export async function startBattle(userId: number, missionId: string, teamIndex = 0) {
  const mission = MISSION_MAP[missionId];
  if (!mission) throw new GameError("Misión no encontrada.", 404);

  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);

    const stamina = await syncStaminaTx(tx, p);
    if (stamina < mission.staminaCost) {
      throw new GameError(`Energía insuficiente. Necesitas ${mission.staminaCost}⚡.`, 400);
    }

    // Cancelar batallas inconclusas anteriores
    const [active] = await tx.select().from(battleSessions)
      .where(and(eq(battleSessions.userId, userId), eq(battleSessions.used, false)))
      .for("update");
    if (active) {
      throw new GameError("Ya tienes una batalla en curso. Reanúdala o retírate desde el Inicio.", 409);
    }

    await tx.update(players).set({ stamina: stamina - mission.staminaCost }).where(eq(players.userId, userId));

    const teams = (p.teams as { name: string; members: number[] }[]) || [];
    const team = teams[teamIndex] || teams[0];
    const memberIds = team?.members || [];

    let members = await tx.select().from(ownedChars)
      .where(and(eq(ownedChars.userId, userId), inArray(ownedChars.id, memberIds.length ? memberIds : [-1])));

    if (!members.length) {
      members = await tx.select().from(ownedChars).where(eq(ownedChars.userId, userId)).limit(4);
    }

    const overrides = await tx.select().from(charOverrides);
    const result = createBattle(members, mission, overrides as any);
    const token = randomBytes(24).toString("hex");

    await tx.insert(battleSessions).values({
      token,
      userId,
      missionId,
      used: false,
      state: result.state,
    });

    return {
      token,
      mission,
      snapshot: result.state,
    };
  });
}

// Enviar acción en combate autoritativo
export async function submitBattleAction(userId: number, token: string, command: any) {
  return db.transaction(async (tx) => {
    const [session] = await tx.select().from(battleSessions)
      .where(and(eq(battleSessions.token, token), eq(battleSessions.userId, userId)))
      .for("update");

    if (!session) throw new GameError("Batalla no encontrada.", 404);
    if (session.used || !session.state) throw new GameError("Esta batalla ya ha concluido.", 409);

    const step = applyPlayerAction(session.state as BattleSnapshot, command);
    let battleResult = null;

    if (step.state.phase === "victory") {
      const mission = MISSION_MAP[session.missionId];
      const stars = resultStars(step.state);

      const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
      const mat = { ...((p.materials as Record<string, number>) || {}) };
      for (const [k, v] of Object.entries(mission?.rewardMaterials || {})) {
        mat[k] = (mat[k] || 0) + v;
      }

      let nextLevel = p.level;
      let nextXp = p.xp + (mission?.rewardExp || 100);
      while (nextXp >= XP_FOR_PLAYER_LEVEL(nextLevel)) {
        nextXp -= XP_FOR_PLAYER_LEVEL(nextLevel);
        nextLevel++;
      }

      await tx.update(players).set({
        gold: p.gold + (mission?.rewardGold || 1000),
        gems: p.gems + (mission?.rewardGems || 50),
        xp: nextXp,
        level: nextLevel,
        wins: p.wins + 1,
        materials: mat,
      }).where(eq(players.userId, userId));

      const [existingPr] = await tx.select().from(missionProgress)
        .where(and(eq(missionProgress.userId, userId), eq(missionProgress.missionId, session.missionId)));

      if (existingPr) {
        await tx.update(missionProgress).set({
          clears: existingPr.clears + 1,
          stars: Math.max(existingPr.stars, stars),
        }).where(eq(missionProgress.id, existingPr.id));
      } else {
        await tx.insert(missionProgress).values({
          userId,
          missionId: session.missionId,
          clears: 1,
          stars,
        });
      }

      await tx.update(battleSessions).set({ used: true, state: step.state }).where(eq(battleSessions.token, token));
      battleResult = {
        victory: true,
        stars,
        rewards: {
          gems: mission?.rewardGems || 50,
          gold: mission?.rewardGold || 1000,
          exp: mission?.rewardExp || 100,
          materials: mission?.rewardMaterials,
        },
      };
    } else if (step.state.phase === "defeat") {
      await tx.update(battleSessions).set({ used: true, state: step.state }).where(eq(battleSessions.token, token));
      battleResult = { victory: false, rewards: null };
    } else {
      await tx.update(battleSessions).set({ state: step.state }).where(eq(battleSessions.token, token));
    }

    return {
      snapshot: step.state,
      frames: step.frames,
      result: battleResult,
    };
  });
}

// Retirada
export async function retreatBattle(userId: number, token: string) {
  return db.transaction(async (tx) => {
    const [session] = await tx.select().from(battleSessions)
      .where(and(eq(battleSessions.token, token), eq(battleSessions.userId, userId)))
      .for("update");
    if (!session || session.used) throw new GameError("Batalla inactiva.", 409);
    await tx.update(battleSessions).set({ used: true }).where(eq(battleSessions.token, token));
    return { ok: true };
  });
}

// Invocaciones Gacha con garantía (Pity de 50) y registro real
export async function doSummon(userId: number, bannerKey: string, count: number) {
  if (count !== 1 && count !== 10) throw new GameError("Solo se puede invocar de a 1 o 10.", 400);

  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);

    const [b] = await tx.select().from(banners).where(eq(banners.key, bannerKey));
    if (!b || !b.active) throw new GameError("Banner no disponible.", 404);

    const cost = count === 1 ? b.costSingle : b.costMulti;
    if (p.gems < cost) throw new GameError(`Gemas insuficientes. Necesitas ${cost} gemas.`, 400);

    const pityMap = { ...((p.pity as Record<string, number>) || {}) };
    let currentPity = pityMap[bannerKey] || 0;
    const featured = (b.featured as string[]) || [];

    const pool5 = CHARACTERS.filter((c) => c.rarity === 5);
    const pool4 = CHARACTERS.filter((c) => c.rarity === 4);
    const pool3 = CHARACTERS.filter((c) => c.rarity === 3);

    const results: Array<{ charKey: string; rarity: number; isNew: boolean; resonance: number }> = [];
    const ownedRows = await tx.select().from(ownedChars).where(eq(ownedChars.userId, userId));
    const ownedMap = new Map(ownedRows.map((o) => [o.charKey, o]));

    let stardustGain = 0;

    for (let i = 0; i < count; i++) {
      currentPity++;
      let rarity = 3;
      const roll = Math.random() * 100;

      if (currentPity >= b.pityLimit || roll < b.rates.r5) {
        rarity = 5;
        currentPity = 0;
      } else if (roll < b.rates.r5 + b.rates.r4) {
        rarity = 4;
      } else {
        rarity = 3;
      }

      let chosen: CharDef;
      if (rarity === 5 && featured.length && Math.random() < 0.5) {
        const featKey = featured[randomInt(featured.length)];
        chosen = CHAR_MAP[featKey] || pool5[randomInt(pool5.length)];
      } else if (rarity === 5) {
        chosen = pool5[randomInt(pool5.length)];
      } else if (rarity === 4) {
        chosen = pool4[randomInt(pool4.length)];
      } else {
        chosen = pool3[randomInt(pool3.length)];
      }

      const existing = ownedMap.get(chosen.key);
      const isNew = !existing;
      let resLevel = 0;

      if (existing) {
        resLevel = Math.min(5, existing.resonance + 1);
        existing.resonance = resLevel;
        await tx.update(ownedChars).set({ resonance: resLevel }).where(eq(ownedChars.id, existing.id));
        const stardustByRarity = rarity === 5 ? 15 : rarity === 4 ? 5 : 1;
        stardustGain += stardustByRarity;
      } else {
        const [inserted] = await tx.insert(ownedChars).values({
          userId,
          charKey: chosen.key,
          level: 1,
          resonance: 0,
        }).returning();
        ownedMap.set(chosen.key, inserted);
      }

      await tx.insert(summonLog).values({
        userId,
        bannerKey,
        charKey: chosen.key,
        rarity,
        isNew,
      });

      results.push({
        charKey: chosen.key,
        rarity,
        isNew,
        resonance: resLevel,
      });
    }

    pityMap[bannerKey] = currentPity;

    await tx.update(players).set({
      gems: p.gems - cost,
      stardust: p.stardust + stardustGain,
      summonCount: p.summonCount + count,
      pity: pityMap,
    }).where(eq(players.userId, userId));

    return {
      results,
      gemsLeft: p.gems - cost,
      pityCount: currentPity,
      stardustGain,
    };
  });
}

// Subir de nivel un personaje
export async function upgradeChar(userId: number, charId: number, times = 1) {
  return db.transaction(async (tx) => {
    const [c] = await tx.select().from(ownedChars).where(and(eq(ownedChars.id, charId), eq(ownedChars.userId, userId))).for("update");
    if (!c) throw new GameError("Personaje no encontrado.", 404);

    const def = CHAR_MAP[c.charKey];
    const cap = RARITY_CAP[def.rarity];
    if (c.level >= cap) throw new GameError(`Nivel máximo alcanzado (${cap}).`, 400);

    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);

    let currentLevel = c.level;
    let gold = p.gold;
    const mat = { ...((p.materials as Record<string, number>) || {}) };
    let upgradesDone = 0;

    for (let i = 0; i < Math.max(1, times); i++) {
      if (currentLevel >= cap) break;
      const cost = levelUpCost(currentLevel);
      if (gold < cost.gold || (mat.esencia || 0) < cost.esencia) break;
      gold -= cost.gold;
      mat.esencia = (mat.esencia || 0) - cost.esencia;
      currentLevel++;
      upgradesDone++;
    }

    if (upgradesDone === 0) {
      throw new GameError("Recursos insuficientes para subir de nivel.", 400);
    }

    await tx.update(players).set({ gold, materials: mat }).where(eq(players.userId, userId));
    await tx.update(ownedChars).set({ level: currentLevel }).where(eq(ownedChars.id, charId));

    return { level: currentLevel, upgrades: upgradesDone };
  });
}

// Subir de nivel una habilidad
export async function upgradeSkill(userId: number, charId: number) {
  return db.transaction(async (tx) => {
    const [c] = await tx.select().from(ownedChars).where(and(eq(ownedChars.id, charId), eq(ownedChars.userId, userId))).for("update");
    if (!c) throw new GameError("Personaje no encontrado.", 404);
    if (c.skillLevel >= 5) throw new GameError("Habilidad ya al nivel máximo (5).", 400);

    const cost = skillUpCost(c.skillLevel);
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    const mat = { ...((p.materials as Record<string, number>) || {}) };

    if (p.gold < cost.gold) throw new GameError("Oro insuficiente.", 400);
    if ((mat.pergamino || 0) < cost.pergamino) throw new GameError("Pergaminos insuficientes.", 400);
    if (cost.crystal_fragment && (mat.crystal_fragment || 0) < cost.crystal_fragment) {
      throw new GameError("Fragmentos de Cristal insuficientes.", 400);
    }

    mat.pergamino -= cost.pergamino;
    if (cost.crystal_fragment) mat.crystal_fragment -= cost.crystal_fragment;

    await tx.update(players).set({ gold: p.gold - cost.gold, materials: mat }).where(eq(players.userId, userId));
    await tx.update(ownedChars).set({ skillLevel: c.skillLevel + 1 }).where(eq(ownedChars.id, charId));

    return { skillLevel: c.skillLevel + 1 };
  });
}

// Despertar Transformación (Modo Sabio, Barion, Valquiria, Omnilátigo, etc.)
export async function transformChar(userId: number, charId: number) {
  return db.transaction(async (tx) => {
    const [c] = await tx.select().from(ownedChars).where(and(eq(ownedChars.id, charId), eq(ownedChars.userId, userId))).for("update");
    if (!c) throw new GameError("Personaje no encontrado.", 404);
    if (c.transformed) throw new GameError("El personaje ya ha despertado su transformación.", 400);

    const def = CHAR_MAP[c.charKey];
    if (!def.transform) throw new GameError("Este personaje no posee transformación.", 400);

    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    const mat = { ...((p.materials as Record<string, number>) || {}) };
    const cost = def.transform.cost;

    if (p.gold < cost.gold) throw new GameError(`Oro insuficiente (${cost.gold} 🪙 necesarios).`, 400);
    for (const [matKey, needed] of Object.entries(cost.materials)) {
      if ((mat[matKey] || 0) < needed) {
        throw new GameError(`Materiales insuficientes: necesitas ${needed}x ${matKey}.`, 400);
      }
    }

    for (const [matKey, needed] of Object.entries(cost.materials)) {
      mat[matKey] -= needed;
    }

    await tx.update(players).set({ gold: p.gold - cost.gold, materials: mat }).where(eq(players.userId, userId));
    await tx.update(ownedChars).set({ transformed: true }).where(eq(ownedChars.id, charId));

    return { ok: true, transformName: def.transform.name };
  });
}

// Reclamar recompensa diaria
export async function claimDaily(userId: number) {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);

    const today = new Date().toISOString().slice(0, 10);
    if (p.lastDaily === today) throw new GameError("Ya has reclamado tu recompensa diaria de hoy.", 409);

    const streak = p.dailyStreak + 1;
    const gemsReward = 150 + Math.min(streak, 7) * 25;
    const goldReward = 3000 + streak * 500;
    const mat = { ...((p.materials as Record<string, number>) || {}) };
    mat.esencia = (mat.esencia || 0) + 10;
    mat.residual_chakra = (mat.residual_chakra || 0) + 5;
    mat.mako_crystal = (mat.mako_crystal || 0) + 3;

    await tx.update(players).set({
      gems: p.gems + gemsReward,
      gold: p.gold + goldReward,
      dailyStreak: streak,
      lastDaily: today,
      materials: mat,
    }).where(eq(players.userId, userId));

    return { streak, gems: gemsReward, gold: goldReward };
  });
}

// Equipos
export async function updateTeams(userId: number, teams: any) {
  await db.update(players).set({ teams }).where(eq(players.userId, userId));
  return { ok: true };
}

// Favorito
export async function toggleFavorite(userId: number, charId: number) {
  const [c] = await db.select().from(ownedChars).where(and(eq(ownedChars.id, charId), eq(ownedChars.userId, userId)));
  if (!c) throw new GameError("Personaje no encontrado.", 404);
  await db.update(ownedChars).set({ favorite: !c.favorite }).where(eq(ownedChars.id, charId));
  return { favorite: !c.favorite };
}

// Configuración
export async function updateSettings(userId: number, settings: any) {
  await db.update(players).set({ settings }).where(eq(players.userId, userId));
  return { ok: true };
}

// Cerrar sesión
export async function logoutUser(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

// Datos de administración
export async function getAdminData() {
  const userRows = await db.select({
    id: users.id, username: users.username, isAdmin: users.isAdmin, createdAt: users.createdAt,
    level: players.level, gems: players.gems, gold: players.gold, wins: players.wins,
  }).from(users).leftJoin(players, eq(users.id, players.userId)).orderBy(desc(users.id)).limit(100);

  const bannerRows = await db.select().from(banners);
  const eventRows = await db.select().from(gameEvents);
  const errorRows = await db.select().from(errorLogs).orderBy(desc(errorLogs.id)).limit(50);
  const overrideRows = await db.select().from(charOverrides);

  return {
    users: userRows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    banners: bannerRows,
    events: eventRows.map((e) => ({ ...e, endsAt: e.endsAt?.toISOString() || null })),
    errors: errorRows.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    overrides: overrideRows,
  };
}

export async function overrideChar(charKey: string, mult: any) {
  const [existing] = await db.select().from(charOverrides).where(eq(charOverrides.charKey, charKey));
  if (existing) {
    await db.update(charOverrides).set({ mult }).where(eq(charOverrides.charKey, charKey));
  } else {
    await db.insert(charOverrides).values({ charKey, mult });
  }
  return { ok: true };
}

export async function clearErrors() {
  await db.delete(errorLogs);
  return { ok: true };
}

export async function getActiveBattle(userId: number) {
  const [session] = await db.select().from(battleSessions)
    .where(and(eq(battleSessions.userId, userId), eq(battleSessions.used, false)))
    .limit(1);
  if (!session || !session.state) throw new GameError("No hay batalla activa.", 404);
  const mission = MISSION_MAP[session.missionId];
  return {
    token: session.token,
    mission,
    snapshot: session.state,
  };
}

export const SHOP_ITEMS = [
  { id: "esencia_10", name: "10x Esencia Astral", icon: "🧪", currency: "gold", price: 2000, reward: { esencia: 10 } },
  { id: "pergamino_5", name: "5x Pergamino Táctico", icon: "📜", currency: "gold", price: 3000, reward: { pergamino: 5 } },
  { id: "cristal_2", name: "2x Cristal Puro", icon: "💎", currency: "gold", price: 6000, reward: { cristal: 2 } },
  { id: "mako_3", name: "3x Cristal de Mako", icon: "🟢", currency: "gold", price: 8000, reward: { mako_crystal: 3 } },
  { id: "chakra_5", name: "5x Chakra Residual", icon: "🌀", currency: "gold", price: 7500, reward: { residual_chakra: 5 } },
  { id: "attire_1", name: "1x Esfera de Atavío", icon: "🔮", currency: "stardust", price: 20, reward: { attire_sphere: 1 } },
  { id: "biju_1", name: "1x Fragmento de Bijū", icon: "🦊", currency: "stardust", price: 35, reward: { biju_fragment: 1 } },
  { id: "stardust_gems", name: "200 Gemas Nexus", icon: "🔷", currency: "stardust", price: 25, reward: { gems: 200 } },
  { id: "nexus_coins_pack", name: "50 Monedas del Nexus", icon: "🪙", currency: "gold", price: 4000, reward: { nexus_coins: 50 } },
];

export async function buyShop(userId: number, itemId: string) {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) throw new GameError("Artículo no disponible.", 404);

  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);

    if (item.currency === "gold") {
      if (p.gold < item.price) throw new GameError("Oro insuficiente.", 400);
      await tx.update(players).set({ gold: p.gold - item.price }).where(eq(players.userId, userId));
    } else {
      if (p.stardust < item.price) throw new GameError("Polvo Estelar insuficiente.", 400);
      await tx.update(players).set({ stardust: p.stardust - item.price }).where(eq(players.userId, userId));
    }

    const mat = { ...((p.materials as Record<string, number>) || {}) };
    let extraGems = 0;
    for (const [k, v] of Object.entries(item.reward)) {
      if (k === "gems") extraGems += (v as number);
      else mat[k] = (mat[k] || 0) + (v as number);
    }

    await tx.update(players).set({
      materials: mat,
      gems: p.gems + extraGems,
    }).where(eq(players.userId, userId));

    return { ok: true, item: item.name };
  });
}

export async function claimAchievement(userId: number, key: string) {
  const ach = ACHIEVEMENTS.find((a) => a.id === key);
  if (!ach) throw new GameError("Logro no encontrado.", 404);

  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);
    const existing = (p.achievements as string[]) || [];
    if (existing.includes(key)) throw new GameError("Logro ya reclamado.", 409);

    await tx.update(players).set({
      gems: p.gems + ach.reward,
      achievements: [...existing, key],
    }).where(eq(players.userId, userId));

    return { ok: true, gemsReward: ach.reward };
  });
}

export const actBattle = submitBattleAction;
export const levelUpChar = upgradeChar;
export const skillUpChar = upgradeSkill;
export const saveTeams = updateTeams;
export const saveSettings = updateSettings;
export const claimAfk = claimAfkRewards;

export const adminData = getAdminData;
export const adminClearErrors = clearErrors;
export const adminSetOverride = overrideChar;

export async function adminGrant(userId: number, body: { gems?: number; gold?: number; stardust?: number; materials?: Record<string, number>; charKey?: string }) {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado", 404);
    const mat = { ...((p.materials as Record<string, number>) || {}) };
    if (body.materials) {
      for (const [k, v] of Object.entries(body.materials)) {
        mat[k] = (mat[k] || 0) + Number(v);
      }
    }
    await tx.update(players).set({
      gems: p.gems + (body.gems || 0),
      gold: p.gold + (body.gold || 0),
      stardust: p.stardust + (body.stardust || 0),
      materials: mat,
    }).where(eq(players.userId, userId));

    if (body.charKey && CHAR_MAP[body.charKey]) {
      const [existing] = await tx.select().from(ownedChars).where(and(eq(ownedChars.userId, userId), eq(ownedChars.charKey, body.charKey)));
      if (existing) {
        await tx.update(ownedChars).set({ resonance: existing.resonance + 1 }).where(eq(ownedChars.id, existing.id));
      } else {
        await tx.insert(ownedChars).values({ userId, charKey: body.charKey, level: 1, resonance: 0, skillLevel: 1, favorite: false, transformed: false });
      }
    }
    return { ok: true };
  });
}

export async function adminUpdateBanner(key: string, data: any) {
  const [existing] = await db.select().from(banners).where(eq(banners.key, key));
  if (existing) {
    await db.update(banners).set({
      active: data.active ?? existing.active,
      featured: data.featured ?? existing.featured,
      rates: data.rates ?? existing.rates,
      costSingle: data.costSingle ?? existing.costSingle,
      costMulti: data.costMulti ?? existing.costMulti,
    }).where(eq(banners.key, key));
  }
  return { ok: true };
}

export async function adminSaveEvent(data: any) {
  if (data.id) {
    await db.update(gameEvents).set({
      name: data.name,
      description: data.description,
      active: data.active,
      missionId: data.missionId,
      rewardGems: data.rewardGems,
      rewardGold: data.rewardGold,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    }).where(eq(gameEvents.id, data.id));
  } else {
    await db.insert(gameEvents).values({
      name: data.name,
      description: data.description,
      active: data.active ?? true,
      missionId: data.missionId,
      rewardGems: data.rewardGems || 200,
      rewardGold: data.rewardGold || 5000,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    });
  }
  return { ok: true };
}

export async function adminBackup() {
  const allUsers = await db.select().from(users);
  const allPlayers = await db.select().from(players);
  const allChars = await db.select().from(ownedChars);
  const allBanners = await db.select().from(banners);
  const allEvents = await db.select().from(gameEvents);
  return { users: allUsers, players: allPlayers, chars: allChars, banners: allBanners, events: allEvents, timestamp: new Date().toISOString() };
}


