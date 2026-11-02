# M4 Goban renderer smoke (D5)

**Date:** 2026-10-30  
**Package:** `goban@8.3.226`  
**Scripts:** `scripts/m4-goban-browser-smoke.mjs` · vitest `goban-smoke.test.tsx`

## Results

| Check | Outcome |
|---|---|
| Vitest/happy-dom mount | **FAIL** (canvas parent/`setAttribute`) — not decisive |
| Playwright Chromium import + mount | **PASS** |
| Board sizes 9 / 13 / 19 | **PASS** (2 canvas layers each) |
| Resize | **PASS** |
| Mobile 390 | **PASS** |
| Navigate away / unmount | **PASS** |
| Evidence | `docs/07-delivery/visual-qa/m4-goban-browser-smoke-2026-10-30/` + `report.json` |

## Decision

**Prefer Goban** (canvas renderer, explicit `square_size`) in `/play/:gameId`. SnapshotBoard remains fallback if mount throws.

## Notes

- SVG renderer produced an empty child tree in our config; canvas works.
- Missing `/img/kaya.jpg` may 404 for wood texture; board still renders.
