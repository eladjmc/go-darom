/**
 * Screenshots: refined Games Hub + DM invite CTA.
 * Usage: WEB_BASE=http://localhost:5175 node scripts/m4-hub-dm-invite-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.WEB_BASE || "http://localhost:5173";
const OUT = path.join("docs", "07-delivery", "visual-qa", "m4-hub-dm-invite-2026-11-02");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, url, viewport) {
  const page = await browser.newPage({ viewport, locale: "he-IL" });
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  await page.close();
  console.log("wrote", name);
}

await shot("hub-desktop-empty", "/dev/play-hub-smoke?scene=empty", { width: 1280, height: 800 });
await shot("hub-desktop-active", "/dev/play-hub-smoke?scene=active", { width: 1280, height: 800 });
await shot("hub-desktop-multi", "/dev/play-hub-smoke?scene=multi", { width: 1280, height: 800 });
await shot("hub-mobile-390", "/dev/play-hub-smoke?scene=incoming", { width: 390, height: 844 });
await shot("dm-invite-desktop", "/dev/dm-invite-smoke?mode=desktop", { width: 900, height: 640 });
await shot("dm-invite-mobile-390", "/dev/dm-invite-smoke?mode=mobile", { width: 390, height: 700 });

await browser.close();
console.log("OK", OUT);
