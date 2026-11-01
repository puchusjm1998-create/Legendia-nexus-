// ============================================================
// LEGENDIA NEXUS — Expedición AFK de 12 Horas
// Acumulación Pasiva de Recursos, Materiales y Protección de Límite
// ============================================================
"use client";
import React, { useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { useGame } from "@/lib/store";
import { MATERIALS } from "@/game/catalog";
import { Btn, SectionTitle } from "../ui";
import { getAudio } from "@/game/audio";

const subscribeClock = (notify: () => void) => {
  const id = setInterval(notify, 1000);
  return () => clearInterval(id);
};
const getClockSnapshot = () => Math.floor(Date.now() / 1000);
const getClockServerSnapshot = () => 0;

export function AfkScreen() {
  const { state, refresh, toast } = useGame();
  const [claiming, setClaiming] = useState(false);
  const nowSec = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);

  if (!state) return null;
  const p = state.player;
  const afk = state.afk;

  const lastClaimSec = p.lastAfkClaim ? Math.floor(new Date(p.lastAfkClaim).getTime() / 1000) : 0;
  const elapsedSeconds = nowSec && lastClaimSec
    ? Math.max(0, nowSec - lastClaimSec)
    : (afk ? afk.accumulatedMinutes * 60 : 0);
  const MAX_SECONDS = 12 * 3600; // 12 horas estrictas
  const accumulatedSeconds = Math.min(MAX_SECONDS, elapsedSeconds);

  const hours = Math.floor(accumulatedSeconds / 3600);
  const minutes = Math.floor((accumulatedSeconds % 3600) / 60);
  const seconds = accumulatedSeconds % 60;

  const progressPercent = Math.min(100, (accumulatedSeconds / MAX_SECONDS) * 100);
  const isCapped = accumulatedSeconds >= MAX_SECONDS;

  // Cálculos locales en tiempo real
  const accumulatedMinutes = Math.floor(accumulatedSeconds / 60);
  const goldGain = Math.floor(accumulatedMinutes * (25 + p.level * 3));
  const expGain = Math.floor(accumulatedMinutes * (12 + p.level * 2));
  const gemGain = Math.floor((accumulatedMinutes / 60) * 15);

  const claimRewards = async () => {
    if (claiming || accumulatedMinutes < 2) return;
    setClaiming(true);
    try {
      const res = await api<{ minutes: number; rewards: { gold: number; exp: number; gems: number; materials: Record<string, number> } }>("game/afk", {});
      getAudio().sfx("levelup");
      toast(`🎁 ¡Expedición recolectada! +${res.rewards.gold}🪙 +${res.rewards.gems}🔷 +${res.rewards.exp}📈`, "gold");
      await refresh();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <SectionTitle
        icon="⏳"
        sub="Generación pasiva constante incluso con el juego cerrado (límite estricto de 12 horas)"
      >
        Expediciones del Nexus Multiversal
      </SectionTitle>

      {/* Tarjeta Principal de Acumulación Temporal */}
      <div className="relative overflow-hidden rounded-xl border border-cyan-400/30 bg-gradient-to-b from-[#132244] to-[#0a1329] p-5 shadow-2xl">
        <div className="absolute right-0 top-0 -mr-10 -mt-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            {isCapped ? "⚠️ LÍMITE DE 12 HORAS ALCANZADO" : "EXPEDICIÓN EN CURSO"}
          </p>

          {/* Reloj Digital con fuente estilizada */}
          <div className="my-2 flex items-baseline gap-1 font-display text-4xl font-black tracking-tight text-white">
            <span className="text-amber-300">{String(hours).padStart(2, "0")}</span>
            <span className="text-slate-500">:</span>
            <span className="text-cyan-300">{String(minutes).padStart(2, "0")}</span>
            <span className="text-slate-500">:</span>
            <span className="text-slate-400 text-2xl">{String(seconds).padStart(2, "0")}</span>
            <span className="ml-2 text-xs text-slate-400 font-sans font-normal">/ 12:00:00</span>
          </div>

          {/* Barra de progreso con efecto glow */}
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-black/60 p-0.5 border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCapped
                  ? "bg-gradient-to-r from-amber-400 to-rose-500 shadow-[0_0_12px_#f43f5e]"
                  : "bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 shadow-[0_0_10px_#38bdf8]"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-slate-300">
            {isCapped
              ? "Reclama ahora para continuar acumulando recompensas."
              : `Eficiencia de expedición: Nv. ${p.level} de Invocador (+${p.level * 3} oro/min).`}
          </p>

          <Btn
            className="mt-4 w-full py-3 text-sm font-extrabold uppercase tracking-wider"
            variant={isCapped ? "gold" : "blue"}
            disabled={claiming || accumulatedMinutes < 2}
            onClick={claimRewards}
          >
            {claiming
              ? "Reclamando..."
              : accumulatedMinutes < 2
              ? "Acumulando... (mínimo 2 min)"
              : `Reclamar Recompensas (${hours}h ${minutes}m)`}
          </Btn>
        </div>
      </div>

      {/* Vista previa de recursos acumulados */}
      <div className="rounded-xl border border-white/10 bg-[#0f1b35] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
          Recompensas Listas para Recoger
        </p>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-black/30 p-2.5 border border-white/5">
            <span className="text-xl">🪙</span>
            <p className="mt-1 font-display font-bold text-amber-300">+{goldGain.toLocaleString("es")}</p>
            <p className="text-[10px] text-slate-400">Oro</p>
          </div>
          <div className="rounded-lg bg-black/30 p-2.5 border border-white/5">
            <span className="text-xl">📈</span>
            <p className="mt-1 font-display font-bold text-emerald-400">+{expGain.toLocaleString("es")}</p>
            <p className="text-[10px] text-slate-400">EXP</p>
          </div>
          <div className="rounded-lg bg-black/30 p-2.5 border border-white/5">
            <span className="text-xl">🔷</span>
            <p className="mt-1 font-display font-bold text-cyan-300">+{gemGain}</p>
            <p className="text-[10px] text-slate-400">Gemas</p>
          </div>
        </div>

        {/* Materiales Multiversales de la convergencia */}
        <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
          Materiales Multiversales Extraídos
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded bg-black/25 p-2 border border-white/5">
            <span className="text-2xl">🟢</span>
            <div className="min-w-0">
              <p className="font-bold text-emerald-300 truncate">Cristales de Mako</p>
              <p className="text-[10px] text-slate-400">Transformaciones y límites FF</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded bg-black/25 p-2 border border-white/5">
            <span className="text-2xl">🌀</span>
            <div className="min-w-0">
              <p className="font-bold text-cyan-300 truncate">Chakra Residual</p>
              <p className="text-[10px] text-slate-400">Modos Sabio y Bijū Naruto</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded bg-black/25 p-2 border border-white/5">
            <span className="text-2xl">🔮</span>
            <div className="min-w-0">
              <p className="font-bold text-purple-300 truncate">Esferas de Atavío</p>
              <p className="text-[10px] text-slate-400">Despertar de trajes y auras</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded bg-black/25 p-2 border border-white/5">
            <span className="text-2xl">🦊</span>
            <div className="min-w-0">
              <p className="font-bold text-amber-300 truncate">Fragmentos de Bijū</p>
              <p className="text-[10px] text-slate-400">Ascensos de 5 estrellas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded bg-black/25 p-2 border border-white/5">
            <span className="text-2xl">✨</span>
            <div className="min-w-0">
              <p className="font-bold text-yellow-300 truncate">Polvo de Estrellas</p>
              <p className="text-[10px] text-slate-400">Forja y tienda secreta</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded bg-black/25 p-2 border border-white/5">
            <span className="text-2xl">🪙</span>
            <div className="min-w-0">
              <p className="font-bold text-slate-200 truncate">Monedas del Nexus</p>
              <p className="text-[10px] text-slate-400">Mercado interdimensional</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventario de Materiales Actuales del Jugador */}
      <div className="rounded-xl border border-white/10 bg-[#0c162b] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">
          Tu Almacén de Materiales Actual
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {Object.entries(MATERIALS).map(([key, item]) => {
            const count = p.materials[key] || 0;
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded bg-white/5 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>{item.icon}</span>
                  <span className="truncate text-slate-300">{item.name}</span>
                </div>
                <span className="font-display font-bold text-amber-300">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
