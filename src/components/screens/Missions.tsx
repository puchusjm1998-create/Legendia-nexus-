"use client";
import { useState } from "react";
import { ALL_MISSIONS, CHAPTERS, MISSION_MAP, type MissionDef } from "@/game/missions";
import type { BattleStart } from "@/lib/api";
import { useGame } from "@/lib/store";
import { MissionModal } from "../MissionModal";
import { Portrait } from "../Portrait";
import { SectionTitle } from "../ui";

function MissionRow({ m, onPick }: { m: MissionDef; onPick: (m: MissionDef) => void }) {
  const { state } = useGame();
  const ms = state!.missions.find((x) => x.id === m.id)!;
  const boss = m.enemies.find((e) => e.boss);
  return (
    <button
      onClick={() => ms.unlocked && onPick(m)}
      disabled={!ms.unlocked}
      className={`tile-cut flex w-full items-center gap-3 border p-2.5 text-left transition-all ${
        ms.unlocked
          ? "border-white/10 bg-gradient-to-r from-[#152342] to-[#0d1730] hover:border-amber-400/40 active:scale-[0.98]"
          : "border-white/5 bg-black/30 opacity-50"
      }`}
    >
      <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded ${boss ? "ring-1 ring-purple-400" : ""}`}>
        <Portrait charKey={(boss || m.enemies[0]).charKey} dim={!ms.unlocked} />
        <div className="absolute inset-0 bg-rose-900/20" />
        {boss && <span className="absolute right-0 top-0 text-[10px]">👑</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-slate-100">
          {m.difficulty === "hard" && <span className="mr-1 text-rose-400">🔥</span>}
          {m.chapter}-{m.index} {m.name}
        </p>
        <p className="text-[11px] text-slate-400">Nv. rec. {m.recLevel} · ⚡{m.staminaCost} · {m.enemies.length} enemigos</p>
        <p className="text-[11px]">
          {ms.clears > 0
            ? <span className="text-yellow-400">{"★".repeat(ms.stars)}{"☆".repeat(3 - ms.stars)} <span className="text-slate-500">×{ms.clears}</span></span>
            : ms.unlocked ? <span className="text-cyan-300">✦ Sin completar (+{m.rewards.firstGems} 🔷)</span> : <span className="text-slate-500">🔒 Completa la misión anterior</span>}
        </p>
      </div>
      <span className="text-slate-500">{ms.unlocked ? "▸" : "🔒"}</span>
    </button>
  );
}

function useBattlePick(onBattle: (b: BattleStart) => void) {
  const [picked, setPicked] = useState<MissionDef | null>(null);
  const { state } = useGame();
  const modal = picked ? (
    <MissionModal
      mission={picked}
      mState={state!.missions.find((x) => x.id === picked.id)!}
      onClose={() => setPicked(null)}
      onBattle={(b) => { setPicked(null); onBattle(b); }}
    />
  ) : null;
  return { pick: setPicked, modal };
}

export function StoryScreen({ onBattle }: { onBattle: (b: BattleStart) => void }) {
  const { state } = useGame();
  const { pick, modal } = useBattlePick(onBattle);
  const [chapter, setChapter] = useState(1);
  const ch = CHAPTERS.find((c) => c.id === chapter)!;
  const missions = ALL_MISSIONS.filter((m) => m.chapter === chapter && m.difficulty === "normal");
  const cleared = missions.filter((m) => (state!.missions.find((x) => x.id === m.id)?.clears || 0) > 0).length;

  return (
    <div className="pb-4">
      <SectionTitle icon="📖" sub="Campaña principal · historia original en tres mundos">Historia</SectionTitle>
      <div className="mb-3 flex gap-2">
        {CHAPTERS.map((c) => {
          const unlocked = c.id === 1 || (state!.missions.find((m) => m.id === "c1-5")?.clears || 0) > 0;
          return (
            <button key={c.id} disabled={!unlocked} onClick={() => setChapter(c.id)}
              className={`btn-cut flex-1 px-3 py-2 font-display text-xs font-bold uppercase tracking-wide transition-all ${chapter === c.id ? "bg-amber-400 text-amber-950" : unlocked ? "bg-white/8 text-slate-300 hover:bg-white/15" : "bg-black/30 text-slate-600"}`}>
              {unlocked ? `Cap. ${c.id}` : "🔒 Cap. 2"}
            </button>
          );
        })}
      </div>
      <div className="tile-cut mb-3 border border-cyan-400/20 bg-gradient-to-r from-cyan-500/15 to-transparent p-3">
        <p className="font-display text-lg font-bold text-cyan-200">{ch.name}</p>
        <p className="text-xs text-slate-300">{ch.desc}</p>
        <p className="mt-1 text-[11px] text-slate-400">Progreso: {cleared}/{missions.length} misiones</p>
      </div>
      <div className="space-y-2 stagger">
        {missions.map((m) => <MissionRow key={m.id} m={m} onPick={pick} />)}
      </div>
      {modal}
    </div>
  );
}

export function MissionsScreen({ onBattle }: { onBattle: (b: BattleStart) => void }) {
  const [diff, setDiff] = useState<"normal" | "hard">("normal");
  const { pick, modal } = useBattlePick(onBattle);
  const missions = ALL_MISSIONS.filter((m) => m.difficulty === diff);
  return (
    <div className="pb-4">
      <SectionTitle icon="🗡️" sub="Repite misiones para farmear oro, EXP y materiales">Misiones</SectionTitle>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button onClick={() => setDiff("normal")}
          className={`btn-cut py-2 font-display text-sm font-bold uppercase ${diff === "normal" ? "bg-cyan-400 text-cyan-950" : "bg-white/8 text-slate-300"}`}>
          Normales
        </button>
        <button onClick={() => setDiff("hard")}
          className={`btn-cut py-2 font-display text-sm font-bold uppercase ${diff === "hard" ? "bg-rose-500 text-white" : "bg-white/8 text-slate-300"}`}>
          🔥 Difíciles ×2
        </button>
      </div>
      {diff === "hard" && (
        <p className="mb-2 rounded bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
          Las versiones difíciles se desbloquean al superar su misión normal. Enemigos +14 niveles, recompensas dobles.
        </p>
      )}
      <div className="space-y-2 stagger">
        {missions.map((m) => <MissionRow key={m.id} m={m} onPick={pick} />)}
      </div>
      {modal}
    </div>
  );
}

export { MISSION_MAP };