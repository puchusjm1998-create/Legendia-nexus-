import type { MissionDef } from "@/game/missions";
import type { BattleFrame, BattleSnapshot } from "@/game/battle-engine";
import type { AfkState } from "@/game/afk";

export type { PlayerSettings } from "@/db/schema";
import type { PlayerSettings } from "@/db/schema";

export interface OwnedChar {
  id: number; userId: number; charKey: string; level: number;
  resonance: number; favorite: boolean; transformed: boolean; skillLevel: number;
  xp: number;
}
export interface BannerRow {
  key: string; name: string; description: string; kind: string; active: boolean;
  costSingle: number; costMulti: number;
  rates: { r5: number; r4: number; r3: number };
  pityLimit: number; featured: string[];
}
export interface EventRow {
  id: number; name: string; description: string; active: boolean;
  missionId: string | null; rewardGems: number; rewardGold: number; endsAt: string | null;
}
export interface MissionState { id: string; unlocked: boolean; clears: number; stars: number }
export interface HistoryRow {
  id: number; bannerKey: string; charKey: string; rarity: number; isNew: boolean; createdAt: string;
}
export interface AchievementRow {
  key: string; name: string; desc: string;
  reward: { gems?: number; gold?: number; stardust?: number };
  done: boolean; claimed: boolean;
}
export interface OverrideRow { charKey: string; mult: { hp: number; atk: number; def: number; spd: number } }

export interface GameState {
  player: {
    username: string; isAdmin: boolean; level: number; xp: number; xpNext: number;
    gold: number; gems: number; stardust: number; stamina: number; staminaMax: number;
    materials: Record<string, number>;
    teams: { name: string; members: number[] }[];
    settings: PlayerSettings;
    dailyAvailable: boolean; dailyStreak: number; wins: number; summonCount: number;
    pity: Record<string, number>;
  };
  chars: OwnedChar[];
  missions: MissionState[];
  history: HistoryRow[];
  banners: BannerRow[];
  events: EventRow[];
  overrides: OverrideRow[];
  achievements: AchievementRow[];
  afk: AfkState;
  activeBattle: { missionId: string } | null;
}

export interface SummonResult {
  results: { charKey: string; rarity: number; isNew: boolean; stardust: number }[];
  pity: number; cost: number; stardustGain: number;
}

export interface BattleStart {
  token: string;
  mission: MissionDef;
  snapshot: BattleSnapshot;
  enemyPower: number;
}

export interface BattleTurn {
  snapshot: BattleSnapshot;
  frames: BattleFrame[];
  result: BattleResult | null;
}

export interface BattleResult {
  victory: boolean;
  stars?: number;
  firstClear?: boolean;
  levelUp?: boolean;
  newLevel?: number;
  rewards?: { gold: number; gems: number; xp: number; materials: Record<string, number> } | null;
}

const TOKEN_KEY = "legendia_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.status = status; }
}

export async function api<T = unknown>(path: string, body?: unknown, method?: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/${path}`, {
    method: method || (body !== undefined ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || "Error de conexión", res.status);
  return data as T;
}