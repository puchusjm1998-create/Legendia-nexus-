import type { BattleSnapshot } from "@/game/battle-engine";
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const players = pgTable("players", {
  userId: integer("user_id").primaryKey(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  gold: integer("gold").notNull().default(5000),
  gems: integer("gems").notNull().default(1600),
  stardust: integer("stardust").notNull().default(0),
  stamina: integer("stamina").notNull().default(60),
  staminaAt: timestamp("stamina_at").notNull().defaultNow(),
  materials: jsonb("materials").$type<Record<string, number>>().notNull().default({}),
  pity: jsonb("pity").$type<Record<string, number>>().notNull().default({}),
  teams: jsonb("teams")
    .$type<{ name: string; members: number[] }[]>()
    .notNull()
    .default([]),
  settings: jsonb("settings")
    .$type<{ music: number; sfx: number }>()
    .notNull()
    .default({ music: 0.6, sfx: 0.8 }),
  dailyStreak: integer("daily_streak").notNull().default(0),
  lastDaily: text("last_daily").notNull().default(""),
  achievements: jsonb("achievements").$type<string[]>().notNull().default([]),
  wins: integer("wins").notNull().default(0),
  summonCount: integer("summon_count").notNull().default(0),
  lastAfkClaim: timestamp("last_afk_claim").notNull().defaultNow(),
});

export const ownedChars = pgTable(
  "owned_chars",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    charKey: text("char_key").notNull(),
    level: integer("level").notNull().default(1),
    resonance: integer("resonance").notNull().default(0),
    favorite: boolean("favorite").notNull().default(false),
    transformed: boolean("transformed").notNull().default(false),
    skillLevel: integer("skill_level").notNull().default(1),
  },
  (t) => [uniqueIndex("owned_user_char").on(t.userId, t.charKey)]
);

export const summonLog = pgTable("summon_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bannerKey: text("banner_key").notNull(),
  charKey: text("char_key").notNull(),
  rarity: integer("rarity").notNull(),
  isNew: boolean("is_new").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const missionProgress = pgTable(
  "mission_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    missionId: text("mission_id").notNull(),
    clears: integer("clears").notNull().default(0),
    stars: integer("stars").notNull().default(0),
  },
  (t) => [uniqueIndex("mission_user_unique").on(t.userId, t.missionId)]
);

export const battleSessions = pgTable("battle_sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  missionId: text("mission_id").notNull(),
  used: boolean("used").notNull().default(false),
  enemyPower: integer("enemy_power").notNull().default(0),
  state: jsonb("state").$type<BattleSnapshot | null>(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
});

export const banners = pgTable("banners", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  kind: text("kind").notNull().default("normal"),
  active: boolean("active").notNull().default(true),
  costSingle: integer("cost_single").notNull().default(50),
  costMulti: integer("cost_multi").notNull().default(450),
  rates: jsonb("rates")
    .$type<{ r5: number; r4: number; r3: number }>()
    .notNull()
    .default({ r5: 3, r4: 17, r3: 80 }),
  pityLimit: integer("pity_limit").notNull().default(50),
  featured: jsonb("featured").$type<string[]>().notNull().default([]),
});

export const gameEvents = pgTable("game_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
  missionId: text("mission_id"),
  rewardGems: integer("reward_gems").notNull().default(100),
  rewardGold: integer("reward_gold").notNull().default(2000),
  endsAt: timestamp("ends_at"),
});

export const charOverrides = pgTable("char_overrides", {
  charKey: text("char_key").primaryKey(),
  mult: jsonb("mult")
    .$type<{ hp: number; atk: number; def: number; spd: number }>()
    .notNull()
    .default({ hp: 1, atk: 1, def: 1, spd: 1 }),
});

export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  stack: text("stack").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
