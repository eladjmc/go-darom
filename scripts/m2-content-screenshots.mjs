import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT = path.resolve("docs/07-delivery/visual-qa/m2-content-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.GO_DAROM_URL || "http://localhost:5174/";

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

async function scrollTo(page, selector) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
}

const browser = await chromium.launch();

async function withViewport(width, height, isMobile, run) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    isMobile,
    hasTouch: isMobile,
    locale: "he-IL",
  });
  const page = await ctx.newPage();
  await run(page);
  await ctx.close();
}

await withViewport(1440, 900, false, async (page) => {
  await page.goto(BASE + "?v=content-d", { waitUntil: "networkidle" });
  await page.waitForSelector(".feature-grid");
  await scrollTo(page, ".community-section");
  await shot(page, "desktop-features.png");
  await scrollTo(page, ".home-teasers");
  await shot(page, "desktop-teasers.png");
  await scrollTo(page, ".site-footer");
  await shot(page, "desktop-footer.png");
  await page.goto(BASE + "learn?v=content-d", { waitUntil: "networkidle" });
  await page.waitForSelector(".learn-page");
  await shot(page, "desktop-learn.png");
});

await withViewport(390, 844, true, async (page) => {
  await page.goto(BASE + "?v=content-m", { waitUntil: "networkidle" });
  await page.waitForSelector(".feature-grid");
  await scrollTo(page, ".community-section");
  await shot(page, "mobile-features.png");
  await scrollTo(page, ".home-teasers");
  await shot(page, "mobile-teasers.png");
  await scrollTo(page, ".site-footer");
  await shot(page, "mobile-footer.png");
  await page.goto(BASE + "learn?v=content-m", { waitUntil: "networkidle" });
  await page.waitForSelector(".learn-page");
  await shot(page, "mobile-learn.png");
});

await browser.close();
console.log("done", OUT);
