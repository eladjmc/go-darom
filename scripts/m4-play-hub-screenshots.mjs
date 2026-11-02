/**
 * M4 Game Hub UX screenshots (stub auth).
 * Requires: npm run dev:api + npm run dev:web, IDENTITY_DEV_STUB=true
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: path.resolve(".env") });

const API = process.env.GO_DAROM_API || "http://localhost:4000";
const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m4-play-hub-2026-10-30");
fs.mkdirSync(OUT, { recursive: true });

async function api(token, method, urlPath, body) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function ensureUser(stubId, nickname) {
  const token = `stub:${stubId}`;
  let me = await api(token, "GET", "/me");
  if (!me.onboardingCompleted) {
    me = await api(token, "PATCH", "/me", { nickname, completeOnboarding: true });
  }
  return { token, me, stubId };
}

const a = await ensureUser("m4_hub_alice", "אליסמשחק");
const b = await ensureUser("m4_hub_bob", "בובמשחק");

// Presence: open sockets so accept/invite online checks can pass later
const browser = await chromium.launch();

async function withPage(stubId, viewport, fn) {
  const ctx = await browser.newContext({
    viewport,
    locale: "he-IL",
    isMobile: viewport.width < 500,
    hasTouch: viewport.width < 500,
  });
  await ctx.addInitScript((id) => {
    sessionStorage.setItem("go_darom_dev_stub_token", `stub:${id}`);
  }, stubId);
  const page = await ctx.newPage();
  await fn(page);
  await ctx.close();
}

// Empty hub
await withPage(a.stubId, { width: 1280, height: 900 }, async (page) => {
  await page.goto(`${WEB}/play`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=הזמנת חבר למשחק");
  await page.screenshot({ path: path.join(OUT, "01-desktop-hub-empty.png"), fullPage: true });
});

await withPage(a.stubId, { width: 390, height: 844 }, async (page) => {
  await page.goto(`${WEB}/play`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=הזמנת חבר למשחק");
  await page.screenshot({ path: path.join(OUT, "02-mobile-hub-empty.png"), fullPage: true });
});

// Keep B online in background while A invites
const bCtx = await browser.newContext({ viewport: { width: 800, height: 600 }, locale: "he-IL" });
await bCtx.addInitScript((id) => {
  sessionStorage.setItem("go_darom_dev_stub_token", `stub:${id}`);
}, b.stubId);
const bPage = await bCtx.newPage();
await bPage.goto(`${WEB}/community`, { waitUntil: "networkidle" });

await withPage(a.stubId, { width: 1280, height: 900 }, async (page) => {
  await page.goto(`${WEB}/play`, { waitUntil: "networkidle" });
  await page.click("text=הזמנת חבר למשחק");
  await page.waitForSelector("text=בחירת יריב");
  // Prefer online-only list; wait for Bob
  await page.waitForTimeout(800);
  const choose = page.getByRole("button", { name: "בחירה" }).first();
  if (await choose.count()) {
    await choose.click();
  } else {
    // Toggle offline filter if needed
    await page.locator(".toggle-switch input").click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "בחירה" }).first().click();
  }
  await page.waitForSelector("text=הזמנת");
  await page.screenshot({ path: path.join(OUT, "03-desktop-invite-settings.png"), fullPage: true });
  await page.getByRole("button", { name: "שליחת הזמנה" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "04-desktop-hub-outgoing.png"), fullPage: true });
});

await withPage(b.stubId, { width: 1280, height: 900 }, async (page) => {
  await page.goto(`${WEB}/play`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "05-desktop-hub-incoming.png"), fullPage: true });
  const accept = page.getByRole("button", { name: "קבלה" }).first();
  if (await accept.count()) {
    await accept.click();
    await page.waitForURL(/\/play\//);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, "06-desktop-active-room.png"), fullPage: true });
  }
});

await withPage(a.stubId, { width: 1280, height: 900 }, async (page) => {
  await page.goto(`${WEB}/play`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "07-desktop-hub-active.png"), fullPage: true });
});

await withPage(a.stubId, { width: 390, height: 844 }, async (page) => {
  await page.goto(`${WEB}/play`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "08-mobile-hub-active.png"), fullPage: true });
});

await bCtx.close();
await browser.close();
console.log(`Screenshots written to ${OUT}`);
