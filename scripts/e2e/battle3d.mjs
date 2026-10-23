// E2E del combate 3D en Chromium real (WebGL por software).
//   GAME_URL=http://localhost:3000 E2E_TOOLS=/ruta/tools SHOTS=/ruta/out node scripts/e2e/battle3d.mjs
import { launch, sleep, clickText } from "./browser.mjs";
const URL = process.env.GAME_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS || "/tmp/shots";
const W = +(process.env.W || 420), H = +(process.env.H || 800);
import fs from "node:fs";
fs.mkdirSync(SHOTS, { recursive: true });
let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.error("✗ " + m); } else console.log("✓ " + m); };
const api = async (path, token, body) => {
  const res = await fetch(`${URL}/api/${path}`, { method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: res.status, data: await res.json() };
};
const user = "b3d" + Math.random().toString(36).slice(2, 8);
const reg = await api("auth/register", null, { username: user, password: "secret123" });
const token = reg.data.token;
const started = await api("battle/start", token, { missionId: process.env.MISSION || "c1-1", teamIndex: 0 });
ok(started.status === 200, "batalla iniciada por API");
if (process.env.ULT) {
  // Deja a los aliados con la energía de definitiva llena para probar la cinemática (sólo datos de prueba).
  const { createRequire } = await import("node:module");
  const { Client } = createRequire(import.meta.url)("pg");
  const env = fs.readFileSync(new globalThis.URL("../../.env", import.meta.url), "utf8").match(/DATABASE_URL=(.*)/)[1].trim();
  const c = new Client({ connectionString: env }); await c.connect();
  const r = await c.query("select state from battle_sessions where token=$1", [started.data.token]);
  const st = r.rows[0].state; st.units.filter((u) => u.side === "ally").forEach((u) => { u.energy = 100; });
  await c.query("update battle_sessions set state=$1 where token=$2", [JSON.stringify(st), started.data.token]);
  await c.end();
  console.log("  energía de los aliados fijada a 100 (prueba)");
}

const { browser, page } = await launch({ width: W, height: H });
await page.goto(URL, { waitUntil: "networkidle2" });
await page.evaluate((t) => localStorage.setItem("legendia_token", t), token);
await page.reload({ waitUntil: "networkidle2" });
await page.waitForFunction(() => document.body.textContent.includes("Centro de mando"), { timeout: 30000 });
await page.mouse.click(10, 10);
await clickText(page, "Batalla en curso", "button").catch(async () => { await page.screenshot({ path: SHOTS + "/err-home.png" }); throw new Error("sin botón reanudar"); });
await page.waitForFunction(() => !!window.__nexusStage, { timeout: 60000 });
ok(true, "escenario 3D creado");
const shot = async (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
await sleep(800); await shot("01-intro");
await page.waitForFunction(() => document.body.textContent.includes("Tu turno"), { timeout: 60000 });
await sleep(500); await shot("02-play");
const info = await page.evaluate(() => { const s = window.__nexusStage; return { views: s.views.size, layout: s.layout, q: s.quality }; });
console.log("  stage:", JSON.stringify(info));
ok(info.views >= 3, "unidades en escena: " + info.views);

// jugar turnos con la UI real (misma lógica de decisión que scripts/smoke-game.mjs)
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const clickBtn = (t) => page.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes(t) && !x.disabled); if (b) { b.click(); return true; } return false; }, t);
let skips = 0, checks = 0, mismatches = 0;
let turns = 0, ults = 0, shotsUlt = 0, lastRev = -1;
const seen = { ult: false };
while (turns < 120) {
  const s = await page.evaluate(() => {
    const st = window.__nexusStage; if (!st) return null;
    const over = [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Continuar"));
    return { over, my: document.body.textContent.includes("Tu turno"), snap: JSON.parse(JSON.stringify(st.displayed)), playing: st.isPlaying };
  });
  if (!s || s.over) break;
  if (!s.my || s.playing) { await sleep(400); continue; }
  const snap = s.snap, a = snap.units.find((u) => u.uid === snap.currentUid);
  if (!a || a.side !== "ally") { await sleep(300); continue; }
  const foes = snap.units.filter((u) => u.side === "enemy" && u.alive);
  const allies = snap.units.filter((u) => u.side === "ally" && u.alive);
  const wounded = allies.filter((u) => u.hp / u.maxHp < 0.55).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
  const tapUnit = async (u) => { const p = await page.evaluate((id) => window.__nexusStage.screenOfUnit(id), u.uid); await page.mouse.click(p.x, p.y); };
  let acted = false;
  const ultTarget = a.energy >= 100 && a.ultimate.target === "enemy" ? foes.filter((u) => dist(a, u) <= a.ultimate.range).sort((x, y) => x.hp - y.hp)[0] : null;
  if (ultTarget) { await clickBtn("Def."); await sleep(250); await tapUnit(ultTarget); acted = true; ults++; seen.ult = true; if (process.env.SEQ && ults === 1) { for (let i = 0; i < 14; i++) { await shot("seq-" + String(i).padStart(2, "0")); await sleep(150); } }
    else { await sleep(1700); await shot("ult-charge-" + ults); await sleep(1200); await shot("ult-release-" + ults); } }
  else if (a.skill.target === "ally" && a.cd === 0 && a.chakra >= a.skill.cost && wounded && dist(a, wounded) <= a.skill.range) { await clickBtn("Hab."); await sleep(250); await tapUnit(wounded); acted = true; }
  else {
    const t = foes.filter((u) => dist(a, u) <= a.range).sort((x, y) => x.hp - y.hp)[0];
    if (t) { await clickBtn("Atacar"); await sleep(250); await tapUnit(t); acted = true; if (turns === 4) { await sleep(500); await shot("04-attack"); } }
    else if (a.skill.target === "enemy" && a.cd === 0 && a.chakra >= a.skill.cost && foes.some((u) => dist(a, u) <= a.skill.range)) {
      const t2 = foes.filter((u) => dist(a, u) <= a.skill.range).sort((x, y) => x.hp - y.hp)[0];
      await clickBtn("Hab."); await sleep(250); await tapUnit(t2); acted = true; if (!shotsUlt++) { await sleep(500); await shot("05-skill"); }
    }
  }
  if (!acted) {
    if (!a.movedThisTurn) {
      const tile = await page.evaluate(() => window.__nexusStage.getMoveTile());
      if (tile) { await page.mouse.click(tile.x, tile.y); acted = true; }
    }
    if (!acted) { await clickBtn("Esperar"); }
  }
  turns++;
  if (process.env.DEBUG) console.log("  turno", turns, "ronda", snap.round, "rev", snap.revision, a.key, "acted=" + acted, "pos", a.x, a.y, "foes", foes.map((f) => f.x + "," + f.y + ":" + f.hp).join(" "));
  await sleep(500);
  if (turns % 3 === 1) { await sleep(400); if (await clickBtn("Saltar")) skips++; }
  await page.waitForFunction(() => !window.__nexusStage || !window.__nexusStage.isPlaying, { timeout: 90000 }).catch(() => {});
  await sleep(200);
  // La escena debe mostrar EXACTAMENTE el estado del servidor (HP, energía, posición, vivos)
  const srv = await api("battle/active", token);
  if (srv.status === 200) {
    const shown = await page.evaluate(() => window.__nexusStage.displayed.units.map((u) => [u.uid, u.hp, u.energy, u.x, u.y, u.alive]));
    const real = srv.data.snapshot.units.map((u) => [u.uid, u.hp, u.energy, u.x, u.y, u.alive]);
    checks++;
    if (JSON.stringify(shown) !== JSON.stringify(real)) { mismatches++; console.log("  ✗ desincronía en turno", turns); }
  }
}
await shot("99-final");
console.log("  turnos jugados:", turns);
ok(turns > 0, "se jugaron turnos");
const endTxt = await page.evaluate(() => /Victoria/.test(document.body.textContent) ? "Victoria" : /Derrota/.test(document.body.textContent) ? "Derrota" : "sin resultado");
console.log(`  comprobaciones escena==servidor: ${checks}, desincronías: ${mismatches}, saltos usados: ${skips}`);
ok(checks > 0 && mismatches === 0, "la escena 3D siempre muestra el estado real del servidor (también tras Saltar)");
console.log("  resultado:", endTxt, "· definitivas lanzadas:", ults);
ok(endTxt !== "sin resultado", "la batalla 3D termina con pantalla de resultado");
await browser.close();
process.exit(failures ? 1 : 0);
