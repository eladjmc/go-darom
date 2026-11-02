# M4 Planning Gate — Approved

**Date:** 2026-10-30  
**Prerequisite:** M3 APPROVED (`M3_FINAL_ACCEPTANCE_REPORT.md`)  
**Status:** Owner approved overall direction with D1–D8 + engineering corrections. **Implementation authorized.**  
**Do not** start M5 or mark M4 complete without owner manual approval.

## Planning package

| Doc | Path | Status |
|---|---|---|
| LLD | `docs/05-modules/m4-live-go/LLD.md` | APPROVED (with corrections below) |
| REST + Socket | `docs/04-contracts/m4-live-go-api.md` | APPROVED |
| DB / game state | `docs/04-contracts/m4-live-go-data.md` | APPROVED |
| Roadmap | `docs/07-delivery/M4_IMPLEMENTATION_PLAN.md` | APPROVED |
| Test matrix | `docs/06-quality/m4-live-go-test-matrix.md` | APPROVED |
| Manual acceptance | `docs/06-quality/m4-live-go-acceptance.md` | APPROVED |

## D1–D8 — recorded decisions

| ID | Decision |
|---|---|
| **D1** | After 48h inactivity in **untimed** Live: allow proposing **mutual no-winner** only. **No unilateral termination** in M4. |
| **D2** | Colors: `random` **or** explicit inviter Black/White. With handicap: **Black receives handicap stones; White moves first**. Editable komi; approved handicap limits (≤4 on 9×9; ≤9 on 13/19). |
| **D3** | Defer functional Live→Async conversion to **M5**. **Do not** expose a nonfunctional convert control in M4. |
| **D4** | Absolute clocks **keep running** during disconnect; authority = server timestamps. |
| **D5** | Prefer existing **Goban** renderer if early React smoke passes; otherwise document gap before custom renderer. |
| **D6** | ~~Reuse participant↔participant **DM** as in-game side chat.~~ **SUPERSEDED 2026-11-02** by **ADR-017**: dedicated `game_chat_messages` per `gameId` — never mix with community DMs. |
| **D7** | **REST** primary for game commands; Socket.IO for authoritative `game:update` + invite notifications. |
| **D8** | Subtle non-spamming turn notice when Live opponent is online **outside** the game room; **no duplicate** per turn. |

## Required engineering corrections (binding)

1. **`live_game_occupancy`** enforces one active Live game per user (both colors).  
2. **Game finish + occupancy release** in one short transaction, or a clearly tested recovery path.  
3. **Command idempotency:** bounded recent-ID ring alone is insufficient — durable receipt so an evicted ID cannot re-execute.  
4. **Atomic invite accept** under concurrent requests — verified by test.  
5. Ordinary moves: **single-row version-checked UPDATE** (HLD).  
6. **Goban integration smoke early**, before full game-room UI.  
7. **Explicit logout** cancel ≠ transient disconnect (+ 10s grace).

## Approval checklist

- [x] Planning baseline accepted with corrections  
- [x] D1–D8 answered  
- [x] Authorization to implement M4 under approved architecture  
- [ ] M4 complete — **owner manual approval required later**
