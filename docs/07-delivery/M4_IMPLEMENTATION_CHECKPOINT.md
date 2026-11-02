# M4 Live Go — Implementation Checkpoint

**Date:** 2026-10-30  
**Status:** IN PROGRESS — not complete; **no M5**; awaiting owner manual acceptance later  
**Planning:** APPROVED (`M4_PLANNING_GATE.md` D1–D8 + engineering corrections)

## Delivered so far

- Docs updated with locked decisions  
- Migration `0003_m4_live_go`: `games`, `game_invites`, `live_game_occupancy`, `game_command_receipts`  
- InvitationService (create/accept/reject/cancel/expire/logout cancel)  
- GameService (REST commands, version CAS, durable receipts, finish+occupancy TX, recovery, clocks, scoring/undo/resign/no-winner, D8 turn notice)  
- Socket `game:join` / `game:update` (commands remain REST)  
- Web: `/play`, `/play/:gameId`, **חזרה למשחק**, DM side-link, SnapshotBoard default  
- Goban smoke: import PASS; happy-dom mount gap documented (`M4_GOBAN_SMOKE.md`)  

## Gates (this checkpoint)

```text
npm run typecheck → PASS
npm run lint      → PASS
npm test          → PASS (shared 11 · go-engine 20 · api 22 · web 50)
npm run build     → PASS
npm run db:migrate → applied 0003_m4_live_go
```

## Still polish before claiming M4 done

- Richer invite UI from member directory (not UUID paste)  
- Dead-stone click UX beyond confirm/resume  
- Browser Goban mount verification (FU-M4-GOBAN-01)  
- Broader integration tests against live DB for concurrent accept  
- Full walkthrough of `m4-live-go-acceptance.md` by owner  

## Manual acceptance

Use `docs/06-quality/m4-live-go-acceptance.md` when ready for sign-off.  
**Do not mark M4 complete or start M5 without owner approval.**
