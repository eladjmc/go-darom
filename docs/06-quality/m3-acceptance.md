# M3 Acceptance Criteria

**Milestone:** M3 Community messaging, presence, notifications & trust  
**Status:** IMPLEMENTED — owner manual QA via `m3-manual-qa-checklist.md` before M3 sign-off

## Presence & directory

| ID | Criterion |
|---|---|
| ACC-M3-P01 | Onboarded members hold an authenticated Socket.IO connection from the app shell (site-wide), not only on the directory page |
| ACC-M3-P02 | Online means ≥1 active connection; multiple tabs count as one member (AUTH-005) |
| ACC-M3-P03 | Guests cannot read presence or online-filtered directory |
| ACC-M3-P04 | `GET /members?online=1` returns only currently online onboarded members; search `q` remains server-side |
| ACC-M3-P05 | Offline broadcast uses approved disconnect debounce (proposal: 10s) without inventing Clerk-session “online” |

## Community chat

| ID | Criterion |
|---|---|
| ACC-M3-C01 | Single central community chat; members can read history and post (COMM-001) |
| ACC-M3-C02 | Messages show sender nickname/photo; persist before realtime fanout |
| ACC-M3-C03 | Useful unread feedback via read watermark (no per-message public-chat toast) |
| ACC-M3-C04 | Admin can soft-remove a public message; clients receive deletion event |
| ACC-M3-C05 | Suspended / unauthenticated users cannot post |

## Direct messages

| ID | Criterion |
|---|---|
| ACC-M3-D01 | Member can open/get-or-create a 1:1 DM from directory/member actions (COMM-002) |
| ACC-M3-D02 | History + unread counts work across refresh |
| ACC-M3-D03 | If A blocks B (or B blocks A), new DMs are rejected; public chat remains visible (COMM-003) |
| ACC-M3-D04 | Non-participants cannot join DM socket room or fetch thread |

## Notifications

| ID | Criterion |
|---|---|
| ACC-M3-N01 | Significant events persist in DB and appear in bell; survive refresh (PRD §4.3) |
| ACC-M3-N02 | New DM produces toast for online recipient; ordinary public chat does **not** (BR-NOTIF-01) |
| ACC-M3-N03 | Mark-read (ids or all) clears badge appropriately |
| ACC-M3-N04 | Game invite/turn notification **types** may exist in schema but are not required to emit until M4 |

## Trust & moderation

| ID | Criterion |
|---|---|
| ACC-M3-T01 | Member can block/unblock; block list visible in personal area |
| ACC-M3-T02 | Member can report a public message or DM with a reason |
| ACC-M3-T03 | Admin report view for DM includes only reported message + **approved** bounded neighbors (OPEN-011); access audited (COMM-005, BR-PRIV-01) |
| ACC-M3-T04 | Admin can resolve reports and suspend/unsuspend with reason + audit (COMM-004) |
| ACC-M3-T05 | Non-admin calling admin moderation APIs receives **403** |
| ACC-M3-T06 | No production UI exposes raw API JSON, stack traces, or DM bodies in logs |

## Quality / regression

| ID | Criterion |
|---|---|
| ACC-M3-Q01 | `npm run typecheck`, `lint`, `test`, `build` pass |
| ACC-M3-Q02 | M2 identity/directory/auth flows still pass (no visual redesign of approved M2 marketing shell) |
| ACC-M3-Q03 | Rate limits reject abusive chat/report bursts without breaking normal use |

## Explicit non-acceptance (not M3)

Live/async games, Study Boards, event registration, CMS publishing, puzzle solving, chat file uploads, additional public channels, voice/video, full account-deletion privacy matrix (OPEN-010).

## Owner decisions before coding

| Topic | Proposal |
|---|---|
| OPEN-011 context window | ±5 messages by `thread_seq` |
| Presence offline debounce | 10 seconds |
