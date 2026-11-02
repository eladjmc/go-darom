/**
 * Screenshots for M3 Admin Control Center (stub auth + local DB).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: path.resolve(".env") });

const API = process.env.GO_DAROM_API || "http://localhost:4000";
const WEB = process.env.GO_DAROM_URL || "http://localhost:5173";
const OUT = path.resolve("docs/07-delivery/visual-qa/m3-admin-control-center-2026-10-30");
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

async function promoteAdmin(internalUserId) {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://go_darom:go_darom_dev@localhost:5432/go_darom";
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`update users set role = 'admin', updated_at = now() where id = $1::uuid`, [
      internalUserId,
    ]);
  } finally {
    await client.end();
  }
}

const admin = await ensureUser("m3_acc_admin", "מנהלאצ");
const a = await ensureUser("m3_acc_alice", "אליסאצ");
const b = await ensureUser("m3_acc_bob", "בובאצ");
await promoteAdmin(admin.me.id);

const communityMsg = await api(a.token, "POST", "/chat/community/messages", {
  body: "הודעת קהילה לבדיקת מרכז הניהול",
  clientCommandId: crypto.randomUUID(),
});
await api(b.token, "POST", "/reports", {
  targetType: "public_message",
  messageId: communityMsg.message.id,
  reason: "דיווח בדיקה ציבורי למרכז הניהול",
});

const dm = await api(a.token, "POST", "/dms/threads", { peerUserId: b.me.id });
let mid = null;
for (let i = 0; i < 11; i++) {
  const tok = i % 2 === 0 ? a.token : b.token;
  const posted = await api(tok, "POST", `/dms/threads/${dm.threadId}/messages`, {
    body: `DM ACC ${i + 1}`,
    clientCommandId: crypto.randomUUID(),
  });
  if (i === 5) mid = posted.message.id;
}
await api(a.token, "POST", "/reports", {
  targetType: "dm_message",
  messageId: mid,
  reason: "דיווח בדיקה פרטי למרכז הניהול",
});

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
  await withPage("m3_acc_admin", { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${WEB}/admin`, { waitUntil: "networkidle" });
    await page.waitForSelector(".admin-stat-grid");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "01-desktop-overview.png"), fullPage: false });

    await page.goto(`${WEB}/admin/members`, { waitUntil: "networkidle" });
    await page.waitForSelector(".admin-table");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "02-desktop-members.png"), fullPage: false });

    await page.goto(`${WEB}/admin/reports`, { waitUntil: "networkidle" });
    await page.waitForSelector(".admin-table");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "03-desktop-reports.png"), fullPage: false });

    const openLink = page.locator('a[href*="/admin/reports/"]').first();
    await openLink.click();
    await page.waitForSelector(".admin-evidence, .admin-detail-card");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, "04-desktop-report-detail.png"), fullPage: false });

    await page.goto(`${WEB}/admin/audit`, { waitUntil: "networkidle" });
    await page.waitForSelector(".admin-table");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "05-desktop-audit.png"), fullPage: false });
  });

  await withPage("m3_acc_admin", { width: 390, height: 844 }, async (page) => {
    await page.goto(`${WEB}/admin/reports`, { waitUntil: "networkidle" });
    await page.waitForSelector(".admin-table, .admin-empty");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "06-mobile-reports.png"), fullPage: false });
    await page.click(".admin-mobile-nav-toggle");
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, "07-mobile-nav-drawer.png"), fullPage: false });
  });

  console.log("screenshots written to", OUT);
} finally {
  await browser.close();
}
