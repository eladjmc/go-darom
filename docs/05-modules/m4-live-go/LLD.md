# M4 Live Go — Low-Level Design

**Status:** APPROVED 2026-10-30 (owner D1–D8 + engineering corrections); game chat ADR-017 2026-11-02  
**Milestone:** M4 Live Go only (async = M5)  
**Authority:** Product Baseline v0.1, BUSINESS_RULES BR-GAME-*, HLD v0.2, ADR-009 / GoEnginePort, ADR-017, M1 POC, `M4_PLANNING_GATE.md`  
**Gate:** Do not mark M4 complete or start M5 without owner manual approval

## 1. Goals

1. Live invite → accept/reject/expire/conflict with atomic invariants  
2. Server-authoritative legal moves on 9×9 / 13×13 / 19×19 via `GoEnginePort`  
3. Single-row version-checked game-state UPDATE + **durable** command idempotency  
4. Pass, resign, mutually approved **own-move undo**, Japanese scoring (dead stones / resume)  
5. Mutual no-winner (including after 48h untimed idle — D1)  
6. Optional absolute 15m clocks (keep running on disconnect — D4), handicap, komi, colors (D2)  
7. Reconnect / multi-tab / **חזרה למשחק**  
8. Private participant replay only  

## 2. Non-goals (M4)

- Async / Live→Async conversion UI or mode flip (D3 → M5)  
- Study Boards, public lobby, rankings, ACC game analytics  
- Unilateral idle termination  
- Redis / new vendors  

## 3. Module boundaries

| Module | Owns |
|---|---|
| `InvitationService` | Live invite lifecycle; atomic accept; logout cancel |
| `GameService` | State machine, clocks, scoring, finish+occupancy release, turn soft-notify (D8) |
| `GoEnginePort` | Rules/scoring primitives |
| Notifications | Invite + subtle turn notices |
| GameChat (`GameChatService`) | Per-game `game_chat_messages` (ADR-017; supersedes D6) |
| Presence | Online checks; **not** invite cancel on transient disconnect |

Ordinary moves: **one conditional UPDATE**. Accept / finish: **short transactions**.

## 4. State machine

```
pending_invite → active_play → scoring → finished
```

Overlays: `undoProposal`, `noWinnerProposal`, `idleOffer` (mutual no-winner only after 48h untimed — **no convert control**), `clock`.

Transitions: two passes → `beginScoring()` (GAP-PHASE-01); dead-stone mutual confirm → score finish; dispute → resume; resign / mutual no-winner / clock timeout → finished.

## 5. Live invitations

Defaults: 9×9, `clockMode=none`, `colorMode=random`, komi 6.5 (0.5 when handicap>0 if omitted), handicap 0.

| Event | Behavior |
|---|---|
| Create | Snapshot settings; `game.invite` bell+toast; TTL 5m |
| Reject / expire / cancel | Terminal statuses |
| **Explicit logout** (inviter) | Cancel pending Live invites (OPEN-004) |
| Transport disconnect | **10s grace; do not cancel** invites |
| Accept | **Transaction:** validate TTL, blocks, suspend, occupancy free, invite pending, inviter online → insert `games` + **both** `live_game_occupancy` rows → close invite → invalidate sibling pending Live invites → notify |

Concurrent accept: DB uniqueness on occupancy + invite status CAS; exactly one winner (INV-05).

## 6. Colors & handicap (D2)

- `colorMode`: `random` | `inviter_black` | `inviter_white`  
- Handicap > 0: Black gets stones; White to move; colorMode still assigns who is Black  
- Limits: ≤4 on 9×9; ≤9 on 13/19; editable komi  

## 7. Commands (REST primary — D7)

```ts
{
  expectedVersion: number;
  commandId: string; // client UUID
  type: "play" | "pass" | "resign" | "propose_undo" | "respond_undo" | "withdraw_undo"
    | "propose_no_winner" | "respond_no_winner" | "withdraw_no_winner"
    | "mark_dead" | "clear_dead" | "confirm_score" | "dispute_score" | "resume";
  payload?: unknown;
}
```

### Idempotency (correction)

1. Table `game_command_receipts(game_id, command_id PK/unique, version_after, response_snapshot)` — **durable**.  
2. On submit: if receipt exists → return stored projection (**never** re-apply).  
3. Optional in-row ring is cache only; eviction must not allow re-execution.  
4. New `commandId` + stale `expectedVersion` → `409 VERSION_CONFLICT`.  

### Ordinary play/pass write path

AuthZ → load → receipt check → version check → engine → **single** `UPDATE … WHERE version = expected` → insert receipt → emit `game:update`.

### Finish path (correction)

Short transaction: set `games` finished + result; **delete** both occupancy rows; insert receipts as needed. Recovery: startup/read path if `status=finished` but occupancy remains → delete occupancy (tested).

