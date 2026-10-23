"use client";
import { useMemo, useState } from "react";
import { CHARACTERS, CHAR_MAP, ELEMENTS, UNIVERSES, type Element, type Universe } from "@/game/catalog";
import { useGame } from "@/lib/store";
import { Portrait, RarityStars } from "../Portrait";
import { SectionTitle } from "../ui";
import { CharDetail } from "../CharDetail";

function useFilters() {
  const [rarity, setRarity] = useState(0);
  const [universe, setUniverse] = useState<Universe | "">("");
  const [element, setElement] = useState<Element | "">("");
  const [favOnly, setFavOnly] = useState(false);
  const [sortLevel, setSortLevel] = useState(false);
  return { rarity, setRarity, universe, setUniverse, element, setElement, favOnly, setFavOnly, sortLevel, setSortLevel };
}

function FilterBar({ f }: { f: ReturnType<typeof useFilters> }) {
  return (
    <div className="mb-3 space-y-1.5">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {[0, 5, 4, 3].map((r) => (
          <button key={r} onClick={() => f.setRarity(r)}
            className={`shrink-0 rounded px-2.5 py-1 text-xs font-bold transition-all ${f.rarity === r ? "bg-amber-400 text-amber-950" : "bg-white/8 text-slate-300"}`}>
            {r === 0 ? "Todos ★" : `${r}★`}
          </button>
        ))}
        <span className="mx-1 w-px bg-white/15" />
        {(Object.keys(UNIVERSES) as Universe[]).map((u) => (
          <button key={u} onClick={() => f.setUniverse(f.universe === u ? "" : u)}
            className={`shrink-0 rounded px-2.5 py-1 text-xs transition-all ${f.universe === u ? "bg-cyan-400 text-cyan-950 font-bold" : "bg-white/8 text-slate-300"}`}>
            {UNIVERSES[u].icon} {UNIVERSES[u].name}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {(Object.keys(ELEMENTS) as Element[]).map((e) => (
          <button key={e} onClick={() => f.setElement(f.element === e ? "" : e)}
            className={`shrink-0 rounded px-2 py-1 text-xs transition-all ${f.element === e ? "font-bold" : "opacity-70"}`}
            style={{ background: f.element === e ? `${ELEMENTS[e].color}44` : "rgba(255,255,255,0.06)", color: ELEMENTS[e].color }}>
            {ELEMENTS[e].icon} {ELEMENTS[e].name}
          </button>
        ))}
        <button onClick={() => f.setFavOnly(!f.favOnly)}
          className={`shrink-0 rounded px-2 py-1 text-xs ${f.favOnly ? "bg-pink-400/30 text-pink-200 font-bold" : "bg-white/8 text-slate-300"}`}>
          💛 Favoritos
        </button>
        <button onClick={() => f.setSortLevel(!f.sortLevel)}
          className={`shrink-0 rounded px-2 py-1 text-xs ${f.sortLevel ? "bg-emerald-400/30 text-emerald-200 font-bold" : "bg-white/8 text-slate-300"}`}>
          ⬆ Por nivel
        </button>
      </div>
    </div>
  );
}

function CharGrid({ keys, onPick, album }: { keys: string[]; onPick: (k: string) => void; album: boolean }) {
  const { state } = useGame();
  return (
    <div className="grid grid-cols-3 gap-2.5 stagger sm:grid-cols-4">
      {keys.map((key) => {
        const def = CHAR_MAP[key];
        const owned = state!.chars.find((c) => c.charKey === key);
        return (
          <button key={key} onClick={() => onPick(key)}
            className={`group relative text-left transition-transform active:scale-95 ${album && !owned ? "" : ""}`}>
            <div className={`relative aspect-square overflow-hidden rounded ${owned ? (def.rarity === 5 ? "frame-r5" : def.rarity === 4 ? "frame-r4" : "frame-r3") : "border border-slate-700"}`}>
              <Portrait charKey={key} transformed={owned?.transformed} dim={album && !owned} />
              {owned?.favorite && <span className="absolute left-1 top-1 text-xs">💛</span>}
              {owned?.transformed && <span className="absolute right-1 top-1 text-xs">⚡</span>}
              {!owned && album && <span className="absolute inset-0 flex items-center justify-center text-2xl">🔒</span>}
              <span className="absolute bottom-1 right-1 text-sm">{ELEMENTS[def.element].icon}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className={`truncate text-xs font-bold ${owned ? "text-slate-100" : "text-slate-500"}`}>{def.name}</p>
              {owned && <span className="text-[10px] text-cyan-300">Nv.{owned.level}</span>}
            </div>
            <RarityStars rarity={def.rarity} className="text-[10px]" />
            {owned && owned.resonance > 0 && <p className="text-[9px] text-purple-300">Resonancia +{Math.min(owned.resonance, 5)}</p>}
          </button>
        );
      })}
    </div>
  );
}

export function CharactersScreen() {
  const { state } = useGame();
  const f = useFilters();
  const [detail, setDetail] = useState<string | null>(null);
  const keys = useMemo(() => {
    let list = state!.chars.filter((c) => {
      const d = CHAR_MAP[c.charKey];
      if (f.rarity && d.rarity !== f.rarity) return false;
      if (f.universe && d.universe !== f.universe) return false;
      if (f.element && d.element !== f.element) return false;
      if (f.favOnly && !c.favorite) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      f.sortLevel ? b.level - a.level : CHAR_MAP[b.charKey].rarity - CHAR_MAP[a.charKey].rarity || b.level - a.level
    );
    return list.map((c) => c.charKey);
  }, [state, f.rarity, f.universe, f.element, f.favOnly, f.sortLevel]);

  return (
    <div className="pb-4">
      <SectionTitle icon="👥" sub={`${state!.chars.length} héroes obtenidos · toca ℹ o el retrato para gestionar`}>Personajes</SectionTitle>
      <FilterBar f={f} />
      <CharGrid keys={keys} onPick={setDetail} album={false} />
      {!keys.length && <p className="py-8 text-center text-sm text-slate-500">Ningún héroe coincide con los filtros.</p>}
      {detail && <CharDetail charKey={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

export function AlbumScreen() {
  const { state } = useGame();
  const f = useFilters();
  const [detail, setDetail] = useState<string | null>(null);
  const keys = useMemo(() => {
    return CHARACTERS.filter((d) => {
      const owned = state!.chars.find((c) => c.charKey === d.key);
      if (f.rarity && d.rarity !== f.rarity) return false;
      if (f.universe && d.universe !== f.universe) return false;
      if (f.element && d.element !== f.element) return false;
      if (f.favOnly && !owned?.favorite) return false;
      return true;
    }).sort((a, b) => b.rarity - a.rarity).map((d) => d.key);
  }, [state, f.rarity, f.universe, f.element, f.favOnly]);

  const pct = Math.round((state!.chars.length / CHARACTERS.length) * 100);
  return (
    <div className="pb-4">
      <SectionTitle icon="📚" sub="Todos los guardianes del Nexus, obtenidos y por descubrir">Álbum</SectionTitle>
      <div className="mb-3 rounded bg-white/5 p-3">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Descubiertos: <b className="text-amber-300">{state!.chars.length}</b> / {CHARACTERS.length}</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/50">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-amber-300 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <FilterBar f={f} />
      <CharGrid keys={keys} onPick={setDetail} album={true} />
      {detail && <CharDetail charKey={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}