# M3 Milestone Report — Community Messaging & Trust

**Status:** M3 FIXES COMPLETE — awaiting owner QA sign-off (do not start M4)  
**Date:** 2026-10-30  
**LLD/contracts:** APPROVED before implementation  

## Scope delivered

| Area | Delivery |
|---|---|
| Central community chat | Bubble UI + compact composer (Enter send / Shift+Enter newline); history pagination; read watermark; report; soft-delete |
| Direct messages | Desktop split (list right / chat left in RTL); mobile list → full-width thread + back; open from community directory |
| Global Messages entry | Navbar Messages icon (any page) with DB-backed unread badge — separate from Bell |
| System notifications | Bell → `/notifications`; unread excludes `dm.message`; toasts unchanged |
| Site-wide presence | AppShell Socket.IO; multi-tab = one user; **10s** offline debounce |
| Online-only directory | `GET /members?online=1` + UI toggle on community members tab |
| Blocking / reporting | Unchanged rules; report links on bubbles; block from members tab |
| Unread policy | Existing `chat_thread_reads` — **no schema migration**; see `docs/04-contracts/m3-dm-unread.md` |

## UX correction + required fixes (this pass)

- Replaced form-like chat logs with message bubbles; compact composer (Enter / Shift+Enter).  
- Messages ≠ Bell; DB-backed DM unread + system unread-count.  
- **Draft stability:** Clerk JWT refresh no longer sets auth `loading` or remounts chat; socket session survives token refresh; history fetch is one-shot per thread; draft owned by parent state. Regression: `chatDraftStability.test.tsx`.  
- **Alignment:** mine = physical LEFT, others = physical RIGHT (explicit CSS, not RTL-inferred); matching bubble tails; tighter stacked gaps.  
- **Members:** sage toggle for «מחוברים בלבד»; compact member rows.  
- **Scroll/overflow:** chat shell uses definite height + `grid-template-rows: auto minmax(0,1fr) auto`; thread is the only scroller (`min-height:0; overflow-y:auto`). DM list scrolls independently. Mobile fills `100dvh - header` via flex column. Scroll planner: `chatScroll.ts` + `messageThreadScroll.test.tsx`.  

## Explicit non-goals (unchanged)

Games / Study / invites emission, Redis, extra channels, file uploads, M4.

## Quality gates (actual)

```text
npm run typecheck   → PASS
npm run lint        → PASS
npm test            → PASS
  shared 6 · go-engine 20 · api 9 · web 33 (draft + scroll)
npm run build       → PASS
```

## Screenshots

UX redesign: `docs/07-delivery/visual-qa/m3-messaging-ux-2026-10-30/`  
Fixes (alignment / members): `docs/07-delivery/visual-qa/m3-fixes-2026-10-30/`  
Long-history scroll: `docs/07-delivery/visual-qa/m3-scroll-2026-10-30/` (desktop + 360/390/430)  

## Local testing instructions

1. Postgres up; migrations applied (`0002_m3_community`).  
2. `npm run dev:api` + `npm run dev:web`  
3. Two authenticated users: community chat, directory → DM, Messages badge, Bell separate.  
4. Refresh + second tab: unread total from API / `dm:unread`.  
5. Block / report still enforced.  

Manual checklist: `docs/06-quality/m3-manual-qa-checklist.md`

## Risks / follow-ups (non-blocking)

1. Soft-delete of own DM messages is limited vs public; admin delete is for public messages.  
2. Rate limits are not yet middleware-enforced.  
3. OPEN-010 account deletion matrix still deferred.

## Approval requested

Owner completes manual QA checklist, then approve **M3** before any **M4** work.
