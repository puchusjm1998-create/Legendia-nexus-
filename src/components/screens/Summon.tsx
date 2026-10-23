"use client";
import { useEffect, useState } from "react";
import { CHARACTERS, CHAR_MAP, ELEMENTS } from "@/game/catalog";
import { api, type BannerRow, type SummonResult } from "@/lib/api";
import { useGame } from "@/lib/store";
import { Portrait, RarityStars } from "../Portrait";
import { Btn, Modal, SectionTitle } from "../ui";
import { getAudio } from "@/game/audio";

const RARITY_COLOR: Record<number, string> = { 3: "#38bdf8", 4: "#facc15", 5: "#f0abfc" };

function SummonAnimation({ results, onDone }: { results: SummonResult["results"]; onDone: () => void }) {
  const [phase, setPhase] = useState<"portal" | "reveal" | "grid">("portal");
  const [idx, setIdx] = useState(0);
  const maxRarity = Math.max(...results.map((r) => r.rarity));
  const portalColor = RARITY_COLOR[maxRarity];

  useEffect(() => {
    const t = setTimeout(() => setPhase("reveal"), 2300);
    return () => clearTimeout(t);
  }, []);

  const advance = () => {
    const r = results[idx];
    getAudio().sfx(r.rarity === 5 ? "summon5" : r.rarity === 4 ? "summon4" : "summon3");
    if (idx + 1 >= results.length) setPhase("grid");
    else setIdx(idx + 1);
  };

  // reproducir sonido del primero al entrar en reveal
  const [played, setPlayed] = useState(-1);
  if (phase === "reveal" && played !== idx) {
    setPlayed(idx);
    const r = results[idx];
    setTimeout(() => getAudio().sfx(r.rarity === 5 ? "summon5" : r.rarity === 4 ? "summon4" : "summon3"), 150);
  }

  const cur = results[idx];
  const def = cur ? CHAR_MAP[cur.charKey] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black">
      {phase === "portal" && (
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle, ${portalColor}33, transparent 60%)` }} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute rounded-full border-2"
              style={{
                width: 180 + i * 70, height: 180 + i * 70, borderColor: `${portalColor}${i === 0 ? "" : "66"}`,
                borderTopColor: "transparent", borderLeftColor: "transparent",
                animation: `portalSpin ${1.1 + i * 0.5}s linear infinite${i % 2 ? " reverse" : ""}`,
              }} />
          ))}
          <div className="absolute h-40 w-40 rounded-full anim-pulse-soft" style={{ background: `radial-gradient(circle, ${portalColor}cc, transparent 70%)` }} />
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className="particle" style={{ left: `${6 + i * 6}%`, width: 5, height: 5, background: portalColor, animationDuration: `${2 + (i % 4)}s`, animationDelay: `${-i * 0.3}s` }} />
          ))}
          <p className="relative z-10 font-display text-xl font-bold uppercase tracking-[0.4em] text-white anim-pulse-soft">Invocando…</p>
          {maxRarity === 5 && <p className="absolute bottom-20 font-display text-sm text-pink-300 anim-pulse-soft">✦ ¡Una presencia legendaria se acerca! ✦</p>}
        </div>
      )}

      {phase === "reveal" && def && (
        <button className="relative flex h-full w-full flex-col items-center justify-center" onClick={advance}>
          <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle, ${RARITY_COLOR[cur.rarity]}44, transparent 65%)` }} />
          {cur.rarity === 5 && <div className="absolute inset-0 anim-flash" style={{ background: `radial-gradient(circle, #fff, transparent 70%)` }} />}
          <div key={idx} className="anim-bounce-in relative">
            <div className={`h-60 w-60 overflow-hidden rounded-lg ${cur.rarity === 5 ? "frame-r5" : cur.rarity === 4 ? "frame-r4" : "frame-r3"}`}
              style={{ boxShadow: `0 0 60px ${RARITY_COLOR[cur.rarity]}88` }}>
              <Portrait charKey={cur.charKey} />
            </div>
            {cur.isNew
              ? <span className="absolute -right-3 -top-3 rotate-12 rounded bg-rose-500 px-2 py-1 font-display text-sm font-bold text-white anim-pulse-soft">¡NUEVO!</span>
              : <span className="absolute -right-3 -top-3 rotate-12 rounded bg-purple-600 px-2 py-1 text-xs font-bold text-white">+{cur.stardust} ✨</span>}
          </div>
          <div key={`t${idx}`} className="anim-rise mt-5 text-center">
            <RarityStars rarity={cur.rarity} className="text-2xl" />
            <p className="font-display text-3xl font-extrabold text-white">{def.name}</p>
            <p className="text-sm italic text-slate-300">{def.title}</p>
            <p className="mt-1 text-xs" style={{ color: ELEMENTS[def.element].color }}>{ELEMENTS[def.element].icon} {ELEMENTS[def.element].name} · {def.role}</p>
            {!cur.isNew && <p className="mt-1 text-xs text-purple-300">Duplicado → Resonancia +1 y Polvo Estelar</p>}
          </div>
          <p className="absolute bottom-10 text-xs text-slate-500 anim-pulse-soft">Toca para continuar ({idx + 1}/{results.length})</p>
        </button>
      )}

      {phase === "grid" && (
        <div className="w-full max-w-md p-5 anim-rise">
          <p className="mb-4 text-center font-display text-2xl font-extrabold uppercase tracking-widest text-amber-300">Resultado</p>
          <div className={`grid ${results.length > 1 ? "grid-cols-5" : "grid-cols-1 justify-items-center"} gap-2`}>
            {results.map((r, i) => (
              <div key={i} className="relative anim-bounce-in" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className={`${results.length > 1 ? "h-16 w-16" : "h-48 w-48"} overflow-hidden rounded ${r.rarity === 5 ? "frame-r5" : r.rarity === 4 ? "frame-r4" : "frame-r3"}`}>
                  <Portrait charKey={r.charKey} />
                </div>
                {r.isNew && <span className="absolute -right-1 -top-1 rounded bg-rose-500 px-0.5 text-[8px] font-bold text-white">NEW</span>}
                <p className="mt-0.5 text-center text-[9px] text-yellow-400">{"★".repeat(r.rarity)}</p>
              </div>
            ))}
          </div>
          <Btn className="mt-6 w-full" onClick={onDone}>✔ Añadir a la colección</Btn>
        </div>
      )}

      {phase === "reveal" && results.length > 1 && (
        <button onClick={() => setPhase("grid")} className="absolute right-4 top-4 rounded bg-white/10 px-3 py-1.5 text-xs text-slate-300">Revelar todo ⏩</button>
      )}
    </div>
  );
}

