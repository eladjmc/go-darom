import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT = path.resolve("docs/07-delivery/visual-qa/m2-hero-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.GO_DAROM_URL || "http://localhost:5174/";

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

async function shotTransition(page, name) {
  await page.locator(".community-section .section-title").scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  // Center the seam: hero bottom + community head
  await page.evaluate(() => {
    const community = document.querySelector(".community-section");
    if (!community) return;
    const y = community.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.45;
    window.scrollTo(0, Math.max(0, y));
  });
  await page.waitForTimeout(80);
  await shot(page, name);
}

const browser = await chromium.launch();
const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "he-IL",
});
const page = await desktop.newPage();
await page.goto(BASE + "?v=qa-fade-1440", { waitUntil: "networkidle" });
await page.waitForSelector(".hero-panel h1");
await shot(page, "desktop-1440.png");
await shotTransition(page, "desktop-1440-transition.png");

await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(200);
await page.evaluate(() => window.scrollTo(0, 0));
await shot(page, "desktop-1920.png");
await shotTransition(page, "desktop-1920-transition.png");
await desktop.close();

for (const [w, h, name] of [
  [360, 800, "mobile-360"],
  [390, 844, "mobile-390"],
  [430, 932, "mobile-430"],
]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
  });
  const p = await ctx.newPage();
  await p.goto(BASE + `?v=qa-fade-${w}`, { waitUntil: "networkidle" });
  await p.waitForSelector(".hero-panel h1");
  await shot(p, `${name}.png`);
  await shotTransition(p, `${name}-transition.png`);
  await ctx.close();
}

await browser.close();
console.log("done", OUT);
