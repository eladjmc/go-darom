# Go Darom — Admin Control Center Specification

**Version:** 0.1 · **Status:** M3 slice APPROVED 2026-10-30 — further modules deferred to later milestones  
**Source of truth:** Approved Product Baseline v0.1, HLD v0.2, M3 moderation decisions and subsequent owner clarification.  
**Delivery task:** `docs/07-delivery/ADMIN_CONTROL_CENTER_CURSOR_TASK.md`  
**LLD / API / acceptance:** `docs/05-modules/m3-admin-control-center/LLD.md`, `docs/04-contracts/m3-admin-control-center-api.md`, `docs/06-quality/m3-admin-control-center-acceptance.md`  
**Scope rule:** Build the reusable administration framework and working M3 functions now. Deliver remaining domain capabilities in their planned milestones. Do not invent new user-facing features or privileged data access.

## 1. Product intent

`/admin` is the centralized operational workspace for Go Darom administrators, not a single moderation page. It will eventually host community member administration, moderation, puzzle authoring and weekly selection, events/registrations, content/announcements/media and operational metrics. It must grow without navigation redesign or permission bypasses.

**Explicit owner clarification:** “Go problems” refers to **creating and editing Go puzzles**, not an admin console for inspecting or changing members’ games. Aggregate game statistics are welcome; **no admin access to individual private games or their boards/replays**, no forced moves or outcome manipulation.

## 2. Navigation and future routes

| Navigation label (Hebrew) | Route recommendation | MVP scope | Milestone gate |
|---|---|---|---|
| סקירה כללית | `/admin` | Lightweight overview from real data | M3 shell; metrics progressively |
| משתמשים | `/admin/members` | Directory, search, role/status, suspend/unsuspend | M3 basics |
| דיווחים ומודרציה | `/admin/reports`, `/admin/reports/:reportId` | Queue, detail, context and actions | M3 |
| חידות גו | `/admin/puzzles`, `/admin/puzzles/new`, `/admin/puzzles/:id/edit` | Puzzle board/SGF, solution tree, weekly pick | M7 |
| אירועים | `/admin/events`, `/admin/events/:id` | Event edit, capacity, registration admin, CSV | M6 |
| תוכן ופרסומים | `/admin/content` | Guides, announcements, videos, galleries/Tiptap | M7 |
| פעילות ונתונים | `/admin/analytics` | Aggregate community and game activity | Progressive; read-only only after authoritative data exists |
| יומן ניהול | `/admin/audit` | Restricted, scoped moderation action history | M3 foundation; broader audit later |

**Navigation policy:** Working M3 sections are visible now. Future sections have stable reserved routes and documented registration points, but are not presented as functioning pages or dead links. If showing a roadmap entry inside Admin, visibly mark it non-interactive and avoid implying availability; simpler default: omit until implemented.

## 3. Layout and navigation

- Dedicated administration shell within the same React SPA; inherit Go Darom design tokens and typography, but prioritize operational density, clarity and readability.
- Desktop: RTL **right-hand sidebar**, persistent top bar showing page, logged-in admin, back-to-site action, responsive content region.
- Mobile: accessible right-side drawer or compact administrative tabs with discoverable menu; do not let tables overflow the viewport (stack or allow scoped horizontal table scrolling).
- Sidebar navigation uses accessible active states, badge count for open reports if implemented with accurate data, compact iconography, grouping by administration domain.
- Global authenticated website navbar displays a clear **ניהול** link to `/admin` only when server-confirmed `admin` role is available. No frontend-only authorization.
- Unknown admin routes show a branded 404 within the admin shell; unauthorized users get appropriate 403, unauthenticated users sign in and return.
- Shared UI: page title, description, breadcrumb where helpful, status badges, search, filters, tables, pagination/load more, skeleton loading, empty/error states, confirmation dialogs, toast feedback.
- Do not render JSON payloads, internal UUIDs, raw enums, developer notes or Clerk identifiers as default UI. Debug data is not part of public admin UI.

## 4. M3: overview dashboard

Display only measurements available from current authoritative backends; prefer straightforward labeled counts, e.g. open reports, suspended members, registered members. Use deep links to the existing admin areas. No fabricated graphs or hardcoded statistics. Placeholders for future cross-domain metrics should not present fictional counts. Do not add heavyweight analytics infrastructure.

## 5. M3: member management

- Compact RTL member rows: avatar, nickname, role, active/suspended status, permitted actions. Search server-side; stable ordering and bounded result set; use load-more/pagination if data volume requires.
- Admin can suspend/unsuspend as already implemented; require explicit confirmation, feedback and appropriate existing-session enforcement.
- Show only authorized member information; avoid unnecessary email/PII exposure. No open-ended changes to roles or superadmin creation without separately approved requirements.
- Logging for material moderation actions; restrict access to admins server-side.

## 6. M3: reports and moderation

