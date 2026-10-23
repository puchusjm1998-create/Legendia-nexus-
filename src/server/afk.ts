// ============================================================
// LEGENDIA NEXUS — Expediciones AFK (lógica autoritativa del servidor)
// - El tiempo lo decide SIEMPRE el servidor (Date.now() del proceso Node);
//   el cliente nunca envía marcas de tiempo.
// - Las recompensas se calculan como total(t) − ya_concedido, con t acotado
//   a la duración de la expedición (máx. 12 h). Reclamar dos veces no duplica.
// - Cada reclamación se hace en UNA transacción con bloqueo de filas.
// ============================================================
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { players, ownedChars, expeditions, afkProfiles, charOverrides } from "@/db/schema";
import { CHAR_MAP, RARITY_CAP } from "@/game/catalog";
import {
  AFK_CONFIG, AFK_MAX_MS, EXPEDITION_MAP, applyCharXp, durationMs, fragmentPool,
  fragmentRecipient, slotsForLevel, squadBonus, totalsAt,
  type AfkClaimResult, type AfkResource, type AfkState, type SquadMember,
} from "@/game/afk";
import { GameError } from "./errors";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ExpRow = typeof expeditions.$inferSelect;

const toState = (e: ExpRow) => ({
  id: e.id, expKey: e.expKey, charIds: e.charIds,
  startedAt: new Date(e.startedAt).getTime(), endsAt: new Date(e.endsAt).getTime(),
  granted: e.granted, mult: e.mult / 1000, power: e.power, memberKeys: e.memberKeys,
  status: e.status as "active" | "closed",
});

/** Duración efectiva guardada en la fila, acotada al límite duro de 12 h. */
const rowDuration = (e: ExpRow) =>
  Math.min(AFK_MAX_MS, Math.max(0, new Date(e.endsAt).getTime() - new Date(e.startedAt).getTime()));

export async function getAfkState(userId: number): Promise<AfkState> {
  const [p] = await db.select({ level: players.level }).from(players).where(eq(players.userId, userId));
  const rows = await db.select().from(expeditions)
    .where(and(eq(expeditions.userId, userId), eq(expeditions.status, "active")));
  const [prof] = await db.select().from(afkProfiles).where(eq(afkProfiles.userId, userId));
  return {
    serverNow: Date.now(),
    slots: slotsForLevel(p?.level ?? 1),
    expeditions: rows.map(toState),
    mastery: prof?.mastery ?? {},
  };
}

export async function startExpedition(userId: number, expKey: string, charIdsRaw: unknown) {
  const def = EXPEDITION_MAP[expKey];
  if (!def) throw new GameError("Expedición desconocida.");
  if (!Array.isArray(charIdsRaw)) throw new GameError("Escuadrón inválido.");
  const charIds = [...new Set(charIdsRaw.map(Number))];
  if (!charIds.length || charIds.length > AFK_CONFIG.maxSquad || charIds.some((n) => !Number.isInteger(n) || n <= 0))
    throw new GameError(`Elige de 1 a ${AFK_CONFIG.maxSquad} personajes.`);

  return db.transaction(async (tx) => {
    // Bloquear al jugador serializa inicios/reclamaciones simultáneas.
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);
    if (p.level < def.minPlayerLevel) throw new GameError(`Requiere nivel de cuenta ${def.minPlayerLevel}.`);
    const active = await tx.select().from(expeditions)
      .where(and(eq(expeditions.userId, userId), eq(expeditions.status, "active")));
    if (active.length >= slotsForLevel(p.level))
      throw new GameError("No quedan huecos de expedición libres. Reclama o retira una.", 409);
    if (active.some((a) => a.expKey === expKey)) throw new GameError("Esa expedición ya está en curso.", 409);
    const busy = new Set(active.flatMap((a) => a.charIds));
    if (charIds.some((id) => busy.has(id))) throw new GameError("Algún personaje ya está en otra expedición.", 409);

    const rows = await tx.select().from(ownedChars)
      .where(and(eq(ownedChars.userId, userId), inArray(ownedChars.id, charIds)));
    if (rows.length !== charIds.length) throw new GameError("Personaje no encontrado en tu colección.");
    const ovr = await tx.select().from(charOverrides);
    const squad: SquadMember[] = charIds.map((id) => {
      const r = rows.find((x) => x.id === id)!;
      return { charKey: r.charKey, level: r.level, resonance: r.resonance, transformed: r.transformed,
        mult: ovr.find((o) => o.charKey === r.charKey)?.mult };
    });
    const [prof] = await tx.select().from(afkProfiles).where(eq(afkProfiles.userId, userId));
    const bonus = squadBonus(def, squad, prof?.mastery?.[expKey] ?? 0);
    if (bonus.power < def.minPower)
      throw new GameError(`Poder insuficiente: ${bonus.power} / ${def.minPower} requerido.`);

    const now = Date.now();
    const [row] = await tx.insert(expeditions).values({
      userId, expKey, charIds,
      startedAt: new Date(now), endsAt: new Date(now + durationMs(def)),
      mult: Math.round(bonus.mult * 1000), power: bonus.power,
      memberKeys: squad.map((s) => s.charKey),
    }).returning();
    return { expedition: toState(row), serverNow: now };
  });
}

