CREATE TABLE "banners" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'normal' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"cost_single" integer DEFAULT 50 NOT NULL,
	"cost_multi" integer DEFAULT 450 NOT NULL,
	"rates" jsonb DEFAULT '{"r5":3,"r4":17,"r3":80}'::jsonb NOT NULL,
	"pity_limit" integer DEFAULT 50 NOT NULL,
	"featured" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mission_id" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"enemy_power" integer DEFAULT 0 NOT NULL,
	"state" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "char_overrides" (
	"char_key" text PRIMARY KEY NOT NULL,
	"mult" jsonb DEFAULT '{"hp":1,"atk":1,"def":1,"spd":1}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"stack" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"mission_id" text,
	"reward_gems" integer DEFAULT 100 NOT NULL,
	"reward_gold" integer DEFAULT 2000 NOT NULL,
	"ends_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mission_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mission_id" text NOT NULL,
	"clears" integer DEFAULT 0 NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owned_chars" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"char_key" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"resonance" integer DEFAULT 0 NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"transformed" boolean DEFAULT false NOT NULL,
	"skill_level" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"gold" integer DEFAULT 5000 NOT NULL,
	"gems" integer DEFAULT 1600 NOT NULL,
	"stardust" integer DEFAULT 0 NOT NULL,
	"stamina" integer DEFAULT 60 NOT NULL,
	"stamina_at" timestamp DEFAULT now() NOT NULL,
	"materials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"teams" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{"music":0.6,"sfx":0.8}'::jsonb NOT NULL,
	"daily_streak" integer DEFAULT 0 NOT NULL,
	"last_daily" text DEFAULT '' NOT NULL,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"summon_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summon_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"banner_key" text NOT NULL,
	"char_key" text NOT NULL,
	"rarity" integer NOT NULL,
	"is_new" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"salt" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mission_user_unique" ON "mission_progress" USING btree ("user_id","mission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "owned_user_char" ON "owned_chars" USING btree ("user_id","char_key");