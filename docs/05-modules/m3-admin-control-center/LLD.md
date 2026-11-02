# M3 Admin Control Center — LLD

**Status:** Implementation for owner review (M3 only)  
**Specs:** `docs/03-design/ADMIN_CONTROL_CENTER_SPEC.md`, `docs/07-delivery/ADMIN_CONTROL_CENTER_CURSOR_TASK.md`  
**Authority:** PRD / HLD / BUSINESS_RULES bind; this LLD elaborates UI/API within those bounds.

## Goals (M3)

1. Dedicated RTL admin shell: overview, members, reports (+ detail), audit foundation.
2. Server RBAC on every admin endpoint; global `ניהול` only when `me.role === "admin"`.
3. Human-readable report triage (no raw JSON / Clerk ids / internal enums as UI).
4. Extensible nav registry for M6/M7/analytics **without** shipping unfinished modules as working pages.

## Non-goals

- Puzzle/event/CMS authoring, game boards, private game access, fabricated metrics.
- Expanding role model beyond member/admin + suspend/unsuspend.

## Routes (SPA)

| Path | Page |
|---|---|
| `/admin` | Overview counts |
| `/admin/members` | Admin member directory |
| `/admin/reports` | Report queue |
| `/admin/reports/:reportId` | Report detail |
| `/admin/audit` | Recent moderation audit (scoped) |
| unknown `/admin/*` | Branded admin 404 |

Future routes documented in ACC spec; **not registered** as live nav until implemented.

## API additions (admin-only)

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/overview` | `{ openReports, suspendedMembers, registeredMembers }` |
| GET | `/admin/members?q=&status=` | Admin directory including suspended |
| GET | `/admin/reports` | Enriched list (reporter + reported display) |
| GET | `/admin/reports/:id` | Structured detail + bounded messages (audit DM read) |
| GET | `/admin/audit` | Recent audit rows for admins |

Existing: session, resolve, suspend, unsuspend, delete public message.

## Module ownership

- Identity: member listings for admin, role checks.
- Trust/Moderation: reports, suspend, audit.
- Chat: soft-delete public messages; snapshot builder unchanged (OPEN-011).

## UI shell

- Own chrome (no site footer); RTL sidebar (desktop) / drawer (mobile).
- Top bar: title, admin nickname, link back to site.
- Confirm dialogs for suspend / resolve / delete.
