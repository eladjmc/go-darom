# M4 Board blocker — acceptance stop

**Status:** Ready for owner visual/manual acceptance. Do **not** mark M4 complete or start M5 until signed off.

## Root cause (Goban yellow rectangle)

See `M4_GOBAN_RENDER_FAILURE.md`. Goban Canvas layers stayed fully transparent; cream/yellow host showed through. **Production board is SnapshotBoard** (SVG) wrapped in `BoardViewport` (pinch/pan). Goban is not shown to users on the live game path.

## What changed (UI only)

- `PlayGamePage` → single `SnapshotBoard` + `BoardViewport`
- Square CSS (`aspect-ratio: 1`) for desktop + mobile widths 320–430
- Pinch zoom 1×–3×, pan when zoomed, reset view; gestures block move submit
- 19×19 on narrow viewports: preview → confirm before `play` command
- GameService / GoEnginePort / contracts unchanged

## Automated checks

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npm run dev:web   # other terminal
node scripts/m4-board-render-smoke.mjs
```

Screenshots: `docs/07-delivery/visual-qa/m4-board-render-2026-10-30/`

## Manual test plan

1. Desktop 9 / 13 / 19 — grid + stars + stones visible; click plays via existing commands.
2. Mobile 360px 9×9 — square board, no tall yellow slab, no horizontal overflow; taps place.
3. Mobile 390px 19×19 — pinch zoom, pan, reset; first tap previews, confirm sends move; pan/zoom clears preview.
4. Hover (desktop) shows correct color; resize window keeps square board and committed stones.
5. Capture / undo / refresh — board matches server version (no client-only stones).

## Owner sign-off

- [ ] Desktop boards playable  
- [ ] Mobile square + zoom/pan  
- [ ] 19×19 confirm flow  
- [ ] No broken Goban shown  
