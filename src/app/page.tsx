"use client";
import { useEffect, useState } from "react";
import { useGame } from "@/lib/store";
import type { BattleStart } from "@/lib/api";
import type { Tab } from "@/lib/nav";
import { getAudio } from "@/game/audio";
import { AuthScreen } from "@/components/screens/AuthScreen";
import { HomeScreen } from "@/components/screens/Home";
import { StoryScreen, MissionsScreen } from "@/components/screens/Missions";
import { TeamScreen } from "@/components/screens/Team";
import { CharactersScreen, AlbumScreen } from "@/components/screens/Collection";
import { SummonScreen } from "@/components/screens/Summon";
import { EventsScreen } from "@/components/screens/Events";
import { ShopScreen } from "@/components/screens/Shop";
import { ProfileScreen } from "@/components/screens/Profile";
import { ExpeditionsScreen } from "@/components/screens/Expeditions";
import { SettingsScreen } from "@/components/screens/Settings";
import { Battle } from "@/components/Battle";

const NAV: { tab: Tab; icon: string; label: string }[] = [
  { tab: "home", icon: "🏯", label: "Inicio" },
  { tab: "story", icon: "📖", label: "Historia" },
  { tab: "afk", icon: "⛺", label: "AFK" },
  { tab: "summon", icon: "🌀", label: "Invocar" },
  { tab: "album", icon: "📚", label: "Álbum" },
  { tab: "team", icon: "🛡️", label: "Equipo" },
];

export default function Page() {
  const { state, authed, booting, toasts, refresh } = useGame();
  const [tab, setTab] = useState<Tab>("home");
  const [battle, setBattle] = useState<BattleStart | null>(null);

  // Música según contexto: login y menú comparten pista (sin reinicios al navegar);
  // sólo cambia al entrar/salir de un combate.
  useEffect(() => {
    getAudio().playMusic(battle ? "battle" : "menu");
  }, [battle]);

  // regeneración de energía visible
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => refresh(), 90000);
    return () => clearInterval(t);
  }, [authed, refresh]);

  if (booting) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0a1224]">
        <p className="font-display text-3xl font-extrabold uppercase text-white anim-pulse-soft" style={{ textShadow: "0 0 24px #38bdf8" }}>Legendia Nexus</p>
        <p className="mt-2 text-xs tracking-[0.4em] text-cyan-300 uppercase">Conectando al servidor…</p>
      </div>
    );
  }

  if (!authed || !state) return (
    <>
      <AuthScreen />
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-1.5 px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`anim-slide-up max-w-sm rounded px-4 py-2 text-xs font-bold shadow-lg backdrop-blur ${
            t.kind === "err" ? "bg-rose-600/90 text-white" : t.kind === "gold" ? "bg-amber-400/95 text-amber-950" : "bg-cyan-500/90 text-cyan-950"
          }`}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );

  const p = state.player;

  return (
    <div className="relative min-h-dvh">
      {/* fondo ambiental */}
      <div className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url(/art/bg-home.jpg)" }} />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#0a1224]/80 to-[#0a1224]" />

      <div className="relative mx-auto max-w-lg">
        {/* barra superior */}
        <header className="sticky top-0 z-30 border-b border-cyan-400/15 bg-[#0a1224]/95 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <button onClick={() => setTab("profile")} className="flex items-center gap-1.5" title="Perfil">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 font-display text-sm font-extrabold text-amber-950">{p.level}</span>
              <div className="text-left">
                <p className="max-w-20 truncate text-[11px] font-bold leading-none text-slate-200">{p.username}</p>
                <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-black/60">
                  <div className="h-full bg-cyan-400" style={{ width: `${(p.xp / p.xpNext) * 100}%` }} />
                </div>
              </div>
            </button>
            <div className="flex flex-1 items-center justify-end gap-1.5 text-[11px] font-bold">
              <span className="rounded bg-black/40 px-1.5 py-1 text-emerald-300" title="Energía (se regenera con el tiempo)">⚡{p.stamina}/{p.staminaMax}</span>
              <span className="rounded bg-black/40 px-1.5 py-1 text-amber-300" title="Oro">🪙{p.gold >= 10000 ? `${(p.gold / 1000).toFixed(1)}k` : p.gold}</span>
              <button onClick={() => setTab("summon")} className="rounded bg-black/40 px-1.5 py-1 text-cyan-300" title="Gemas Nexus">🔷{p.gems}</button>
              <button onClick={() => setTab("settings")} className="rounded bg-black/40 px-1.5 py-1 text-slate-300" title="Ajustes">⚙️</button>
            </div>
          </div>
        </header>

        {/* contenido */}
        <main className="px-3 pb-24 pt-3" key={tab}>
          <div className="anim-fade">
            {tab === "home" && <HomeScreen go={setTab} onBattle={setBattle} />}
            {tab === "story" && <StoryScreen onBattle={setBattle} />}
            {tab === "missions" && <MissionsScreen onBattle={setBattle} />}
            {tab === "team" && <TeamScreen />}
            {tab === "chars" && <CharactersScreen />}
            {tab === "album" && <AlbumScreen />}
            {tab === "afk" && <ExpeditionsScreen />}
            {tab === "summon" && <SummonScreen />}
            {tab === "events" && <EventsScreen onBattle={setBattle} />}
            {tab === "shop" && <ShopScreen />}
            {tab === "profile" && <ProfileScreen />}
            {tab === "settings" && <SettingsScreen />}
          </div>
        </main>

        {/* navegación inferior */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-cyan-400/15 bg-[#0a1224]/95 backdrop-blur">
          <div className="mx-auto grid max-w-lg grid-cols-6">
            {NAV.map((n) => (
              <button key={n.tab} onClick={() => { getAudio().sfx("click"); setTab(n.tab); }}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 transition-all ${tab === n.tab ? "text-amber-300" : "text-slate-500 hover:text-slate-300"}`}>
                {n.tab === "summon" ? (
                  <span className={`-mt-5 flex h-11 w-11 items-center justify-center rounded-full border-2 text-xl shadow-[0_0_18px_rgba(56,189,248,0.5)] transition-all ${tab === "summon" ? "border-amber-300 bg-gradient-to-b from-cyan-400 to-sky-600" : "border-cyan-400/60 bg-gradient-to-b from-[#152342] to-[#0d1730]"}`}>
                    {n.icon}
                  </span>
                ) : (
                  <span className="text-lg">{n.icon}</span>
                )}
                <span className="font-display text-[10px] font-bold uppercase tracking-wide">{n.label}</span>
                {tab === n.tab && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-amber-300" />}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* combate a pantalla completa */}
      {battle && (
        <Battle data={battle} onFinish={async () => { setBattle(null); getAudio().playMusic("menu"); await refresh(); }} />
      )}

      {/* toasts */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-1.5 px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`anim-slide-up max-w-sm rounded px-4 py-2 text-xs font-bold shadow-lg backdrop-blur ${
            t.kind === "err" ? "bg-rose-600/90 text-white" : t.kind === "gold" ? "bg-amber-400/95 text-amber-950" : "bg-cyan-500/90 text-cyan-950"
          }`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}