# M3 correction — chat layout + persistent messaging routes

**Status:** Implemented — awaiting owner manual acceptance (do **not** start M4; do **not** mark M3 complete)  
**Date:** 2026-10-30

## Root causes (DOM / CSS / routing)

1. **Off-center shell (RTL):** `.messaging-page { max-width: 1100px }` was applied to the full-bleed `<section>`. A block with `max-width` and no `margin-inline: auto` aligns to **inline-start** — in RTL that is the **right**, leaving a large empty band on the left.
2. **Page-level scroll:** Chat shells used capped `dvh` heights that ignored in-page chrome (title/tabs/padding) **and** the site footer still rendered under `main`, so header + chrome + shell + footer exceeded the viewport. Internal thread scroll and document scroll ran together.
3. **DM refresh → Community:** SPA routes lived under `/dms/:id` while Vite also proxies `/dms` to the API. Document navigations *should* bypass via `sec-fetch-dest`, but sharing the API path prefix is fragile. Owner-required `/messages/:conversationId` avoids the collision entirely; legacy `/dms` redirects.

## Fixes

| Area | Change |
|---|---|
| Centering | Shared `.chat-frame` — `width: min(100% - 2rem, 1200px); margin-inline: auto` |
| Viewport fit | `app-shell.is-chat-focus` fills `100dvh`, hides footer, flex column; shell fills remaining space after title/tabs |
| Scrollbars | Native thin sage scrollbars on `.msg-thread`, `.dm-thread-list` (Firefox `scrollbar-*` + WebKit pseudo-elements); stronger on hover/focus-within |
| Routes | `/community` directory, `/community/chat` public chat, `/messages`, `/messages/:conversationId`; `/dms` → `/messages` redirects |
| Auth return | `/messages` allowlisted in `RETURN_INTENT_PREFIXES` |
| Errors | 403/404 conversation loads show branded in-pane errors (no silent Community redirect) |
| Remount | Stable `pageTransitionKey` for community/messages shells |

## Draft persistence (explicit)

| Scenario | Behavior |
|---|---|
| Incoming realtime message | Draft kept (parent-owned state) |
| Clerk token refresh / socket reconnect | Draft kept |
| Switch conversation | Draft resets for the new thread (by design) |
| Full browser refresh | **Not** persisted — drafts are in-memory only |

## Gates (actual)

```text
npm run typecheck   → PASS
npm run lint        → PASS
npm test            → PASS (shared 6 · go-engine 20 · api 9 · web 46)
npm run build       → PASS
```

Playwright probe (1440×900 stub): `.chat-frame` at x=120, w=1200 (balanced margins); `documentElement.scrollHeight === innerHeight` on community chat; refresh kept `/messages/:id`.

## Screenshots

`docs/07-delivery/visual-qa/m3-layout-routes-2026-10-30/`

- `01-centered-community-chat.png`
- `02-centered-dm-interface.png`
- `03-long-conversation-scrolled.png`
- `04-scrollbar-hover-community.png`
- `05-mobile-conversation.png`
- `06-dm-refresh-persists.png`

## Approval

Owner manual QA per `docs/06-quality/m3-manual-qa-checklist.md`. **Do not start M4** until sign-off.
