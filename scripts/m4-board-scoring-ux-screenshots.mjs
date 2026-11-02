/**
 * Board coordinates + scoring territory + DM labeling screenshots.
 * Usage: WEB_BASE=http://localhost:5173 node scripts/m4-board-scoring-ux-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.GO_DAROM_URL || process.env.WEB_BASE || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m4-board-scoring-ux-2026-11-02");
fs.mkdirSync(OUT, { recursive: true });

const report = { date: new Date().toISOString(), web: WEB, shots: [], checks: [], errors: [] };
const browser = await chromium.launch();

async function shot(name, url, viewport, opts = {}) {
  const context = await browser.newContext({ viewport, locale: "he-IL", ...opts });
  const page = await context.newPage();
  page.on("pageerror", (err) => report.errors.push(`${name}: ${err}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="snapshot-board"]');
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.shots.push({ name, file, viewport });
  await context.close();
}

async function checkCoords(size) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "he-IL" });
  const page = await context.newPage();
  await page.goto(`${WEB}/dev/game-room-smoke?size=${size}&scene=coords`, { waitUntil: "networkidle" });
  const metrics = await page.evaluate((boardSize) => {
    const coords = document.querySelector('[data-testid="board-coords"]');
    const hasA = Boolean(document.querySelector('[data-testid="coord-col-bottom-A"]'));
    const hasI = Boolean(document.querySelector('[data-testid="coord-col-bottom-I"]'));
    const hasJ = boardSize >= 9 ? Boolean(document.querySelector('[data-testid="coord-col-bottom-J"]')) : true;
    const hasTop = Boolean(document.querySelector(`[data-testid="coord-row-left-${boardSize}"]`));
    const hasOne = Boolean(document.querySelector('[data-testid="coord-row-left-1"]'));
    const terr = document.querySelectorAll('[data-testid^="territory-"]').length;
    return { ok: Boolean(coords) && hasA && !hasI && hasJ && hasTop && hasOne, hasA, hasI, hasJ, hasTop, hasOne, terr };
  }, size);
  report.checks.push({ label: `coords-${size}`, ...metrics });
  if (!metrics.ok) report.errors.push(`coords-${size}: ${JSON.stringify(metrics)}`);
  await page.screenshot({ path: path.join(OUT, `desktop-coords-${size}.png`), fullPage: true });
  report.shots.push({ name: `desktop-coords-${size}`, file: path.join(OUT, `desktop-coords-${size}.png`) });
  await context.close();
}

async function checkScoring() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
  const page = await context.newPage();
  await page.goto(`${WEB}/dev/game-room-smoke?size=13&scene=scoring`, { waitUntil: "networkidle" });
  const metrics = await page.evaluate(() => {
    const phase = document.querySelector('[data-testid="scoring-phase"]');
    const terr = document.querySelectorAll('[data-testid^="territory-"]').length;
    const black = document.querySelectorAll('[data-owner="black"]').length;
    const white = document.querySelectorAll('[data-owner="white"]').length;
    const provisional = document.querySelector('[data-testid="provisional-score"]');
    return {
      ok: Boolean(phase) && terr > 0 && black > 0 && white > 0 && Boolean(provisional),
      terr,
      black,
      white,
    };
  });
  report.checks.push({ label: "scoring-territory", ...metrics });
  if (!metrics.ok) report.errors.push(`scoring: ${JSON.stringify(metrics)}`);
  await page.screenshot({ path: path.join(OUT, "desktop-scoring-territory.png"), fullPage: true });
  report.shots.push({ name: "desktop-scoring-territory", file: path.join(OUT, "desktop-scoring-territory.png") });
  await context.close();
}

async function checkResultAndDm() {
  await shot("desktop-result-territory", `${WEB}/dev/game-room-smoke?size=13&scene=result`, {
    width: 1440,
    height: 900,
  });
  await shot("desktop-dm-labels", `${WEB}/dev/game-room-smoke?size=13&scene=dm`, { width: 1280, height: 800 });
  await shot(
    "mobile-390-scoring",
    `${WEB}/dev/game-room-smoke?size=9&scene=scoring`,
    { width: 390, height: 844 },
    { isMobile: true, hasTouch: true },
  );
  await shot(
    "mobile-360-coords-19",
    `${WEB}/dev/game-room-smoke?size=19&scene=coords`,
    { width: 360, height: 740 },
    { isMobile: true, hasTouch: true },
  );
}

for (const size of [9, 13, 19]) await checkCoords(size);
await checkScoring();
await checkResultAndDm();

await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) {
  process.exitCode = 2;
} else {
  console.log(`Screenshots written to ${OUT}`);
}
