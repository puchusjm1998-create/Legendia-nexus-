"use client";
import { useState } from "react";
import { useGame } from "@/lib/store";
import { Btn } from "../ui";
import { getAudio } from "@/game/audio";

export function AuthScreen() {
  const { login, register } = useGame();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    getAudio().init();
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden p-5">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/art/bg-home.jpg)" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1224]/60 via-[#0a1224]/40 to-[#0a1224]" />
      {/* partículas */}
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="particle" style={{
          left: `${(i * 7.3) % 100}%`, width: 3 + (i % 4) * 2, height: 3 + (i % 4) * 2,
          animationDuration: `${9 + (i % 6) * 3}s`, animationDelay: `${-i * 1.7}s`,
        }} />
      ))}

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center anim-rise">
          <p className="font-display text-xs uppercase tracking-[0.5em] text-cyan-300">Servidor Privado</p>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-none text-white" style={{ textShadow: "0 0 30px #38bdf8, 0 4px 0 #0a1224" }}>
            Legendia
          </h1>
          <h2 className="font-display text-3xl font-extrabold uppercase tracking-[0.35em] text-amber-300" style={{ textShadow: "0 0 24px #fbbf24" }}>
            Nexus
          </h2>
          <p className="mt-3 text-sm text-slate-300">Tres mundos. Un nexo. Invoca a tus leyendas.</p>
        </div>

        <div className="panel-cut border border-cyan-400/20 bg-[#0d1730]/90 p-5 backdrop-blur anim-slide-up">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded bg-black/30 p-1">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`rounded py-1.5 font-display text-sm font-bold uppercase tracking-wide transition-all ${mode === m ? "bg-amber-400 text-amber-950" : "text-slate-400 hover:text-white"}`}>
                {m === "login" ? "Entrar" : "Crear cuenta"}
              </button>
            ))}
          </div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Invocador</label>
          <input
            value={username} onChange={(e) => setUsername(e.target.value)}
            className="mb-3 w-full rounded border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            placeholder="Tu nombre de invocador" autoComplete="username"
          />
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Contraseña</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="mb-4 w-full rounded border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            placeholder="Mínimo 6 caracteres" autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {error && <p className="mb-3 rounded bg-rose-500/15 px-3 py-2 text-xs text-rose-300 anim-shake">⚠️ {error}</p>}
          <Btn className="w-full" onClick={submit} disabled={busy || !username || !password}>
            {busy ? "Conectando…" : mode === "login" ? "⚔️ Entrar al Nexus" : "✦ Comenzar aventura"}
          </Btn>
          {mode === "register" && (
            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
              Empiezas con <b className="text-amber-300">4 héroes</b>, <b className="text-cyan-300">1600 gemas</b> y oro suficiente para tu primera invocación ×10.
            </p>
          )}
        </div>
        <p className="mt-5 text-center text-[10px] text-slate-500">
          Tu progreso se guarda en el servidor · Personajes y música 100% originales
        </p>
      </div>
    </div>
  );
}