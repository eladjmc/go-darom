# M4 Games Hub & Invitation Dialog — UX checkpoint

**Date:** 2026-10-30  
**Status:** Delivered for owner visual/functional review — **M4 not complete**; **no M5**  
**Plan:** `docs/07-delivery/M4_PLAY_HUB_INVITE_UX_PLAN.md`

## What changed (UI only)

- Hub: ~1200px centered dashboard; **המשחק שלי** visually primary vs invitations
- Two-step invite flow via portal modal (`PlayModalShell` + `InviteFlowModal`)
  - Step 1: **למי שולחים הזמנה?** — search, presence, selected state, offline disabled + Hebrew reason, **המשך להגדרות**
  - Step 2: **הגדרות המשחק** — board/clock/color/handicap/komi + summary, **חזרה לבחירת חבר** / **שליחת הזמנה**
- Modal: body portal, `max-height` from visual viewport (+ zoom), sticky header/footer, body scroll, Escape, focus trap, backdrop close, focus restore, background scroll lock
- No GameService / GoEnginePort / DB / invite business-rule changes

## Screenshots & gates

`docs/07-delivery/visual-qa/m4-invite-flow-ux-2026-10-30/`  
Fixtures: `/dev/play-hub-smoke`, `/dev/invite-flow-smoke?scene=pick|settings`

```text
npm run typecheck -w @go-darom/web → PASS
npm run lint -w @go-darom/web      → PASS
npm run test -w @go-darom/web      → PASS (74)
npm run build -w @go-darom/web     → PASS
node scripts/m4-invite-flow-ux-screenshots.mjs → PASS
  (desktop 1280/1440/1920, mobile 360/390/430, short-height 520, zoom 200% — modal chrome in viewport)
```

## Approval requested

Manual visual + functional review of `/play` hub and invite steps.  
Do **not** mark M4 complete or start M5 without separate sign-off.
