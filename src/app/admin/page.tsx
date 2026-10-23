"use client";
import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "@/lib/api";
import { CHARACTERS } from "@/game/catalog";
import { ALL_MISSIONS } from "@/game/missions";

interface AdminUser { id: number; username: string; isAdmin: boolean; createdAt: string; level: number | null; gems: number | null; gold: number | null; wins: number | null }
interface AdminBanner { key: string; name: string; description: string; kind: string; active: boolean; costSingle: number; costMulti: number; rates: { r5: number; r4: number; r3: number }; pityLimit: number; featured: string[] }
interface AdminEvent { id: number; name: string; description: string; active: boolean; missionId: string | null; rewardGems: number; rewardGold: number; endsAt: string | null }
interface AdminError { id: number; message: string; stack: string; createdAt: string }
interface AdminOverride { charKey: string; mult: { hp: number; atk: number; def: number; spd: number } }
interface AdminData { users: AdminUser[]; banners: AdminBanner[]; events: AdminEvent[]; errors: AdminError[]; overrides: AdminOverride[] }

type ATab = "users" | "banners" | "events" | "chars" | "errors" | "backup";

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<ATab>("users");
  const [msg, setMsg] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<AdminData>("admin/data");
      setData(d);
      setDenied(false);
    } catch (e) {
      setDenied(true);
      setMsg((e as Error).message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const login = async () => {
    try {
      const r = await api<{ token: string; isAdmin: boolean }>("auth/login", { username, password });
      setToken(r.token);
      if (!r.isAdmin) { setMsg("Esa cuenta no es administradora."); return; }
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  if (denied || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1224] p-5">
        <div className="panel-cut w-full max-w-sm border border-purple-400/30 bg-[#101a30] p-6">
          <p className="font-display text-xl font-extrabold uppercase text-purple-300">🛠️ Panel de administración</p>
          <p className="mb-4 mt-1 text-xs text-slate-400">Acceso restringido. La cuenta admin se configura con las variables de entorno ADMIN_USERNAME / ADMIN_PASSWORD.</p>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuario admin"
            className="mb-2 w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-400" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña"
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="mb-3 w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-400" />
          {msg && <p className="mb-2 text-xs text-rose-300">⚠️ {msg}</p>}
          <button onClick={login} className="btn-cut w-full bg-gradient-to-b from-purple-500 to-purple-700 py-2.5 font-display text-sm font-bold uppercase text-white">Acceder</button>
          <a href="/" className="mt-3 block text-center text-xs text-cyan-300 hover:underline">← Volver al juego</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0a1224] pb-10">
      <header className="sticky top-0 z-20 border-b border-purple-400/20 bg-[#0a1224]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="font-display text-lg font-extrabold uppercase text-purple-300">🛠️ Legendia Nexus — Admin</p>
          <a href="/" className="text-xs text-cyan-300 hover:underline">← Volver al juego</a>
        </div>
        <div className="mx-auto mt-2 flex max-w-4xl gap-1.5 overflow-x-auto">
          {([["users", "👤 Usuarios"], ["banners", "🌀 Banners"], ["events", "🎪 Eventos"], ["chars", "📊 Personajes"], ["errors", "🐞 Errores"], ["backup", "💾 Backup"]] as [ATab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`shrink-0 rounded px-3 py-1.5 text-xs font-bold ${tab === t ? "bg-purple-500 text-white" : "bg-white/8 text-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>
        {msg && <p className="mx-auto mt-2 max-w-4xl rounded bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300">{msg}</p>}
      </header>

      <main className="mx-auto max-w-4xl space-y-3 px-4 pt-4">
        {tab === "users" && <UsersTab users={data.users} onDone={async (m) => { flash(m); await load(); }} />}
        {tab === "banners" && <BannersTab banners={data.banners} onDone={async (m) => { flash(m); await load(); }} />}
        {tab === "events" && <EventsTab events={data.events} onDone={async (m) => { flash(m); await load(); }} />}
        {tab === "chars" && <CharsTab overrides={data.overrides} onDone={async (m) => { flash(m); await load(); }} />}
        {tab === "errors" && <ErrorsTab errors={data.errors} onDone={async (m) => { flash(m); await load(); }} />}
        {tab === "backup" && <BackupTab onFlash={flash} />}
      </main>
    </div>
  );
}

function UsersTab({ users, onDone }: { users: AdminUser[]; onDone: (m: string) => Promise<void> }) {
  const [grant, setGrant] = useState<Record<number, { gold: string; gems: string; stardust: string; esencia: string }>>({});
  const g = (id: number) => grant[id] || { gold: "", gems: "", stardust: "", esencia: "" };
  const submit = async (id: number) => {
    const v = g(id);
    await api("admin/grant", {
      userId: id, gold: Number(v.gold) || 0, gems: Number(v.gems) || 0,
      stardust: Number(v.stardust) || 0,
      materials: v.esencia ? { esencia: Number(v.esencia) } : undefined,
    });
    await onDone(`Recursos enviados al usuario #${id}`);
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">{users.length} cuentas registradas</p>
      {users.map((u) => (
        <div key={u.id} className="rounded border border-white/10 bg-[#101a30] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-100">#{u.id} {u.username} {u.isAdmin && <span className="rounded bg-purple-500/30 px-1.5 text-[10px] text-purple-300">ADMIN</span>}</p>
            <p className="text-[11px] text-slate-400">Nv.{u.level ?? "—"} · 🪙{u.gold ?? "—"} · 🔷{u.gems ?? "—"} · ⚔️{u.wins ?? 0} victorias · alta {new Date(u.createdAt).toLocaleDateString("es")}</p>
          </div>
          {!u.isAdmin && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {(["gold", "gems", "stardust", "esencia"] as const).map((k) => (
                <input key={k} placeholder={k === "gold" ? "🪙 oro" : k === "gems" ? "🔷 gemas" : k === "stardust" ? "✨ polvo" : "🧪 esencia"}
                  value={g(u.id)[k]}
                  onChange={(e) => setGrant({ ...grant, [u.id]: { ...g(u.id), [k]: e.target.value } })}
                  className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1 text-white outline-none focus:border-purple-400" />
              ))}
              <button onClick={() => submit(u.id)} className="rounded bg-purple-600 px-3 py-1 font-bold text-white hover:bg-purple-500">Enviar (admite negativos)</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BannersTab({ banners, onDone }: { banners: AdminBanner[]; onDone: (m: string) => Promise<void> }) {
  const [edit, setEdit] = useState<Record<string, Partial<AdminBanner>>>({});
  const e = (b: AdminBanner) => ({ ...b, ...edit[b.key] });
  const save = async (b: AdminBanner) => {
    const v = e(b);
    await api("admin/banner", { key: b.key, active: v.active, pityLimit: Number(v.pityLimit), costSingle: Number(v.costSingle), costMulti: Number(v.costMulti), rates: v.rates });
    await onDone(`Banner ${b.name} actualizado`);
  };
  return (
    <div className="space-y-2">
      {banners.map((b) => {
        const v = e(b);
        return (
          <div key={b.key} className="rounded border border-white/10 bg-[#101a30] p-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-100">{b.name} <span className="text-[10px] text-slate-500">({b.key} · {b.kind})</span></p>
              <label className="flex items-center gap-1.5 text-xs text-slate-300">
                <input type="checkbox" checked={!!v.active} onChange={(ev) => setEdit({ ...edit, [b.key]: { ...v, active: ev.target.checked } })} />
                Activo
              </label>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">{b.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
              <label>5★ % <input type="number" step="0.5" value={v.rates?.r5} onChange={(ev) => setEdit({ ...edit, [b.key]: { ...v, rates: { ...v.rates!, r5: Number(ev.target.value) } } })} className="w-16 rounded border border-white/15 bg-black/40 px-1.5 py-1" /></label>
              <label>4★ % <input type="number" step="0.5" value={v.rates?.r4} onChange={(ev) => setEdit({ ...edit, [b.key]: { ...v, rates: { ...v.rates!, r4: Number(ev.target.value) } } })} className="w-16 rounded border border-white/15 bg-black/40 px-1.5 py-1" /></label>
              <span className="self-center text-slate-500">3★ = resto</span>
              <label>Pity <input type="number" value={v.pityLimit} onChange={(ev) => setEdit({ ...edit, [b.key]: { ...v, pityLimit: Number(ev.target.value) } })} className="w-16 rounded border border-white/15 bg-black/40 px-1.5 py-1" /></label>
              <label>×1 <input type="number" value={v.costSingle} onChange={(ev) => setEdit({ ...edit, [b.key]: { ...v, costSingle: Number(ev.target.value) } })} className="w-16 rounded border border-white/15 bg-black/40 px-1.5 py-1" /></label>
              <label>×10 <input type="number" value={v.costMulti} onChange={(ev) => setEdit({ ...edit, [b.key]: { ...v, costMulti: Number(ev.target.value) } })} className="w-20 rounded border border-white/15 bg-black/40 px-1.5 py-1" /></label>
              <button onClick={() => save(b)} className="rounded bg-purple-600 px-3 py-1 font-bold text-white hover:bg-purple-500">Guardar</button>
            </div>
            {b.featured.length > 0 && <p className="mt-1 text-[11px] text-pink-300">Destacados: {b.featured.join(", ")}</p>}
          </div>
        );
      })}
    </div>
  );
}

function localDateValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function EventsTab({ events, onDone }: { events: AdminEvent[]; onDone: (m: string) => Promise<void> }) {
  const empty = { name: "", description: "", active: true, missionId: "", rewardGems: 100, rewardGold: 2000, endsAt: "" };
  const [form, setForm] = useState<{ id?: number } & typeof empty>(empty);
  const save = async () => {
    await api("admin/event", { ...form, id: form.id, missionId: form.missionId || null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null });
    setForm(empty);
    await onDone("Evento guardado");
  };
  return (
    <div className="space-y-3">
      <div className="rounded border border-purple-400/30 bg-[#101a30] p-3">
        <p className="mb-2 font-bold text-purple-300">{form.id ? `Editando evento #${form.id}` : "Crear evento"}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm" />
          <select value={form.missionId} onChange={(e) => setForm({ ...form, missionId: e.target.value })} className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm">
            <option value="">Sin misión asociada</option>
            {ALL_MISSIONS.filter((m) => m.difficulty === "event").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm sm:col-span-2" rows={2} />
          <label className="text-xs text-slate-300">Gemas extra <input type="number" value={form.rewardGems} onChange={(e) => setForm({ ...form, rewardGems: Number(e.target.value) })} className="ml-1 w-20 rounded border border-white/15 bg-black/40 px-1.5 py-1" /></label>
          <label className="text-xs text-slate-300">Oro extra <input type="number" value={form.rewardGold} onChange={(e) => setForm({ ...form, rewardGold: Number(e.target.value) })} className="ml-1 w-24 rounded border border-white/15 bg-black/40 px-1.5 py-1" /></label>
          <label className="text-xs text-slate-300">Finaliza (hora local, opcional)<input type="datetime-local" value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            className="mt-1 block w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-slate-100" /></label>
          <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Activo</label>
          <div className="flex gap-2">
            <button onClick={save} disabled={!form.name} className="rounded bg-purple-600 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40">Guardar</button>
            {form.id && <button onClick={() => setForm(empty)} className="rounded bg-white/10 px-3 py-1.5 text-sm">Cancelar</button>}
          </div>
        </div>
      </div>
      {events.map((ev) => (
        <div key={ev.id} className="flex items-center gap-3 rounded border border-white/10 bg-[#101a30] p-3">
          <span className={`h-2.5 w-2.5 rounded-full ${ev.active && (!ev.endsAt || new Date(ev.endsAt) > new Date()) ? "bg-emerald-400" : "bg-slate-600"}`} />
          <div className="flex-1">
            <p className="font-bold text-slate-100">{ev.name}</p>
            <p className="text-[11px] text-slate-400">{ev.description}</p>
            <p className="text-[10px] text-slate-500">Misión: {ev.missionId || "—"} · +{ev.rewardGems}🔷 +{ev.rewardGold}🪙
              {ev.endsAt && ` · Fin: ${new Date(ev.endsAt).toLocaleString("es")}${new Date(ev.endsAt) < new Date() ? " (finalizado)" : ""}`}</p>
          </div>
          <button onClick={() => setForm({ id: ev.id, name: ev.name, description: ev.description,
            active: ev.active, missionId: ev.missionId || "", rewardGems: ev.rewardGems,
            rewardGold: ev.rewardGold, endsAt: localDateValue(ev.endsAt) })}
            className="rounded bg-white/10 px-3 py-1 text-xs">Editar</button>
          <button onClick={async () => { await api("admin/event", { ...ev, active: !ev.active }); await onDone(`Evento ${ev.active ? "desactivado" : "activado"}`); }}
            className={`rounded px-3 py-1 text-xs font-bold ${ev.active ? "bg-rose-600/70" : "bg-emerald-600/70"} text-white`}>
            {ev.active ? "Desactivar" : "Activar"}
          </button>
        </div>
      ))}
    </div>
  );
}

function CharsTab({ overrides, onDone }: { overrides: AdminOverride[]; onDone: (m: string) => Promise<void> }) {
  const [key, setKey] = useState(CHARACTERS[0].key);
  const cur = overrides.find((o) => o.charKey === key);
  const [mult, setMult] = useState({ hp: 1, atk: 1, def: 1, spd: 1 });
  useEffect(() => {
    setMult(cur?.mult || { hp: 1, atk: 1, def: 1, spd: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <div className="rounded border border-white/10 bg-[#101a30] p-3">
      <p className="mb-1 font-bold text-slate-100">Balance de personajes</p>
      <p className="mb-3 text-[11px] text-slate-400">Multiplicadores de estadísticas aplicados en servidor al desplegar (0.1 – 5.0). No modifica el catálogo base.</p>
      <select value={key} onChange={(e) => setKey(e.target.value)} className="mb-3 rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm">
        {CHARACTERS.map((c) => <option key={c.key} value={c.key}>{"★".repeat(c.rarity)} {c.name} — {c.title}</option>)}
      </select>
      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
        {(["hp", "atk", "def", "spd"] as const).map((k) => (
          <label key={k}>{k.toUpperCase()} <input type="number" step="0.1" min="0.1" max="5" value={mult[k]}
            onChange={(e) => setMult({ ...mult, [k]: Number(e.target.value) })}
            className="w-20 rounded border border-white/15 bg-black/40 px-1.5 py-1" /></label>
        ))}
        <button onClick={async () => { await api("admin/override", { charKey: key, mult }); await onDone("Multiplicadores aplicados"); }}
          className="rounded bg-purple-600 px-4 py-1 font-bold text-white">Aplicar</button>
      </div>
      {overrides.length > 0 && (
        <div className="mt-3 text-[11px] text-slate-400">
          Activos: {overrides.map((o) => `${o.charKey} (PV×${o.mult.hp} ATK×${o.mult.atk})`).join(" · ")}
        </div>
      )}
    </div>
  );
}

function ErrorsTab({ errors, onDone }: { errors: AdminError[]; onDone: (m: string) => Promise<void> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{errors.length} errores registrados (últimos 50)</p>
        <button onClick={async () => { await api("admin/clearErrors", {}); await onDone("Registro de errores limpiado"); }}
          className="rounded bg-rose-600/70 px-3 py-1 text-xs font-bold text-white">Limpiar registro</button>
      </div>
      {!errors.length && <p className="rounded border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Sin errores. El servidor está sano. ✨</p>}
      {errors.map((e) => (
        <details key={e.id} className="rounded border border-rose-500/20 bg-[#101a30] p-2.5 text-xs">
          <summary className="cursor-pointer font-bold text-rose-300">#{e.id} · {new Date(e.createdAt).toLocaleString("es")} · {e.message}</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[10px] text-slate-400">{e.stack}</pre>
        </details>
      ))}
    </div>
  );
}

function BackupTab({ onFlash }: { onFlash: (m: string) => void }) {
  const download = async () => {
    const res = await fetch("/api/admin/backup", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) { onFlash("Error al generar la copia."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legendia-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onFlash("Copia de seguridad descargada (sin hashes de contraseñas).");
  };
  return (
    <div className="rounded border border-white/10 bg-[#101a30] p-4">
      <p className="font-bold text-slate-100">💾 Copia de seguridad</p>
      <p className="mb-3 mt-1 text-xs text-slate-400">
        Exporta cuentas (sin contraseñas), jugadores, colecciones, invocaciones, misiones, batallas guardadas, banners, eventos y balance en JSON. Contiene tokens de batalla: guarda el archivo de forma privada.
        Para copias completas a nivel de base de datos usa <code className="rounded bg-black/40 px-1">pg_dump</code> (ver README).
      </p>
      <button onClick={download} className="btn-cut bg-gradient-to-b from-emerald-500 to-emerald-700 px-5 py-2.5 font-display text-sm font-bold uppercase text-white">
        ⬇ Descargar backup JSON
      </button>
    </div>
  );
}