# M3 — Community Messaging, Presence, Notifications & Trust (LLD)

**Status:** APPROVED for implementation (owner 2026-10-30)  
**Milestone:** M3 Community communication & trust foundations  
**Depends on:** M2 COMPLETED AND APPROVED (identity, directory foundation, Socket.IO auth)  
**Authority:** Elaborates Product Baseline v0.1 + HLD v0.2 + Realtime Architecture. Does **not** invent features or alter approved decisions.

## 1. Goals

1. **One central community chat** (COMM-001): authenticated members read/post; history; sender nickname/photo; useful unread feedback; no per-message toast for public chat.
2. **One-to-one DMs** (COMM-002): open from member directory/cards; history; unread counts.
3. **Site-wide presence** (AUTH-005 + Realtime §1/§6): signed-in members maintain an authenticated Socket.IO connection from the app shell; online = ≥1 active connection; multi-tab = one member; guests never see presence.
4. **Online-only directory filter**: authenticated `GET /members` supports filtering to currently online members (M2 follow-up).
5. **Persistent notifications + toasts** (PRD §4.3, BR-NOTIF-01, GAME-018 pattern): DB-backed bell; real-time toast for significant events that exist in M3 (primarily new DM); **no** toast spam for ordinary public-chat posts. Schema ready for later invite/turn types without implementing games.
6. **Blocking & reporting foundations** (COMM-003–005, BR-COMM-01, BR-PRIV-01): mutual direct-contact block; report public chat or DM; admin bounded DM context; audit.
7. **Relevant moderation controls** (COMM-004): admin remove public messages; review/resolve reports; suspend members — server-enforced, auditable.

## 2. Non-goals (explicit)

| Deferred | Milestone / note |
|---|---|
| Live/async games, Study invites | M4+ |
| Game-room chat | M4 — dedicated `game_chat_messages` (ADR-017); not community DM |
| Voice/video, chat file uploads, multiple public channels | Out of MVP (MVP_SCOPE) |
| Full account-deletion privacy matrix (COMM-008 / OPEN-010) | Privacy LLD before release; M3 only avoids blocking future deletion |
| Pagination “Load More” beyond soft caps if not needed at <500 WAUs | Optional within M3 if volume requires; not inventing infinite scroll UX |
| Email notifications for chat/DM | Not in product (in-app only for these) |
| Admin arbitrary DM inbox browsing | Forbidden (COMM-005) |
| Changing M2 visual language / re-homing marketing pages | Preserve M2 |

## 3. Requirements mapped

| ID | Requirement | M3 delivery |
|---|---|---|
| COMM-001 | Central chat + history + unread | Room `community`; persist + socket fanout |
| COMM-002 | DMs + invites subject to blocks | DM threads; **game invites remain M4** but block checks shared |
| COMM-003 | Block direct contact; public chat visible | `user_blocks`; enforce on DM create/send |
| COMM-004 | Admin reports, remove public msgs, suspend | Admin APIs + `/admin` panels (minimal) |
| COMM-005 | Bounded DM report context | Fixed window — see OPEN-011 proposal |
| COMM-006 | Chat retained until deletion policy | Soft-delete / admin remove; no auto-purge in M3 |
| COMM-007 | Closed reports ≤1 year | Retention field + note; job can wait OPEN-024 |
| AUTH-004/005 | Directory + presence | Site-wide socket; `?online=1` filter |
| BR-NOTIF-01 | Persist + bell; no public-chat toasts | `notifications` table + socket push |
| J-09 | Block and report journeys | Member UI + admin queue |
| OPEN-027 | Presence races | Disconnect debounce; connection counts (extend M2) |

## 4. Open decisions required before/with approval

| ID | Issue | Proposal for approval (not assumed) |
|---|---|---|
| **OPEN-011** | DM report adjacent context size | **APPROVED:** up to 5 before + reported + up to 5 after; report-scoped only; audit admin access. |
| OPEN-027 | Disconnect flicker | **APPROVED:** 10s debounce after last socket disconnect; cancel if reconnect; multi-tab = one online. |
| OPEN-024 | Notification/audit retention | M3 stores indefinitely unless/until retention job approved; document only. |
| Unread “community” semantics | PRD: useful unread feedback | **Propose:** per-user `last_read_seq` on community room; badge = count of messages with `seq > last_read_seq` (excluding own), capped in UI. |

No other product features are introduced.

## 5. Architecture (approved stack)

