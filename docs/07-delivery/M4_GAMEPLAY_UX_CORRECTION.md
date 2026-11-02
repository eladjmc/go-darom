# M4 Gameplay & game-room UX correction (2026-10-30)

**Status:** Ready for owner manual acceptance. Do **not** mark M4 complete or start M5.

## Undo (critical)

- Only the player who committed the **latest** `play`/`pass` may `propose_undo`.
- Opponent accepts/rejects; never silently undoes an opponent's move.
- Accept: truncate history + engine undo; clock does **not** refund time (LLD §8).
- Codes: `UNDO_NOT_OWN_MOVE`, `UNDO_PENDING`, `UNDO_NONE`, …

## Errors

- API returns stable `code`; UI maps to Hebrew toasts via `gameErrors.ts`.
- Raw Goban strings never shown; rapid illegal clicks dedupe.

## Controls / DM

- Compact Pass + Undo / הודעה ליריב / עוד.
- Existing DM overlay/sheet — not a permanent sidebar chat.

## Checks run

| Check | Result |
|---|---|
| `npm run build -w @go-darom/shared` | pass |
| `npm run test -w @go-darom/api` (incl. undo-rules) | 32 pass |
| `npm run typecheck/lint/test/build -w @go-darom/web` | pass (66 tests) |
| `npm run typecheck/lint -w @go-darom/api` | pass |
| Screenshots | `docs/07-delivery/visual-qa/m4-game-controls-2026-10-30/` |

## Manual

Two accounts, 9/13/19: White plays → Black cannot undo; White requests → Black accept/reject; illegal tap → toast; DM open/close without leaving the board.
