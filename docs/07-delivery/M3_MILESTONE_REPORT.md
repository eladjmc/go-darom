# M3 Milestone Report — Community Messaging & Trust

**Status:** APPROVED (owner product/UI 2026-10-30 + final automated gates)  
**Final acceptance:** `docs/07-delivery/M3_FINAL_ACCEPTANCE_REPORT.md`  
**Date:** 2026-10-30  
**LLD/contracts:** APPROVED before implementation  
**Layout correction:** `docs/07-delivery/M3_LAYOUT_ROUTING_FIX.md`  
**Admin bootstrap:** `docs/07-delivery/ADMIN_BOOTSTRAP.md` · moderation QA: `docs/06-quality/m3-admin-moderation-manual-qa.md`  
**Admin Control Center (M3):** `docs/03-design/ADMIN_CONTROL_CENTER_SPEC.md` · task `docs/07-delivery/ADMIN_CONTROL_CENTER_CURSOR_TASK.md` · LLD `docs/05-modules/m3-admin-control-center/LLD.md`  

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
| Admin Control Center | RTL shell, overview/members/reports/detail/audit; server RBAC; future domains stubs only |

## Explicit non-goals (unchanged)

Games / Study / invites emission, Redis, extra channels, file uploads, M4 implementation.

## Quality gates (final 2026-10-30)

```text
npm run typecheck   → PASS
npm run lint        → PASS
npm test            → PASS
  shared 6 · go-engine 20 · api 18 · web 48
npm run build       → PASS
```

## Screenshots

UX redesign: `docs/07-delivery/visual-qa/m3-messaging-ux-2026-10-30/`  
Fixes (alignment / members): `docs/07-delivery/visual-qa/m3-fixes-2026-10-30/`  
Long-history scroll: `docs/07-delivery/visual-qa/m3-scroll-2026-10-30/`  
Layout + routes: `docs/07-delivery/visual-qa/m3-layout-routes-2026-10-30/`  
Admin Control Center: `docs/07-delivery/visual-qa/m3-admin-control-center-2026-10-30/`  

## Follow-ups (non-blocking)

See `M3_FINAL_ACCEPTANCE_REPORT.md` FU-M3-01…06 (rate limits, DM soft-delete parity, OPEN-016 production, OPEN-010, ACC polish, deeper chaos tests).

## Sign-off

| Role | Date | Result |
|---|---|---|
| Owner (product/UI) | 2026-10-30 | Pass — satisfied with chat, DMs, presence, notifications, ACC |
| Automated gates | 2026-10-30 | Pass |
| M4 implementation | — | **Blocked** until M4 plan approval |
