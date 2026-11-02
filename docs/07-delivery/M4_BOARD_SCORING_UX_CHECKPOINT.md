# M4 Board Coordinates, DM Context & Territory Visualization — checkpoint

**Date:** 2026-11-02  
**Status:** Delivered for owner manual acceptance — **M4 not complete**; **no M5**

## Changes

1. **Coordinates** on `SnapshotBoard`: A–T skip I; rows bottom→top; labels in wood margins; `data-coord` on intersections; stable under SVG resize / BoardViewport pan-zoom.
2. **Game-room chat**: superseded by ADR-017 dedicated `game_chat_messages` (title **צ'אט המשחק**); no longer reuses community DM.
3. **Territory**: engine `ownership` markers during scoring; dead stones with X + opacity; provisional score labeled; on mutual score agree keep `overlays.scoring.committed` so refresh restores territory + marks. Resume/dispute clears overlay. Resign/timeout/no-winner do not invent territory.

## Evidence

`docs/07-delivery/visual-qa/m4-board-scoring-ux-2026-11-02/`  
Contract note: `docs/04-contracts/m4-live-go-api.md` (scoring overlay)

## Gates

```text
typecheck (shared/go-engine/web/api) → PASS
lint web → PASS
test go-engine 26 · web 80 · api 32 → PASS
build shared + web → PASS
node scripts/m4-board-scoring-ux-screenshots.mjs → PASS (coords 9/13/19, territory markers, 0 errors)
```

## Approval requested

Manual browser review of coordinates, scoring territory, finished restore, and DM labels. Do not mark M4 complete or start M5 without sign-off.
