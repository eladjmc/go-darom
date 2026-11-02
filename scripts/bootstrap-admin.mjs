/**
 * Local one-time admin bootstrap (OPEN-016 / ADR-011).
 *
 * Promotes a single existing user to role=admin and writes moderation_audit_log.
 * Does not create accounts, does not demote anyone, does not touch other users.
 *
 * Usage (local only):
 *   node scripts/bootstrap-admin.mjs --clerk-user-id user_xxx --i-understand
 *   node scripts/bootstrap-admin.mjs --user-id <internal-uuid> --i-understand
 *
 * Guards:
 * - Refuses NODE_ENV=production
 * - Refuses non-local DATABASE_URL hosts
 * - Requires explicit --i-understand
 * Never prints secret keys.
 */
import { config as loadDotenv } from "dotenv";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAuditInsert, buildPromoteUpdate } from "./bootstrap-admin-sql.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: path.join(root, ".env") });

function arg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function isLocalDatabaseUrl(url) {
  try {
    const u = new URL(url);
    const host = (u.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing: NODE_ENV=production");
    process.exit(1);
  }
  if (!hasFlag("--i-understand")) {
    console.error("Refusing: pass --i-understand to confirm a local one-time admin promotion.");
    process.exit(1);
  }

  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://go_darom:go_darom_dev@localhost:5432/go_darom";
  if (!isLocalDatabaseUrl(databaseUrl)) {
    console.error("Refusing: DATABASE_URL host is not localhost/127.0.0.1");
    process.exit(1);
  }

  const clerkUserId = arg("--clerk-user-id");
  const userId = arg("--user-id");
  if ((!clerkUserId && !userId) || (clerkUserId && userId)) {
    console.error("Provide exactly one of --clerk-user-id or --user-id");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    let target;
    if (clerkUserId) {
      const res = await client.query(
        `select u.id, u.nickname, u.role, a.external_id as clerk_user_id
         from auth_identities a
         join users u on u.id = a.user_id
         where a.provider = 'clerk' and a.external_id = $1
         limit 1`,
        [clerkUserId],
      );
      target = res.rows[0];
    } else {
      const res = await client.query(
        `select u.id, u.nickname, u.role, a.external_id as clerk_user_id
         from users u
         left join auth_identities a on a.user_id = u.id and a.provider = 'clerk'
         where u.id = $1::uuid
         limit 1`,
        [userId],
      );
      target = res.rows[0];
    }

    if (!target) {
      console.error("User not found. Sign in once so the account is provisioned, then retry.");
      process.exit(1);
    }

    if (target.role === "admin") {
      console.log(
        JSON.stringify(
          {
            ok: true,
            alreadyAdmin: true,
            userId: target.id,
            nickname: target.nickname,
          },
          null,
          2,
        ),
      );
      return;
    }

    await client.query("begin");
    const promote = buildPromoteUpdate(target.id);
    const updated = await client.query(promote.text, promote.values);
    if (updated.rowCount !== 1) {
      await client.query("rollback");
      console.error("Promotion failed (role changed concurrently or unexpected state).");
      process.exit(1);
    }
    const audit = buildAuditInsert(target.id, {
      source: "scripts/bootstrap-admin.mjs",
      clerkUserId: target.clerk_user_id ?? clerkUserId ?? null,
      path: "cli",
    });
    await client.query(audit.text, audit.values);
    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          ok: true,
          promoted: true,
          userId: updated.rows[0].id,
          nickname: updated.rows[0].nickname,
          role: updated.rows[0].role,
          nextSteps: [
            "Clear BOOTSTRAP_ADMIN_CLERK_IDS from .env after verification (disable bootstrap).",
            "Restart API if it was using env-based bootstrap.",
            "Open /admin while signed in as this account.",
          ],
        },
        null,
        2,
      ),
    );
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      /* ignore */
    }
    console.error("Bootstrap failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
