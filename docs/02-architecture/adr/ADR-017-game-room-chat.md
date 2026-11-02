# ADR-017: Dedicated Game Room Chat (supersedes M4 D6)

**Status:** APPROVED 2026-11-02 (owner product correction)  
**Supersedes:** M4 planning gate **D6** (reuse participant DM as in-game side chat)

## Context

M4 initially reused the community DM thread as the game-room chat. That mixed persistent community history with ephemeral game talk, polluted DM unread badges, and made per-game isolation impossible.

## Decision

Maintain **two independent messaging systems**:

1. **Community DMs** — existing `chat_threads` / `chat_messages`; global Messages UI; unread badges.  
2. **Game room chat** — new `game_chat_messages` keyed by `game_id`; only messages written in that room; no DM notifications or unread coupling.

M4 authorization: only the two game participants may read/send. AuthZ is designed so future **spectators** can be granted read (and optionally send) without redesigning storage or rooms — **spectators are not implemented in M4**.

## Consequences

- Migration `0005_game_chat`  
- REST `GET/POST /games/:gameId/chat` + Socket `game-chat:join` / `game-chat:new`  
- Finished games: history retained, send disabled  
- Docs: LLD, contracts, acceptance, planning gate D6 marked superseded  
