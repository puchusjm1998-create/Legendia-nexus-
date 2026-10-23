"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ApiError, api, getToken, setToken, type GameState } from "./api";
import { getAudio } from "@/game/audio";

export interface Toast { id: number; msg: string; kind: "ok" | "err" | "gold" }

interface Store {
  state: GameState | null;
  authed: boolean;
  booting: boolean;
  refresh: () => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  toast: (msg: string, kind?: Toast["kind"]) => void;
  toasts: Toast[];
  /** Hora del SERVIDOR estimada (ms). Inmune a un reloj del dispositivo mal puesto. */
  serverNow: () => number;
}

const Ctx = createContext<Store>(null as unknown as Store);
export const useGame = () => useContext(Ctx);

let toastId = 0;

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const refreshing = useRef(false);
  const offset = useRef(0); // serverNow - Date.now() en el último estado recibido
  const serverNow = useCallback(() => Date.now() + offset.current, []);

  const toast = useCallback((msg: string, kind: Toast["kind"] = "ok") => {
    const id = ++toastId;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const s = await api<GameState>("game/state");
      if (s.afk?.serverNow) offset.current = s.afk.serverNow - Date.now();
      setState(s);
      setAuthed(true);
      getAudio().setVolumes(s.player.settings.music, s.player.settings.sfx);
    } catch (error) {
      // No desmontar el juego por una pérdida momentánea de red móvil.
      if (error instanceof ApiError && error.status === 401) {
        setToken(null);
        setAuthed(false);
        setState(null);
      }
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (getToken()) await refresh();
      setBooting(false);
    })();
  }, [refresh]);

  const login = useCallback(async (u: string, p: string) => {
    const r = await api<{ token: string }>("auth/login", { username: u, password: p });
    setToken(r.token);
    await refresh();
  }, [refresh]);

  const register = useCallback(async (u: string, p: string) => {
    const r = await api<{ token: string }>("auth/register", { username: u, password: p });
    setToken(r.token);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await api("auth/logout", {}); } catch { /* ignore */ }
    setToken(null);
    setState(null);
    setAuthed(false);
    getAudio().playMusic(null);
  }, []);

  return (
    <Ctx.Provider value={{ state, authed, booting, refresh, login, register, logout, toast, toasts, serverNow }}>
      {children}
    </Ctx.Provider>
  );
}