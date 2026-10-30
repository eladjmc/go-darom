# M2 Implementation Plan — Visual Shell + Identity

**Status:** PROPOSED — **do not implement until owner approves**  
**References:** `docs/05-modules/m2-visual-shell-identity/LLD.md`, `docs/06-quality/m2-acceptance.md`, `docs/04-contracts/m2-identity-api.md`

## Priority statement

Build the **real polished Go Darom interface** first (tokens, RTL shell, selected hero/logo assets, public home + key public shells), then wire **Clerk Google identity** and presence foundation on that shell—not a second stub.

## Task sequence (after approval)

1. **Design tokens + AppShell** — CSS variables, Heebo, Header/Footer/Nav RTL, responsive breakpoints.
2. **Brand assets pipeline** — import manifest assets into `apps/web` (or static public paths); provisional logo + hero wiring; hero RTL layout solution.
3. **Public pages** — Home (UX-001 structure), Shop Coming Soon, empty/placeholder sections for events/puzzle/learn (no fake community quotes/stats).
4. **Identity schema + API** — Drizzle `users` / `auth_identities`; Clerk verify middleware; `/me`, `/members`.
5. **Web auth UX** — Clerk provider; sign-in CTA; onboarding screen; return-intent allowlist.
6. **Presence foundation** — Socket.IO auth + connection counting; online flag on directory.
7. **Admin route shell** — empty `/admin` gate (UI + 403 APIs for non-admin).
8. **QA** — automated tests + breakpoint screenshots; update milestone report; request M2 sign-off.

## Dependencies

| Dependency | Notes |
|---|---|
| Clerk application (dev) | Owner must provide publishable + secret keys in local `.env` |
| M1 Docker Postgres | Continues |
| Selected assets under `docs/03-design/assets` | Already in repo |
| Vector logo | **Not** required; provisional raster + text |

## Risks

1. Hero RTL / left negative space needs intentional layout (documented).
2. Clerk webhook vs first-request upsert — prefer upsert-on-API for M2 simplicity.
3. OPEN-016 bootstrap — must not use bare email matching.
4. UX copy still draft — label strings as provisional in UI comments/docs.

## Out of scope reminder

No M3–M8 feature implementation under M2 approval.
