/**
 * Long-conversation screenshots for M3 scroll/overflow fix (stub auth).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const API = process.env.GO_DAROM_API || "http://localhost:4000";
const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m3-scroll-2026-10-30");
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

const a = await ensureUser("m3_scroll_alice", "אליסגל");
const b = await ensureUser("m3_scroll_bob", "בובגל");

for (let i = 0; i < 40; i++) {
  await api(a.token, "POST", "/chat/community/messages", {
    body: `הודעת קהילה ארוכה מספר ${i + 1} — בדיקת גלילה וחיתוך`,
    clientCommandId: crypto.randomUUID(),
  });
}

const open = await api(a.token, "POST", "/dms/threads", { peerUserId: b.me.id });
for (let i = 0; i < 35; i++) {
  const token = i % 2 === 0 ? a.token : b.token;
  await api(token, "POST", `/dms/threads/${open.threadId}/messages`, {
    body: `DM ${i + 1} — היסטוריה ארוכה לגלילה עצמאית`,
    clientCommandId: crypto.randomUUID(),
  });
}

// Seed many DM threads for list scroll
for (let i = 0; i < 12; i++) {
  const peer = await ensureUser(`m3_scroll_peer_${i}`, `עמית${i}`);
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

try {
  await withPage("m3_scroll_bob", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${WEB}/community`, { waitUntil: "networkidle" });
    await page.waitForSelector(".msg-thread");
    await page.waitForTimeout(400);
    const thread = page.locator(".msg-thread");
    const box = await thread.boundingBox();
    const scroll = await thread.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop,
      overflowY: getComputedStyle(el).overflowY,
    }));
    console.log("desktop community thread metrics", box, scroll);
    if (!(scroll.scrollHeight > scroll.clientHeight + 20)) {
      throw new Error("expected community thread to overflow and scroll");
    }
    if (scroll.overflowY !== "auto" && scroll.overflowY !== "scroll") {
      throw new Error(`expected overflow-y auto, got ${scroll.overflowY}`);
    }
    // Near bottom after load
    if (scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight > 120) {
      throw new Error("expected initial scroll near bottom");
    }
    await page.screenshot({ path: path.join(OUT, "desktop-community-long.png") });

    await page.goto(`${WEB}/dms/${open.threadId}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".dm-chat-pane .msg-thread");
    await page.waitForTimeout(400);
    const listScroll = await page.locator(".dm-thread-list").evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
    }));
    console.log("desktop dm list metrics", listScroll);
    await page.screenshot({ path: path.join(OUT, "desktop-dm-long.png") });
  });

  for (const w of [360, 390, 430]) {
    await withPage("m3_scroll_bob", { width: w, height: 800 }, async (page) => {
      await page.goto(`${WEB}/community`, { waitUntil: "networkidle" });
      await page.waitForSelector(".msg-thread");
      await page.waitForTimeout(300);
      const shell = await page.locator(".msg-shell").boundingBox();
      const composer = await page.locator(".msg-composer").boundingBox();
      const thread = await page.locator(".msg-thread").evaluate((el) => ({
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: getComputedStyle(el).overflowY,
      }));
      const vh = page.viewportSize()?.height ?? 800;
      if (!shell || !composer) throw new Error("missing shell/composer");
      if (composer.y + composer.height > vh + 4) {
        throw new Error(`composer below viewport at ${w}px (bottom=${composer.y + composer.height}, vh=${vh})`);
      }
      if (shell.y + shell.height > vh + 4) {
        throw new Error(`shell exceeds viewport at ${w}px`);
      }
      if (!(thread.scrollHeight > thread.clientHeight + 20)) {
        throw new Error(`expected scrollable thread at ${w}px`);
      }
      console.log(`mobile ${w} ok`, { composerBottom: composer.y + composer.height, vh, thread });
      await page.screenshot({ path: path.join(OUT, `mobile-${w}-community-long.png`) });

      await page.goto(`${WEB}/dms/${open.threadId}`, { waitUntil: "networkidle" });
      await page.waitForSelector(".dm-chat-pane .msg-composer");
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `mobile-${w}-dm-long.png`) });
    });
  }
} finally {
  await browser.close();
}

console.log("wrote", OUT);