- Reports queue: type (community or DM), reporter nickname/avatar, reported member, reason if available, timestamp, status; sort and filter to support triage.
- Detail screen: readable evidence, clear distinction between reporting and reported users, actions and current status; **no raw JSON**.
- DM evidence: only reported message plus **up to five messages before and five after**, no next/previous or general conversation browse. Read action audited (`dm_report_context_read`).
- For public chat: view reported message, allow removal only via approved moderation use case. Allow resolve report, suspend/unsuspend as approved.
- All actions protected with server RBAC; enforce suspended-account behavior in API and socket actions. UI confirmations for impactful actions and safe duplicate submission behavior.
- Data model may need query projections to provide reporter/reported display names, avatars, reason and context. Build such projections through approved domain services and authorization checks; **do not expose private payloads wholesale**.

## 7. M6: events administration (future)

- Create/edit/cancel events; capacity (unlimited or capped); review confirmed/pending registrations; manually add participants; export CSV; photo galleries administered by admins.
- Respect guest email verification and 15-minute seat reservation, cancellations and email workflows; never make participant identities public.
- Guest PII retention and export lifecycle per approved baseline. Detail screen includes capacity/confirmed counts and relevant status, without fabricating event analytics.

## 8. M7: puzzles and learning/content (future)

**Puzzles:** admin creates/edits through interactive Go board or supported SGF import, defines solution tree with multiple accepted branches, optional hints/explanations, selects weekly featured puzzle, manages public puzzle library. No ranking/solve-tracking feature.

**Content:** admin authors guides and announcements using reusable Tiptap editor, draft/publish/pin as specified, manages video metadata and admin-only gallery uploads. Reuse the same shell but module-specific authoring workflows. Respect media rights/consent and storage adapter.

## 9. Aggregate game statistics — proposal, requires implementation timing decision

Allowed only **aggregate metadata** (no individual game access). Suggested measures once Games exists:

- Number of active Live games *now* (based on stored authoritative game statuses)
- Number of active asynchronous games
- Number of games started/completed over a selected period
- Optional breakdown by board size (9/13/19) and game mode when already represented by data
- Total registered community members and/or online members if reliably provided by Identity/Presence

**No admin-visible player-vs-player list, no boards, moves, private replays, direct player activity surveillance or interventions.** No ELO, leaderboards, tournaments, retention analytics requiring tracking outside the approved product. Avoid storing extra personal telemetry merely for dashboard metrics. Define counting rules (time zone, completion status, period boundaries) in Games/Analytics LLD, and ensure query performance via simple aggregate SQL/indexes where appropriate. There is no need for new analytics vendors. Counts are not promised in M3 because the Games domain does not exist yet.

## 10. Security/privacy and ownership

- Central Admin orchestration cannot bypass owning-module business rules or directly rewrite domain records. Follow HLD module boundaries and repository/service ports.
- Backend authorization on every relevant REST/socket action; auditable actions and scoped DM access; no exposed raw database tables.
- Preserve user deletion and anonymization constraints, guest PII policies, and limited access to reports.
- Avoid using Role=admin as carte blanche to read private game or DM data.

## 11. Incremental implementation and acceptance gates

### M3 now — implement and verify
1. Dedicated Admin Shell and working navigation for overview, members and reports.
2. Admin-only global-navbar entry and secure route guards.
3. Legible report list and detail view; replace JSON with purpose-built fields and constrained DM context UI.
4. Member administration with current M3 actions; basic overview from real authoritative counts.
5. Reusable design and route registration pattern for future admin modules, without implementing future business logic.
6. Verify two regular members + one admin manually: reports, DM context ±5, audit, resolve, public message deletion, suspend/unsuspend, unauthorized 403; check desktop/mobile.
7. Automated test/build gates and actual results; owner sign-off before M4.

### M4/M5 — Games
No admin game viewing. Add aggregate metrics only if an explicit milestone LLD includes queries and definitions; otherwise integrate in a later admin analytics pass.

### M6 — Events
Add functional event management pages under existing admin shell.

### M7 — Puzzles and CMS
Add functional puzzle editor/weekly choice, guide/announcement/video/gallery management.

### Later — analytics and audit expansion
Only features grounded in data already collected and approved workflows. Present any expanded telemetry, permissions or administration tools for explicit owner decision.

## 12. Review and acceptance criteria

- ADM-01: Admin has visible global entry; member does not. Backend still enforces RBAC.
- ADM-02: Dedicated shell with consistent right sidebar and responsive mobile navigation.
- ADM-03: Reports list includes human identities, readable localized status/type, clear triage actions; no raw JSON.
- ADM-04: DM report detail limits scope to report ±5, audited; cannot explore unrelated DMs.
- ADM-05: Member list compact, queryable and restricted; suspension workflow guarded and audited.
- ADM-06: Unknown/unauthorized routes handle 404/403 without leaking information.
- ADM-07: Future domain entry points documented, but unfinished features are not presented as working.
- ADM-08: At desktop 1280/1440/1920 and mobile 360/390/430, layouts readable, keyboard accessible, no uncontrolled overflow.
- ADM-09: All executed test/build commands and manual QA results reported. No claim of completion prior to owner sign-off.

## Open items for future domain LLDs
- Exact metric definitions and update intervals for aggregate live/async statistics.
- Whether to surface administrative warnings/operational health in overview, and permitted information granularity.
- Full role management beyond existing admin/member and suspend/unsuspend is **not approved**.
- Admin report queue filters and any further audit-log display scope can be selected during detailed UI implementation without broadening authorization.