```text
apps/api/
  modules/
    chat/           # community + DM services (ownership of message writes)
    trust/          # blocks, reports, suspensions (shared policy helpers)
    notifications/  # create + list + mark-read
  http/routes/
    chat.ts, dms.ts, blocks.ts, reports.ts, notifications.ts
    admin/moderation.ts
  realtime/
    presence-registry.ts   # extend: debounce offline; site-wide
    socket-server.ts       # rooms: user:{id}, chat:community, dm:{threadId}
apps/web/
  AppShell socket provider when signed-in + onboarded
  /community → chat + directory (online filter)
  DM inbox / thread UI
  Notification bell + toast host
  /me block list
  /admin reports + suspensions + message removal
```

**Invariants (HLD):**

- All authoritative chat/DM/notification/block/report mutations go through application services (same rules for REST and Socket command paths).
- Persist **before** broadcast.
- Re-authorize on room join and before each privileged mutation.
- Never log DM bodies or secrets.
- Rate-limit chat writes and report filing (SECURITY_ARCHITECTURE).

## 6. Data model (Drizzle / PostgreSQL)

| Table | Purpose |
|---|---|
| `chat_threads` | `kind = community \| dm`; community is singleton; DM unique pair of user ids (ordered) |
| `chat_messages` | `thread_id`, `sender_id`, `body`, `thread_seq`, `created_at`, `deleted_at`, `deleted_by` |
| `chat_thread_reads` | `thread_id`, `user_id`, `last_read_seq`, `updated_at` |
| `user_blocks` | `blocker_id`, `blocked_id`, unique pair; bidirectional enforcement in services |
| `moderation_reports` | target type `public_message \| dm_message`, target ids, reporter, reason, status, resolution |
| `moderation_audit_log` | actor, action, entity refs, reason, created_at (no DM body duplication beyond necessary report snapshot fields) |
| `notifications` | recipient, type, payload JSON (ids + safe display fields), `read_at`, created_at |

**Report snapshot:** store reported message id + frozen bounded neighbor ids (or copy of bounded texts at report time) so later deletes do not erase evidence; still no unrestricted inbox access.

## 7. Authorization matrix (server)

| Action | Member | Admin |
|---|---|---|
| Read/post community (not suspended) | yes | yes |
| Soft-delete own message | yes (own) | yes (any public) |
| Open/send DM if not blocked either way | yes | as member |
| Block / unblock | yes | as member |
| File report | yes | yes |
| List/resolve reports; suspend user | no | yes |
| View DM report context | no | yes, scoped + audited |
| Read notifications (own) | yes | own only |

Suspended users: authenticate may already 403 (M2); keep consistent — no chat/DM writes.

## 8. Realtime rooms & flow

1. On app load (onboarded member): connect Socket.IO with Clerk token; join `user:{userId}`; presence connect/disconnect with debounce.
2. Community: join `chat:community` after authz; emit `chat:message` after persist; clients apply by `thread_seq`.
3. DM: join `dm:{threadId}` only if participant and not blocked; same persist-then-emit.
4. Notifications: emit `notification:created` to `user:{recipientId}` after insert; client shows toast when type is toast-eligible.
5. Presence: `presence:snapshot` / `presence:user` (M2 events retained); coalesce updates; directory `online` filter uses registry.

**Snapshot + gap:** REST history pages by cursor/`before_seq`; on seq gap, refetch snapshot.

## 9. API / Socket contracts

See `docs/04-contracts/m3-community-api.md` (REST + Socket.IO event catalog).

## 10. UX placement (Hebrew RTL; preserve M2 shell)

- `/community`: tabs or split — **צ׳אט** | **חברים** (directory with search + online-only toggle).
- Member card/row actions: פתח הודעה, חסום, דווח (as applicable).
- Global notification bell in header; toast host non-blocking.
- `/me`: manage blocks.
- `/admin`: reports queue, suspend, remove public message — minimal panels, not a redesign of marketing pages.

## 11. Testing plan

- Unit: block matrix; report context window bounds; notification toast eligibility; nickname-safe payloads.
- Integration: persist-then-broadcast; unauthorized room join; blocked DM rejected; admin 403 for non-admin.
- Presence: multi-tab one online; debounce offline; site-wide socket while navigating.
- UI RTL smoke; a11y focus on composers and bell.
- No secrets/DM bodies in logs (spot checks).

## 12. Risks

1. OPEN-011 must be decided before implementing DM report evidence.
2. Presence debounce vs “who is online” freshness — document expected lag.
3. Public chat volume — soft page size + rate limits; avoid inventing complex moderation AI.
4. Do not implement game invite/turn emitters in M3; only shared notification plumbing.

## 13. Approval gate

Owner approves this LLD + `m3-community-api.md` + `m3-acceptance.md` + `M3_IMPLEMENTATION_PLAN.md` (including OPEN-011 window and presence debounce proposal) **before any M3 application code**.
