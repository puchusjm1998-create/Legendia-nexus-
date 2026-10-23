// E2E: el modo "2D clásico" y el botón de velocidad/saltar siguen funcionando.
//   GAME_URL=... E2E_TOOLS=... node scripts/e2e/battle2d.mjs
import { launch, sleep, clickText } from "./browser.mjs";
const BASE = process.env.GAME_URL || "http://localhost:3000";
let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.error("✗ " + m); } else console.log("✓ " + m); };
const api = async (path, token, body) => {
  const res = await fetch(`${BASE}/api/${path}`, { method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: res.status, data: await res.json() };
};
const reg = await api("auth/register", null, { username: "b2d" + Math.random().toString(36).slice(2, 8), password: "secret123" });
const token = reg.data.token;
await api("battle/start", token, { missionId: "c1-1", teamIndex: 0 });
const { browser, page } = await launch({ width: 420, height: 800 });
await page.goto(BASE, { waitUntil: "networkidle2" });
await page.evaluate((t) => { localStorage.setItem("legendia_token", t); localStorage.setItem("legendia_combat_v1", JSON.stringify({ animSpeed: 2, skipUlt: false, quality: "2d" })); }, token);
await page.reload({ waitUntil: "networkidle2" });
await page.waitForFunction(() => document.body.textContent.includes("Centro de mando"), { timeout: 30000 });
await page.mouse.click(10, 10);
await clickText(page, "Batalla en curso");
await page.waitForFunction(() => document.body.textContent.includes("Tu turno"), { timeout: 30000 });
const r = await page.evaluate(() => ({ stage: !!window.__nexusStage, cells: document.querySelectorAll(".grid-cell").length, canvas: !!document.querySelector("canvas") }));
ok(!r.stage && r.cells === 35 && !r.canvas, `modo 2D clásico activo (celdas=${r.cells}, sin canvas 3D)`);
await clickText(page, "Esperar");
await page.waitForFunction(() => document.body.textContent.includes("Tu turno"), { timeout: 30000 });
ok(true, "el turno se resuelve y vuelve al jugador en 2D");
await browser.close();
process.exit(failures ? 1 : 0);
