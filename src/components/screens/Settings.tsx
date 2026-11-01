"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useGame } from "@/lib/store";
import { Btn, SectionTitle } from "../ui";
import { getAudio } from "@/game/audio";

export function SettingsScreen() {
  const { state, refresh, toast } = useGame();
  const p = state!.player;
  const [music, setMusic] = useState(p.settings.music);
  const [sfx, setSfx] = useState(p.settings.sfx);
  const [busy, setBusy] = useState(false);

  const save = async (m: number, s: number) => {
    setBusy(true);
    try {
      await api("game/settings", { music: m, sfx: s });
      toast("Ajustes guardados en tu cuenta", "info");
      await refresh();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-4">
      <SectionTitle icon="⚙️" sub="Se sincronizan con el servidor">Ajustes</SectionTitle>

      <div className="tile-cut mb-4 border border-white/10 bg-[#0d1730] p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">🎵 Audio (música y efectos originales)</p>
        <label className="mb-1 flex justify-between text-xs text-slate-300">
          <span>Música</span><span>{Math.round(music * 100)}%</span>
        </label>
        <input type="range" min={0} max={1} step={0.05} value={music} className="w-full"
          onChange={(e) => { const v = Number(e.target.value); setMusic(v); getAudio().setVolumes(v, sfx); getAudio().playMusic("menu"); }} />
        <label className="mb-1 mt-3 flex justify-between text-xs text-slate-300">
          <span>Efectos de sonido</span><span>{Math.round(sfx * 100)}%</span>
        </label>
        <input type="range" min={0} max={1} step={0.05} value={sfx} className="w-full"
          onChange={(e) => { const v = Number(e.target.value); setSfx(v); getAudio().setVolumes(music, v); }}
          onPointerUp={() => getAudio().sfx("hit")} />
        <Btn small className="mt-4 w-full" disabled={busy} onClick={() => save(music, sfx)}>💾 Guardar ajustes</Btn>
      </div>

      <div className="tile-cut mb-4 border border-white/10 bg-[#0d1730] p-4 text-xs leading-relaxed text-slate-300">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">📖 Cómo jugar</p>
        <ul className="list-disc space-y-1.5 pl-4">
          <li><b className="text-cyan-300">Combate:</b> por turnos de velocidad. Toca casillas azules para moverte, elige acción (⚔️ atacar, ✦ habilidad, 💥 definitiva) y toca un objetivo resaltado.</li>
          <li><b className="text-cyan-300">Chakra ⬡:</b> las habilidades lo consumen; recuperas 1 por turno.</li>
          <li><b className="text-cyan-300">Definitiva:</b> la barra de energía se llena atacando y recibiendo daño. Al 100% desatas una técnica cinematográfica.</li>
          <li><b className="text-cyan-300">Combos:</b> atacar a un enemigo rodeado por tus aliados da +10% de daño por aliado adyacente.</li>
          <li><b className="text-cyan-300">Elementos:</b> 🔥→🌪️→⚡→💧→ (×1.5 de daño). ✨ y 🌑 se contrarrestan entre sí.</li>
          <li><b className="text-cyan-300">Jefes:</b> al 50% de vida entran en fase 2 y se vuelven más peligrosos.</li>
          <li><b className="text-cyan-300">Energía ⚡:</b> las misiones la consumen; se regenera 1 punto cada 4 minutos.</li>
          <li><b className="text-cyan-300">Guardado de batalla:</b> cada acción se valida y guarda en el servidor. Si cierras la pestaña, usa «Reanudar» en Inicio dentro de las siguientes 12 horas. Una retirada no otorga recompensas.</li>
        </ul>
      </div>

      <div className="tile-cut border border-white/10 bg-[#0d1730] p-4 text-xs leading-relaxed text-slate-400">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">ℹ️ Acerca de</p>
        <p><b className="text-slate-200">Legendia Nexus</b> — servidor privado v1.1. RPG táctico con personajes, historia, transformaciones y música 100% originales inspirados en el espíritu de los grandes RPG de anime.</p>
        <p className="mt-2">📱 Optimizado para navegadores Android. Puede empaquetarse como APK con Capacitor (instrucciones en el README del proyecto).</p>
        <p className="mt-2">💾 Todo tu progreso se guarda en la base de datos del servidor, no en el navegador.</p>
      </div>
    </div>
  );
}