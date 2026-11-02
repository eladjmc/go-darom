# Contract: M3 Community Chat, DMs, Presence, Notifications & Trust

**Milestone:** M3  
**Status:** APPROVED with M3 LLD (owner 2026-10-30)  
**Auth:** Clerk Bearer JWT unless noted; caller must be onboarded member (same gate as directory) except where noted  
**Transports:** REST for snapshots/CRUD; Socket.IO for live delivery (same services)

## Conventions

- All successful writes return durable server ids and `threadSeq` / revision fields.
- Errors: **401** unauthenticated · **403** forbidden/suspended/blocked · **404** missing · **409** conflict · **429** rate limit · **4xx/5xx** JSON `{ "error": "Hebrew safe message" }` — never stack traces.
- Message `body`: plain text; max length **2000** chars trimmed; reject empty; sanitize control chars (no HTML render as markup).

---

## Presence & directory

### `GET /members?q=&online=`

Extends M2.

| Query | Meaning |
|---|---|
| `q` | Nickname `ilike` (server) |
| `online=1` \| `true` | Only members with ≥1 active presence connection |

Ordering: `nickname ASC`, `id ASC`. Soft limit **50** (pagination still M3-optional follow-up).  
**403** if caller not onboarded.

Presence itself is not a REST resource; clients use Socket.IO (below).

---

## Community chat

### `GET /chat/community/messages?beforeSeq=&limit=`

Returns `{ items: Message[], nextBeforeSeq: number|null }` newest-first page for history scroll. Default `limit=50` (max 100).

### `POST /chat/community/messages`

Body: `{ body, clientCommandId }`  
**200** `{ message }` after persist. Idempotent on `(senderId, clientCommandId)`.

### `POST /chat/community/read`

Body: `{ lastReadSeq }` — updates caller watermark.

### `DELETE /chat/community/messages/:id` (admin or own)

Soft-delete; broadcast `chat:messageDeleted`.

---

## Direct messages

### `GET /dms/threads`

List threads for caller with peer `{ id, nickname, avatarUrl }`, `unreadCount`, `lastMessagePreview` (no full history).

### `POST /dms/threads`

Body: `{ peerUserId }` — get-or-create DM thread.  
**403** if mutual block either direction or peer suspended/not onboarded.

### `GET /dms/threads/:threadId/messages?beforeSeq=&limit=`

Participants only.

### `POST /dms/threads/:threadId/messages`

Body: `{ body, clientCommandId }`  
**403** if blocked. Creates notification + toast-eligible push for peer.

### `POST /dms/threads/:threadId/read`

Body: `{ lastReadSeq }`

---

## Blocks

### `GET /me/blocks`

List blocked members (nickname/photo only).

### `POST /me/blocks`

Body: `{ userId }` — block (idempotent).

### `DELETE /me/blocks/:userId`

Unblock.

Effects: reject new DMs and (future) Live/async/Study invites; **do not** hide public chat or end games.

---

## Reports

### `POST /reports`

Body:

```json
{
  "targetType": "public_message" | "dm_message",
  "messageId": "uuid",
  "reason": "string"
}
```

Creates report; for DM, attaches **bounded context** per OPEN-011 (approved): up to 5 messages before + reported + up to 5 after; access scoped to that report only; admin reads of DM evidence are audit-logged.

### Admin

- `GET /admin/reports?status=`
- `POST /admin/reports/:id/resolve` `{ resolution, note? }`
- `GET /admin/reports/:id` — includes bounded DM evidence when applicable; **audit log write** on read of DM evidence
- `POST /admin/users/:id/suspend` `{ reason }`
- `POST /admin/users/:id/unsuspend` `{ reason }`
- `DELETE /admin/chat/messages/:id` — public soft-delete

All admin routes **403** for non-admin.

---

## Notifications

### `GET /notifications?cursor=&limit=`

Own notifications, newest first.

### `POST /notifications/dismiss`

Body `{ "ids": ["uuid", ...] }`. Sets `dismissed_at` for the **current recipient only**. Dismissed rows are omitted from `GET /notifications` and unread counts. Does **not** cancel game invites or affect other users’ copies. Emits `notification:dismissed` `{ ids }` to the recipient’s user room for cross-tab sync.

### `POST /notifications/read`

Body: `{ ids?: uuid[], all?: true }`

### Types (M3 emitters vs reserved)

| `type` | M3 emit? | Toast? |
|---|---|---|
| `dm.message` | yes | yes |
| `moderation.report_resolved` | optional | no |
| `game.invite` / `game.turn` / `study.invite` | **reserved schema only** | yes when M4+ emits |

Public chat messages: **never** create per-message notifications or toasts.

---

## Socket.IO

Handshake: Bearer/Clerk token → internal user id (M2). Re-auth on reconnect.

### Client → server (commands may mirror REST; REST remains supported)

| Event | Payload | Notes |
|---|---|---|
| `chat:join` | `{ room: "community" \| { dmThreadId } }` | Authz checked |
| `chat:leave` | same | |
| `chat:send` | `{ room, body, clientCommandId }` | Optional; may use REST only in M3 |

### Server → client

| Event | Payload |
|---|---|
| `presence:snapshot` | `{ onlineUserIds: string[] }` |
| `presence:user` | `{ userId, online }` |
| `chat:message` | `Message` |
| `chat:messageDeleted` | `{ threadId, messageId }` |
| `notification:created` | `Notification` |
| `notification:toast` | subset of notification for UI toast (DM only in M3) |

### Message DTO

```json
{
  "id": "uuid",
  "threadId": "uuid",
  "threadSeq": 1,
  "body": "string",
  "createdAt": "iso",
  "deletedAt": null,
  "sender": { "id": "uuid", "nickname": "string", "avatarUrl": "string|null" }
}
```

---

## Rate limits (initial)

| Action | Guideline |
|---|---|
| Community/DM send | tight per-user limit (e.g. 30/min) |
| Report create | low (e.g. 10/hour) |
| Block | moderate |

Exact numbers tunable in implementation without changing product meaning.
