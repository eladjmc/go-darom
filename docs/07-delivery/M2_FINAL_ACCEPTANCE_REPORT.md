# M2 Final Acceptance Report — Visual Shell + Identity

**Date:** 2026-10-30  
**Status:** COMPLETED AND APPROVED (owner manual visual + functional testing + automated gates)  
**Supporting verification:** `docs/07-delivery/M2_DIRECTORY_VERIFICATION.md`

## Scope delivered

- Hebrew RTL visual shell (tokens, nav, hero/logo provisional, shop Coming Soon, placeholders).
- Google-only Clerk auth (custom branded sign-in UI), server JWT verify + internal UUID upsert.
- First-login onboarding (nickname + optional Google photo), personal area, sign-out.
- Authenticated member directory under **הקהילה** (`/community`; `/members` redirects).
- Socket.IO presence foundation (connection-count online status).
- `/admin` SPA shell with server authz rejection for non-admins.
- Branded error screens (403 / 404 / 500 / network) + React Error Boundary.
- Dev proxy: SPA document navigations no longer collide with API paths.

## Root-cause fixes (blocking, 2026-10-30)

### A. Raw JSON on `http://localhost:5173/me`

**Cause:** Vite `server.proxy` forwarded **all** `/me` (also `/members`, `/admin`) to Express — including browser document navigations. Express correctly returned **401** JSON `{"error":"נדרשת התחברות"}`, which the browser rendered as a blank/raw page. React Router never ran.

**Fix:** `shouldBypassApiProxyForSpa()` — if `Sec-Fetch-Dest: document` or `Accept` includes `text/html`, serve `/index.html`. JSON client fetches (`Accept: application/json`) still proxy to the API (**401** preserved).

**Evidence:** Playwright — `GET /me` as document → `text/html` + branded sign-in; `GET /me` with JSON Accept → `401` + JSON body. Screenshots under `docs/07-delivery/visual-qa/m2-routing-errors-2026-10-30/`.

### B. Invisible header button labels on hover

**Cause:** Global `a:hover { color: var(--brand-hover) }` overrode `a.btn-primary` label color while hover background also used `--brand-hover` → dark-on-dark.

**Fix:** Explicit `color: var(--surface)` on primary (default/hover/focus/active/disabled) and `color: var(--brand)` on secondary for both `button` and `a.btn*`. Regression test: `apps/web/src/styles/button-contrast.test.ts`. Hover screenshot shows white label on dark green.

## Acceptance checklist

### Visual shell

| ID | Status | Notes |
|---|---|---|
| ACC-M2-V01 | Met | Selected hero derivatives; Hebrew overlay; photo not mirrored |
| ACC-M2-V02 | Met | Provisional logo / `גו דרום` (vector master still outstanding) |
| ACC-M2-V03 | Met | Cream/wood/sage tokens; Heebo |
| ACC-M2-V04 | Met | RTL primary nav; responsive breakpoints; header CTA hover readable |
| ACC-M2-V05 | Met | Shop Coming Soon |
| ACC-M2-V06 | Met | Reduced-motion + focus-visible |
| ACC-M2-V07 | Met (owner) | Manual visual QA completed with M2 approval |

### Identity / directory / routing

| ID | Status | Notes |
|---|---|---|
| ACC-M2-A01 | Met | Google Clerk path functional in local/dev |
| ACC-M2-A02 | Met | Server verify + upsert |
| ACC-M2-A03 | Met | Onboarding before member features |
| ACC-M2-A04 | Met | Homepage login → `/`; protected destination → that path after auth/onboarding |
| ACC-M2-A05 | Met | `/me` auth + nickname validation; no public email |
| ACC-M2-A06 | Met | Directory nickname/photo; server search; `ORDER BY nickname, id`; limit 50; caller onboarding **403** |
| ACC-M2-A07 | Met (foundation) | Real socket presence (page-scoped in M2; site-wide deferred to M3) |
| ACC-M2-A08 | Met | `/admin` shell; privileged APIs reject non-admin; branded 403 UI |
| ACC-M2-A09 | Met | Secrets not in frontend; `.env.example` documents keys |
| Routing UX | Met | Guest `/me` → SPA sign-in (not API JSON); loading gate; Error Boundary |

### Quality

| ID | Status | Evidence |
|---|---|---|
| ACC-M2-Q01 | **Pass** | Final gates 2026-10-30 — all exit 0 |
| ACC-M2-Q02 | **Pass** | go-engine POC suite 20/20 |
| ACC-M2-Q03 | Pass (local) | Health when API + DB running |

#### Final command results (actual)

```text
npm run typecheck  → PASS
npm run lint       → PASS
npm test           → PASS (shared 3 · go-engine 20 · api 7 · web 13)
npm run build      → PASS
```

## Explicit deferred to M3 (approved carry-forward)

1. Site-wide real-time member presence  
2. Online-only directory filtering  
3. Load More / pagination beyond 50  
4. Central chat, DMs, notifications, blocking/reporting, moderation controls  

## Non-blocking leftovers

1. Provisional brand assets until vector logo master  
2. OPEN-018 refinements as assets finalize  

## Closure

**M2 is complete and owner-approved.** Preserve all approved M2 design and functionality. **Do not start M3 implementation** until M3 LLD, contracts, plan, and acceptance are approved.
