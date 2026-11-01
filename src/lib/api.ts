// ============================================================
// LEGENDIA NEXUS — Cliente de API con Bearer Token y Tipos
// ============================================================
import type { BattleFrame, BattleSnapshot } from "@/game/battle-engine";
import type { MissionDef } from "@/game/missions";

const TOKEN_KEY = "legendia_nexus_session_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}: ${res.statusText}`);
  }
  return data as T;
}

export interface BattleStart {
  token: string;
  mission: MissionDef;
  snapshot: BattleSnapshot;
}

export interface BattleResult {
  victory: boolean;
  stars?: number;
  firstClear?: boolean;
  levelUp?: boolean;
  newLevel?: number;
  rewards: {
    gems: number;
    gold: number;
    exp: number;
    xp?: number;
    materials?: Record<string, number>;
  } | null;
}

export type MissionState = {
  id: string;
  clears: number;
  stars: number;
  unlocked: boolean;
};

export interface BannerRow {
  key: string;
  name: string;
  description: string;
  kind: string;
  active: boolean;
  costSingle: number;
  costMulti: number;
  rates: { r5: number; r4: number; r3: number };
  pityLimit: number;
  featured: string[];
}

export interface SummonResult {
  results: {
    charKey: string;
    rarity: number;
    isNew: boolean;
    stardust?: number;
  }[];
  newGems: number;
}

export interface BattleTurn {
  snapshot: BattleSnapshot;
  frames: BattleFrame[];
  result?: BattleResult | null;
}

export interface AfkRewardState {
  lastClaim: string;
  accumulatedMinutes: number;
  maxMinutes: number;
  available: boolean;
  rewards: {
    gold: number;
    exp: number;
    gems: number;
    materials: Record<string, number>;
  };
}
