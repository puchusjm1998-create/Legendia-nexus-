// Prueba de integración de expediciones AFK contra un servidor real + PostgreSQL.
// Simula el paso del tiempo retrasando las marcas de tiempo PERSISTENTES en la BD
// (equivale a cerrar el juego horas): el servidor es el único que calcula.
//   GAME_URL=http://localhost:3000 DATABASE_URL=postgresql://... node scripts/test-afk.mjs
import pg from "pg";
const BASE = process.env.GAME_URL || "http://localhost:3000";
const DB = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const pool = new pg.Pool({ connectionString: DB });
let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.error("✗ " + m); } else console.log("✓ " + m); };

async function api(path, token, body) {
  const r = await fetch(`${BASE}/api/${path}`, {
    method: body !== undefined ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
const shift = (expId, hours) => pool.query(
  `UPDATE expeditions SET started_at = started_at - ($2 || ' hours')::interval,
   ends_at = ends_at - ($2 || ' hours')::interval WHERE id = $1`, [expId, String(hours)]);

const name = "afk" + Math.random().toString(36).slice(2, 9);
const reg = await api("auth/register", null, { username: name, password: "secret123" });
const token = reg.data.token;
ok(!!token, "registro de cuenta temporal");
let st = (await api("game/state", token)).data;
ok(st.afk && st.afk.slots >= 2, `estado incluye bloque AFK (huecos: ${st.afk?.slots})`);
const ids = st.chars.map((c) => c.id);
const uid = (await pool.query("select id from users where username=$1", [name])).rows[0].id;

// --- validaciones de inicio
let r = await api("afk/start", token, { expKey: "abismo", charIds: [ids[0]] });
ok(r.status === 400, "expedición avanzada rechazada por nivel/poder: " + r.data.error);
r = await api("afk/start", token, { expKey: "bosque", charIds: [] });
ok(r.status === 400, "escuadrón vacío rechazado");
r = await api("afk/start", token, { expKey: "bosque", charIds: [999999] });
ok(r.status === 400, "personaje ajeno rechazado");
r = await api("afk/start", token, { expKey: "bosque", charIds: [ids[0], ids[1]], startedAt: 1 });
ok(r.status === 200, "inicio válido (ignora cualquier marca de tiempo del cliente)");
const exp = r.data.expedition;
const serverStart = exp.startedAt;
ok(Math.abs(serverStart - Date.now()) < 5000, "startedAt lo fija el servidor");
r = await api("afk/start", token, { expKey: "bosque", charIds: [ids[2]] });
ok(r.status === 409, "misma expedición dos veces rechazada: " + r.data.error);
await pool.query("update players set level = 5 where user_id = $1", [uid]); // desbloquea "ruinas" (nivel 3)
r = await api("afk/start", token, { expKey: "ruinas", charIds: [ids[1]] });
ok(r.status === 409, "personaje ya en expedición rechazado: " + r.data.error);

// --- reclamo inmediato: nada
r = await api("afk/claim", token, { id: exp.id });
ok(r.status === 409, "reclamo inmediato sin recursos rechazado");

// --- 1 h después
const goldBefore = (await api("game/state", token)).data.player.gold;
await shift(exp.id, 1);
r = await api("afk/claim", token, { id: exp.id });
ok(r.status === 200, "reclamo tras 1 h correcto");
const expectGold1 = Math.floor(140 * exp.mult * 1 + 1e-9);
ok(r.data.gained.gold === expectGold1, `oro tras 1 h = ${r.data.gained.gold} (esperado ${expectGold1}, mult ${exp.mult.toFixed(3)})`);
ok(r.data.finished === false, "aún no completada");
let after = (await api("game/state", token)).data;
ok(after.player.gold === goldBefore + expectGold1, "el oro se persistió en el jugador");
r = await api("afk/claim", token, { id: exp.id });
ok(r.status === 409, "segundo reclamo inmediato no duplica");

// --- 30 h después (cerrado mucho tiempo): tope 12 h / duración
await shift(exp.id, 30);
const stBefore = (await api("game/state", token)).data;
r = await api("afk/claim", token, { id: exp.id });
ok(r.status === 200 && r.data.finished === true, "reclamo tras 31 h => completada");
const totalGold = expectGold1 + (r.data.gained.gold || 0);
const maxGold = Math.floor(140 * exp.mult * 2 + 1e-9);
ok(totalGold === maxGold, `oro total ${totalGold} = tope de 2 h (${maxGold}), no 31 h`);
ok(totalGold < 140 * exp.mult * 12, "nunca supera 12 h de recompensas");
r = await api("afk/claim", token, { id: exp.id });
ok(r.status === 409, "expedición cerrada no se puede reclamar otra vez");
after = (await api("game/state", token)).data;
ok(after.afk.expeditions.length === 0, "la expedición cerrada libera el hueco");
ok((after.afk.mastery.bosque || 0) === 1, "nivel de expedición (maestría) registrado");
const fr = Object.entries(after.player.materials).filter(([k]) => k.startsWith("frag_"));
console.log("  fragmentos:", JSON.stringify(fr), "xp chars:", JSON.stringify(after.chars.map((c) => [c.charKey, c.level, c.xp])));

// --- carrera: 6 reclamos simultáneos
r = await api("afk/start", token, { expKey: "bosque", charIds: [ids[0]] });
const e2 = r.data.expedition;
await shift(e2.id, 1.5);
const g0 = (await api("game/state", token)).data.player.gold;
const rs = await Promise.all(Array.from({ length: 6 }, () => api("afk/claim", token, { id: e2.id })));
const wins = rs.filter((x) => x.status === 200).length;
ok(wins === 1, `6 reclamos concurrentes → ${wins} concedido(s)`);
const g1 = (await api("game/state", token)).data.player.gold;
ok(g1 - g0 === Math.floor(140 * e2.mult * 1.5 + 1e-9), "oro concedido una sola vez en la carrera");

// --- retirada anticipada y persistencia entre sesiones
const login = await api("auth/login", null, { username: name, password: "secret123" });
const t2 = login.data.token;
const s2 = (await api("game/state", t2)).data;
ok(s2.afk.expeditions.some((e) => e.id === e2.id), "otra sesión/dispositivo ve la expedición en curso");
await shift(e2.id, 0.2);
r = await api("afk/recall", t2, { id: e2.id });
ok(r.status === 200 && r.data.finished === false, "retirada anticipada concede lo acumulado y cierra");
r = await api("afk/recall", t2, { id: e2.id });
ok(r.status === 409, "retirada repetida rechazada");

// --- aislamiento entre jugadores
const other = await api("auth/register", null, { username: name + "x", password: "secret123" });
r = await api("afk/claim", other.data.token, { id: e2.id });
ok(r.status === 404, "otro jugador no puede reclamar la expedición ajena");

// --- fragmentos
await pool.query(`update players set materials = materials || '{"frag_kagero": 170, "frag_ryuen": 45}'::jsonb where user_id=$1`, [uid]);
r = await api("game/fragments", token, { charKey: "kagero" });
ok(r.status === 200 && r.data.kind === "unlock", "fragmentos desbloquean un héroe no poseído");
r = await api("game/fragments", token, { charKey: "kagero" });
ok(r.status === 400, "sin fragmentos suficientes para resonancia: " + r.data.error);
r = await api("game/fragments", token, { charKey: "ryuen" });
ok(r.status === 200 && r.data.kind === "resonance", "fragmentos suben la resonancia de un héroe poseído");
const fin = (await api("game/state", token)).data;
ok(fin.player.materials.frag_kagero === 10 && fin.player.materials.frag_ryuen === 5, "coste de fragmentos descontado");
ok(fin.chars.some((c) => c.charKey === "kagero"), "héroe desbloqueado aparece en la colección");

await pool.end();
if (failures) { console.error(`\n${failures} fallo(s)`); process.exit(1); }
console.log("\nAFK OK");
