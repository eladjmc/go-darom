/**
 * Real Chromium smoke: SnapshotBoard grid+stones visible; square aspect; mobile widths.
 * Usage: node scripts/m4-board-render-smoke.mjs
 * Requires: npm run dev:web (default http://127.0.0.1:5173)
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.WEB_BASE || "http://localhost:5173";
const OUT = path.join("docs", "07-delivery", "visual-qa", "m4-board-render-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });

function assertSquare(box, label) {
  if (!box) throw new Error(`${label}: missing box`);
  const ratio = box.width / box.height;
  if (Math.abs(ratio - 1) > 0.06) {
    throw new Error(`${label}: not square (${box.width.toFixed(1)}×${box.height.toFixed(1)}, ratio=${ratio.toFixed(3)})`);
  }
}

async function sampleBoardPixels(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid="snapshot-board"]');
    if (!svg) return { ok: false, reason: "no svg" };
    const lines = svg.querySelectorAll("line").length;
    const stones = svg.querySelectorAll('[data-testid^="stone-"]').length;
    const rect = svg.getBoundingClientRect();
    // Rasterize via canvas to prove wood + ink (not flat transparent)
    const c = document.createElement("canvas");
    c.width = Math.max(2, Math.floor(rect.width));
    c.height = Math.max(2, Math.floor(rect.height));
    const ctx = c.getContext("2d");
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    return new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const mid = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
        // Inside rounded wood (avoid transparent outside rx)
        const inset = Math.max(12, Math.floor(Math.min(c.width, c.height) * 0.08));
        const corner = ctx.getImageData(inset, inset, 1, 1).data;
        resolve({
          ok: true,
          lines,
          stones,
          width: rect.width,
          height: rect.height,
          mid: [...mid],
          corner: [...corner],
        });
      };
      img.onerror = () => resolve({ ok: false, reason: "svg raster fail", lines, stones });
      img.src = url;
    });
  });
}

const browser = await chromium.launch();
const failures = [];

async function check(size, viewport, name) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/dev/game-room-smoke?size=${size}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="snapshot-board"]');
  const stage = await page.locator('[data-testid="board-stage"]').boundingBox();
  const board = await page.locator('[data-testid="snapshot-board"]').boundingBox();
  try {
    assertSquare(stage, `${name} stage`);
    assertSquare(board, `${name} board`);
    if (board.width > viewport.width + 2) {
      throw new Error(`${name}: horizontal overflow (${board.width} > ${viewport.width})`);
    }
    const sample = await sampleBoardPixels(page);
    if (!sample.ok) throw new Error(`${name}: ${sample.reason}`);
    if (sample.lines < size * 2) throw new Error(`${name}: expected ${size * 2} lines, got ${sample.lines}`);
    if (sample.stones < 2) throw new Error(`${name}: expected stones, got ${sample.stones}`);
    // Wood mid should not be fully transparent
    if (sample.mid[3] < 200) throw new Error(`${name}: mid pixel transparent ${sample.mid}`);
    // Corner wood-ish (not pure cream page bleed alone — alpha opaque)
    if (sample.corner[3] < 200) throw new Error(`${name}: corner transparent`);
    console.log("OK", name, {
      stage: `${stage.width.toFixed(0)}×${stage.height.toFixed(0)}`,
      stones: sample.stones,
      lines: sample.lines,
    });
  } catch (e) {
    failures.push(String(e.message || e));
    console.error("FAIL", name, e.message || e);
  }
  const shot = path.join(OUT, `${name}.png`);
  await page.locator('[data-testid="board-stage"]').screenshot({ path: shot });
  await page.close();
}

try {
  for (const size of [9, 13, 19]) {
    await check(size, { width: 1280, height: 800 }, `desktop-${size}`);
  }
  for (const w of [320, 360, 390, 430]) {
    await check(9, { width: w, height: 740 }, `mobile-${w}-9`);
    await check(19, { width: w, height: 740 }, `mobile-${w}-19`);
  }

  // Interaction: click empty intersection fires (smoke page has interactive board)
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE}/dev/game-room-smoke?size=9`, { waitUntil: "networkidle" });
    await page.click('[data-testid="intersection-0-0"]');
    await page.screenshot({ path: path.join(OUT, "desktop-9-after-click.png"), fullPage: true });
    await page.close();
  }

  // Mobile orientation change
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 740 } });
    await page.goto(`${BASE}/dev/game-room-smoke?size=19`, { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 740, height: 390 });
    await page.waitForTimeout(200);
    const board = await page.locator('[data-testid="snapshot-board"]').boundingBox();
    try {
      assertSquare(board, "rotated-19");
      console.log("OK rotated-19", `${board.width.toFixed(0)}×${board.height.toFixed(0)}`);
    } catch (e) {
      failures.push(String(e.message || e));
      console.error("FAIL rotated-19", e.message || e);
    }
    await page.screenshot({ path: path.join(OUT, "mobile-rotated-19.png"), fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("\nBoard render smoke FAILED:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("\nBoard render smoke PASSED. Screenshots:", OUT);
