/**
 * Screenshots for M3 stability/alignment/members fixes (dev stub).
 * Temporarily requires stub auth OR an already-onboarded stub session from verify script users.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const API = process.env.GO_DAROM_API || "http://localhost:4000";
const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m3-fixes-2026-10-30");
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
  return { token, me };
}

const health = await fetch(`${API}/health`).then((r) => r.json()).catch(() => null);
if (!health || health.status !== "ok") {
  console.error("API not healthy — start npm run dev:api first");
  process.exit(1);
}

// Detect stub mode
let stubOk = false;
try {
  await ensureUser("m3_fix_alice", "אליסגו");
  stubOk = true;
} catch (e) {
  console.error("Stub auth unavailable (IDENTITY_DEV_STUB must be true for this script):", e.message);
  process.exit(1);
}

const a = await ensureUser("m3_fix_alice", "אליסגו");
const b = await ensureUser("m3_fix_bob", "בובגו");
await api(a.token, "POST", "/chat/community/messages", {
  body: "הודעת יישור — שלי כשולח",
  clientCommandId: crypto.randomUUID(),
});
const open = await api(a.token, "POST", "/dms/threads", { peerUserId: b.me.id });
await api(a.token, "POST", `/dms/threads/${open.threadId}/messages`, {
  body: "DM ליישור",
  clientCommandId: crypto.randomUUID(),
});
await api(b.token, "POST", `/dms/threads/${open.threadId}/messages`, {
  body: "תשובה שלי ב-DM",
  clientCommandId: crypto.randomUUID(),
});

const browser = await chromium.launch();

async function shot(stubId, viewport, name, pathUrl) {
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
  await page.goto(`${WEB}${pathUrl}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  await ctx.close();
  console.log("wrote", name);
}

try {
  await shot("m3_fix_bob", { width: 1440, height: 900 }, "desktop-community-chat.png", "/community");
  await shot("m3_fix_bob", { width: 1440, height: 900 }, "desktop-dm-conversation.png", `/dms/${open.threadId}`);
  // members tab
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
    await ctx.addInitScript(() => {
      sessionStorage.setItem("go_darom_dev_stub_token", "stub:m3_fix_bob");
    });
    const page = await ctx.newPage();
    await page.goto(`${WEB}/community`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "חברים" }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, "desktop-members.png"), fullPage: false });
    await ctx.close();
    console.log("wrote desktop-members.png");
  }
  await shot("m3_fix_bob", { width: 390, height: 844 }, "mobile-community-chat.png", "/community");
  await shot("m3_fix_bob", { width: 390, height: 844 }, "mobile-dm-conversation.png", `/dms/${open.threadId}`);
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "he-IL",
      isMobile: true,
      hasTouch: true,
    });
    await ctx.addInitScript(() => {
      sessionStorage.setItem("go_darom_dev_stub_token", "stub:m3_fix_bob");
    });
    const page = await ctx.newPage();
    await page.goto(`${WEB}/community`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "חברים" }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, "mobile-members.png"), fullPage: false });
    await ctx.close();
    console.log("wrote mobile-members.png");
  }
} finally {
  await browser.close();
}

console.log("done", OUT, "stubOk", stubOk);
