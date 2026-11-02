/**
 * Desktop + mobile screenshots: controls, undo request, error toast, DM panel.
 * Usage: WEB_BASE=http://localhost:5173 node scripts/m4-game-controls-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.WEB_BASE || "http://localhost:5173";
const OUT = path.join("docs", "07-delivery", "visual-qa", "m4-game-controls-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, viewport, scene) {
  const page = await browser.newPage({ viewport, locale: "he-IL" });
  await page.goto(`${BASE}/dev/game-room-smoke?size=13&scene=${scene}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="game-room-smoke"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  await page.close();
  console.log("wrote", name);
}

await shot("desktop-controls", { width: 1280, height: 800 }, "controls");
await shot("desktop-undo", { width: 1280, height: 800 }, "undo");
await shot("desktop-toast", { width: 1280, height: 800 }, "toast");
await shot("desktop-dm", { width: 1280, height: 800 }, "dm");
await shot("mobile-controls-390", { width: 390, height: 844 }, "controls");
await shot("mobile-undo-390", { width: 390, height: 844 }, "undo");
await shot("mobile-toast-390", { width: 390, height: 844 }, "toast");
await shot("mobile-dm-390", { width: 390, height: 844 }, "dm");

await browser.close();
console.log("OK", OUT);
