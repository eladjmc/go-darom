# M3 Implementation Plan — Community Messaging & Trust

**Status:** EXECUTED (2026-10-30) — implementation complete; owner QA pending; no M4  
**References:**

- `docs/05-modules/m3-community-messaging/LLD.md`
- `docs/04-contracts/m3-community-api.md`
- `docs/06-quality/m3-acceptance.md`
- Product: COMM-001–007, AUTH-005, BR-COMM-01, BR-NOTIF-01, BR-PRIV-01; HLD Realtime + Security

## Priority statement

Extend the **approved M2 shell and identity** with community chat, DMs, site-wide presence, notifications, and trust/moderation foundations — without redesigning marketing pages or starting games (M4).

## Approved decisions (locked)

1. **OPEN-011:** DM report context = up to 5 before + reported + up to 5 after; report-scoped; audit DM evidence reads.  
2. **Presence offline debounce:** **10 seconds**; cancel on reconnect; multi-tab = one online.  
3. Community unread = per-user `last_read_seq` watermark.

## Task sequence (after approval only)

1. **Schema migrations** — threads, messages, reads, blocks, reports, audit, notifications.  
2. **Trust module** — block checks shared helper; report create; admin suspend/resolve APIs.  
3. **Chat module** — community singleton thread; persist-before-broadcast; soft-delete.  
4. **DM module** — get-or-create pair thread; enforce blocks; unread.  
5. **Notifications module** — insert + list + mark-read; emit socket to recipient; toast only for eligible types.  
6. **Realtime** — AppShell site-wide socket; presence debounce; rooms join authz; directory `?online=`.  
7. **Web UI** — `/community` chat + members (online filter); DM surfaces; bell + toasts; `/me` blocks; minimal `/admin` moderation.  
8. **QA** — automated tests per acceptance; RTL screenshots; rate-limit smoke; request M3 sign-off.

## Dependencies

| Dependency | Notes |
|---|---|
| M2 approved identity + Socket auth | Done |
| Clerk session token on socket | Existing |
| Owner OPEN-011 confirmation | Blocks DM report evidence implementation |
| No Redis / no new vendors | Per HLD |

## Risks

1. Unapproved context window → delay DM reporting UI.  
2. Presence debounce perceived as “stale online”.  
3. Accidental public-chat toast spam — hard-exclude in notification service.  
4. Scope creep into game invites — **forbidden in M3**.

## Out of scope reminder

No M4+ games/Study/events CMS. No invented channels, uploads, or ELO. Preserve M2 visuals and auth UX.
