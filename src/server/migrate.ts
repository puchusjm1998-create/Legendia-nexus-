// ============================================================
// Migración ligera e idempotente (CREATE ... IF NOT EXISTS).
// Permite actualizar un servidor ya desplegado SIN perder datos aunque
// el operador olvide ejecutar `npx drizzle-kit push`. Es equivalente al
// esquema declarado en src/db/schema.ts.
// ============================================================
import { sql } from "drizzle-orm";
import { db } from "@/db";

const g = globalThis as typeof globalThis & { __nexusSchemaReady?: Promise<void> };

async function run() {
  await db.execute(sql`ALTER TABLE owned_chars ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS expeditions (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    exp_key text NOT NULL,
    char_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    started_at timestamp NOT NULL DEFAULT now(),
    ends_at timestamp NOT NULL,
    status text NOT NULL DEFAULT 'active',
    granted jsonb NOT NULL DEFAULT '{}'::jsonb,
    mult_milli integer NOT NULL DEFAULT 1000,
    power integer NOT NULL DEFAULT 0,
    member_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
    last_claim_at timestamp,
    claims integer NOT NULL DEFAULT 0
  )`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS expedition_active_unique
    ON expeditions (user_id, exp_key) WHERE status = 'active'`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS expedition_user_idx ON expeditions (user_id, status)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS afk_profiles (
    user_id integer PRIMARY KEY,
    mastery jsonb NOT NULL DEFAULT '{}'::jsonb,
    total_claims bigint NOT NULL DEFAULT 0
  )`);
}

/** Se resuelve una vez por proceso; si falla, se reintenta en la siguiente petición. */
export function ensureSchema(): Promise<void> {
  if (!g.__nexusSchemaReady) {
    g.__nexusSchemaReady = run().catch((e) => { g.__nexusSchemaReady = undefined; throw e; });
  }
  return g.__nexusSchemaReady;
}
