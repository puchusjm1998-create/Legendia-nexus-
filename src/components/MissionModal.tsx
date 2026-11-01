"use client";
import { useState } from "react";
import { CHAR_MAP } from "@/game/catalog";
import type { MissionDef } from "@/game/missions";
import { api, type BattleStart, type MissionState } from "@/lib/api";
import { useGame } from "@/lib/store";
import { Portrait } from "./Portrait";
import { Btn, ElementChip, Modal } from "./ui";

export function MissionModal({
  mission, mState, onClose, onBattle,
}: {
  mission: MissionDef;
  mState: MissionState;
  onClose: () => void;
  onBattle: (b: BattleStart) => void;
}) {
  const { state, refresh, toast } = useGame();
  const [teamIdx, setTeamIdx] = useState(0);
  const [dialogueStep, setDialogueStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const p = state!.player;

  const start = async () => {
    setBusy(true);
    try {
      const data = await api<BattleStart>("battle/start", { missionId: mission.id, teamIndex: teamIdx });
      await refresh();
      onBattle(data);
    } catch (e) {
      toast((e as Error).message, "err");
      setBusy(false);
      await refresh();
    }
  };

  const deploy = () => {
    const team = p.teams[teamIdx];
    if (!team || !team.members.length) { toast("Ese equipo está vacío. Configúralo en Equipo.", "err"); return; }
    if (p.stamina < mission.staminaCost) { toast("Energía insuficiente. Se regenera con el tiempo o cómprala en la Tienda.", "err"); return; }
    setDialogueStep(0);
  };

  const line = dialogueStep >= 0 ? mission.dialogue[dialogueStep] : null;

  return (
    <Modal onClose={onClose}>
      {line ? (
        /* ------- diálogo ------- */
        <div className="p-4">
          <p className="mb-2 text-center text-[10px] uppercase tracking-[0.3em] text-slate-500">— Antes del combate —</p>
          <div className="flex items-start gap-3 anim-rise" key={dialogueStep}>
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded border border-cyan-400/40">
              {speakerPortrait(line.speaker)}
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-amber-300">{line.speaker}</p>
              <p className="mt-1 min-h-16 text-sm leading-relaxed text-slate-200">{line.text}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn variant="ghost" small onClick={() => start()} disabled={busy}>Saltar ⏩</Btn>
            <Btn className="flex-1" disabled={busy} onClick={() => {
              if (dialogueStep < mission.dialogue.length - 1) setDialogueStep(dialogueStep + 1);
              else start();
            }}>
              {busy ? "Desplegando…" : dialogueStep < mission.dialogue.length - 1 ? "Siguiente ▸" : "⚔️ ¡Combatir!"}
            </Btn>
          </div>
        </div>
      ) : (
        /* ------- info de misión ------- */
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            {mission.difficulty === "hard" ? "🔥 Misión difícil" : mission.difficulty === "event" ? "🎪 Misión de evento" : `Capítulo ${mission.chapter}`}
          </p>
          <h3 className="font-display text-xl font-bold text-white">{mission.name}</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Nivel recomendado {mission.recLevel} · Coste ⚡{mission.staminaCost} ·{" "}
            {mState.clears > 0 ? <span className="text-yellow-400">{"★".repeat(mState.stars)} ({mState.clears} victorias)</span> : "Sin completar"}
          </p>

          <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Enemigos</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mission.enemies.map((e, i) => (
              <div key={i} className="w-20 shrink-0 text-center">
                <div className={`relative h-20 w-20 overflow-hidden rounded border ${e.boss ? "border-purple-400 shadow-[0_0_12px_#a855f7aa]" : "border-rose-500/40"}`}>
                  <Portrait charKey={e.charKey} />
                  <div className="absolute inset-0 bg-rose-900/25" />
                  {e.boss && <span className="absolute right-0.5 top-0.5 text-xs">👑</span>}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-slate-300">{e.name}</p>
                <p className="text-[9px] text-slate-500">Nv.{e.level} {CHAR_MAP[e.charKey] && <ElementChip element={e.element} small />}</p>
              </div>
            ))}
          </div>

          <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Recompensas {mState.clears === 0 && <span className="text-cyan-300">(+{mission.rewards.firstGems} 🔷 primera vez)</span>}</p>
          <div className="flex flex-wrap gap-1.5 text-xs text-slate-200">
            <span className="rounded bg-white/8 px-2 py-1">🪙 {mission.rewards.gold}</span>
            <span className="rounded bg-white/8 px-2 py-1">🔷 {mission.rewards.gems}</span>
            <span className="rounded bg-white/8 px-2 py-1">📈 {mission.rewards.xp} EXP</span>
            {Object.entries(mission.rewards.materials).map(([k, v]) => (
              <span key={k} className="rounded bg-white/8 px-2 py-1">{k === "esencia" ? "🧪" : k === "cristal" ? "💎" : "📜"} {v}</span>
            ))}
          </div>

          <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Equipo de despliegue</p>
          <div className="grid grid-cols-3 gap-1.5">
            {p.teams.map((t, i) => (
              <button key={i} onClick={() => setTeamIdx(i)}
                className={`tile-cut p-2 text-left transition-all ${teamIdx === i ? "bg-amber-400/20 ring-1 ring-amber-300" : "bg-white/5 hover:bg-white/10"}`}>
                <p className="truncate text-[10px] font-bold text-slate-200">{t.name}</p>
                <div className="mt-1 flex -space-x-1.5">
                  {t.members.length ? t.members.map((id) => {
                    const c = state!.chars.find((x) => x.id === id);
                    return c ? <div key={id} className="h-6 w-6 overflow-hidden rounded-full border border-slate-600"><Portrait charKey={c.charKey} /></div> : null;
                  }) : <span className="text-[9px] text-slate-500">vacío</span>}
                </div>
              </button>
            ))}
          </div>

          <Btn className="mt-4 w-full" onClick={deploy} disabled={busy || !mState.unlocked}>
            ▶ Desplegar equipo (⚡{mission.staminaCost})
          </Btn>
        </div>
      )}
    </Modal>
  );
}

function speakerPortrait(speaker: string) {
  const clean = speaker.replace(" (eco)", "").toLowerCase();
  const key = Object.keys(CHAR_MAP).find((k) => CHAR_MAP[k].name.toLowerCase() === clean);
  if (key) return <Portrait charKey={key} />;
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900 text-3xl">
      {speaker.includes("Vharzun") ? "👁️" : speaker.includes("Eidolón") ? "🌊" : "🌀"}
    </div>
  );
}