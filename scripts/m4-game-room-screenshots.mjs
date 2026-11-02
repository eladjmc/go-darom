/**
 * Game room layout screenshots (desktop + mobile).
 * Usage: node scripts/m4-game-room-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m4-game-room-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });

const report = { date: new Date().toISOString(), web: WEB, shots: [], errors: [] };
const browser = await chromium.launch();

async function shot(name, viewport, opts = {}) {
  const ctx = await browser.newContext({
    viewport,
    locale: "he-IL",
    ...opts,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => report.errors.push(`${name}: ${err}`));
  await page.goto(`${WEB}/dev/game-room-smoke`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="game-room-smoke"]');
  await page.waitForTimeout(400);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.shots.push(name);
  await ctx.close();
}

await shot("desktop-1280x720", { width: 1280, height: 720 });
await shot("desktop-1440x900", { width: 1440, height: 900 });
await shot("desktop-1920x1080", { width: 1920, height: 1080 });
await shot("mobile-360", { width: 360, height: 740 }, { isMobile: true, hasTouch: true });
await shot("mobile-390", { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
await shot("mobile-430", { width: 430, height: 932 }, { isMobile: true, hasTouch: true });

await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
