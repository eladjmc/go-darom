/**
 * Personal history + private replay visual QA.
 *
 * Usage (web dev server running):
 *   GO_DAROM_URL=http://localhost:5175 node scripts/m4-history-replay-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m4-history-replay-2026-11-02");
fs.mkdirSync(OUT, { recursive: true });

const report = { date: new Date().toISOString(), web: WEB, shots: [], errors: [] };
const browser = await chromium.launch();

async function shot(name, url, viewport, opts = {}) {
  const context = await browser.newContext({ viewport, locale: "he-IL", ...opts });
  const page = await context.newPage();
  page.on("pageerror", (err) => report.errors.push(`${name}: ${err}`));
  await page.goto(url, { waitUntil: "networkidle" });
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.shots.push({ name, file, viewport });
  await context.close();
}

await shot("desktop-hub-history", `${WEB}/dev/play-hub-smoke?scene=empty`, { width: 1280, height: 900 });
await shot("desktop-replay", `${WEB}/dev/game-room-smoke?scene=replay&size=13`, { width: 1280, height: 800 });
await shot(
  "mobile-hub-history",
  `${WEB}/dev/play-hub-smoke?scene=empty`,
  { width: 390, height: 844 },
  { isMobile: true, hasTouch: true },
);
await shot(
  "mobile-replay",
  `${WEB}/dev/game-room-smoke?scene=replay&size=13`,
  { width: 390, height: 844 },
  { isMobile: true, hasTouch: true },
);

await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ out: OUT, shots: report.shots.length, errors: report.errors }, null, 2));
if (report.errors.length) process.exit(1);
