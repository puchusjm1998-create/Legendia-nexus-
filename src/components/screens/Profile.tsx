"use client";
import { useState } from "react";
import { CHARACTERS, MATERIALS } from "@/game/catalog";
import { api } from "@/lib/api";
import { useGame } from "@/lib/store";
import { Btn, SectionTitle, StatRow } from "../ui";
import { getAudio } from "@/game/audio";

export function ProfileScreen() {
  const { state, refresh, toast, logout } = useGame();
  const [busy, setBusy] = useState<string | null>(null);
  const p = state!.player;

  const claim = async (key: string) => {
    setBusy(key);
    try {
      const r = await api<{ reward: { gems?: number; gold?: number; stardust?: number } }>("game/achievement", { key });
      getAudio().sfx("summon4");
      toast(`🏆 Logro reclamado: ${r.reward.gems ? `+${r.reward.gems} 🔷 ` : ""}${r.reward.gold ? `+${r.reward.gold} 🪙 ` : ""}${r.reward.stardust ? `+${r.reward.stardust} ✨` : ""}`, "gold");
      await refresh();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pb-4">
      <SectionTitle icon="🏆" sub="Tu leyenda en el Nexus">Perfil</SectionTitle>
      <div className="tile-cut mb-3 border border-amber-400/25 bg-gradient-to-r from-amber-400/15 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 font-display text-2xl font-extrabold text-amber-950">
            {p.level}
          </div>
          <div className="flex-1">
            <p className="font-display text-xl font-extrabold text-white">{p.username}</p>
            <p className="text-[11px] text-slate-400">Comandante del Nexus {p.isAdmin && <span className="ml-1 rounded bg-rose-500/30 px-1.5 text-rose-300">ADMIN</span>}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/50">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${(p.xp / p.xpNext) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">EXP {p.xp}/{p.xpNext} para nivel {p.level + 1}</p>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-1.5">
        <StatRow icon="⚔️" label="Victorias" value={p.wins} />
        <StatRow icon="🌀" label="Invocaciones" value={p.summonCount} />
        <StatRow icon="📚" label="Colección" value={`${state!.chars.length}/${CHARACTERS.length}`} />
        <StatRow icon="🎁" label="Racha diaria" value={`${p.dailyStreak} días`} />
      </div>

      <div className="mb-4 rounded bg-white/5 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">🎒 Inventario de materiales</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {Object.entries(MATERIALS).map(([k, m]) => (
            <div key={k} className="rounded bg-black/30 py-2">
              <span className="text-xl">{m.icon}</span>
              <p className="font-display text-sm font-bold text-slate-100">{p.materials[k] || 0}</p>
              <p className="text-[9px] text-slate-500">{m.name}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">🏆 Logros y objetivos</p>
      <div className="space-y-1.5">
        {(state!.achievements || []).map((a) => (
          <div key={a.id} className={`flex items-center gap-2.5 rounded p-2.5 ${a.claimed ? "bg-white/3 opacity-50" : a.done ? "bg-amber-400/10 border border-amber-400/30" : "bg-white/5"}`}>
            <span className="text-xl">{a.claimed ? "✅" : a.done ? "🎉" : "🔒"}</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-100">{a.name}</p>
              <p className="text-[10px] text-slate-400">{a.desc} · +{a.reward} 🔷 Gemas</p>
            </div>
            {a.done && !a.claimed && (
              <Btn small onClick={() => claim(a.id)} disabled={busy === a.id}>Reclamar</Btn>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {p.isAdmin && (
          <a href="/admin" className="btn-cut bg-gradient-to-b from-purple-500 to-purple-700 px-4 py-2.5 text-center font-display text-sm font-bold uppercase tracking-wider text-white">
            🛠️ Panel admin
          </a>
        )}
        <Btn variant="danger" onClick={logout}>🚪 Cerrar sesión</Btn>
      </div>
    </div>
  );
}