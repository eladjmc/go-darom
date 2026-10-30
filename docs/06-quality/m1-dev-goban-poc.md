# Temporary M1 developer Goban demo

**Status:** Temporary, developer-only. Not product UI. Not an M2 deliverable.  
**URL (Vite dev only):** http://localhost:5173/dev/goban-poc  
**Gate:** Available only when `import.meta.env.DEV` is true (omitted from production routing).

## Purpose

Manual smoke of `GoEnginePort` / `GobanEngineAdapter`: place stones, captures, pass, undo, illegal-move feedback.

## How to run

```bash
npm run dev:api   # optional; not required for this client-side demo
npm run dev:web
```

Open http://localhost:5173/dev/goban-poc

## Manual checks

1. Place alternating stones on empty intersections.
2. Capture: Black (2,1) → White (1,1) → Black (1,2); white stone removed; black prisoners ≥ 1.
3. Click an occupied point → error, board unchanged.
4. Pass / Undo / Reset behave as labeled.
5. **Hover preview** must match side-to-move (black ghost vs white ghost) after moves, pass, and undo — covered by `apps/web/src/dev/hover-preview.test.ts`.