export function SummonScreen() {
  const { state, refresh, toast } = useGame();
  const [bannerIdx, setBannerIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [anim, setAnim] = useState<SummonResult["results"] | null>(null);
  const [showRates, setShowRates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const banners = state!.banners;
  const banner: BannerRow | undefined = banners[bannerIdx];
  const p = state!.player;
  if (!banner) return <p className="p-6 text-center text-slate-400">No hay banners activos. El administrador puede activarlos.</p>;
  const pity = p.pity?.[banner.key] || 0;

  const summon = async (count: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<SummonResult>("summon", { bannerKey: banner.key, count });
      setAnim(r.results);
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-4">
      <SectionTitle icon="🌀" sub="El resultado se calcula y valida en el servidor">Invocaciones</SectionTitle>

      <div className="mb-3 flex gap-1.5 overflow-x-auto">
        {banners.map((b, i) => (
          <button key={b.key} onClick={() => setBannerIdx(i)}
            className={`shrink-0 rounded px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide transition-all ${i === bannerIdx ? "bg-amber-400 text-amber-950" : "bg-white/8 text-slate-300"}`}>
            {b.kind === "event" ? "🎪 " : b.kind === "special" ? "🌑 " : "♾️ "}{b.name}
          </button>
        ))}
      </div>

      {/* banner */}
      <div className="relative mb-3 overflow-hidden rounded-lg border border-purple-400/30">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url(/art/bg-home.jpg)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1224] via-[#0a1224]/60 to-transparent" />
        <div className="relative flex gap-2 p-4">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-purple-300">{banner.kind === "event" ? "Banner de evento" : banner.kind === "special" ? "Banner especial" : "Banner permanente"}</p>
            <h3 className="font-display text-2xl font-extrabold text-white">{banner.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{banner.description}</p>
            <button onClick={() => setShowRates(true)} className="mt-2 rounded bg-white/10 px-2 py-1 text-[11px] text-cyan-300 underline-offset-2 hover:underline">
              📊 Ver probabilidades ({banner.rates.r5}% 5★)
            </button>
          </div>
          {banner.featured.length > 0 && (
            <div className="flex shrink-0 -space-x-4">
              {banner.featured.slice(0, 2).map((k, i) => (
                <div key={k} className={`h-28 w-24 overflow-hidden rounded frame-r5 ${i ? "mt-6" : ""} anim-float`} style={{ animationDelay: `${i * 0.8}s` }}>
                  <Portrait charKey={k} />
                </div>
              ))}
            </div>
          )}
        </div>
        {/* pity */}
        <div className="relative px-4 pb-3">
          <div className="flex justify-between text-[11px] text-slate-300">
            <span>🛡️ Garantía: 5★ asegurado en <b className="text-amber-300">{banner.pityLimit - pity}</b> invocaciones</span>
            <span>{pity}/{banner.pityLimit}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/50">
            <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500" style={{ width: `${(pity / banner.pityLimit) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Btn variant="blue" disabled={busy || p.gems < banner.costSingle} onClick={() => summon(1)}>
          Invocar ×1<br /><span className="text-[11px] normal-case">🔷 {banner.costSingle}</span>
        </Btn>
        <Btn variant="gold" disabled={busy || p.gems < banner.costMulti} onClick={() => summon(10)}>
          Invocar ×10<br /><span className="text-[11px] normal-case">🔷 {banner.costMulti} · 4★ garantizado</span>
        </Btn>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500">Tienes 🔷 {p.gems} gemas · consigue más jugando misiones, logros y recompensas diarias</p>

      <button onClick={() => setShowHistory(true)} className="mt-4 w-full rounded bg-white/5 py-2 text-xs text-cyan-300 hover:bg-white/10">
        📜 Historial de invocaciones ({p.summonCount} totales)
      </button>

      {anim && <SummonAnimation results={anim} onDone={async () => { setAnim(null); await refresh(); }} />}

      {showRates && (
        <Modal onClose={() => setShowRates(false)}>
          <div className="p-4">
            <h3 className="font-display text-lg font-bold text-amber-300">Probabilidades — {banner.name}</h3>
            <p className="mb-3 text-[11px] text-slate-400">Cada invocación es independiente. El pity garantiza un 5★ a las {banner.pityLimit} invocaciones sin uno. En ×10 se garantiza al menos un 4★.</p>
            {[5, 4, 3].map((r) => {
              const rate = r === 5 ? banner.rates.r5 : r === 4 ? banner.rates.r4 : banner.rates.r3;
              const pool = CHARACTERS.filter((c) => c.rarity === r);
              return (
                <div key={r} className="mb-3 rounded bg-white/5 p-3">
                  <p className="font-bold" style={{ color: RARITY_COLOR[r] }}>{"★".repeat(r)} — {rate}%</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {pool.map((c) => (
                      <span key={c.key} className={`rounded px-1.5 py-0.5 text-[10px] ${banner.featured.includes(c.key) ? "bg-pink-500/30 text-pink-200 font-bold" : "bg-black/30 text-slate-300"}`}>
                        {c.name}{banner.featured.includes(c.key) && " ⬆"}
                      </span>
                    ))}
                  </div>
                  {r === 5 && banner.featured.length > 0 && <p className="mt-1 text-[10px] text-pink-300">50% de los 5★ obtenidos serán destacados.</p>}
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {showHistory && (
        <Modal onClose={() => setShowHistory(false)}>
          <div className="p-4">
            <h3 className="mb-3 font-display text-lg font-bold text-amber-300">Historial reciente</h3>
            <div className="space-y-1.5">
              {state!.history.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aún no has invocado nada.</p>}
              {state!.history.map((h) => (
                <div key={h.id} className="flex items-center gap-2 rounded bg-white/5 p-1.5">
                  <div className="h-9 w-9 overflow-hidden rounded"><Portrait charKey={h.charKey} /></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-200">{CHAR_MAP[h.charKey]?.name} <RarityStars rarity={h.rarity} className="text-[10px]" /></p>
                    <p className="text-[10px] text-slate-500">{new Date(h.createdAt).toLocaleString("es")} · {h.bannerKey}</p>
                  </div>
                  {h.isNew ? <span className="rounded bg-rose-500/20 px-1.5 text-[9px] font-bold text-rose-300">NUEVO</span> : <span className="text-[9px] text-purple-300">DUPLICADO</span>}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}