"use client";
import { useState } from "react";
import { CHAR_MAP, statsFor, powerOf, ELEMENTS } from "@/game/catalog";
import { api } from "@/lib/api";
import { useGame } from "@/lib/store";
import { Portrait, RarityStars } from "../Portrait";
import { Btn, SectionTitle } from "../ui";
import { CharDetail } from "../CharDetail";

export function TeamScreen() {
  const { state, refresh, toast } = useGame();
  const [teams, setTeams] = useState(() => state!.player.teams.map((t) => ({ ...t, members: [...t.members] })));
  const [active, setActive] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const chars = state!.chars;
  const usedElsewhere = new Set(teams.flatMap((t, i) => (i === active ? [] : t.members)));
  const available = chars.filter((c) => !teams[active].members.includes(c.id) && !usedElsewhere.has(c.id));

  const toggle = (id: number) => {
    setTeams((ts) => ts.map((t, i) => {
      if (i !== active) return t;
      const members = t.members.includes(id) ? t.members.filter((m) => m !== id) : t.members.length < 4 ? [...t.members, id] : t.members;
      return { ...t, members };
    }));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api("game/teams", { teams });
      toast("Formaciones guardadas en el servidor", "ok");
      setDirty(false);
      await refresh();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  const teamPower = (members: number[]) =>
    members.reduce((acc, id) => {
      const c = chars.find((x) => x.id === id);
      if (!c) return acc;
      const mult = state!.overrides.find((o) => o.charKey === c.charKey)?.mult;
      return acc + powerOf(statsFor(CHAR_MAP[c.charKey], c.level, c.resonance, c.transformed, mult));
    }, 0);

  return (
    <div className="pb-4">
      <SectionTitle icon="🛡️" sub="Hasta 4 héroes por equipo · un héroe no puede estar en dos equipos">Equipos</SectionTitle>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {teams.map((t, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`tile-cut p-2 text-left transition-all ${active === i ? "bg-amber-400/20 ring-1 ring-amber-300" : "bg-white/5 hover:bg-white/10"}`}>
            <p className="truncate font-display text-xs font-bold text-slate-100">{t.name}</p>
            <p className="text-[10px] text-cyan-300">⚔️ {teamPower(t.members)}</p>
          </button>
        ))}
      </div>

      {/* formación actual */}
      <div className="tile-cut mb-3 border border-cyan-400/20 bg-[#0d1730] p-3">
        <div className="mb-2 flex items-center justify-between">
          <input
            value={teams[active].name}
            onChange={(e) => { setTeams((ts) => ts.map((t, i) => i === active ? { ...t, name: e.target.value } : t)); setDirty(true); }}
            className="w-40 bg-transparent font-display text-sm font-bold text-amber-300 outline-none border-b border-transparent focus:border-amber-300/50"
            maxLength={24}
          />
          <span className="text-[11px] text-slate-400">{teams[active].members.length}/4 héroes</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, slot) => {
            const id = teams[active].members[slot];
            const c = id ? chars.find((x) => x.id === id) : null;
            return c ? (
              <button key={slot} onClick={() => toggle(c.id)} className="group relative anim-bounce-in" title="Quitar del equipo">
                <div className={`aspect-square overflow-hidden rounded ${c.transformed ? "frame-r5" : ""} border border-cyan-400/40`}>
                  <Portrait charKey={c.charKey} transformed={c.transformed} />
                </div>
                <p className="mt-0.5 truncate text-center text-[10px] text-slate-200">{CHAR_MAP[c.charKey].name}</p>
                <p className="text-center text-[9px] text-slate-500">Nv.{c.level} {ELEMENTS[CHAR_MAP[c.charKey].element].icon}</p>
                <span className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white group-hover:flex">✕</span>
              </button>
            ) : (
              <div key={slot} className="flex aspect-square items-center justify-center rounded border border-dashed border-slate-600 text-2xl text-slate-600">+</div>
            );
          })}
        </div>
      </div>

      <Btn className="mb-4 w-full" onClick={save} disabled={!dirty || busy}>
        {busy ? "Guardando…" : dirty ? "💾 Guardar formación" : "✔ Formación sincronizada"}
      </Btn>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Héroes disponibles — toca para añadir/quitar · mantén para ficha</p>
      <div className="grid grid-cols-4 gap-2 stagger">
        {available.map((c) => {
          const def = CHAR_MAP[c.charKey];
          return (
            <div key={c.id} className="relative">
              <button onClick={() => toggle(c.id)} onDoubleClick={() => setDetail(c.charKey)} className="w-full text-left transition-transform active:scale-95">
                <div className="relative aspect-square overflow-hidden rounded border border-white/15 hover:border-amber-300/60">
                  <Portrait charKey={c.charKey} transformed={c.transformed} />
                  <span className="absolute left-0.5 top-0.5 text-[9px]">{ELEMENTS[def.element].icon}</span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-slate-200">{def.name}</p>
                <div className="flex items-center justify-between">
                  <RarityStars rarity={def.rarity} className="text-[8px]" />
                  <span className="text-[9px] text-slate-500">Nv.{c.level}</span>
                </div>
              </button>
              <button onClick={() => setDetail(c.charKey)} className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] text-cyan-300">ℹ</button>
            </div>
          );
        })}
        {!available.length && <p className="col-span-4 py-4 text-center text-xs text-slate-500">Todos tus héroes están asignados. Invoca más en el Nexus.</p>}
      </div>
      {detail && <CharDetail charKey={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}