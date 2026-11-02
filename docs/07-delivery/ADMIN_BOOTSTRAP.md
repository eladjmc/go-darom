# Secure local admin bootstrap (OPEN-016 / ADR-011)

**Purpose:** Grant the `admin` role to one existing Clerk-authenticated account for local M3 moderation QA.  
**Authority:** HLD Security Architecture — one-time bootstrap with explicit principal, auditable, repeat-safe, then disabled.  
**Not for production** without a separate production runbook and secrets handling.

## Principles

- Role lives in PostgreSQL `users.role` (`member` | `admin`), keyed by internal UUID.
- Clerk JWT proves identity only; **role is never trusted from the client or from email**.
- No public admin registration endpoint.
- No hardcoded admin passwords.
- Bootstrap writes `moderation_audit_log.action = admin_bootstrap`.
- Only the targeted user is updated (`member` → `admin`); other users unchanged.

## Preferred local procedure (CLI — existing account)

1. Sign in once at http://localhost:5173 with Google/Clerk so your row exists in `users` / `auth_identities`.
2. In the [Clerk Dashboard](https://dashboard.clerk.com) → **Users** → your user → copy **User ID** (`user_…`).  
   Do not paste secret keys into chat, tickets, or git.
3. Ensure API uses a **local** database (`DATABASE_URL` host `localhost` / `127.0.0.1`) and `NODE_ENV` is not `production`.
4. From the repo root:

```bash
node scripts/bootstrap-admin.mjs --clerk-user-id user_XXXXXXXX --i-understand
```

5. Confirm JSON output shows `"promoted": true` (or `"alreadyAdmin": true`).
6. Restart nothing required for DB role; refresh the browser (or hard-refresh) so `/me` reloads role.
7. Open http://localhost:5173/admin — admin shell should load.
8. **Disable bootstrap leftovers:** leave `BOOTSTRAP_ADMIN_CLERK_IDS=` empty in `.env` (do not keep a standing promotion list).

Optional: promote by internal UUID instead:

```bash
node scripts/bootstrap-admin.mjs --user-id <uuid-from-users.id> --i-understand
```

## Alternate path (env list on authenticate)

`BOOTSTRAP_ADMIN_CLERK_IDS` (comma-separated Clerk user ids) can also promote on the next authenticated API call:

- **New user:** created as `admin` + audit `path: create`.
- **Existing member:** upgraded once + audit `path: existing`.
- Already-admin: no-op (no duplicate role change).

After the first successful promotion, **clear the env var** and restart the API so the bootstrap list stays empty.

## Verify

```bash
# As admin (Bearer from browser Network tab on /me — do not commit the token)
curl -s -H "Authorization: Bearer <token>" http://localhost:4000/admin/session
# → {"ok":true,"role":"admin"}

# As a regular member token
curl -s -H "Authorization: Bearer <member-token>" http://localhost:4000/admin/session
# → 403 Hebrew error
```

Audit row:

```sql
select action, entity_id, detail, created_at
from moderation_audit_log
where action = 'admin_bootstrap'
order by created_at desc
limit 5;
```

## Cleanup / revoke (local)

```sql
-- Only if you intentionally remove admin from yourself after QA
update users set role = 'member', updated_at = now() where id = '<your-uuid>';
```

Do not leave production databases with a populated `BOOTSTRAP_ADMIN_CLERK_IDS`.
