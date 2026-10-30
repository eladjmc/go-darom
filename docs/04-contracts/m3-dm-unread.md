# M3 — Private-message unread policy

**Status:** Implemented with existing schema (no migration required)

## Source of truth

Unread private messages are derived from durable tables already in M3:

- `chat_messages.thread_seq` — ordered messages in a DM thread  
- `chat_thread_reads (thread_id, user_id, last_read_seq)` — per-user read watermark  

For viewer `U` in thread `T`:

```text
unreadCount(T,U) = COUNT messages in T
  WHERE thread_seq > last_read_seq(T,U)
    AND sender_id <> U
    AND deleted_at IS NULL
```

Navbar Messages badge:

```text
totalUnread(U) = SUM unreadCount(T,U) over DM threads where U is a participant
```

## Mark-read policy

- Opening an active DM conversation loads history and calls `POST /dms/threads/:id/read` with `lastReadSeq = max visible message seq`.  
- Sending a message also advances the sender’s watermark to that message’s seq.  
- Watermark only moves forward (`GREATEST`).  
- Multi-tab / refresh: clients refetch `GET /dms/unread-total` and thread list; server emits `dm:unread { total }` to `user:{id}` after inbound DM and after mark-read.

## Separation from system notifications

- `notifications` table remains for bell (game/study invites, etc.).  
- `dm.message` notifications may still be created for toast delivery, but **do not** increment the bell badge.  
- Messages icon badge uses **only** `totalUnread` from chat read watermarks (`GET /dms/unread-total`, socket `dm:unread`).  
- Bell badge uses `GET /notifications/unread-count` (unread rows where `type <> 'dm.message'`).

## Schema

No additional migration: unread continues to use existing `chat_thread_reads` + `chat_messages`.
