# M4 Live Go — Automated Test Matrix

**Status:** APPROVED 2026-10-30 — execute during implementation; PASS only when run

## Engine

| ID | Scenario |
|---|---|
| ENG-REG-01 | POC suite remains green |
| ENG-SEKI-02 | Curated seki fixtures (GAP-SEKI-01) |
| UI-GOBAN-01 | Early Goban React smoke (D5) — pass or document gap |

## Invitations

| ID | Scenario |
|---|---|
| INV-01…04 | Create defaults / reject / expire / accept locks settings |
| INV-05 | Concurrent double-accept → exactly one game |
| INV-06…10 | BUSY_LIVE / BLOCKED / expired / siblings / suspended |
| INV-11 | Explicit logout cancels pending Live invites |
| INV-12 | Transient disconnect <10s does **not** cancel |
| INV-13 | colorMode random / inviter_black / inviter_white + handicap rules (D2) |

## Occupancy & finish

| ID | Scenario |
|---|---|
| OCC-01 | Accept inserts two occupancy rows; second Live blocked |
| OCC-02 | Finish TX deletes both occupancy rows |
| OCC-03 | Recovery clears occupancy if game already finished |

## Moves / version / idempotency

| ID | Scenario |
|---|---|
| MOVE-01…08 | Legal/illegal/turn/phase/403/broadcast-after-commit |
| VER-01 | Stale version → 409 |
| IDEM-01 | Same commandId returns stored result; no double apply |
| IDEM-02 | Receipt survives beyond any bounded ring eviction — re-submit does not re-apply |

## Endings / scoring / clock / idle

| ID | Scenario |
|---|---|
| END-* | Resign, mutual undo, mutual no-winner |
| SCORE-* | Dead stones, confirm, dispute/resume |
| CLOCK-* | absolute_15m timestamp authority; runs while disconnected (D4) |
| IDLE-01 | 48h untimed → mutual no-winner affordance only |
| IDLE-02 | No unilateral end; no convert-to-async control (D1/D3) |

## Continuity / notify

| ID | Scenario |
|---|---|
| RECON-* / ACTIVE-01 / REPLAY-01 | Reconnect, return chip, private replay |
| REPLAY-02 | History list both participants; stranger 403 on `/replay` |
| REPLAY-03 | Reconstruct plies incl. approved undo, handicap, pass/capture; final grid matches snapshot |
| REPLAY-04 | Finished commands → 410; hub cursor pagination |
| PROP-01 | No-winner: initiator cannot self-respond; opponent accept/reject; withdraw |
| PROP-02 | Undo: requester cannot self-respond; opponent only; withdraw; stale respond |
| NOTIF-D8 | `game.live_turn` once per version when opponent online outside room; none when in room |

## Game chat (ADR-017)

| ID | Scenario |
|---|---|
| GCHAT-01 | Message in game A never appears in game B |
| GCHAT-02 | Community DM history / unread unchanged by game chat |
| GCHAT-03 | Non-participant GET/POST/`game-chat:join` → 403 |
| GCHAT-04 | Finished game: GET ok, POST → 410 |
| GCHAT-05 | Idempotent `clientCommandId`; reconnect no duplicate UI rows |
| GCHAT-06 | Suspended cannot send |

## Gates

`npm run typecheck`, `lint`, `test`, `build` at each slice checkpoint.
