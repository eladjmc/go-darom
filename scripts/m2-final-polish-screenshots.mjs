import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT = path.resolve("docs/07-delivery/visual-qa/m2-final-polish-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.GO_DAROM_URL || "http://localhost:5174/";

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

const browser = await chromium.launch();

for (const w of [320, 360, 390, 430]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
  });
  const page = await ctx.newPage();
  await page.goto(BASE + `?v=polish-${w}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".hero-secondary-mobile .btn");
  await page.locator(".hero-secondary-mobile").scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await shot(page, `mobile-${w}-hero-ctas.png`);

  const box = await page.locator(".hero-secondary-mobile .btn").boundingBox();
  const clipped =
    !box || box.y < 0 || box.x < 0 || box.y + box.height > 844 || box.x + box.width > w + 1;
  console.log(`cta-${w}`, JSON.stringify(box), clipped ? "CLIPPED?" : "visible");
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "he-IL",
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "?v=polish-nav", { waitUntil: "networkidle" });
  await page.waitForSelector(".primary-nav a.active");
  await shot(page, "desktop-nav-active-home.png");
  await page.locator('.primary-nav a[href="/learn"]').hover();
  await page.waitForTimeout(220);
  await shot(page, "desktop-nav-hover-learn.png");
  await page.locator('.primary-nav a[href="/learn"]').click();
  await page.waitForSelector(".learn-page");
  await page.waitForTimeout(220);
  await shot(page, "desktop-nav-active-learn.png");
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "?v=polish-drawer", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "פתיחת תפריט" }).click();
  await page.waitForSelector(".nav-drawer.is-open");
  await page.waitForTimeout(240);
  await shot(page, "mobile-drawer-open.png");
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "?v=polish-video", { waitUntil: "networkidle" });

  // Open → navigate (animated close) → reopen → X close
  await page.getByRole("button", { name: "פתיחת תפריט" }).click();
  await page.waitForSelector(".nav-drawer.is-open");
  await page.waitForTimeout(350);
  await page.locator('.nav-drawer-nav a[href="/learn"]').click();
  await page.waitForSelector(".learn-page");
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "פתיחת תפריט" }).click();
  await page.waitForSelector(".nav-drawer.is-open");
  await page.waitForTimeout(300);
  await page.locator(".nav-drawer-close").click();
  await page.waitForSelector(".nav-drawer", { state: "detached" });
  await page.waitForTimeout(200);

  const videoPath = await page.video()?.path();
  await page.close();
  await ctx.close();
  if (videoPath && fs.existsSync(videoPath)) {
    const dest = path.join(OUT, "mobile-drawer-open-nav-close.webm");
    fs.renameSync(videoPath, dest);
    console.log("wrote", dest, fs.statSync(dest).size, "bytes");
  }
}

await browser.close();
console.log("done", OUT);