## 8. Clocks (D4)

`none` | `absolute_15m`. Remaining derived from timestamps; disconnect does **not** pause. Timeout → result `timeout`.

### Undo + clock (M4 correction)

Accepted undo of the latest own play/pass:

1. Truncate `moveHistory` through the retracted board move; engine `undo()` restores board/turn/captures.  
2. **Clock:** do **not** refund time spent on the retracted move. Deduct any elapsed thinking time from the current `runningFor`, then set `runningFor` to the restored `toMove`. Documented; not silent rewind of remaining ms.

## 8b. Undo proposal (M4 correction)

- Only the player who committed the **latest retractable** `play`/`pass` may `propose_undo`.  
- Opponent approves/rejects via `respond_undo`. One pending proposal max.  
- Requester may `withdraw_undo` while pending; cannot self-respond (`UNDO_SELF`).  
- Overlay: `{ by, status, moveType, payload?, historyIndex }`.  
- Reject → clear overlay; board unchanged. Stale/self responses → `400` with stable codes.  
- No multi-move takebacks in M4.

## 8c. Mutual no-winner proposal ownership

- `propose_no_winner` records initiator consent.  
- Only opponent may `respond_no_winner` (`NO_WINNER_SELF` otherwise).  
- Initiator may `withdraw_no_winner` before opponent answers.  
- Accept → authoritative `finished` / `no_winner`; reject or withdraw → clear overlay and continue.

## 9. Idle 48h (D1, D3)

Untimed only: surface **mutual no-winner** proposal. No unilateral end. **No** Live→Async control in M4.

## 10. Occupancy

`live_game_occupancy(user_id PK, game_id, created_at)` — one row per user in an active Live game (covers both colors).

## 11. Realtime (D7, D8)

- Socket: join `game:{id}`; push `game:update` / `game:ended` after commit  
- Commands: REST only  
- Turn soft-notify: if opponent online and **not** in game room, at most **one** subtle notice per committed turn (dedupe by `gameId+version`); not `game.turn` spam; in-room players rely on `game:update`  

## 11b. Game room chat (ADR-017 — supersedes D6)

**Independent** of community DMs. Never read/write `chat_messages`; never touch DM unread or notification rows.

| Concern | Rule |
|---|---|
| Storage | `game_chat_messages(id, game_id, sender_user_id, body, client_command_id, created_at)` |
| AuthZ (M4) | Only black/white participants may **read** or **send**; suspended cannot send |
| Future | Resolve access via role (`participant` \| `spectator`) — spectators **not** implemented in M4 |
| Send | Active games only (`status=active`); finished → history readable, send disabled |
| Transport | REST `GET/POST /games/:gameId/chat`; Socket `game-chat:join` → room `game-chat:{id}`; broadcast `game-chat:new` **after** persist |
| Idempotency | Unique `(game_id, sender_user_id, client_command_id)` |
| Isolation | Game A history ≠ Game B; no bleed into community DM |
| Rate / validation | Same body limits as chat (`CHAT_BODY_MAX`); per-user send rate limit |

## 12. UI

- Games hub `/play`: compact dashboard (**משחקים**, **משחק חדש**, המשחק שלי, הזמנות נכנסות/יוצאות, **משחקים קודמים** with cursor pagination + **צפייה במשחק**)  
- Private participant replay on finished `/play/:gameId`: read-only board + First/Prev/Next/Last scrubber; no auto-redirect when opened from history; live completion still returns both players to `/play`  

- Live invite also from DM header (**הזמנה למשחק**) via reusable `InviteFlowModal` with preselected/locked opponent — same REST + notifications; stay in DM after send  
- Board-first `/play/:gameId`; Hebrew RTL; responsive; compact controls (Pass primary; Undo / More secondary)  
- Illegal moves → branded Hebrew **toast** (stable `code`); never raw engine strings  
- Dedicated game chat: title **צ'אט המשחק**; **always visible** compact log under players/actions in the sidebar (two-column desktop: board | sidebar) — never under the board, no toggle/modal  
- OGS-inspired lines (nick + text + time); single-line composer; independent log scroll  
- Mobile: board → controls → always-visible chat in page flow  
- Local unread hint when chat collapsed during active game only — **not** global DM badge  
- Global **חזרה למשחק** from `/games/active`  
- Production board: SnapshotBoard (+ BoardViewport); Goban not shown when paint fails (D5)  

## 13. Security

Server AuthZ; private games; no admin spectate in M4; blocks block invites not mid-game play; game-chat join requires participant AuthZ (knowing `gameId` is insufficient).

## 14. POC gaps

GAP-PHASE-01 Games-owned; GAP-SEKI-01 fixtures; GAP-UI-01 Goban smoke → adopt or document.
