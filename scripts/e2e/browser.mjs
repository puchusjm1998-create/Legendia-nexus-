// Utilidad para las pruebas end-to-end con navegador real (Chromium headless + WebGL por software).
// Requiere (fuera del proyecto, no se añaden a package.json):
//   npm i puppeteer-core @sparticuz/chromium      (o define CHROME_PATH apuntando a un Chrome/Chromium)
// Uso: import { launch } from "./browser.mjs"
import { createRequire } from "node:module";
const require = createRequire(process.env.E2E_TOOLS ? process.env.E2E_TOOLS + "/" : import.meta.url);

export async function launch({ width = 420, height = 800 } = {}) {
  const puppeteer = require("puppeteer-core");
  let executablePath = process.env.CHROME_PATH;
  let extra = [];
  if (!executablePath) {
    process.env.AWS_EXECUTION_ENV ||= "AWS_Lambda_nodejs20.x";
    const chromium = require("@sparticuz/chromium").default || require("@sparticuz/chromium");
    executablePath = await chromium.executablePath();
    extra = chromium.args;
  }
  const browser = await puppeteer.launch({
    executablePath, headless: "shell",
    args: [...extra, "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 700, hasTouch: width < 700 });
  const logs = [];
  page.on("console", (m) => { const t = m.text(); logs.push(t); if (/error|warn/i.test(m.type())) console.log("  [console." + m.type() + "]", t.slice(0, 300)); });
  page.on("pageerror", (e) => { logs.push("PAGEERROR " + e.message); console.log("  [pageerror]", e.message.slice(0, 300)); });
  return { browser, page, logs };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function clickText(page, text, sel = "button") {
  const ok = await page.evaluate((text, sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent && e.textContent.includes(text) && !e.disabled);
    if (el) { el.click(); return true; }
    return false;
  }, text, sel);
  if (!ok) throw new Error("No se encontró el botón: " + text);
}
