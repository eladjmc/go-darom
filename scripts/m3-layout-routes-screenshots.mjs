/**
 * Screenshots for M3 layout centering, scroll containment, scrollbars, persistent routes.
 * Requires IDENTITY_DEV_STUB=true and VITE_IDENTITY_DEV_STUB=true with api+web running.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const API = process.env.GO_DAROM_API || "http://localhost:4000";
const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m3-layout-routes-2026-10-30");
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

const a = await ensureUser("m3_layout_alice", "אליסמרכז");
const b = await ensureUser("m3_layout_bob", "בובמרכז");

for (let i = 0; i < 45; i++) {
  await api(a.token, "POST", "/chat/community/messages", {
    body: `הודעת קהילה ${i + 1} — בדיקת מרכוז וגלילה פנימית בלבד`,
    clientCommandId: crypto.randomUUID(),
  });
}

const open = await api(a.token, "POST", "/dms/threads", { peerUserId: b.me.id });
for (let i = 0; i < 40; i++) {
  const token = i % 2 === 0 ? a.token : b.token;
  await api(token, "POST", `/dms/threads/${open.threadId}/messages`, {
    body: `הודעה פרטית ${i + 1} — היסטוריה ארוכה`,
    clientCommandId: crypto.randomUUID(),
  });
}

for (let i = 0; i < 14; i++) {
  const peer = await ensureUser(`m3_layout_peer_${i}`, `עמיתמ${i}`);
  const t = await api(b.token, "POST", "/dms/threads", { peerUserId: peer.me.id });
  await api(peer.token, "POST", `/dms/threads/${t.threadId}/messages`, {
    body: `תצוגה מקדימה ${i}`,
    clientCommandId: crypto.randomUUID(),
  });
}

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

function assertCentered(frameBox, viewportWidth) {
  const left = frameBox.x;
  const right = viewportWidth - (frameBox.x + frameBox.width);
  const delta = Math.abs(left - right);
  if (delta > 24) {
    throw new Error(`chat frame not centered: left=${left.toFixed(1)} right=${right.toFixed(1)} delta=${delta.toFixed(1)}`);
  }
}

try {
  await withPage("m3_layout_bob", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${WEB}/community/chat`, { waitUntil: "networkidle" });
    await page.waitForSelector(".msg-thread");
    await page.waitForTimeout(500);

    const frame = page.locator(".chat-frame");
    const frameBox = await frame.boundingBox();
    if (!frameBox) throw new Error("missing chat-frame");
    assertCentered(frameBox, 1440);

    const pageScroll = await page.evaluate(() => ({
      doc: document.documentElement.scrollHeight,
      win: window.innerHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      shellClass: document.querySelector(".app-shell")?.className ?? "",
    }));
    console.log("community chat page metrics", pageScroll, frameBox);
    if (!pageScroll.shellClass.includes("is-chat-focus")) {
      throw new Error("expected app-shell.is-chat-focus on community chat");
    }
    if (pageScroll.doc > pageScroll.win + 8) {
      throw new Error(`unexpected page-level overflow: doc=${pageScroll.doc} win=${pageScroll.win}`);
    }

    await page.screenshot({ path: path.join(OUT, "01-centered-community-chat.png"), fullPage: false });

    const thread = page.locator(".msg-thread");
    await thread.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, "04-scrollbar-hover-community.png"), fullPage: false });

    await thread.evaluate((el) => {
      el.scrollTop = Math.max(0, el.scrollHeight / 2 - el.clientHeight / 2);
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, "03-long-conversation-scrolled.png"), fullPage: false });

    await page.goto(`${WEB}/messages/${open.threadId}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".dm-chat-pane .msg-thread");
    await page.waitForTimeout(500);
    const dmFrame = await page.locator(".chat-frame").boundingBox();
    if (!dmFrame) throw new Error("missing dm chat-frame");
    assertCentered(dmFrame, 1440);
    const dmPage = await page.evaluate(() => ({
      doc: document.documentElement.scrollHeight,
      win: window.innerHeight,
    }));
    if (dmPage.doc > dmPage.win + 8) {
      throw new Error(`DM page-level overflow: doc=${dmPage.doc} win=${dmPage.win}`);
    }
    await page.screenshot({ path: path.join(OUT, "02-centered-dm-interface.png"), fullPage: false });

    // Refresh persistence
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".dm-chat-pane .msg-thread");
    if (!page.url().includes(`/messages/${open.threadId}`)) {
      throw new Error(`refresh lost conversation URL: ${page.url()}`);
    }
    await page.screenshot({ path: path.join(OUT, "06-dm-refresh-persists.png"), fullPage: false });
  });

  await withPage("m3_layout_bob", { width: 390, height: 844 }, async (page) => {
    await page.goto(`${WEB}/messages/${open.threadId}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".dm-chat-pane .msg-thread");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, "05-mobile-conversation.png"), fullPage: false });
  });

  console.log("screenshots written to", OUT);
} finally {
  await browser.close();
}
