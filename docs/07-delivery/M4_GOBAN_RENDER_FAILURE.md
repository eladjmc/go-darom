# M4 — Goban render failure (2026-10-30)

## Symptom

Desktop/mobile game room and `/dev/goban-browser-smoke` show a solid yellow/cream square with **no grid lines and no stones**.

## Chromium evidence

- `createGoban` succeeds and inserts `#shadow-canvas` + `#board-canvas` (`.StoneLayer`).
- No `.Goban` wrapper node is created when `board_div` is the host.
- `getImageData` on `#board-canvas` at multiple sample points returns **fully transparent** pixels (`rgba 0,0,0,0`).
- Parent `.game-room-board-wrap` / cream styling shows through → appears as a “yellow board”.

## Root cause

Goban **CanvasRenderer** initializes canvases at the correct CSS size but **does not paint** board lines/stones under our mount + `engine.board` sync path. This is a renderer integration failure, not missing game snapshots (engine `toMove` / SnapshotBoard remain correct).

## Production decision

**SnapshotBoard is the functional production board** for M4 until a future Goban integration POC paints reliably in Chromium. Game room never shows a broken Goban to users.

- Live path: `PlayGamePage` → `BoardViewport` + `SnapshotBoard` only.
- Zoom/pan: isolated `BoardViewport` (1×–3× pinch/wheel, pan when zoomed, reset).
- 19×19 narrow: preview-then-confirm before `play` command.
- Acceptance checklist: `M4_BOARD_ACCEPTANCE.md`. Chromium smoke: `node scripts/m4-board-render-smoke.mjs`.

## What we preserve

GoEnginePort, GameService, versioned commands, invites, clocks, scoring — unchanged. Only UI rendering/input.
