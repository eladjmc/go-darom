# M4 Game Hub UX — checkpoint

**Date:** 2026-10-30  
**Status:** Hub UX delivered — **M4 not complete**; stop for owner manual acceptance  
**No M5**

## What changed

- Redesigned `/play` hub: CTA **הזמנת חבר למשחק**, **המשחקים שלי**, incoming/outgoing invites, empty/loading/error
- UUID input removed; opponent picker uses `/members` search + online status
- Invitation settings modal (size, clock, color, komi, handicap)
- Active Live card with opponent + **חזרה למשחק**
- Invites show identity, settings, remaining TTL; accept/reject/cancel; refresh on game notifications
- Goban preferred after real-browser smoke PASS; SnapshotBoard fallback

## Screenshots

`docs/07-delivery/visual-qa/m4-play-hub-2026-10-30/`  
`docs/07-delivery/visual-qa/m4-goban-browser-smoke-2026-10-30/`

## Gates

```text
npm run typecheck → PASS
npm run lint      → PASS
npm test          → PASS (shared 11 · go-engine 20 · api 22 · web 52)
npm run build     → PASS
Playwright Goban  → PASS
```

## Manual acceptance

Continue with `docs/06-quality/m4-live-go-acceptance.md` (hub UX rows + prior play rules).
