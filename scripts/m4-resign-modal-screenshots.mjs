/**
 * Surrender confirmation modal visual QA.
 *
 * Usage (web dev server running):
 *   node scripts/m4-resign-modal-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m4-resign-modal-2026-11-02");
fs.mkdirSync(OUT, { recursive: true });

const report = {
  date: new Date().toISOString(),
  web: WEB,
  shots: [],
  checks: [],
  errors: [],
};

const browser = await chromium.launch();

async function openResign(page, scene) {
  await page.goto(`${WEB}/dev/game-room-smoke?scene=${scene}&size=13`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="resign-confirm-modal"] .play-modal-card');
}

async function shotViewport(name, scene, viewport, opts = {}, interact) {
  const context = await browser.newContext({ viewport, locale: "he-IL", ...opts });
  const page = await context.newPage();
  page.on("pageerror", (err) => report.errors.push(`${name}: ${err}`));
  await openResign(page, scene);
  if (interact) await interact(page);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.shots.push({ name, file, viewport, scene });
  await context.close();
}

async function assertModalChrome(label, scene, viewport, opts = {}) {
  const context = await browser.newContext({ viewport, locale: "he-IL", ...opts });
  const page = await context.newPage();
  page.on("pageerror", (err) => report.errors.push(`${label}: ${err}`));
  await openResign(page, scene);
  const metrics = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="resign-confirm-modal"]');
    const card = root?.querySelector(".play-modal-card");
    const dialog = root?.querySelector('[role="dialog"][aria-modal="true"]');
    const header = root?.querySelector(".play-modal-header h2");
    const footer = root?.querySelector(".play-modal-footer");
    if (!card || !dialog || !header || !footer) return { ok: false, reason: "missing chrome" };
    const cr = card.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const fullyIn =
      cr.top >= -1 && cr.left >= -1 && cr.bottom <= vh + 1 && cr.right <= vw + 1;
    return {
      ok: fullyIn,
      title: header.textContent?.trim(),
      ariaModal: dialog.getAttribute("aria-modal"),
      card: { top: cr.top, bottom: cr.bottom, width: cr.width, height: cr.height },
      vh,
      vw,
    };
  });
  report.checks.push({ label, scene, viewport, ...metrics });
  if (!metrics.ok) report.errors.push(`${label}: modal clipped or incomplete (${JSON.stringify(metrics)})`);
  await context.close();
}

await shotViewport("desktop-default", "resign", { width: 1280, height: 720 });
await shotViewport("desktop-focus-cancel", "resign", { width: 1280, height: 720 }, {}, async (page) => {
  await page.locator('.play-resign-modal .btn-secondary').focus();
});
await shotViewport("desktop-hover-confirm", "resign", { width: 1280, height: 720 }, {}, async (page) => {
  const btn = page.locator(".play-resign-modal .play-btn-danger");
  await btn.hover();
  await btn.focus();
});
await shotViewport("desktop-loading", "resign-busy", { width: 1280, height: 720 });
await shotViewport("mobile-default", "resign", { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
await shotViewport("mobile-loading", "resign-busy", { width: 390, height: 844 }, { isMobile: true, hasTouch: true });

await assertModalChrome("check-desktop-chrome", "resign", { width: 1280, height: 720 });
await assertModalChrome("check-mobile-chrome", "resign", { width: 390, height: 844 }, {
  isMobile: true,
  hasTouch: true,
});

await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ out: OUT, shots: report.shots.length, errors: report.errors }, null, 2));
if (report.errors.length) process.exit(1);
