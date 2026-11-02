# M4 Product Correction — Dedicated Game Room Chat

**Date:** 2026-11-02  
**Decision:** ADR-017 (supersedes planning-gate D6)  
**Status:** Implemented — awaiting owner **manual acceptance** (do not mark M4 complete / start M5)

## What changed

- Community DMs and game-room chat are fully independent.
- Persistence: `game_chat_messages` (migration `0005_game_chat`).
- REST: `GET/POST /games/:gameId/chat`
- Socket: `game-chat:join` / `game-chat:leave` / `game-chat:new` (persist-before-broadcast)
- UI title: **צ'אט המשחק**; **non-modal** layout dock (desktop column / mobile below board) — no backdrop
- Finished games read-only; draft preserved while collapsed
- No DM unread, notifications, or history bleed

## Checks run

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test` | PASS (incl. `game-chat-service.test.ts`) |
| `npm run build` | PASS |
| `npm run db:migrate` | PASS (`0005_game_chat`) |

## Manual acceptance still required

Use `docs/06-quality/m4-live-go-acceptance.md` game-chat items (two users, two games, isolation, DM unread, reconnect, third-party 403, finished read-only, desktop+mobile).
