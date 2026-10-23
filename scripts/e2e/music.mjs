// E2E de música: continuidad del menú, pista de combate separada, volumen y silencio.
//   GAME_URL=http://localhost:3000 E2E_TOOLS=/ruta/a/tools node scripts/e2e/music.mjs
import { launch, sleep, clickText } from "./browser.mjs";
const URL = process.env.GAME_URL || "http://localhost:3000/";
let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.error("✗ " + m); } else console.log("✓ " + m); };
const { browser, page } = await launch();
const dbg = () => page.evaluate(() => window.__nexusAudio.debug());

await page.goto(URL, { waitUntil: "networkidle2" });
await page.waitForFunction(() => !!window.__nexusAudio);
let d = await dbg();
ok(d.desired === "menu" && !d.unlocked, "antes del primer gesto: música del menú pendiente (política de autoplay)");

await page.mouse.click(200, 400); // primer gesto
await sleep(1500);
d = await dbg();
ok(d.ctx === "running" && d.track === "menu" && d.menuPlaying, `tras el primer gesto suena la pista de inicio (ctx=${d.ctx})`);
ok(!d.battlePlaying, "la pista de combate NO suena en la pantalla de login");
const s1 = d.steps.menu;
ok(s1 > 3, `el secuenciador avanza (pasos=${s1})`);

// registro por la UI real
const user = "mus" + Math.random().toString(36).slice(2, 8);
await clickText(page, "Crear cuenta");
await page.type('input[placeholder="Tu nombre de invocador"]', user);
await page.type('input[type="password"]', "secret123");
await clickText(page, "Comenzar aventura");
await page.waitForFunction(() => document.body.textContent.includes("Centro de mando"), { timeout: 20000 });
await sleep(500);
d = await dbg();
ok(d.track === "menu" && d.starts.menu === 1, `al entrar al menú la música NO se reinicia (starts.menu=${d.starts.menu})`);
ok(d.steps.menu > s1, `…y continúa donde iba (pasos ${s1} → ${d.steps.menu})`);

// navegación por todas las pestañas inferiores
let last = d.steps.menu;
for (const label of ["Historia", "AFK", "Invocar", "Álbum", "Equipo", "Inicio"]) {
  await page.evaluate((l) => { const b = [...document.querySelectorAll("nav button")].find((x) => x.textContent.includes(l)); b && b.click(); }, label);
  await sleep(350);
  d = await dbg();
  ok(d.starts.menu === 1 && d.track === "menu" && d.steps.menu >= last, `navegar a «${label}» no reinicia la música (starts=${d.starts.menu}, pasos=${d.steps.menu})`);
  last = d.steps.menu;
}

// combate: cambio de pista
await page.evaluate(() => window.__nexusAudio.playMusic("battle"));
await sleep(900);
d = await dbg();
ok(d.track === "battle" && d.battlePlaying, "entrar en combate activa la pista de combate");
ok(d.gains.menu < 0.05, `el menú queda fundido a silencio (ganancia ${d.gains.menu.toFixed(3)})`);
await page.evaluate(() => window.__nexusAudio.playMusic("battle"));
d = await dbg();
ok(d.starts.battle === 1, "pedir de nuevo la pista de combate no la reinicia");
const stepsLeave = d.steps.menu;
await page.evaluate(() => window.__nexusAudio.playMusic("menu"));
await sleep(900);
d = await dbg();
ok(d.track === "menu" && d.menuPlaying && !d.battlePlaying, "al salir del combate se restaura la música del menú y se detiene la de combate");
ok(d.steps.menu >= stepsLeave, `el menú REANUDA su secuencia (pasos ${stepsLeave} → ${d.steps.menu}, no vuelve a 0)`);
ok(d.gains.battle < 0.05 && d.gains.menu > 0.9, "sólo una pista audible (sin superposición)");

// cambios rápidos de escena no dejan pistas colgadas
for (let i = 0; i < 6; i++) { await page.evaluate((i) => window.__nexusAudio.playMusic(i % 2 ? "menu" : "battle"), i); await sleep(60); }
await page.evaluate(() => window.__nexusAudio.playMusic("menu"));
await sleep(900);
d = await dbg();
ok(d.track === "menu" && !d.battlePlaying && d.gains.battle < 0.05, "conmutaciones rápidas: queda únicamente el menú");

// volumen y silencio
await page.evaluate(() => window.__nexusAudio.setMuted(true));
d = await dbg();
ok(d.muted && d.prefs.muted, "silencio activado");
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("legendia_audio_v1")));
ok(stored && stored.muted === true, "el silencio se persiste en localStorage");
await page.evaluate(async () => {
  window.__nexusAudio.setMuted(false); window.__nexusAudio.setVolumes(0.3, 0.2);
  // lo mismo que hace la pantalla de Ajustes: guardar también en la cuenta
  await fetch("/api/game/settings", { method: "POST", headers: { "Content-Type": "application/json",
    Authorization: "Bearer " + localStorage.getItem("legendia_token") }, body: JSON.stringify({ music: 0.3, sfx: 0.2, muted: false }) });
});
await page.reload({ waitUntil: "networkidle2" });
await page.waitForFunction(() => !!window.__nexusAudio);
d = await dbg();
ok(Math.abs(d.prefs.music - 0.3) < 1e-6 && Math.abs(d.prefs.sfx - 0.2) < 1e-6, "los volúmenes sobreviven a recargar la página");

// ocultar pestaña (móvil): suspende y reanuda
await page.mouse.click(200, 400); await sleep(600);
await page.evaluate(() => { Object.defineProperty(document, "hidden", { value: true, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
await sleep(300);
d = await dbg();
ok(d.ctx === "suspended", "al ocultar la pestaña el audio se suspende");
await page.evaluate(() => { Object.defineProperty(document, "hidden", { value: false, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
await sleep(500);
d = await dbg();
ok(d.ctx === "running", "al volver a la pestaña el audio se reanuda");

await browser.close();
if (failures) { console.error(`\n${failures} fallo(s)`); process.exit(1); }
console.log("\nMÚSICA OK");
