/**
 * M3 messaging UX verify + screenshots (dev stub auth).
 * Requires IDENTITY_DEV_STUB=true and VITE_IDENTITY_DEV_STUB=true with restarted servers.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const API = process.env.GO_DAROM_API || "http://localhost:4000";
const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m3-messaging-ux-2026-10-30");
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
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function ensureUser(stubId, nickname) {
  const token = `stub:${stubId}`;
  let me = await api(token, "GET", "/me");
  if (!me.onboardingCompleted) {
    me = await api(token, "PATCH", "/me", {
      nickname,
      completeOnboarding: true,
    });
  }
  return { token, me };
}

async function verifyTwoUsers() {
  const a = await ensureUser("m3_ux_alice", "אליסגו");
  const b = await ensureUser("m3_ux_bob", "בובגו");

  const community = await api(a.token, "POST", "/chat/community/messages", {
    body: "הודעת קהילה לבדיקת ממשק",
    clientCommandId: crypto.randomUUID(),
  });
  if (!community.message?.id) throw new Error("community post failed");

  const open = await api(a.token, "POST", "/dms/threads", { peerUserId: b.me.id });
  const threadId = open.threadId;
  await api(a.token, "POST", `/dms/threads/${threadId}/messages`, {
    body: "שלום מבדיקת הודעות",
    clientCommandId: crypto.randomUUID(),
  });

  const unreadB = await api(b.token, "GET", "/dms/unread-total");
  if (!(unreadB.total >= 1)) throw new Error(`expected unread for B, got ${unreadB.total}`);

  const msgs = await api(b.token, "GET", `/dms/threads/${threadId}/messages`);
  const maxSeq = Math.max(...msgs.items.map((m) => m.threadSeq), 0);
  const read = await api(b.token, "POST", `/dms/threads/${threadId}/read`, { lastReadSeq: maxSeq });
  if (read.total !== 0) throw new Error(`expected 0 unread after read, got ${read.total}`);

  const unreadAfter = await api(b.token, "GET", "/dms/unread-total");
  if (unreadAfter.total !== 0) throw new Error(`refresh unread not 0: ${unreadAfter.total}`);

  // Leave one unread for badge screenshot
  await api(a.token, "POST", `/dms/threads/${threadId}/messages`, {
    body: "הודעה שנייה לבאדג׳",
    clientCommandId: crypto.randomUUID(),
  });
  const badge = await api(b.token, "GET", "/dms/unread-total");
  if (!(badge.total >= 1)) throw new Error("badge total missing");

  console.log("API two-user verify OK", { threadId, unreadForB: badge.total });
  return { a, b, threadId };
}

async function withStubPage(browser, stubId, viewport, fn) {
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

async function screenshots(browser, { b, threadId }) {
  await withStubPage(browser, "m3_ux_bob", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${WEB}/community`, { waitUntil: "networkidle" });
    await page.waitForSelector(".community-chat-wrap, .msg-shell", { timeout: 15000 });
    await page.screenshot({ path: path.join(OUT, "desktop-community-chat.png"), fullPage: false });

    await page.goto(`${WEB}/dms`, { waitUntil: "networkidle" });
    await page.waitForSelector(".dm-layout", { timeout: 15000 });
    await page.screenshot({ path: path.join(OUT, "desktop-dm-list.png"), fullPage: false });

    await page.goto(`${WEB}/dms/${threadId}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".dm-chat-pane .msg-thread", { timeout: 15000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, "desktop-dm-conversation.png"), fullPage: false });
  });

  await withStubPage(browser, "m3_ux_bob", { width: 390, height: 844 }, async (page) => {
    await page.goto(`${WEB}/community`, { waitUntil: "networkidle" });
    await page.waitForSelector(".community-chat-wrap, .msg-shell", { timeout: 15000 });
    await page.screenshot({ path: path.join(OUT, "mobile-community-chat.png"), fullPage: false });

    await page.goto(`${WEB}/dms`, { waitUntil: "networkidle" });
    await page.waitForSelector(".dm-layout.is-list, .dm-list-pane", { timeout: 15000 });
    await page.screenshot({ path: path.join(OUT, "mobile-dm-list.png"), fullPage: false });

    await page.goto(`${WEB}/dms/${threadId}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".dm-chat-pane", { timeout: 15000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, "mobile-dm-conversation.png"), fullPage: false });
  });

  console.log("screenshots wrote to", OUT);
}

const health = await fetch(`${API}/health`).then((r) => r.json());
if (health.status !== "ok") throw new Error("API unhealthy");

const users = await verifyTwoUsers();
const browser = await chromium.launch();
try {
  await screenshots(browser, users);
} finally {
  await browser.close();
}
console.log("done");
