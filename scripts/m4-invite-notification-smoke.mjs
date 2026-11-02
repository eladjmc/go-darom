/**
 * Desktop + mobile screenshots for actionable Live invite notification UX.
 *
 * Usage (web dev server running):
 *   node scripts/m4-invite-notification-smoke.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m4-invite-notification-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });

const report = {
  date: new Date().toISOString(),
  web: WEB,
  desktopOk: false,
  mobileOk: false,
  errors: [],
};

const browser = await chromium.launch();

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: "he-IL",
});
const dpage = await desktop.newPage();
dpage.on("pageerror", (err) => report.errors.push(`desktop: ${err}`));
await dpage.goto(`${WEB}/dev/invite-notification-smoke`, { waitUntil: "networkidle" });
await dpage.waitForSelector('[data-testid="game-invite-card"]');
report.desktopOk = await dpage.locator('[data-testid="game-invite-card"]').isVisible();
await dpage.screenshot({ path: path.join(OUT, "desktop-1280.png"), fullPage: true });
await desktop.close();

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: "he-IL",
});
const mpage = await mobile.newPage();
mpage.on("pageerror", (err) => report.errors.push(`mobile: ${err}`));
await mpage.goto(`${WEB}/dev/invite-notification-smoke`, { waitUntil: "networkidle" });
await mpage.waitForSelector('[data-testid="game-invite-card"]');
report.mobileOk = await mpage.locator('[data-testid="game-invite-card"]').isVisible();
await mpage.screenshot({ path: path.join(OUT, "mobile-390.png"), fullPage: true });
await mobile.close();

await browser.close();

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.desktopOk || !report.mobileOk) {
  console.error("Invite notification smoke failed");
  process.exitCode = 2;
} else {
  console.log(`Screenshots written to ${OUT}`);
}
