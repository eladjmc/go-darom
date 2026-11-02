/**
 * Games Hub + invite modal cohesive UX screenshots + viewport clipping checks.
 *
 * Usage (web dev server running):
 *   node scripts/m4-invite-flow-ux-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m4-invite-flow-ux-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });

const report = {
  date: new Date().toISOString(),
  web: WEB,
  shots: [],
  checks: [],
  errors: [],
};

const browser = await chromium.launch();

async function shot(name, url, viewport, opts = {}) {
  const context = await browser.newContext({
    viewport,
    locale: "he-IL",
    ...opts,
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => report.errors.push(`${name}: ${err}`));
  await page.goto(url, { waitUntil: "networkidle" });
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.shots.push({ name, file, viewport });
  await context.close();
  return file;
}

async function assertModalFullyVisible(label, viewport, scene, extra = {}) {
  const context = await browser.newContext({ viewport, locale: "he-IL", ...extra });
  const page = await context.newPage();
  page.on("pageerror", (err) => report.errors.push(`${label}: ${err}`));
  await page.goto(`${WEB}/dev/invite-flow-smoke?scene=${scene}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="invite-flow-modal"] .play-modal-card');
  const metrics = await page.evaluate(() => {
    const card = document.querySelector(".play-modal-card");
    const header = document.querySelector(".play-modal-header h2");
    const footer = document.querySelector(".play-modal-footer");
    const close = document.querySelector(".play-modal-close");
    if (!card || !header || !footer || !close) return { ok: false, reason: "missing chrome" };
    const cr = card.getBoundingClientRect();
    const hr = header.getBoundingClientRect();
    const fr = footer.getBoundingClientRect();
    const xr = close.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const fullyIn =
      cr.top >= -1 &&
      cr.left >= -1 &&
      cr.bottom <= vh + 1 &&
      cr.right <= vw + 1 &&
      hr.top >= cr.top - 1 &&
      hr.bottom <= vh + 1 &&
      fr.bottom <= vh + 1 &&
      fr.top >= 0 &&
      xr.top >= 0 &&
      xr.bottom <= vh + 1;
    return {
      ok: fullyIn,
      card: { top: cr.top, bottom: cr.bottom, height: cr.height },
      headerBottom: hr.bottom,
      footerTop: fr.top,
      footerBottom: fr.bottom,
      vh,
      vw,
      bodyOverflow: getComputedStyle(document.documentElement).overflow,
    };
  });
  report.checks.push({ label, scene, viewport, ...metrics });
  const file = path.join(OUT, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.shots.push({ name: label, file, viewport });
  await context.close();
  if (!metrics.ok) {
    report.errors.push(`${label}: modal chrome clipped or missing (${JSON.stringify(metrics)})`);
  }
}

// Hub dashboard
for (const [name, vp] of [
  ["desktop-1280-hub-empty", { width: 1280, height: 720 }],
  ["desktop-1440-hub-active", { width: 1440, height: 900 }],
  ["desktop-1920-hub-multi", { width: 1920, height: 1080 }],
]) {
  const scene = name.includes("active") ? "active" : name.includes("multi") ? "multi" : "empty";
  await shot(name, `${WEB}/dev/play-hub-smoke?scene=${scene}`, vp);
}

for (const [name, vp] of [
  ["mobile-360-hub-empty", { width: 360, height: 740 }],
  ["mobile-390-hub-incoming", { width: 390, height: 844 }],
  ["mobile-430-hub-multi", { width: 430, height: 932 }],
]) {
  const scene = name.includes("incoming") ? "incoming" : name.includes("multi") ? "multi" : "empty";
  await shot(name, `${WEB}/dev/play-hub-smoke?scene=${scene}`, vp, { isMobile: true, hasTouch: true });
}

// Invite steps — clipping gates
await assertModalFullyVisible("desktop-1280-invite-pick", { width: 1280, height: 720 }, "pick");
await assertModalFullyVisible("desktop-1440-invite-settings", { width: 1440, height: 900 }, "settings");
await assertModalFullyVisible("desktop-1920-invite-settings", { width: 1920, height: 1080 }, "settings");
await assertModalFullyVisible("mobile-360-invite-pick", { width: 360, height: 740 }, "pick", {
  isMobile: true,
  hasTouch: true,
});
await assertModalFullyVisible("mobile-390-invite-settings", { width: 390, height: 844 }, "settings", {
  isMobile: true,
  hasTouch: true,
});
await assertModalFullyVisible("mobile-430-invite-settings", { width: 430, height: 932 }, "settings", {
  isMobile: true,
  hasTouch: true,
});

// Short viewport + 200% zoom equivalent (deviceScaleFactor 2 with half CSS size isn't zoom;
// use a short height and a page.evaluate zoom via CSS zoom where supported)
await assertModalFullyVisible("short-height-invite-settings", { width: 1280, height: 520 }, "settings");

{
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "he-IL",
  });
  const page = await context.newPage();
  await page.goto(`${WEB}/dev/invite-flow-smoke?scene=settings`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="invite-flow-modal"] .play-modal-card');
  // Simulate browser zoom: CSS zoom + force visualViewport-driven max-height resync.
  await page.evaluate(() => {
    document.documentElement.style.zoom = "200%";
  });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
    window.visualViewport?.dispatchEvent(new Event("resize"));
  });
  await page.waitForTimeout(200);
  const metrics = await page.evaluate(() => {
    const card = document.querySelector(".play-modal-card");
    const header = document.querySelector(".play-modal-header");
    const footer = document.querySelector(".play-modal-footer");
    if (!card || !header || !footer) return { ok: false };
    const cr = card.getBoundingClientRect();
    const hr = header.getBoundingClientRect();
    const fr = footer.getBoundingClientRect();
    const vh = window.innerHeight;
    const body = document.querySelector(".play-modal-body");
    const bodyScrollable = Boolean(body && body.scrollHeight > body.clientHeight + 2);
    const cardFits = cr.top >= -2 && cr.bottom <= vh + 2;
    const headerVisible = hr.top >= -2 && hr.bottom <= vh + 2;
    const footerVisible = fr.top >= -2 && fr.bottom <= vh + 2;
    return {
      ok: cardFits && headerVisible && footerVisible,
      headerVisible,
      footerVisible,
      bodyScrollable,
      cardTop: cr.top,
      cardBottom: cr.bottom,
      cardHeight: cr.height,
      vh,
    };
  });
  report.checks.push({ label: "zoom-200-settings", ...metrics });
  await page.screenshot({ path: path.join(OUT, "zoom-200-invite-settings.png"), fullPage: false });
  report.shots.push({ name: "zoom-200-invite-settings", file: path.join(OUT, "zoom-200-invite-settings.png") });
  if (!metrics.ok) report.errors.push(`zoom-200: ${JSON.stringify(metrics)}`);
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) {
  console.error("Invite flow UX smoke failed");
  process.exitCode = 2;
} else {
  console.log(`Screenshots written to ${OUT}`);
}
