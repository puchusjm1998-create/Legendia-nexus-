// ============================================================
// LEGENDIA NEXUS — Store Global de React (Context, Estado y Toasts)
// ============================================================
"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, type AfkRewardState } from "./api";

export interface PlayerState {
  userId: number;
  username: string;
  level: number;
  xp: number;
  xpNext: number;
  gold: number;
  gems: number;
  stardust: number;
  stamina: number;
  staminaMax: number;
  materials: Record<string, number>;
  pity: Record<string, number>;
  teams: { name: string; members: number[] }[];
  settings: { music: number; sfx: number; view3D?: boolean };
  dailyStreak: number;
  lastDaily: string;
  dailyAvailable?: boolean;
  achievements: string[];
  wins: number;
  summonCount: number;
  lastAfkClaim: string;
  isAdmin?: boolean;
}

export interface OwnedCharState {
  id: number;
  charKey: string;
  level: number;
  resonance: number;
  favorite: boolean;
  transformed: boolean;
  skillLevel: number;
}

export interface MissionProgressState {
  id: string;
  clears: number;
  stars: number;
  unlocked: boolean;
}

export interface BannerState {
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

export interface GameEventState {
  id: number;
  name: string;
  description: string;
  active: boolean;
  missionId: string | null;
  rewardGems: number;
  rewardGold: number;
  endsAt?: string;
}

export interface SummonLogItem {
  id: number;
  bannerKey: string;
  charKey: string;
  rarity: number;
  isNew: boolean;
  createdAt: string;
}

export interface AchievementItem {
  id: string;
  name: string;
  desc: string;
  reward: number;
  claimed: boolean;
  done?: boolean;
}

export interface FullGameState {
  player: PlayerState;
  chars: OwnedCharState[];
  missions: MissionProgressState[];
  banners: BannerState[];
  events: GameEventState[];
  history: SummonLogItem[];
  overrides: { charKey: string; mult: { hp: number; atk: number; def: number; spd: number } }[];
  activeBattle: { missionId: string } | null;
  afk?: AfkRewardState;
  achievements?: AchievementItem[];
}

export interface ToastItem {
  id: number;
  msg: string;
  kind: "info" | "gold" | "err";
}

interface GameContextValue {
  state: FullGameState | null;
  authed: boolean;
  booting: boolean;
  toasts: ToastItem[];
  toast: (msg: string, kind?: "info" | "gold" | "err") => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loginSuccess: (token: string) => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

let toastSeq = 0;

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FullGameState | null>(null);
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, kind: "info" | "gold" | "err" = "info") => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev.slice(-4), { id, msg, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAuthed(false);
      setState(null);
      setBooting(false);
      return;
    }
    try {
      const data = await api<FullGameState>("game/state");
      setState(data);
      setAuthed(true);
    } catch {
      setToken(null);
      setAuthed(false);
      setState(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    Promise.resolve().then(() => {
      if (!cancel) refresh();
    });
    return () => { cancel = true; };
  }, [refresh]);

  const loginSuccess = async (token: string) => {
    setToken(token);
    await refresh();
  };

  const logout = async () => {
    try {
      await api("auth/logout", {});
    } catch {
      /* ignore */
    }
    setToken(null);
    setAuthed(false);
    setState(null);
  };

  const login = async (username: string, password: string) => {
    const res = await api<{ token: string }>("auth/login", { username, password });
    await loginSuccess(res.token);
  };

  const register = async (username: string, password: string) => {
    const res = await api<{ token: string }>("auth/register", { username, password });
    await loginSuccess(res.token);
  };

  return (
    <GameContext.Provider value={{ state, authed, booting, toasts, toast, refresh, logout, loginSuccess, login, register }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame debe utilizarse dentro de un GameProvider");
  return ctx;
}