export async function claimExpedition(userId: number, expId: number, recall = false) {
  if (!Number.isInteger(expId)) throw new GameError("Expedición inválida.");
  return db.transaction(async (tx): Promise<AfkClaimResult & { serverNow: number }> => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);
    const [exp] = await tx.select().from(expeditions)
      .where(and(eq(expeditions.id, expId), eq(expeditions.userId, userId))).for("update");
    if (!exp) throw new GameError("Expedición no encontrada.", 404);
    if (exp.status !== "active") throw new GameError("Esta expedición ya fue reclamada.", 409);
    const def = EXPEDITION_MAP[exp.expKey];
    if (!def) throw new GameError("Definición de expedición no encontrada.", 500);

    const now = Date.now();                  // HORA DEL SERVIDOR
    const dur = Math.min(rowDuration(exp), durationMs(def));
    const started = new Date(exp.startedAt).getTime();
    const elapsed = Math.max(0, Math.min(now - started, dur));
    const finished = elapsed >= dur;
    const totals = totalsAt(def, exp.mult / 1000, elapsed);

    const delta: Partial<Record<AfkResource, number>> = {};
    let any = false;
    for (const [k, v] of Object.entries(totals) as [AfkResource, number][]) {
      const d = Math.max(0, v - (exp.granted[k] || 0));
      if (d > 0) { delta[k] = d; any = true; }
    }
    if (!any && !recall && !finished)
      throw new GameError("Todavía no hay recursos que reclamar.", 409);

    const result: AfkClaimResult & { serverNow: number } = {
      gained: delta, fragments: {}, levelUps: [], wastedXp: 0, finished, serverNow: now,
    };
    const mats = { ...p.materials };
    const patch: Partial<typeof players.$inferInsert> = {};
    if (delta.gold) patch.gold = p.gold + delta.gold;
    if (delta.stardust) patch.stardust = p.stardust + delta.stardust;
    for (const m of ["esencia", "pergamino", "cristal"] as const)
      if (delta[m]) mats[m] = (mats[m] || 0) + delta[m]!;

    // Fragmentos: reparto determinista por (expedición, índice)
    if (delta.fragments) {
      const pool = fragmentPool(def, exp.memberKeys);
      const from = (exp.granted.fragments || 0) + 1;
      for (let i = from; i < from + delta.fragments; i++) {
        const key = fragmentRecipient(exp.id, i, pool);
        result.fragments[key] = (result.fragments[key] || 0) + 1;
      }
      for (const [k, n] of Object.entries(result.fragments))
        mats[`frag_${k}`] = (mats[`frag_${k}`] || 0) + n;
    }
    patch.materials = mats;

    // EXP de personaje: repartida entre los miembros que no estén al máximo
    if (delta.charXp) {
      const members = await tx.select().from(ownedChars)
        .where(and(eq(ownedChars.userId, userId), inArray(ownedChars.id, exp.charIds))).for("update");
      const eligible = members.filter((m) => m.level < RARITY_CAP[CHAR_MAP[m.charKey].rarity]);
      let used = 0;
      if (eligible.length) {
        const base = Math.floor(delta.charXp / eligible.length);
        let rest = delta.charXp - base * eligible.length;
        for (const m of eligible) {
          const gain = base + (rest > 0 ? 1 : 0);
          if (rest > 0) rest--;
          const cap = RARITY_CAP[CHAR_MAP[m.charKey].rarity];
          const r = applyCharXp(m.level, m.xp, gain, cap);
          used += r.used;
          await tx.update(ownedChars).set({ level: r.level, xp: r.xp }).where(eq(ownedChars.id, m.id));
          if (r.level > m.level) result.levelUps.push({ charKey: m.charKey, level: r.level });
        }
      }
      result.wastedXp = delta.charXp - used;
    }
    await tx.update(players).set(patch).where(eq(players.userId, userId));

    const closing = finished || recall;
    await tx.update(expeditions).set({
      granted: totals, lastClaimAt: new Date(now), claims: exp.claims + 1,
      status: closing ? "closed" : "active",
    }).where(eq(expeditions.id, exp.id));

    if (finished) {
      // Nivel de expedición: sólo cuenta si se completó el tiempo entero.
      const [prof] = await tx.select().from(afkProfiles).where(eq(afkProfiles.userId, userId)).for("update");
      const mastery = { ...(prof?.mastery ?? {}) };
      mastery[exp.expKey] = (mastery[exp.expKey] || 0) + 1;
      await tx.insert(afkProfiles).values({ userId, mastery, totalClaims: 1 })
        .onConflictDoUpdate({ target: afkProfiles.userId,
          set: { mastery, totalClaims: (prof?.totalClaims ?? 0) + 1 } });
    }
    return result;
  });
}

