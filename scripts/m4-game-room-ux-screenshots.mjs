/**
 * Screenshots: controls, mobile, DM, scoring+territory, finished result.
 * Usage: WEB_BASE=http://localhost:5173 node scripts/m4-game-room-ux-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.WEB_BASE || "http://localhost:5173";
const OUT = path.join("docs", "07-delivery", "visual-qa", "m4-game-room-ux-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, viewport, scene) {
  const page = await browser.newPage({ viewport, locale: "he-IL" });
  await page.goto(`${BASE}/dev/game-room-smoke?size=13&scene=${scene}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="game-room-smoke"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  await page.close();
  console.log("wrote", name);
}

await shot("desktop-controls", { width: 1280, height: 800 }, "controls");
await shot("mobile-390", { width: 390, height: 844 }, "controls");
await shot("desktop-dm", { width: 1280, height: 800 }, "dm");
await shot("desktop-scoring", { width: 1280, height: 800 }, "scoring");
await shot("desktop-result", { width: 1280, height: 800 }, "result");
await shot("mobile-scoring-390", { width: 390, height: 844 }, "scoring");

await browser.close();
console.log("OK", OUT);
