# Contract: M4 Live Go — REST & Socket.IO

**Status:** APPROVED 2026-10-30; game chat corrected 2026-11-02 (ADR-017)  
**Transport:** REST = game commands (D7) + game chat; Socket.IO = `game:update` / invite notifications / `game-chat:*`  
**Auth:** Clerk Bearer / socket handshake; server member + not-suspended

## 1. REST — Invitations

### `POST /invites/live`

```json
{
  "recipientId": "uuid",
  "boardSize": 9,
  "clockMode": "none",
  "komi": 6.5,
  "handicap": 0,
  "colorMode": "random"
}
```

| Field | Values |
|---|---|
| `boardSize` | `9` \| `13` \| `19` (default 9) |
| `clockMode` | `none` \| `absolute_15m` |
| `colorMode` | `random` \| `inviter_black` \| `inviter_white` |
| `handicap` | 0…4 (9×9) / 0…9 (13/19) |
| `komi` | editable; default 6.5, or 0.5 when handicap>0 if omitted |

### `POST /invites/live/:inviteId/accept` → `201 { gameId, game }`

Errors: `INVITE_EXPIRED`, `INVITE_INVALID`, `BLOCKED`, `BUSY_LIVE`, `INVITER_UNAVAILABLE`.

### `POST /invites/live/:inviteId/reject` · `POST …/cancel` · `GET /invites/live/mine` · `GET /invites/live/:inviteId`

Participant-scoped `GET /invites/live/:inviteId` returns authoritative status + `expiresAt` for notification-card sync (pending or terminal).

## 2. REST — Games

| Method | Path | Notes |
|---|---|---|
| GET | `/games/active` | Active Live summary or null (**חזרה למשחק**) |
| GET | `/games/:gameId` | Full projection (participants) |
| GET | `/games/:gameId/replay` | Finished projection; participants only (403 stranger) |
| GET | `/games/mine?status=` | `active` \| `finished`; finished supports cursor pagination |

**Finished history pagination:** `GET /games/mine?status=finished&limit=1..50&cursor=`  
Response `{ items: GameProjection[], nextCursor: string | null }`. Cursor is opaque (`finishedAt~id`), newest first. Stable tie-break on `id`.

**Private replay:** Clients reconstruct move-by-move boards from `moveHistory` + handicap via `GoEnginePort` (`reconstructReplayPositions`). Approved undo truncates history before `respond_undo`, so remaining `play`/`pass` plies do not reintroduce undone moves. Final reconstructed grid must match persisted `board` snapshot.
| POST | `/games/:gameId/commands` | Authoritative commands |
| GET | `/games/:gameId/chat` | Game-chat history (`?before=&limit=`); participants only |
| POST | `/games/:gameId/chat` | Send game-chat message `{ body, clientCommandId }` |

### Scoring overlay (projection `overlays.scoring`)

Authoritative engine view — **not** a client-side score algorithm:

| Field | Notes |
|---|---|
| `ownership` | Row-major `[y][x]`: `0` dame, `1` black territory, `2` white (empty points from `scoring_positions`) |
| `proposedRemoved` | Dead-stone marks |
| `provisionalScore` | Japanese breakdown while `phase=scoring` |
| `blackConfirmed` / `whiteConfirmed` | Mutual agreement |
| `committed` | `true` after both confirm; **retained** on finished score games so territory survives refresh |

Resignation / timeout / `no_winner` do **not** invent territory ownership. `dispute_score` / `resume` clears `overlays.scoring`.

### Command body

```json
{
  "expectedVersion": 12,
  "commandId": "uuid",
  "type": "play",
  "payload": { "x": 3, "y": 4 }
}
```

Types: `play` | `pass` | `resign` | `propose_undo` | `respond_undo` | `withdraw_undo` | `propose_no_winner` | `respond_no_winner` | `withdraw_no_winner` | `mark_dead` | `clear_dead` | `confirm_score` | `dispute_score` | `resume`

