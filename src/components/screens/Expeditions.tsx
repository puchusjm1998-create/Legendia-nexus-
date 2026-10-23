"use client";
import { useEffect, useMemo, useState } from "react";
import { CHAR_MAP, ELEMENTS, UNIVERSES } from "@/game/catalog";
import {
  AFK_CONFIG, AFK_MAX_HOURS, AFK_RESOURCES, AFK_RESOURCE_ORDER, EXPEDITIONS, EXPEDITION_MAP,
  durationMs, effectiveElapsedMs, masteryLevel, squadBonus, totalsAt,
  type AfkClaimResult, type AfkExpeditionState, type ExpeditionDef,
} from "@/game/afk";
import { api } from "@/lib/api";
import { useGame } from "@/lib/store";
import { Portrait, RarityStars } from "../Portrait";
import { Bar, Btn, Modal, SectionTitle } from "../ui";
import { getAudio } from "@/game/audio";

const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s` : `${m}m ${String(sec).padStart(2, "0")}s`;
};

function RewardChips({ values, compact = false }: { values: Partial<Record<string, number>>; compact?: boolean }) {
  const items = AFK_RESOURCE_ORDER.filter((k) => (values[k] || 0) > 0);
  if (!items.length) return <span className="text-[11px] text-slate-500">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((k) => (
        <span key={k} title={AFK_RESOURCES[k].name}
          className="rounded-sm bg-black/40 px-1.5 py-0.5 text-[11px] font-bold text-slate-100">
          {AFK_RESOURCES[k].icon} {values[k]}{!compact && <span className="ml-1 font-normal text-slate-400">{AFK_RESOURCES[k].name}</span>}
        </span>
      ))}
    </div>
  );
}

/** Reloj de 1 s que usa la hora del SERVIDOR (no la del dispositivo). */
function useServerTick() {
  const { serverNow } = useGame();
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(t);
  }, [serverNow]);
  return now;
}

function ActiveCard({ exp, now, onClaim, onRecall, busy }: {
  exp: AfkExpeditionState; now: number; busy: boolean;
  onClaim: () => void; onRecall: () => void;
}) {
  const def = EXPEDITION_MAP[exp.expKey];
  const total = Math.min(durationMs(def), exp.endsAt - exp.startedAt);
  const elapsed = Math.min(total, effectiveElapsedMs(def, exp.startedAt, now));
  const done = elapsed >= total;
  const totals = totalsAt(def, exp.mult, elapsed);
  const pending: Record<string, number> = {};
  for (const k of AFK_RESOURCE_ORDER) pending[k] = Math.max(0, totals[k] - (exp.granted[k] || 0));
  const hasAny = Object.values(pending).some((v) => v > 0);
  const full = totalsAt(def, exp.mult, total);
  return (
    <div className="tile-cut border bg-gradient-to-br from-[#152342] to-[#0d1730] p-3"
      style={{ borderColor: done ? "#fbbf24aa" : `${def.color}55` }}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{def.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold uppercase" style={{ color: def.color }}>{def.name}</p>
          <div className="mt-1 flex gap-1">
            {exp.memberKeys.map((k, i) => (
              <div key={i} className="h-9 w-9 overflow-hidden rounded border border-white/20"><Portrait charKey={k} /></div>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className={`font-display text-sm font-bold ${done ? "text-amber-300 anim-pulse-soft" : "text-slate-100"}`}>
            {done ? "¡COMPLETADA!" : fmtTime(total - elapsed)}
          </p>
          <p className="text-[10px] text-slate-400">de {def.hours} h · ×{exp.mult.toFixed(2)}</p>
        </div>
      </div>
      <Bar className="mt-2 !h-3" value={elapsed} max={total} color={done ? "#fbbf24" : def.color}
        label={`${Math.floor((elapsed / total) * 100)}%`} />
      <div className="mt-2">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">Acumulado listo para reclamar</p>
        <RewardChips values={pending} compact />
        {!done && (
          <p className="mt-1 text-[10px] text-slate-500">Estimación al terminar: {AFK_RESOURCE_ORDER.filter((k) => full[k] > 0).map((k) => `${AFK_RESOURCES[k].icon}${full[k]}`).join(" ")}</p>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <Btn small variant={done ? "gold" : "green"} className="flex-1" disabled={busy || (!hasAny && !done)} onClick={onClaim}>
          {done ? "🎁 Reclamar y cerrar" : "📥 Reclamar acumulado"}
        </Btn>
        {!done && <Btn small variant="ghost" disabled={busy} onClick={onRecall}>↩ Retirar</Btn>}
      </div>
    </div>
  );
}

function SquadPicker({ def, busyIds, onClose, onStart }: {
  def: ExpeditionDef; busyIds: Set<number>; onClose: () => void; onStart: (ids: number[]) => Promise<void>;
}) {
  const { state } = useGame();
  const [sel, setSel] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const chars = useMemo(() => [...state!.chars].sort((a, b) => {
    const pa = CHAR_MAP[a.charKey], pb = CHAR_MAP[b.charKey];
    return pb.rarity - pa.rarity || b.level - a.level;
  }), [state]);
  const squad = sel.map((id) => state!.chars.find((c) => c.id === id)!).filter(Boolean).map((c) => ({
    charKey: c.charKey, level: c.level, resonance: c.resonance, transformed: c.transformed,
    mult: state!.overrides.find((o) => o.charKey === c.charKey)?.mult,
  }));
  const bonus = squadBonus(def, squad, state!.afk.mastery[def.key] || 0);
  const full = totalsAt(def, bonus.mult, durationMs(def));
  const powerOk = bonus.power >= def.minPower;
  const toggle = (id: number) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id)
    : s.length >= AFK_CONFIG.maxSquad ? s : [...s, id]);
  return (
    <Modal onClose={onClose} wide>
      <div className="space-y-3 p-4">
        <div>
          <p className="font-display text-xl font-bold uppercase" style={{ color: def.color }}>{def.icon} {def.name}</p>
          <p className="text-xs text-slate-400">Duración {def.hours} h · elige hasta {AFK_CONFIG.maxSquad} personajes</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
          {chars.map((c) => {
            const cd = CHAR_MAP[c.charKey];
            const taken = busyIds.has(c.id);
            const on = sel.includes(c.id);
            const spec = (def.specialty.element === cd.element) || (def.specialty.universe === cd.universe) || def.specialty.roles?.includes(cd.role);
            return (
              <button key={c.id} disabled={taken} onClick={() => toggle(c.id)}
                className={`relative overflow-hidden rounded border-2 text-left transition-all ${on ? "border-amber-300 shadow-[0_0_12px_#fbbf24aa]" : "border-white/10"} ${taken ? "opacity-30" : ""}`}>
                <div className="aspect-square"><Portrait charKey={c.charKey} transformed={c.transformed} /></div>
                <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 text-[9px] font-bold text-white">Nv.{c.level}</div>
                {spec && <span className="absolute left-0.5 top-0.5 rounded bg-emerald-500 px-1 text-[8px] font-bold text-emerald-950" title="Especialista">★</span>}
                {taken && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] font-bold text-amber-200">EN RUTA</span>}
              </button>
            );
          })}
        </div>
        <div className="rounded bg-white/5 p-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Poder del escuadrón</span>
            <span className={`font-bold ${powerOk ? "text-emerald-300" : "text-rose-300"}`}>{bonus.power} / {def.minPower}</span>
          </div>
          <div className="mt-1 flex justify-between text-slate-400">
            <span>Bonus: especialistas +{Math.round(bonus.specialist * 100)}% · escuadrón +{Math.round(bonus.extraMembers * 100)}% · nivel exp. +{Math.round(bonus.mastery * 100)}%</span>
            <b className="text-amber-300">×{bonus.mult.toFixed(2)}</b>
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">Recompensa estimada completa</p>
          <RewardChips values={full} compact />
        </div>
        <Btn className="w-full" disabled={busy || !sel.length || !powerOk} onClick={async () => {
          setBusy(true);
          try { await onStart(sel); } finally { setBusy(false); }
        }}>
          {!sel.length ? "Selecciona personajes" : !powerOk ? "Poder insuficiente" : `⛺ Enviar expedición (${def.hours} h)`}
        </Btn>
      </div>
    </Modal>
  );
}

export function ExpeditionsScreen() {
  const { state, refresh, toast } = useGame();
  const now = useServerTick();
  const [picking, setPicking] = useState<ExpeditionDef | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<(AfkClaimResult & { name: string }) | null>(null);
  const afk = state!.afk;
  const p = state!.player;
  const active = afk.expeditions;
  const busyIds = useMemo(() => new Set(active.flatMap((e) => e.charIds)), [active]);

  // al volver a la pestaña (o recuperar la conexión) se resincroniza con el servidor
  useEffect(() => {
    const h = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", h);
    window.addEventListener("online", h);
    return () => { document.removeEventListener("visibilitychange", h); window.removeEventListener("online", h); };
  }, [refresh]);

  const start = async (def: ExpeditionDef, ids: number[]) => {
    try {
      await api("afk/start", { expKey: def.key, charIds: ids });
      getAudio().sfx("click");
      toast(`⛺ Expedición «${def.name}» en marcha. Sigue avanzando con el juego cerrado.`, "ok");
      setPicking(null);
      await refresh();
    } catch (e) { toast((e as Error).message, "err"); }
  };
  const claim = async (exp: AfkExpeditionState, recall: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<AfkClaimResult>(recall ? "afk/recall" : "afk/claim", { id: exp.id });
      getAudio().sfx(r.finished ? "summon4" : "levelup");
      setReport({ ...r, name: EXPEDITION_MAP[exp.expKey].name });
      await refresh();
    } catch (e) {
      toast((e as Error).message, "err");
      await refresh();
    } finally { setBusy(false); }
  };

  const fragRows = useMemo(() => Object.entries(p.materials)
    .filter(([k, v]) => k.startsWith("frag_") && v > 0)
    .map(([k, v]) => ({ key: k.slice(5), n: v }))
    .filter((r) => CHAR_MAP[r.key]), [p.materials]);
  const spendFrag = async (charKey: string) => {
    try {
      const r = await api<{ kind: string }>("game/fragments", { charKey });
      getAudio().sfx("summon5");
      toast(r.kind === "unlock" ? `¡${CHAR_MAP[charKey].name} se une a tu colección!` : `Resonancia de ${CHAR_MAP[charKey].name} +1`, "gold");
      await refresh();
    } catch (e) { toast((e as Error).message, "err"); }
  };

  return (
    <div className="space-y-5 pb-4">
      <SectionTitle icon="⛺" sub={`Huecos ${active.length}/${afk.slots} · máx. ${AFK_MAX_HOURS} h por expedición · el tiempo lo cuenta el servidor`}>
        Expediciones
      </SectionTitle>
      <p className="rounded bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100">
        Tus héroes recolectan aunque cierres el juego o cambies de dispositivo. Al alcanzar el límite la expedición se detiene:
        no se acumula nada más hasta que reclames y la vuelvas a enviar.
      </p>

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((e) => (
            <ActiveCard key={e.id} exp={e} now={now} busy={busy}
              onClaim={() => claim(e, false)} onRecall={() => claim(e, true)} />
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-slate-300">Destinos disponibles</p>
        <div className="grid gap-2 md:grid-cols-2">
          {EXPEDITIONS.map((def) => {
            const running = active.some((a) => a.expKey === def.key);
            const lvlOk = p.level >= def.minPlayerLevel;
            const slotsFull = active.length >= afk.slots;
            const rate = (r: keyof typeof def.perHour) => def.perHour[r] || 0;
            const ml = masteryLevel(afk.mastery[def.key] || 0);
            return (
              <div key={def.key} className={`tile-cut border bg-gradient-to-br from-[#121d38] to-[#0b1328] p-3 ${lvlOk ? "border-white/10" : "border-white/5 opacity-70"}`}>
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{def.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold uppercase" style={{ color: def.color }}>{def.name} <span className="text-[10px] text-slate-400">· {def.hours} h</span></p>
                    <p className="text-[11px] text-slate-400">{def.desc}</p>
                  </div>
                  {ml > 0 && <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300" title="Nivel de expedición">Nv.{ml}</span>}
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  Por hora: {AFK_RESOURCE_ORDER.filter((k) => rate(k) > 0).map((k) => `${AFK_RESOURCES[k].icon}${rate(k)}`).join("  ")}
                </p>
                <p className="mt-1 text-[10px] text-emerald-300/80">
                  ★ Especialistas: {[def.specialty.element && `${ELEMENTS[def.specialty.element].icon} ${ELEMENTS[def.specialty.element].name}`,
                    def.specialty.universe && `${UNIVERSES[def.specialty.universe].icon} ${UNIVERSES[def.specialty.universe].name}`,
                    def.specialty.roles && def.specialty.roles.join("/")].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className={`text-[10px] ${lvlOk ? "text-slate-400" : "text-rose-300"}`}>
                    Req.: Nv. cuenta {def.minPlayerLevel} · poder {def.minPower}
                  </p>
                  <Btn small disabled={!lvlOk || running || slotsFull || !state!.chars.length} onClick={() => setPicking(def)}>
                    {running ? "En curso" : !lvlOk ? `🔒 Nv.${def.minPlayerLevel}` : slotsFull ? "Sin huecos" : "Enviar ▸"}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-slate-300">🧩 Fragmentos de héroe</p>
        {fragRows.length === 0 ? (
          <p className="rounded bg-white/5 p-3 text-xs text-slate-400">Aún no tienes fragmentos. Las expediciones los entregan; con ellos subes la resonancia de un héroe o desbloqueas a los que aún no has invocado.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {fragRows.map(({ key, n }) => {
              const d = CHAR_MAP[key];
              const owned = state!.chars.find((c) => c.charKey === key);
              const cost = owned ? AFK_CONFIG.fragmentCostResonance[d.rarity] : AFK_CONFIG.fragmentCostUnlock[d.rarity];
              const maxed = !!owned && owned.resonance >= AFK_CONFIG.maxResonance;
              return (
                <div key={key} className="tile-cut flex items-center gap-2 border border-white/10 bg-white/5 p-2">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded"><Portrait charKey={key} dim={!owned} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-100">{d.name} <RarityStars rarity={d.rarity} className="text-[10px]" /></p>
                    <Bar value={Math.min(n, cost)} max={cost} color="#a78bfa" label={`${n}/${cost}`} />
                  </div>
                  <Btn small variant="blue" disabled={n < cost || maxed} onClick={() => spendFrag(key)}>
                    {owned ? (maxed ? "MAX" : "Resonancia") : "Desbloquear"}
                  </Btn>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {picking && <SquadPicker def={picking} busyIds={busyIds} onClose={() => setPicking(null)} onStart={(ids) => start(picking, ids)} />}
      {report && (
        <Modal onClose={() => setReport(null)}>
          <div className="space-y-3 p-5 text-center">
            <p className="font-display text-2xl font-extrabold uppercase text-amber-300">{report.finished ? "¡Expedición completada!" : "Recursos reclamados"}</p>
            <p className="text-xs text-slate-400">{report.name}</p>
            <div className="flex justify-center"><RewardChips values={report.gained} /></div>
            {Object.keys(report.fragments).length > 0 && (
              <p className="text-xs text-violet-300">🧩 {Object.entries(report.fragments).map(([k, n]) => `${CHAR_MAP[k]?.name} ×${n}`).join(" · ")}</p>
            )}
            {report.levelUps.map((l, i) => (
              <p key={i} className="text-xs font-bold text-emerald-300 anim-pulse-soft">⬆ {CHAR_MAP[l.charKey].name} sube a Nv. {l.level}</p>
            ))}
            {report.wastedXp > 0 && <p className="text-[11px] text-slate-500">{report.wastedXp} EXP no aplicada: tu escuadrón está al nivel máximo.</p>}
            <Btn className="w-full" onClick={() => setReport(null)}>Continuar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// re-export útil para la tarjeta de Inicio
export function afkReadyCount(exps: AfkExpeditionState[], now: number): number {
  return exps.filter((e) => now >= e.endsAt).length;
}
