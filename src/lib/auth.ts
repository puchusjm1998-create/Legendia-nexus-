import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { users, sessions, players, ownedChars, errorLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { STARTER_TEAM } from "@/game/catalog";
import { ensureSchema } from "@/server/migrate";

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const h = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return h.length === stored.length && timingSafeEqual(h, stored);
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({ token, userId });
  return token;
}

export type AuthUser = { id: number; username: string; isAdmin: boolean };

export async function getUserFromRequest(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  await ensureSchema();
  const rows = await db
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);
  if (!rows.length) return null;
  return { id: rows[0].u.id, username: rows[0].u.username, isAdmin: rows[0].u.isAdmin };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function seedPlayer(tx: Tx, userId: number) {
  await tx.insert(players).values({ userId });
  const starters = await tx.insert(ownedChars)
    .values(STARTER_TEAM.map((k) => ({ userId, charKey: k, level: 5 })))
    .returning();
  await tx.update(players).set({
    teams: [
      { name: "Equipo Alfa", members: starters.map((c) => c.id) },
      { name: "Equipo Beta", members: [] },
      { name: "Equipo Gamma", members: [] },
    ],
    materials: { esencia: 20, cristal: 3, pergamino: 10 },
  }).where(eq(players.userId, userId));
}

export async function initPlayer(userId: number) {
  return db.transaction(async (tx) => {
    // Serializa la inicialización si llegan dos peticiones concurrentes.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const [existing] = await tx.select().from(players).where(eq(players.userId, userId)).limit(1);
    if (!existing) await seedPlayer(tx, userId);
  });
}

export async function registerUser(username: string, password: string) {
  const salt = randomBytes(16).toString("hex");
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users)
      .values({ username, passwordHash: hashPassword(password, salt), salt })
      .returning();
    await seedPlayer(tx, user.id);
    return user;
  });
}

/** Ensures the admin account from env exists (never a hardcoded password). */
export async function ensureAdmin() {
  await ensureSchema();
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return;
  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing.length) {
    if (!existing[0].isAdmin) {
      if (!verifyPassword(password, existing[0].salt, existing[0].passwordHash))
        throw new Error("ADMIN_USERNAME pertenece a otra cuenta. Configura un nombre diferente.");
      await db.update(users).set({ isAdmin: true }).where(eq(users.id, existing[0].id));
    }
    await initPlayer(existing[0].id);
    return;
  }
  const salt = randomBytes(16).toString("hex");
  const [created] = await db.transaction(async (tx) => {
    const [admin] = await tx.insert(users).values({
      username, passwordHash: hashPassword(password, salt), salt, isAdmin: true,
    }).onConflictDoNothing({ target: users.username }).returning();
    if (admin) await seedPlayer(tx, admin.id);
    return [admin];
  });
  if (!created) await ensureAdmin();
}

export async function logError(err: unknown) {
  try {
    const e = err as Error;
    await db.insert(errorLogs).values({
      message: String(e?.message || err).slice(0, 500),
      stack: String(e?.stack || "").slice(0, 2000),
    });
  } catch {
    /* never crash on logging */
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
