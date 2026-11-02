/**
 * Screenshots: always-visible game chat under controls.
 * Usage: WEB_BASE=http://localhost:5175 node scripts/m4-game-chat-dock-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.WEB_BASE || "http://localhost:5173";
const OUT = path.join("docs", "07-delivery", "visual-qa", "m4-game-chat-always-2026-11-02");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, viewport) {
  const page = await browser.newPage({ viewport, locale: "he-IL" });
  await page.goto(`${BASE}/dev/game-room-smoke?size=13&scene=dm`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="game-room-smoke"]');
  await page.waitForSelector('[data-testid="game-chat-panel"]');
  await page.waitForSelector('[data-testid="game-chat-log"]');
  await page.waitForTimeout(350);

  // No toggle controls remain
  const toggleCount = await page.locator(".game-chat-toggle").count();
  if (toggleCount !== 0) throw new Error(`${name}: leftover chat toggle UI`);

  const boardBox = await page.locator('[data-testid="board-stage"]').boundingBox();
  if (!boardBox) throw new Error("board missing");
  const topEl = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el ? { testid: el.closest("[data-testid]")?.getAttribute("data-testid") } : null;
    },
    { x: boardBox.x + boardBox.width / 2, y: boardBox.y + boardBox.height / 2 },
  );
  if (topEl?.testid === "game-chat-panel" || topEl?.testid === "game-chat-log") {
    throw new Error(`${name}: chat covers board`);
  }

  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  await page.close();
  console.log("wrote", name);
}

await shot("desktop-always-chat", { width: 1440, height: 900 });
await shot("mobile-always-chat-390", { width: 390, height: 844 });

await browser.close();
console.log("OK", OUT);
