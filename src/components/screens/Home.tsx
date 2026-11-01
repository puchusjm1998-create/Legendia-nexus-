"use client";
import { useEffect, useState } from "react";
import { CHARACTERS, CHAR_MAP } from "@/game/catalog";
import { api, type BattleStart } from "@/lib/api";
import { MENU, type Tab } from "@/lib/nav";
import { useGame } from "@/lib/store";
import { Portrait, RarityStars } from "../Portrait";
import { Btn, SectionTitle } from "../ui";
import { getAudio } from "@/game/audio";
import { CharDetail } from "../CharDetail";

export function HomeScreen({ go, onBattle }: { go: (t: Tab) => void; onBattle: (battle: BattleStart) => void }) {
  const { state, refresh, toast } = useGame();
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [detail, setDetail] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [resuming, setResuming] = useState(false);
  const p = state!.player;
  const featured = ["naruto", "lightning", "kagero", "sephiroth", "sasuke", "cloud", "kaion", "madara", "clive"];

  useEffect(() => {
    const t = setInterval(() => setFeaturedIdx((i) => (i + 1) % featured.length), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fKey = featured[featuredIdx];
  const fDef = CHAR_MAP[fKey] || CHAR_MAP.kagero;
  const event = state!.events[0];
  const afk = state!.afk;
  const afkHours = (afk.accumulatedMinutes / 60).toFixed(1);
  const afkPercent = Math.min(100, Math.round((afk.accumulatedMinutes / 720) * 100));

  const resumeBattle = async () => {
    if (resuming) return;
    setResuming(true);
    try {
      const data = await api<BattleStart>("battle/active");
      onBattle(data);
    } catch (e) {
      toast((e as Error).message, "err");
      await refresh();
    } finally {
      setResuming(false);
    }
  };

  const claimDaily = async () => {
    setClaiming(true);
    try {
      const r = await api<{ gems: number; gold: number; streak: number }>("game/daily", {});
      getAudio().sfx("summon4");
      toast(`🎁 Día ${r.streak}: +${r.gems} 🔷 +${r.gold} 🪙 +5 🧪`, "gold");
      await refresh();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      {/* escaparate destacado */}
      <div className="relative h-56 overflow-hidden rounded-lg border border-amber-400/20">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/art/bg-home.jpg)" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1224] via-[#0a1224]/50 to-transparent" />
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="particle" style={{ left: `${12 + i * 11}%`, width: 4, height: 4, animationDuration: `${8 + i * 2}s`, animationDelay: `${-i * 2}s` }} />
        ))}
        <button onClick={() => setDetail(fKey)} className="absolute bottom-0 right-2 top-2 w-44 anim-float" title={`Ver a ${fDef.name}`}>
          <div key={fKey} className="h-full w-full overflow-hidden rounded-lg anim-bounce-in" style={{ boxShadow: `0 0 34px ${fDef.color}88` }}>
            <Portrait charKey={fKey} />
          </div>
        </button>
        <div className="absolute bottom-4 left-4 max-w-[52%]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">Guardián destacado</p>
          <p className="font-display text-2xl font-extrabold leading-tight text-white">{fDef.name}</p>
          <RarityStars rarity={5} />
          <p className="mt-0.5 text-[11px] italic text-slate-300">{fDef.title}</p>
          <Btn small className="mt-2" onClick={() => go("summon")}>🌀 Invocar ahora</Btn>
        </div>
        <div className="absolute right-3 top-3 flex gap-1">
          {featured.map((_, i) => (
            <span key={i} className={`h-1.5 w-4 rounded-full transition-all ${i === featuredIdx ? "bg-amber-300" : "bg-white/25"}`} />
          ))}
        </div>
      </div>

      {/* partida táctica persistida en el servidor */}
      {state!.activeBattle && (
        <button onClick={resumeBattle} disabled={resuming}
          className="tile-cut flex w-full items-center gap-3 border border-cyan-300/50 bg-gradient-to-r from-cyan-500/25 to-sky-500/5 p-3 text-left transition-transform active:scale-[0.98]">
          <span className="text-3xl anim-pulse-soft">⚔️</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold uppercase text-cyan-200">Batalla en curso</p>
            <p className="truncate text-[11px] text-slate-300">{state!.activeBattle.missionId} · tu turno quedó guardado en el servidor</p>
          </div>
          <span className="shrink-0 font-display text-xs font-bold text-cyan-200">{resuming ? "…" : "REANUDAR ▸"}</span>
        </button>
      )}

      {/* recompensa diaria */}
      {p.dailyAvailable && (
        <button onClick={claimDaily} disabled={claiming}
          className="tile-cut flex w-full items-center gap-3 border border-amber-300/40 bg-gradient-to-r from-amber-400/25 to-amber-400/5 p-3 text-left transition-transform active:scale-[0.98] anim-rise">
          <span className="text-3xl anim-float">🎁</span>
          <div className="flex-1">
            <p className="font-display text-sm font-bold uppercase text-amber-300">Recompensa diaria disponible</p>
            <p className="text-[11px] text-slate-300">Racha actual: {p.dailyStreak} días · gemas, oro y esencias</p>
          </div>
          <span className="font-display text-xs font-bold text-amber-200 anim-pulse-soft">RECLAMAR ▸</span>
        </button>
      )}

      {/* sistema afk de 12 horas */}
      <button onClick={() => go("afk")}
        className="tile-cut flex w-full items-center gap-3 border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 via-teal-900/40 to-black/60 p-3 text-left transition-transform active:scale-[0.98]">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-2xl">
          ⏳
          {afk.accumulatedMinutes >= 720 && (
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-bold uppercase text-emerald-300">Expedición AFK (Límite 12h)</p>
            <span className="text-[11px] font-bold text-amber-300">{afkHours}h / 12h</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/60">
            <div className={`h-full transition-all duration-500 ${afk.accumulatedMinutes >= 720 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${afkPercent}%` }} />
          </div>
          <p className="mt-1 truncate text-[10px] text-slate-300">
            {afk.accumulatedMinutes >= 720
              ? "⚡ Límite de 12h alcanzado · ¡Reclama para seguir acumulando!"
              : `Generando Mako, Chakra, Gemas y Materiales (+${afk.rewards.gold}🪙, +${afk.rewards.gems}🔷)`}
          </p>
        </div>
        <span className="shrink-0 font-display text-xs font-bold text-emerald-300">EXPLORAR ▸</span>
      </button>

      {/* evento */}
      {event && (
        <button onClick={() => go("events")} className="tile-cut flex w-full items-center gap-3 border border-purple-400/40 bg-gradient-to-r from-purple-500/25 to-transparent p-3 text-left transition-transform active:scale-[0.98]">
          <span className="text-3xl">🎪</span>
          <div className="flex-1">
            <p className="font-display text-sm font-bold uppercase text-purple-300">{event.name}</p>
            <p className="line-clamp-1 text-[11px] text-slate-300">{event.description}</p>
          </div>
          <span className="text-purple-300">▸</span>
        </button>
      )}

      {/* menú */}
      <div>
        <SectionTitle icon="🧭" sub={`Bienvenido de nuevo, ${p.username}`}>Centro de mando</SectionTitle>
        <div className="grid grid-cols-2 gap-2 stagger sm:grid-cols-3">
          {MENU.map((m) => (
            <button key={m.tab} onClick={() => { getAudio().sfx("click"); go(m.tab); }}
              className="tile-cut group relative overflow-hidden border border-white/10 bg-gradient-to-br from-[#152342] to-[#0d1730] p-3 text-left transition-all hover:border-cyan-400/50 hover:shadow-[0_0_16px_rgba(56,189,248,0.25)] active:scale-95">
              <span className="text-2xl transition-transform group-hover:scale-110 inline-block">{m.icon}</span>
              <p className="mt-1 font-display text-sm font-bold uppercase tracking-wide text-slate-100">{m.label}</p>
              <p className="text-[10px] text-slate-400">{m.desc}</p>
              {m.tab === "summon" && <span className="absolute right-2 top-2 rounded bg-rose-500 px-1 text-[9px] font-bold text-white anim-pulse-soft">GACHA</span>}
            </button>
          ))}
        </div>
      </div>

      {/* colección resumida */}
      <div className="flex items-center justify-between rounded bg-white/5 px-3 py-2 text-xs text-slate-400">
        <span>📚 Colección: <b className="text-cyan-300">{state!.chars.length}</b> / {CHARACTERS.length} guardianes</span>
        <button className="text-amber-300 hover:underline" onClick={() => go("album")}>Ver álbum ▸</button>
      </div>

      {detail && <CharDetail charKey={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}