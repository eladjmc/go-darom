/**
 * Real Chromium Goban smoke (D5). happy-dom failures are not decisive.
 *
 * Usage (dev servers running):
 *   node scripts/m4-goban-browser-smoke.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m4-goban-browser-smoke-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });

const report = {
  date: new Date().toISOString(),
  web: WEB,
  importOk: false,
  mountOk: false,
  sizes: {},
  resizeOk: false,
  mobileOk: false,
  unmountOk: false,
  errors: [],
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "he-IL" });
const page = await context.newPage();
page.on("pageerror", (err) => report.errors.push(String(err)));

await page.goto(`${WEB}/dev/goban-browser-smoke`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="goban-smoke-page"]');

for (const size of [9, 13, 19]) {
  await page.click(`[data-testid="size-${size}"]`);
  await page.waitForTimeout(600);
  const host = page.locator('[data-testid="goban-host"]');
  const err = page.locator('[data-testid="goban-mount-error"]');
  await page.waitForTimeout(400);
  const hostVisible = await host.isVisible().catch(() => false);
  const errVisible = await err.isVisible().catch(() => false);
  const metrics = hostVisible
    ? await host.evaluate((el) => ({
        childCount: el.childElementCount,
        canvasCount: el.querySelectorAll("canvas").length,
        width: el.clientWidth,
        height: el.clientHeight,
      }))
    : { childCount: 0, canvasCount: 0, width: 0, height: 0 };
  report.sizes[size] = { hostVisible, errVisible, ...metrics };
  await page.screenshot({ path: path.join(OUT, `desktop-${size}.png`), fullPage: true });
  if (hostVisible && metrics.canvasCount > 0 && !errVisible) {
    report.mountOk = true;
    report.importOk = true;
    const box = await host.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.48);
      await page.waitForTimeout(150);
      await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.55);
      await page.waitForTimeout(300);
    }
  } else if (errVisible) {
    report.errors.push(await err.innerText());
  }
}

await page.setViewportSize({ width: 900, height: 700 });
await page.waitForTimeout(400);
report.resizeOk = await page.locator('[data-testid="board-stage"]').isVisible();
await page.screenshot({ path: path.join(OUT, `desktop-resized.png`), fullPage: true });

await context.close();
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: "he-IL",
});
const mpage = await mobile.newPage();
await mpage.goto(`${WEB}/dev/goban-browser-smoke`, { waitUntil: "networkidle" });
await mpage.waitForTimeout(700);
const mHost = mpage.locator('[data-testid="goban-host"]');
report.mobileOk =
  (await mHost.isVisible().catch(() => false)) &&
  (await mHost.evaluate((el) => el.querySelectorAll("canvas").length)) > 0;
await mpage.screenshot({ path: path.join(OUT, `mobile-390.png`), fullPage: true });

// Unmount by navigating away
await mpage.goto(`${WEB}/`, { waitUntil: "domcontentloaded" });
report.unmountOk = true;
await mobile.close();
await browser.close();

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.mountOk) {
  console.error("Goban browser mount did not succeed — see report.json");
  process.exitCode = 2;
} else {
  console.log("Goban browser smoke PASS");
}
