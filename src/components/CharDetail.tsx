"use client";
import { useState } from "react";
import {
  CHAR_MAP, ELEMENTS, UNIVERSES, RARITY_CAP, MATERIALS,
  statsFor, powerOf, levelUpCost, skillUpCost,
} from "@/game/catalog";
import { api } from "@/lib/api";
import { useGame } from "@/lib/store";
import { Portrait, RarityStars } from "./Portrait";
import { ModelViewer } from "./ModelViewer";
import { Btn, ElementChip, Modal, StatRow } from "./ui";
import { getAudio } from "@/game/audio";

export function CharDetail({ charKey, onClose }: { charKey: string; onClose: () => void }) {
  const { state, refresh, toast } = useGame();
  const [busy, setBusy] = useState(false);
  const [view3d, setView3d] = useState(false);
  const def = CHAR_MAP[charKey];
  const owned = state?.chars.find((c) => c.charKey === charKey);
  const mult = state?.overrides.find((o) => o.charKey === charKey)?.mult;
  const level = owned?.level || 1;
  const stats = statsFor(def, level, owned?.resonance || 0, owned?.transformed || false, mult);
  const cap = RARITY_CAP[def.rarity];
  const cost = levelUpCost(level);
  const sCost = skillUpCost(owned?.skillLevel || 1);
  const p = state?.player;

  const act = async (path: string, body: Record<string, unknown>, okMsg: string) => {
    if (!owned || busy) return;
    setBusy(true);
    try {
      await api(path, body);
      getAudio().sfx("levelup");
      toast(okMsg, "gold");
      await refresh();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="relative">
        {/* cabecera con retrato */}
        <div className="relative h-52 overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 70% 20%, ${def.color}, transparent 70%)` }} />
          <div className="absolute right-3 top-3 h-44 w-44 overflow-hidden rounded-lg anim-float" style={{ boxShadow: `0 0 34px ${def.color}66` }}>
            {view3d ? <ModelViewer charKey={charKey} transformed={owned?.transformed} /> : <Portrait charKey={charKey} transformed={owned?.transformed} dim={!owned} />}
            <button onClick={() => setView3d((v) => !v)} className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">{view3d ? "🖼 Retrato" : "🧊 Modelo 3D"}</button>
          </div>
          <div className="absolute bottom-3 left-4 max-w-[55%]">
            <RarityStars rarity={def.rarity} className="text-lg" />
            <h3 className="font-display text-2xl font-extrabold leading-tight text-white">{owned?.transformed ? def.transform.name : def.name}</h3>
            <p className="text-xs italic text-slate-300">{def.title}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <ElementChip element={def.element} small />
              <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">{UNIVERSES[def.universe].icon} {UNIVERSES[def.universe].name}</span>
              <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">🎭 {def.role}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {!owned && (
            <p className="rounded border border-dashed border-slate-600 bg-white/5 p-3 text-center text-sm text-slate-400">
              🔒 Aún no has invocado a este guardián. Encuéntralo en las <b className="text-cyan-300">Invocaciones</b>.
            </p>
          )}

          {owned && (
            <div className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
              <div>
                <p className="font-display text-lg font-bold text-amber-300">Nv. {owned.level} <span className="text-xs text-slate-400">/ {cap}</span></p>
                <p className="text-[11px] text-slate-400">Resonancia (duplicados): {Math.min(owned.resonance, 5)}/5 · +{Math.min(owned.resonance, 5) * 5}% stats</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Poder</p>
                <p className="font-display text-xl font-bold text-cyan-300">{powerOf(stats)}</p>
              </div>
            </div>
          )}

          {/* estadísticas */}
          <div className="grid grid-cols-2 gap-1.5">
            <StatRow icon="❤️" label="PV" value={stats.hp} />
            <StatRow icon="⚔️" label="Ataque" value={stats.atk} />
            <StatRow icon="🛡️" label="Defensa" value={stats.def} />
            <StatRow icon="💨" label="Velocidad" value={stats.spd} />
            <StatRow icon="👟" label="Movimiento" value={`${def.move} casillas`} />
            <StatRow icon="🎯" label="Alcance" value={`${def.range} casillas`} />
          </div>

          {/* habilidades */}
          <div className="space-y-2">
            <SkillCard icon="🗡️" tag="Ataque básico" name={def.basic.name} desc={`Daño ×${def.basic.power} de ATK a un objetivo.`} color="#94a3b8" />
            <SkillCard icon="✦" tag={`Habilidad ${owned ? `Nv.${owned.skillLevel}` : ""} · ${def.skill.cost}⬡ chakra · CD ${def.skill.cooldown}`} name={def.skill.name} desc={def.skill.desc} color="#38bdf8" />
            <SkillCard icon="💥" tag="Técnica definitiva · energía 100%" name={def.ultimate.name} desc={def.ultimate.desc} color={def.ultimate.color} />
            <SkillCard icon="🧬" tag="Pasiva exclusiva" name={def.passive.name} desc={def.passive.desc} color="#4ade80" />
          </div>

          {/* transformación */}
          <div className="rounded border p-3" style={{ borderColor: `${def.color}55`, background: `${def.color}0d` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: def.color }}>⚡ Transformación original (no canónica)</p>
            <p className="font-display text-base font-bold text-white">{def.transform.name}</p>
            <p className="mt-1 text-xs text-slate-300">{def.transform.desc}</p>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Requisito: Nv. {def.transform.reqLevel} ·{" "}
              {Object.entries(def.transform.materials).map(([k, v]) => `${MATERIALS[k].icon} ${v} ${MATERIALS[k].name}`).join(" · ")} · Stats +{Math.round((def.transform.boost - 1) * 100)}%
            </p>
            {owned && !owned.transformed && (
              <Btn small variant="blue" className="mt-2" disabled={busy || owned.level < def.transform.reqLevel}
                onClick={() => act("game/transform", { charId: owned.id }, `¡${def.name} ha despertado su forma alterna!`)}>
                ⚡ Despertar transformación
              </Btn>
            )}
            {owned?.transformed && <p className="mt-2 text-xs font-bold text-emerald-300">✔ Transformación desbloqueada</p>}
          </div>

          {/* acciones */}
          {owned && p && (
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="gold" disabled={busy || owned.level >= cap || p.gold < cost.gold || (p.materials.esencia || 0) < cost.esencia}
                onClick={() => act("game/levelup", { charId: owned.id, times: 1 }, `${def.name} sube a Nv. ${owned.level + 1}`)}>
                ⬆ Nivel +1<br /><span className="text-[10px] normal-case">🪙{cost.gold} · 🧪{cost.esencia}</span>
              </Btn>
              <Btn variant="gold" disabled={busy || owned.level >= cap}
                onClick={() => act("game/levelup", { charId: owned.id, times: 5 }, `${def.name} ha subido de nivel`)}>
                ⬆ Nivel +5<br /><span className="text-[10px] normal-case">usa los recursos disponibles</span>
              </Btn>
              <Btn variant="blue" disabled={busy || owned.skillLevel >= 5 || p.gold < sCost.gold || (p.materials.pergamino || 0) < sCost.pergamino}
                onClick={() => act("game/skillup", { charId: owned.id }, `Habilidad mejorada a Nv. ${owned.skillLevel + 1}`)}>
                ✦ Hab. +1<br /><span className="text-[10px] normal-case">🪙{sCost.gold} · 📜{sCost.pergamino}</span>
              </Btn>
              <Btn variant="ghost" disabled={busy}
                onClick={() => act("game/favorite", { charId: owned.id }, owned.favorite ? "Quitado de favoritos" : "Añadido a favoritos")}>
                {owned.favorite ? "💛 Favorito" : "🤍 Marcar favorito"}
              </Btn>
            </div>
          )}

          {/* historia */}
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">📖 Historia</p>
            <p className="text-sm leading-relaxed text-slate-300">{def.lore}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SkillCard({ icon, tag, name, desc, color }: { icon: string; tag: string; name: string; desc: string; color: string }) {
  return (
    <div className="rounded bg-white/5 p-2.5" style={{ borderLeft: `3px solid ${color}` }}>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{icon} {tag}</p>
      <p className="font-display text-sm font-bold" style={{ color }}>{name}</p>
      <p className="text-xs text-slate-300">{desc}</p>
    </div>
  );
}