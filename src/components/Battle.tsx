"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GRID_W, GRID_H, dist, reachableTiles, type Unit } from "@/game/combat";
import type { BattleFrame, BattleSnapshot } from "@/game/battle-engine";
import { ELEMENTS } from "@/game/catalog";
import { api, type BattleStart, type BattleResult, type BattleTurn } from "@/lib/api";
import { useGame } from "@/lib/store";
import { Portrait } from "./Portrait";
import { Btn } from "./ui";
import { getAudio } from "@/game/audio";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Intent =
  | { type: "move"; x: number; y: number }
  | { type: "attack" | "skill" | "ultimate"; targetUid: number }
  | { type: "wait" };
interface FloatText { id: number; x: number; y: number; text: string; color: string; big?: boolean }
let floatId = 0;

/** Partículas originales de la definitiva; sólo se dibujan durante la animación. */
function UltFX({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = (canvas.width = canvas.offsetWidth);
    const H = (canvas.height = canvas.offsetHeight);
    const parts = Array.from({ length: 70 }, () => {
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      return { x: W / 2, y: H / 2, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1, size: 2 + Math.random() * 4 };
    });
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let active = false;
      for (const p of parts) {
        if (p.life <= 0) continue;
        active = true;
        p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.life -= 0.016;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (active) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

export function Battle({ data, onFinish }: { data: BattleStart; onFinish: () => void }) {
  const { toast } = useGame();
  const [match, setMatch] = useState<BattleSnapshot>(data.snapshot);
  const latest = useRef<BattleSnapshot>(data.snapshot);
  const [phase, setPhase] = useState<"intro" | "play" | "over" | "error">("intro");
  const [action, setAction] = useState<"attack" | "skill" | "ultimate" | null>(null);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [ult, setUlt] = useState<Unit | null>(null);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRetreat, setConfirmRetreat] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const busyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getAudio().playMusic("battle");
    const timer = setTimeout(() => {
      if (!mounted.current) return;
      if (data.snapshot.phase === "playing") setPhase("play");
      else {
        setResult({ victory: false, rewards: null });
        setPhase("over");
      }
    }, 1100);
    return () => { mounted.current = false; clearTimeout(timer); };
  }, [data.token, data.snapshot.phase]);

  const addFloat = useCallback((x: number, y: number, text: string, color: string, big = false) => {
    const id = ++floatId;
    setFloats((f) => [...f.slice(-14), { id, x, y, text, color, big }]);
    setTimeout(() => mounted.current && setFloats((f) => f.filter((v) => v.id !== id)), 1000);
  }, []);

  const showBanner = useCallback(async (text: string, ms = 850) => {
    setBanner(text);
    await sleep(ms);
    if (mounted.current) setBanner(null);
  }, []);

  const animate = useCallback(async (f: BattleFrame) => {
    if (!mounted.current) return;
    setMatch(f.state);
    const e = f.event;
    const victim = f.state.units.find((u) => u.uid === (e.targetUid ?? e.uid));
    if (e.kind === "ultimate") {
      const attacker = f.state.units.find((u) => u.uid === e.uid);
      if (attacker) {
        setUlt(attacker);
        getAudio().sfx("ult");
        await sleep(1450);
        if (!mounted.current) return;
        setFlash(true);
        setShake(true);
        setTimeout(() => mounted.current && (setFlash(false), setShake(false)), 500);
        setUlt(null);
      }
    } else if (e.kind === "damage" && victim) {
      addFloat(victim.x, victim.y, `-${e.amount ?? 0}${e.label === "QUEMADURA" ? " 🔥" : ""}`,
        e.crit ? "#fbbf24" : e.label === "QUEMADURA" ? "#fb923c" : "#fff", !!e.crit);
      if (e.crit) addFloat(victim.x, victim.y - 0.45, "¡CRÍTICO!", "#fbbf24");
      if (e.advantage && e.advantage > 1) addFloat(victim.x, victim.y - 0.45, "¡VENTAJA!", "#4ade80");
      if (e.combo) addFloat(victim.x, victim.y - 0.75, `¡COMBO ×${e.combo + 1}!`, "#38bdf8");
      getAudio().sfx(e.crit ? "crit" : "hit");
      setShake(true);
      setTimeout(() => mounted.current && setShake(false), 300);
      await sleep(320);
    } else if (e.kind === "heal" && victim) {
      if (e.amount) { addFloat(victim.x, victim.y, `+${e.amount}`, "#4ade80"); getAudio().sfx("heal"); }
      await sleep(240);
    } else if (e.kind === "move") {
      getAudio().sfx("move");
      await sleep(250);
    } else if (e.kind === "status" && victim) {
      addFloat(victim.x, victim.y, e.label || "EFECTO", "#c4b5fd");
      await sleep(150);
    } else if (e.kind === "bossPhase") {
      await showBanner(`⚠️ ${e.label} · Su ataque aumenta`, 1150);
    } else if (e.kind === "stun") {
      if (victim) addFloat(victim.x, victim.y, "ATURDIDO 💫", "#fde047");
      await sleep(290);
    } else if (e.kind === "round") {
      await showBanner(e.label || "Nueva ronda", 500);
    } else if (e.kind === "turn") {
      await sleep(f.state.units.find((u) => u.uid === e.uid)?.side === "enemy" ? 210 : 100);
    } else if (e.kind === "wait") {
      await sleep(120);
    }
  }, [addFloat, showBanner]);

  const send = async (intent: Intent) => {
    if (busyRef.current || phase !== "play") return;
    busyRef.current = true;
    setBusy(true);
    setAction(null);
    try {
      const res = await api<BattleTurn>("battle/action", {
        token: data.token,
        command: { ...intent, revision: latest.current.revision },
      });
      latest.current = res.snapshot;
      for (const f of res.frames) {
        if (!mounted.current) return;
        await animate(f);
      }
      if (!mounted.current) return;
      setMatch(res.snapshot);
      if (res.result || res.snapshot.phase !== "playing") {
        setResult(res.result || { victory: false, rewards: null });
        getAudio().sfx(res.result?.victory ? "victory" : "defeat");
        setPhase("over");
      }
    } catch (err) {
      // Una petición puede haberse aplicado aunque la respuesta se perdiera.
      // Releer del servidor evita duplicar la acción o alterar el estado local.
      try {
        const active = await api<BattleStart>("battle/active");
        if (mounted.current && active.token === data.token) {
          latest.current = active.snapshot;
          setMatch(active.snapshot);
          toast(`Estado recuperado: ${(err as Error).message}`, "err");
        } else if (mounted.current) {
          setErrorMessage("No hay batalla activa. Revisa tu progreso: el servidor conserva las recompensas recibidas.");
          setPhase("error");
        }
      } catch {
        if (mounted.current) {
          setErrorMessage(`${(err as Error).message}. Comprueba tu conexión y vuelve a entrar desde Inicio.`);
          setPhase("error");
        }
      }
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const retreat = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await api("battle/retreat", { token: data.token });
      onFinish();
    } catch (e) {
      toast((e as Error).message, "err");
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const units = match.units;
  const current = units.find((u) => u.uid === match.currentUid) || null;
  const isPlayerTurn = phase === "play" && current?.side === "ally" && match.phase === "playing";
  const moveTiles = isPlayerTurn && !busy && !action && current && !current.movedThisTurn
    ? reachableTiles(current, units) : [];
  const validTargets = isPlayerTurn && !busy && current && action
    ? units.filter((u) => {
      const def = action === "attack" ? null : action === "skill" ? current.skill : current.ultimate;
      const side = def && def.target !== "enemy" ? "ally" : "enemy";
      return u.alive && u.side === side && dist(u, current) <= (def?.range ?? current.range);
    }) : [];
  const onUnitTap = (u: Unit) => {
    if (!current || !action || !validTargets.includes(u) || busy) return;
    send({ type: action, targetUid: u.uid });
  };
  const selectAction = (type: "attack" | "skill" | "ultimate") => {
    if (!isPlayerTurn || !current || busy) return;
    if (type === "skill") {
      if (current.cd > 0 || current.chakra < current.skill.cost) return;
      if (current.skill.target === "self") { send({ type: "skill", targetUid: current.uid }); return; }
    }
    if (type === "ultimate" && current.energy < 100) return;
    setAction(action === type ? null : type);
  };
  const cellW = 100 / GRID_W, cellH = 100 / GRID_H;

  return (
    <div className={`fixed inset-0 z-40 flex flex-col bg-[#070d1c] ${shake ? "anim-shake" : ""}`}>
      <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: "url(/art/bg-battle.jpg)" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070d1c]/70 via-transparent to-[#070d1c]/90" />

      <div className="relative z-10 flex items-center justify-between px-3 py-2">
        <div className="min-w-0 pr-2">
          <p className="truncate font-display text-sm font-bold uppercase tracking-wide text-amber-300">{data.mission.name}</p>
          <p className="text-[11px] text-slate-400">Ronda {match.round} · {isPlayerTurn && !busy ? "🎯 Tu turno" : "⏳ Resolviendo combate"} · guardado en servidor</p>
        </div>
        <button disabled={busy || phase === "over"} onClick={() => setConfirmRetreat(true)}
          className="btn-cut shrink-0 bg-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-rose-600/50 disabled:opacity-40">🏳️ Retirada</button>
      </div>

      <div className="relative z-10 flex gap-1 overflow-x-auto px-3 pb-1">
        {match.order.map((uid) => {
          const u = units.find((x) => x.uid === uid);
          if (!u) return null;
          return (
            <div key={uid} className={`h-8 w-8 shrink-0 overflow-hidden rounded-sm border transition-all ${!u.alive ? "opacity-20 grayscale" : uid === match.currentUid ? "scale-110 border-amber-300 shadow-[0_0_8px_#fbbf24]" : u.side === "ally" ? "border-cyan-400/60" : "border-rose-500/60"}`}>
              <Portrait charKey={u.key} />
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 items-center px-2 py-2">
        <div className="relative w-full" style={{ aspectRatio: `${GRID_W}/${GRID_H}` }}>
          {Array.from({ length: GRID_H }).map((_, y) =>
            Array.from({ length: GRID_W }).map((_, x) => (
              <div key={`${x}-${y}`} className={`grid-cell absolute ${moveTiles.some((t) => t.x === x && t.y === y) ? "cell-move" : ""}`}
                style={{ left: `${x * cellW}%`, top: `${y * cellH}%`, width: `${cellW}%`, height: `${cellH}%` }}
                onClick={() => {
                  if (moveTiles.some((t) => t.x === x && t.y === y)) send({ type: "move", x, y });
                }} />
            ))
          )}
          {units.map((u) => {
            const targeted = validTargets.includes(u);
            return (
              <div key={u.uid} onClick={() => onUnitTap(u)}
                className="absolute z-10 flex flex-col items-center justify-center transition-all duration-300"
                style={{ left: `${u.x * cellW}%`, top: `${u.y * cellH}%`, width: `${cellW}%`, height: `${cellH}%`,
                  opacity: u.alive ? 1 : 0, transform: u.alive ? "scale(1)" : "scale(0.3)",
                  pointerEvents: u.alive ? "auto" : "none" }}>
                <div className={`relative h-[72%] aspect-square overflow-hidden rounded-full border-2 ${targeted ? (u.side === "enemy" ? "cell-target" : "cell-ally-target") : ""} ${u.uid === match.currentUid ? "border-amber-300 shadow-[0_0_12px_#fbbf24aa]" : u.side === "ally" ? "border-cyan-400/70" : "border-rose-500/70"} ${u.boss ? "ring-2 ring-purple-400/70" : ""}`}>
                  <Portrait charKey={u.key} transformed={u.transformed} />
                  {u.boss && u.phase >= 2 && <div className="absolute inset-0 bg-purple-600/30 anim-pulse-soft" />}
                  {u.side === "enemy" && <div className="absolute inset-0 bg-rose-900/20" />}
                </div>
                <div className="mt-0.5 w-[86%] space-y-0.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-sm bg-black/70">
                    <div className="h-full transition-all duration-300" style={{ width: `${(u.hp / u.maxHp) * 100}%`, background: u.side === "ally" ? "#4ade80" : "#f87171" }} />
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-sm bg-black/70">
                    <div className="h-full transition-all duration-300" style={{ width: `${u.energy}%`, background: u.energy >= 100 ? "#f0abfc" : "#38bdf8" }} />
                  </div>
                </div>
                <div className="absolute -right-0.5 -top-1 flex gap-0.5 text-[10px] leading-none">
                  {u.boss && <span>👑</span>}
                  {u.statuses.map((s, i) => (
                    <span key={i} title={s.type}>
                      {s.type === "burn" ? "🔥" : s.type === "stun" ? "💫" : s.type === "atkUp" ? "⚔️" : s.type === "defUp" ? "🛡️" : s.type === "defDown" ? "💔" : "💚"}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {floats.map((f) => (
            <div key={f.id} className={`anim-dmg pointer-events-none absolute z-30 font-display font-bold ${f.big ? "text-xl" : "text-sm"}`}
              style={{ left: `${(f.x + 0.5) * cellW}%`, top: `${(f.y + 0.1) * cellH}%`, color: f.color,
                textShadow: "0 1px 3px #000, 0 0 8px #000", transform: "translateX(-50%)" }}>{f.text}</div>
          ))}
        </div>
      </div>

      <div className="relative z-10 border-t border-cyan-400/15 bg-[#0a1428]/95 px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {current && isPlayerTurn ? (
          <div className="mx-auto max-w-lg">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-10 w-10 overflow-hidden rounded border border-amber-300/60"><Portrait charKey={current.key} transformed={current.transformed} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-slate-100">{current.name} <span className="text-[10px] text-slate-400">Nv.{current.level}</span> <span>{ELEMENTS[current.element].icon}</span></p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span>PV {current.hp}/{current.maxHp}</span>
                  <span className="ml-2 flex gap-0.5">
                    {Array.from({ length: current.maxChakra }).map((_, i) => (
                      <span key={i} className={`inline-block h-2 w-1.5 rounded-[1px] ${i < current.chakra ? "bg-cyan-400" : "bg-slate-700"}`} />
                    ))}
                  </span>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-400">
                <p>⚡ DEF. {current.energy}%</p>
                {action && <p className="text-amber-300 anim-pulse-soft">{validTargets.length ? "Elige objetivo" : "Sin blancos: muévete"}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <Btn small variant={action === "attack" ? "gold" : "ghost"} onClick={() => selectAction("attack")} disabled={busy}>⚔️ Atacar</Btn>
              <Btn small variant={action === "skill" ? "blue" : "ghost"} onClick={() => selectAction("skill")}
                disabled={busy || current.cd > 0 || current.chakra < current.skill.cost}>
                {current.cd > 0 ? `⏳ ${current.cd}` : `✦ ${current.skill.cost}⬡`} Hab.
              </Btn>
              <Btn small variant={current.energy >= 100 ? "danger" : "ghost"} onClick={() => selectAction("ultimate")}
                disabled={busy || current.energy < 100} className={current.energy >= 100 ? "anim-pulse-soft" : ""}>💥 Def.</Btn>
              <Btn small variant="ghost" onClick={() => send({ type: "wait" })} disabled={busy}>⏭️ Esperar</Btn>
            </div>
            <p className="mt-1.5 truncate text-center text-[10px] text-slate-500">
              {action === "skill" ? `${current.skill.name} — ${current.skill.desc}` :
                action === "ultimate" ? `${current.ultimate.name} — ${current.ultimate.desc}` :
                  "Toca una casilla azul para moverte · elige acción y objetivo"}
            </p>
          </div>
        ) : (
          <p className="py-3 text-center font-display text-sm uppercase tracking-widest text-slate-400 anim-pulse-soft">
            {phase === "over" ? "Batalla terminada" : busy ? "El servidor resuelve el turno…" : "Turno enemigo…"}
          </p>
        )}
      </div>

      {banner && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-40 flex justify-center">
          <div className="anim-slash bg-gradient-to-r from-transparent via-[#0a1428]/95 to-transparent px-10 py-3 text-center font-display text-base font-bold text-amber-300" style={{ textShadow: "0 0 12px #fbbf24" }}>{banner}</div>
        </div>
      )}
      {phase === "intro" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
          <p className="anim-slash font-display text-3xl font-extrabold uppercase tracking-widest text-amber-300" style={{ textShadow: "0 0 24px #fbbf24" }}>¡Combate!</p>
          <p className="anim-rise mt-2 text-sm text-slate-300">{data.mission.name}</p>
        </div>
      )}
      {ult && (
        <div className="absolute inset-0 z-50 overflow-hidden bg-black/90">
          <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 50% 50%, ${ult.ultimate.color}66, transparent 65%)` }} />
          <UltFX color={ult.ultimate.color} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="anim-ult-zoom relative h-64 w-64 overflow-hidden rounded-lg" style={{ boxShadow: `0 0 60px ${ult.ultimate.color}` }}>
              <Portrait charKey={ult.key} transformed={ult.transformed} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, transparent 40%, ${ult.ultimate.color}55)` }} />
            </div>
          </div>
          <div className="anim-slash absolute inset-x-0 bottom-16">
            <div className="mx-auto max-w-md bg-gradient-to-r from-transparent via-black/90 to-transparent px-6 py-3 text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Técnica Definitiva</p>
              <p className="font-display text-2xl font-extrabold" style={{ color: ult.ultimate.color, textShadow: `0 0 20px ${ult.ultimate.color}` }}>{ult.ultimate.name}</p>
            </div>
          </div>
          <div className="anim-ring absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-4" style={{ borderColor: ult.ultimate.color }} />
        </div>
      )}
      {flash && <div className="anim-flash pointer-events-none absolute inset-0 z-50 bg-white" />}

      {confirmRetreat && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="panel-cut w-full max-w-sm border border-rose-400/30 bg-[#101a30] p-5 text-center">
            <p className="font-display text-xl font-bold text-rose-300">¿Retirarse?</p>
            <p className="mt-2 text-sm text-slate-300">Perderás la energía gastada; no se otorgarán recompensas.</p>
            <div className="mt-4 flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setConfirmRetreat(false)} disabled={busy}>Seguir</Btn>
              <Btn variant="danger" className="flex-1" onClick={retreat} disabled={busy}>Retirarse</Btn>
            </div>
          </div>
        </div>
      )}

      {(phase === "over" || phase === "error") && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="panel-cut w-full max-w-sm border border-amber-400/30 bg-[#101a30] p-6 text-center anim-bounce-in">
            <p className={`font-display text-4xl font-extrabold uppercase tracking-widest ${result?.victory ? "text-amber-300" : "text-rose-400"}`}
              style={{ textShadow: result?.victory ? "0 0 30px #fbbf24" : "0 0 30px #f43f5e" }}>
              {phase === "error" ? "Conexión" : result?.victory ? "Victoria" : "Derrota"}
            </p>
            {!!result?.victory && <p className="mt-1 text-2xl text-yellow-400">{"★".repeat(result.stars || 1)}{"☆".repeat(3 - (result.stars || 1))}</p>}
            {result?.rewards ? (
              <div className="mt-4 space-y-1.5 text-sm">
                {result.firstClear && <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">✦ ¡Primera victoria! Bonus aplicado</p>}
                <p className="text-slate-200">🪙 +{result.rewards.gold} oro</p>
                <p className="text-slate-200">🔷 +{result.rewards.gems} gemas</p>
                <p className="text-slate-200">📈 +{result.rewards.xp} EXP de cuenta</p>
                {Object.entries(result.rewards.materials).map(([k, v]) => (
                  <p key={k} className="text-slate-200">{k === "esencia" ? "🧪" : k === "cristal" ? "💎" : "📜"} +{v} {k}</p>
                ))}
                {result.levelUp && <p className="mt-2 font-display font-bold text-emerald-300 anim-pulse-soft">⬆ ¡Nivel de cuenta {result.newLevel}! Energía restaurada</p>}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">{phase === "error" ? errorMessage : "Tu equipo ha caído. Mejora a tus héroes y vuelve más fuerte. La energía gastada no se recupera."}</p>
            )}
            <Btn className="mt-5 w-full" onClick={onFinish}>Continuar</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
