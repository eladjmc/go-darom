# M4 Game room UX correction — controls, DM, scoring (2026-10-30)

**Status:** Ready for owner manual acceptance. Do **not** mark M4 complete or start M5.

## Changes

1. **Controls panel** — removed desktop `max-height`/`overflow` nested scroll card; natural height; short-viewport scroll only below 640px height.
2. **DM** — existing personal thread via MessageThread + messaging bubble chrome; full history; overlay/sheet with close animation; label **הודעה ליריב**.
3. **Scoring** — engine `getScoringView` (territory ownership + provisional totals); mark/unmark dead toggles; both-confirm; finished score headline + breakdown from committed `result.score` (margin persisted). Removal marks survive serialize.
4. **Motion** — ~180–220ms opacity/transform for DM, proposals, menus; `prefers-reduced-motion` respected.

## Checks

| Command | Result |
|---|---|
| go-engine scoring-view tests | (run with suite) |
| web gameResult tests | (run with suite) |
| typecheck / lint / test / build | reported in delivery message |

Screenshots: `docs/07-delivery/visual-qa/m4-game-room-ux-2026-10-30/`

## Known limitations

- Territory markers are empty-intersection ownership from goban-engine `scoring_positions`, not Goban canvas `showScores` (SnapshotBoard is the production renderer).
- Finished games do not re-show live territory overlays (correct: markers cleared with scoring overlay; totals remain in `result.score`).
