# M4 Games Hub Layout Redesign — checkpoint

**Date:** 2026-10-30  
**Status:** Hub layout delivered for owner visual QA — **M4 not complete**; no M5  
**Scope:** `/play` Games Hub layout/UX only (backend, invites API, game room unchanged)

## What changed

- Centered hub shell (~1180px) with header row: title **משחקים** + CTA **הזמנת חבר למשחק**
- Two-column dashboard (stacks ≤960px): **המשחק שלי** | **הזמנות למשחק**
- Compact active-game card (avatar, chips for size / turn / clock, **חזרה למשחק**)
- Compact empty states (no oversized white placeholders)
- Combined invitations with Incoming / Outgoing tabs; compact rows; client filter for expired
- Routine invite feedback via branded toasts (no permanent status banners)
- Mobile: full-width CTA, game first, invites second; 360 / 390 / 430 checked

## Screenshots

`docs/07-delivery/visual-qa/m4-play-hub-layout-2026-10-30/`  
Fixture: `/dev/play-hub-smoke?scene=empty|active|incoming|outgoing|multi|expired`

## Gates

```text
npm run typecheck -w @go-darom/web → PASS
npm run lint -w @go-darom/web      → PASS
npm run test -w @go-darom/web      → PASS (73)
npm run build -w @go-darom/web     → PASS
node scripts/m4-play-hub-layout-screenshots.mjs → PASS (0 page errors)
```

## Approval requested

Owner visual QA of hub layout at desktop 1280/1440 and mobile 360/390.  
Do **not** mark M4 complete or start M5 without separate manual sign-off.