// ---------------- Uso de fragmentos ----------------

export async function spendFragments(userId: number, charKey: string) {
  const def = CHAR_MAP[charKey];
  if (!def) throw new GameError("Personaje desconocido.");
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(players).where(eq(players.userId, userId)).for("update");
    if (!p) throw new GameError("Jugador no encontrado.", 404);
    const have = p.materials[`frag_${charKey}`] || 0;
    const [owned] = await tx.select().from(ownedChars)
      .where(and(eq(ownedChars.userId, userId), eq(ownedChars.charKey, charKey))).for("update");
    const mats = { ...p.materials };
    if (!owned) {
      const cost = AFK_CONFIG.fragmentCostUnlock[def.rarity];
      if (have < cost) throw new GameError(`Necesitas ${cost} fragmentos (tienes ${have}).`);
      mats[`frag_${charKey}`] = have - cost;
      const [row] = await tx.insert(ownedChars).values({ userId, charKey, level: 1 }).returning();
      const teams = p.teams.map((t) => ({ ...t, members: [...t.members] }));
      const team = teams.find((t) => t.members.length < 4 && t.members.length > 0) || teams.find((t) => t.members.length < 4);
      if (team) team.members.push(row.id);
      await tx.update(players).set({ materials: mats, teams }).where(eq(players.userId, userId));
      return { kind: "unlock" as const, charKey, cost };
    }
    if (owned.resonance >= AFK_CONFIG.maxResonance) throw new GameError("Resonancia al máximo (5/5).");
    const cost = AFK_CONFIG.fragmentCostResonance[def.rarity];
    if (have < cost) throw new GameError(`Necesitas ${cost} fragmentos (tienes ${have}).`);
    mats[`frag_${charKey}`] = have - cost;
    await tx.update(ownedChars).set({ resonance: owned.resonance + 1 }).where(eq(ownedChars.id, owned.id));
    await tx.update(players).set({ materials: mats }).where(eq(players.userId, userId));
    return { kind: "resonance" as const, charKey, cost, resonance: owned.resonance + 1 };
  });
}
