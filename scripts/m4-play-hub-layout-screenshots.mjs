/**
 * Games Hub layout redesign screenshots (desktop + mobile scenes).
 *
 * Usage (web dev server running):
 *   node scripts/m4-play-hub-layout-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m4-play-hub-layout-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });

const scenes = ["empty", "active", "incoming", "outgoing", "multi", "expired"];

const report = {
  date: new Date().toISOString(),
  web: WEB,
  shots: [],
  errors: [],
};

const browser = await chromium.launch();

async function capture(name, viewport, opts = {}) {
  const context = await browser.newContext({
    viewport,
    locale: "he-IL",
    ...opts,
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => report.errors.push(`${name}: ${err}`));
  const scene = name.includes("empty")
    ? "empty"
    : name.includes("active")
      ? "active"
      : name.includes("incoming")
        ? "incoming"
        : name.includes("outgoing")
          ? "outgoing"
          : name.includes("multi")
            ? "multi"
            : name.includes("expired")
              ? "expired"
              : "empty";
  await page.goto(`${WEB}/dev/play-hub-smoke?scene=${scene}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="play-hub-smoke"]');
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.shots.push({ name, file, viewport });
  await context.close();
}

for (const scene of scenes) {
  await capture(`desktop-1280-${scene}`, { width: 1280, height: 900 });
}
await capture("desktop-1440-empty", { width: 1440, height: 900 });
await capture("desktop-1440-active", { width: 1440, height: 900 });
await capture("desktop-1440-multi", { width: 1440, height: 900 });

for (const scene of ["empty", "active", "incoming", "multi"]) {
  await capture(`mobile-360-${scene}`, { width: 360, height: 740 }, { isMobile: true, hasTouch: true });
  await capture(`mobile-390-${scene}`, { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
}
await capture("mobile-430-multi", { width: 430, height: 900 }, { isMobile: true, hasTouch: true });

await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`Screenshots written to ${OUT}`);
