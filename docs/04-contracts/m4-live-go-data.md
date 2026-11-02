# Contract: M4 Live Go — Database & Game State

**Status:** APPROVED 2026-10-30; game chat `0005_game_chat` 2026-11-02 (ADR-017)  
**Migrations:** `0003_m4_live_go`, `0004_notification_dismissed`, `0005_game_chat`

## 1. `game_invites`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| kind | text | `'live'` |
| inviter_id / recipient_id | uuid FK | |
| status | text | pending\|accepted\|rejected\|expired\|cancelled |
| settings | jsonb | boardSize, clockMode, komi, handicap, colorMode |
| created_at / expires_at / resolved_at | timestamptz | Live TTL = +5m |
| game_id | uuid null FK games | |

Indexes: pending by recipient/inviter; expires_at.

## 2. `games`

Immutable setup + versioned mutable state (single row for ordinary moves).

| Column | Notes |
|---|---|
| mode | `'live'` |
| status | active\|finished |
| phase | active_play\|scoring\|finished |
| board_size, komi, handicap, clock_mode | locked |
| color_mode | random\|inviter_black\|inviter_white |
| black_user_id / white_user_id | uuid |
| version | int, optimistic lock |
| engine_blob | serialize() |
| board_snapshot / move_history / overlays / clock / result | jsonb |
| last_activity_at | idle 48h |
| created_at / finished_at | |

**Ordinary move:** `UPDATE games SET …, version = version+1 WHERE id=? AND version=?`

## 3. `live_game_occupancy` (required)

| Column | Type |
|---|---|
| user_id | uuid PK FK users |
| game_id | uuid FK games NOT NULL |
| created_at | timestamptz |

Enforces **one active Live game per user** regardless of color. Insert both players on accept; **delete both in the same short transaction** that finishes the game.

**Recovery:** if `games.status=finished` but occupancy rows remain, delete occupancy (tested path on read/finish retry).

## 4. `game_command_receipts` (durable idempotency)

| Column | Type |
|---|---|
| game_id | uuid FK |
| command_id | text |
| actor_user_id | uuid |
| version_after | int |
| created_at | timestamptz |

**PRIMARY KEY / UNIQUE (game_id, command_id)**.  
Bounded in-row ID lists are optional caches only — **eviction must never allow re-execution**.

## 5. Transactions

| Op | Boundary |
|---|---|
| Accept invite | TX: invite CAS + insert game + 2 occupancy + close siblings + notifications |
| Ordinary command | Conditional game UPDATE + insert receipt (same TX recommended) |
| Finish | TX: game finished + delete occupancy (+ receipt) |

## 6. `game_chat_messages` (ADR-017)

Per-game room chat — **independent** of `chat_threads` / `chat_messages`.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| game_id | uuid FK games ON DELETE CASCADE | |
| sender_user_id | uuid FK users | Stable internal id; no embedded profile |
| body | text | Validated; max `CHAT_BODY_MAX` |
| client_command_id | text | Idempotency |
| created_at | timestamptz | |

Indexes: `(game_id, created_at)`; **UNIQUE** `(game_id, sender_user_id, client_command_id)`.

History retained after game finish. No merge into community DMs.

## 7. Out of scope

Async tables, normalized moves (unless profiling), Redis, admin analytics, spectator rows (AuthZ role reserved only).
