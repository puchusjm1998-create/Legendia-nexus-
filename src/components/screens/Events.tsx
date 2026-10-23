"use client";
import { useState } from "react";
import { MISSION_MAP } from "@/game/missions";
import type { BattleStart } from "@/lib/api";
import { useGame } from "@/lib/store";
import { MissionModal } from "../MissionModal";
import { Portrait } from "../Portrait";
import { Btn, SectionTitle } from "../ui";

export function EventsScreen({ onBattle }: { onBattle: (b: BattleStart) => void }) {
  const { state } = useGame();
  const [missionId, setMissionId] = useState<string | null>(null);
  const events = state!.events;

  return (
    <div className="pb-4">
      <SectionTitle icon="🎪" sub="Contenido temporal configurado desde el servidor">Eventos</SectionTitle>
      {!events.length && (
        <p className="rounded border border-dashed border-slate-600 p-6 text-center text-sm text-slate-400">
          No hay eventos activos ahora mismo. ¡Vuelve pronto, invocador!
        </p>
      )}
      <div className="space-y-3 stagger">
        {events.map((ev) => {
          const mission = ev.missionId ? MISSION_MAP[ev.missionId] : null;
          const ms = mission ? state!.missions.find((m) => m.id === mission.id) : null;
          return (
            <div key={ev.id} className="relative overflow-hidden rounded-lg border border-purple-400/30">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/25 via-[#0d1730] to-[#0d1730]" />
              <div className="relative p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-purple-300 anim-pulse-soft">● Evento activo</p>
                <h3 className="font-display text-xl font-extrabold text-white">{ev.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{ev.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded bg-black/30 px-2 py-1 text-slate-200">🎁 Primera victoria: +{ev.rewardGems} 🔷 +{ev.rewardGold} 🪙 extra</span>
                  {ev.endsAt && <span className="rounded bg-purple-400/15 px-2 py-1 text-purple-200">⏳ Hasta {new Date(ev.endsAt).toLocaleString("es")}</span>}
                </div>
                {mission && ms && (
                  <div className="mt-3 flex items-center gap-3 rounded bg-black/25 p-2.5">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded ring-1 ring-purple-400">
                      <Portrait charKey={mission.enemies[0].charKey} />
                      <span className="absolute right-0 top-0 text-[10px]">👑</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-sm font-bold text-slate-100">{mission.name}</p>
                      <p className="text-[10px] text-slate-400">Jefe de evento · Nv. rec. {mission.recLevel} · ⚡{mission.staminaCost}</p>
                      {ms.clears > 0 && <p className="text-[10px] text-yellow-400">{"★".repeat(ms.stars)} superado ×{ms.clears}</p>}
                    </div>
                    <Btn small variant="blue" onClick={() => setMissionId(mission.id)}>Desafiar</Btn>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
        💡 Los eventos y sus recompensas se configuran desde el panel de administración del servidor. El banner de evento
        <b className="text-purple-300"> «Canto del Eidolón»</b> tiene pity reducido a 40 invocaciones.
      </div>
      {missionId && (
        <MissionModal
          mission={MISSION_MAP[missionId]}
          mState={state!.missions.find((m) => m.id === missionId)!}
          onClose={() => setMissionId(null)}
          onBattle={(b) => { setMissionId(null); onBattle(b); }}
        />
      )}
    </div>
  );
}