| Status | Meaning |
|---|---|
| 200 | Committed or durable idempotent replay of `commandId` |
| 400 | Illegal / wrong phase / turn — body `{ error, code }` (`OCCUPIED`, `WRONG_TURN`, `ILLEGAL_MOVE`, `UNDO_NOT_OWN_MOVE`, `UNDO_PENDING`, …) |
| 403 | Not participant / suspended |
| 409 | `VERSION_CONFLICT` + fresh game |
| 410 | Finished |

### Undo

- `propose_undo`: only if actor owns the latest retractable `play`/`pass`; sets overlay `undo`.  
- `respond_undo` `{ accept }`: **opponent only** (`UNDO_SELF` if requester); accept truncates history + engine undo + clock policy in LLD §8.  
- `withdraw_undo`: **requester only** clears pending overlay (`UNDO_NOT_OWNER` otherwise).

### Mutual no-winner

- `propose_no_winner`: records initiator consent; sets overlay `noWinner`.  
- `respond_no_winner` `{ accept }`: **opponent only** (`NO_WINNER_SELF` if initiator tries to self-approve/reject). Accept → finish `no_winner`; reject → clear overlay.  
- `withdraw_no_winner`: **initiator only** clears pending proposal before opponent answers.

**Idempotency:** durable `game_command_receipts`; never re-apply after receipt exists (even if an in-memory/row ring evicted the id).

## 3. Socket.IO

| Direction | Event | Role |
|---|---|---|
| C→S | `game:join` / `game:leave` | Room membership for pushes + D8 “in room” detection |
| S→C | `game:update` | `{ gameId, version, game }` after commit |
| S→C | `game:ended` | `{ gameId, version, game, result }` after finish commit (full `game` included) |
| C→S | `game-chat:join` / `game-chat:leave` | `{ gameId }` — AuthZ then join `game-chat:{gameId}` |
| S→C | `game-chat:new` | `{ message: GameChatMessageDto }` after persist |
| S→C | existing notification pipeline | Invites; subtle turn notice (D8) |

No Socket game-command submission in M4. Game-chat send is REST; realtime is push-only.

## 4. Notifications

| Type | Toast | When |
|---|---|---|
| `game.invite` | yes | Invite created — enriched payload for actionable card |
| `game.invite_accepted` | yes | Accept (inviter); payload includes `gameId` |
| `game.invite_rejected` | yes | Reject (inviter) |
| `game.invite_cancelled` | yes | Cancel / superseded when a player enters another Live game |
| `game.live_turn` | subtle, once per version | Opponent online, not in room (D8); not emitted to in-room tabs |

`game.invite` payload (UI must not show raw ids): `inviteId`, `inviterNickname`, `inviterAvatarUrl`, `settings`, `expiresAt`. Notification center renders accept/reject; toast opens `/notifications?invite=…`. Authorization remains server-side on accept/reject.

`game.turn` remains reserved for **M5 async**. No Live→Async controls (D3).

## 5. Game room chat (ADR-017 — supersedes D6)

**Not** community DM. Dedicated per-`gameId` history.

### `GET /games/:gameId/chat?before=&limit=`

Returns `{ items: GameChatMessageDto[], nextBefore: string | null }` (newest page; `before` = exclusive `createdAt` ISO cursor).  
403 if not participant. Does not touch DM unread.

### `POST /games/:gameId/chat`

```json
{ "body": "…", "clientCommandId": "uuid" }
```

| Status | Meaning |
|---|---|
| 201 | Persisted (+ `game-chat:new` broadcast) |
| 200 | Idempotent replay of same `clientCommandId` |
| 400 | Empty / too long / rate limited |
| 403 | Not participant / suspended |
| 410 | Game finished — chat read-only |

`GameChatMessageDto`: `{ id, gameId, body, createdAt, sender: { id, nickname, avatarUrl } }`.

**Must not:** write `chat_messages`, emit `dm.message`, increment DM unread, create notification rows.
