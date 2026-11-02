# M3 Manual QA — Admin & Moderation

**Status:** M3 product/UI approved 2026-10-30 — see `M3_FINAL_ACCEPTANCE_REPORT.md`. Live multi-account rows remain useful regression checks; not a separate Playwright suite.  
**Accounts:** 1 admin (you) · 2 regular members (A, B)  
**Bootstrap:** [`docs/07-delivery/ADMIN_BOOTSTRAP.md`](../07-delivery/ADMIN_BOOTSTRAP.md)

## 0. Bootstrap your admin (once)

1. Sign in with your Clerk Google account at http://localhost:5173  
2. Copy your Clerk **User ID** (`user_…`) from the Clerk Dashboard (Users).  
3. Run (local DB only):

```bash
npm run bootstrap:admin -- --clerk-user-id user_XXXXXXXX --i-understand
```

4. Hard-refresh the site → open http://localhost:5173/admin — admin UI loads.  
5. Ensure `BOOTSTRAP_ADMIN_CLERK_IDS` in `.env` is empty after success.

## 1. Access control

| Step | Actor | Action | Expected |
|---|---|---|---|
| 1.1 | Admin | Visit `/admin` | Reports shell loads |
| 1.2 | Member A | Visit `/admin` | Forbidden page (`אין הרשאה`) |
| 1.3 | Member A | `GET /admin/session` with A’s Bearer token | HTTP 403 |
| 1.4 | Member A | `GET /admin/reports` | HTTP 403 |
| 1.5 | Admin | `GET /admin/session` | `{"ok":true,"role":"admin"}` |

Role is re-read from DB on every API call (Clerk JWT does not carry admin).

## 2. Report public message

| Step | Actor | Action | Expected |
|---|---|---|---|
| 2.1 | A & B | Open `/community/chat`, exchange a few messages | Visible to both |
| 2.2 | A | On B’s message → **דיווח** | Success toast/status |
| 2.3 | Admin | `/admin` → open report `public_message` | Context JSON includes reported message |
| 2.4 | Admin | **הסרת הודעה ציבורית מדווחת** | Message shows removed in chat for A/B |
| 2.5 | Admin | **סיום טיפול** | Leaves open queue |

## 3. Report private message (OPEN-011)

| Step | Actor | Action | Expected |
|---|---|---|---|
| 3.1 | A | From `/community` members → **הודעה פרטית** to B | URL `/messages/:id` |
| 3.2 | A & B | Send ≥11 messages in the thread | History long enough for ±5 |
| 3.3 | A | Report one mid-thread DM | Success |
| 3.4 | Admin | Open the `dm_message` report | Snapshot has reported + **at most 5** before and **at most 5** after (≤11 total) |
| 3.5 | Admin | Note status text about audit | `moderation_audit_log` has `dm_report_context_read` |
| 3.6 | Admin | Confirm no “browse all DMs” UI/API | Only this report’s snapshot |

SQL check (optional):

```sql
select action, entity_id, created_at
from moderation_audit_log
where action = 'dm_report_context_read'
order by created_at desc
limit 5;
```

## 4. Suspend / session enforcement

| Step | Actor | Action | Expected |
|---|---|---|---|
| 4.1 | Admin | From DM report → **השעיית שולח/ת מדווח/ת** | Success |
| 4.2 | Suspended member | Refresh or call `/me` | 403 «החשבון מושעה» / cannot act |
| 4.3 | Admin | **ביטול השעיה** (cleanup) | Member can sign in/act again |

## 5. Negative paths

| Step | Expected |
|---|---|
| Member calls any `/admin/*` | 403 |
| Admin has no inbox browser for arbitrary DMs | No such route |
| Unknown report id as admin | 404 Hebrew error |
| Bootstrap script against non-local DB / production | Refused |

## 6. Safe cleanup

1. Resolve or dismiss remaining open test reports in `/admin`.  
2. Unsuspend any QA-suspended accounts.  
3. Optional: leave removed public messages as soft-deleted (acceptable for QA).  
4. Confirm `BOOTSTRAP_ADMIN_CLERK_IDS` empty.  
5. Do **not** commit `.env`, tokens, or Clerk secret keys.

## Sign-off

| Role | Date | Result |
|---|---|---|
| Owner | | Pass / Fail + notes |

Do not start **M4** until this checklist and the layout/routing checklist are approved.
