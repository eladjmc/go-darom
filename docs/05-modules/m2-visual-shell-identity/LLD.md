# M2 — Visual Shell + Authenticated Identity (LLD)

**Status:** APPROVED for implementation (owner 2026-10-29)  
**Milestone:** M2 Visual shell and authenticated identity  
**Depends on:** M1 approved (foundation + engine POC)  
**Authority:** Elaborates Product Baseline v0.1 + HLD v0.2; UX/brand docs are implementation drafts. Does not change approved product requirements.

## 1. Goals

1. Replace the M1 stub with a **polished Hebrew RTL** Go Darom public shell using selected brand assets (logo concept #2 provisional, hero #3).
2. Establish design tokens (CSS variables) from the proposed warm cream/wood/sage system, subject to visual QA.
3. Responsive navigation and public page shells at **360 / 390 / 768 / 1024 / 1440**.
4. Integrate **Clerk Google-only** auth; map to stable internal UUID; first-login nickname/photo confirmation; return-to-intent.
5. Foundation for member presence (socket connection count → online) without full chat/games (those are M3/M4).

## 2. Non-goals (explicitly deferred)

| Deferred | Milestone |
|---|---|
| Central chat, DMs, blocks, reports | M3 |
| Live/async games, invites, Study | M4 / M5 |
| Events registration / Brevo | M6 |
| CMS / puzzles beyond public placeholders | M7 |
| Final vector logo master / favicon set | Pre-launch / design gate (use provisional raster + text brand) |
| Game CAS persistence | M4 |
| Production Netlify/Render deploy hardening | M8 (local + documented env in M2) |

Temporary `/dev/goban-poc` may remain **dev-only**; it is not part of the polished product shell.

## 3. Requirements mapped

| Requirement | Source | M2 delivery |
|---|---|---|
| Hebrew RTL, responsive | PRD §1.2, UX-001–006 | Shell + tokens + layouts |
| Home public discovery | PRD §8/12, UX-001 | Home with hero + sections (content may be placeholder data) |
| Selected hero #3, logo #2 concept | Brand asset spec | Real assets; no photo flip; DOM Hebrew copy |
| Google-only Clerk; internal UUID | AUTH-001, HLD | Server verify + `users` / `auth_identities` |
| First-login nickname/photo; return intent | AUTH-002, J-01 | Onboarding screen + intent store |
| Profile nickname/photo only | AUTH-003 | Profile edit in `/me` minimal |
| Member directory foundation | AUTH-004 | Authenticated list/search stub OK if data exists |
| Presence foundation | AUTH-005 | Socket presence heartbeat → online flag |
| `/admin` same SPA; server authz | AUTH-006–007 | Route shell gated; no admin modules yet |
| Shop Coming Soon | PROD-004 | Polished placeholder page |

## 4. Architecture (within approved stack)

```text
apps/web/
  src/
    styles/tokens.css          # CSS variables from design system
    components/layout/         # AppShell, Header, Footer, Nav
    pages/                     # Home, ShopComingSoon, Me, Onboarding, AuthGate
    auth/                      # Clerk provider, return-intent helpers
    assets/                    # copies or imports from docs/03-design/assets (manifest IDs)

apps/api/
  src/
    modules/identity/          # Auth middleware, UserService, repositories
    http/routes/me.ts          # GET/PATCH profile
    http/routes/members.ts     # authenticated directory (minimal)
    realtime/presence.ts       # Socket.IO auth + presence rooms (foundation)
```

- Controllers → services → repositories → Drizzle (unchanged layering).
- Clerk JWT verified **only on server** for REST and Socket handshake.
- Frontend never receives Supabase service role or Clerk secret.

## 5. Data (M2 schema additions)

| Table | Purpose |
|---|---|
| `users` | `id` UUID PK, `nickname`, `avatar_url`, `role` (`member`\|`admin`), `suspended_at`, timestamps |
| `auth_identities` | `user_id`, `provider` (`clerk`), `external_id` unique, timestamps |
| `user_presence` (or derived) | last optional; prefer ephemeral socket set + optional `last_seen_at` on user |

No game/chat/event tables in M2 beyond what identity needs.

Migrations via Drizzle Kit; seed none required for public home.

## 6. Auth flows (LLD)

1. Browser uses Clerk Google sign-in.
2. API `Authorization: Bearer <clerk session JWT>` → verify → upsert `auth_identities` + `users`.
3. If `nickname` unset / `onboarding_completed=false` → frontend forces onboarding UI.
4. Onboarding PATCH `/me` sets nickname (validated length/charset), optional avatar URL from Clerk image or upload-later stub (Storage adapter not required if using Clerk image URL for M2).
5. **Return intent:** store safe internal path (allowlist prefixes: `/`, `/me`, `/community`, `/play`, `/learn`, `/puzzles`, `/events`, `/shop`, `/members`) in `sessionStorage` before redirect; after onboarding navigate there if still allowed.

Admin bootstrap (OPEN-016) remains a documented one-time env procedure; M2 may include `BOOTSTRAP_ADMIN_CLERK_IDS` checked once — details in security subsection of implementation tasks, no silent email-based promotion.

## 7. Visual / UX decisions to implement (with QA gate)

1. **Tokens:** Canvas `#FAF7F0`, primary `#315C49`, wood `#C89E69`, etc. from `DESIGN_SYSTEM.md` — mark as proposed until screenshot QA.
2. **Typography:** Heebo (or approved open Hebrew webfont) via CSS; license check before bundling files.
3. **Hero:** `HR-001-DESKTOP` / `HR-001-MOBILE` from manifest; Hebrew headline/CTAs in DOM; **do not mirror** photo; resolve left negative space vs RTL headline (recommended: desktop split — text panel inline-start / image inline-end or adjacent panel; mobile stack text then image).
4. **Logo:** provisional use of `BR-LOCKUP-REF` or symbol crop **plus** accessible text `גו דרום`; never claim vector final.
5. **Nav (proposed Hebrew labels, validate in QA):** בית, הקהילה, משחקים, לומדים גו, חידות — plus CTA התחברות / האזור שלי. Exact IA may adjust without inventing new product domains.
6. **Home sections (public):** hero; upcoming events teaser (empty/placeholder state OK); weekly puzzle teaser (placeholder); learn/play/community cards; shop Coming Soon lower; no fake testimonials or fabricated stats.
7. **Motion:** restrained; honor `prefers-reduced-motion`.
8. **a11y:** focus-visible, Hebrew `aria-label` on icon-only controls, skip link.

## 8. API / Socket contracts (M2)

See `docs/04-contracts/m2-identity-api.md` (to be authored with this LLD approval).

Minimum:

- `GET /health` (unchanged)
- `GET /me` → current user profile or 401
- `PATCH /me` → nickname / avatar / complete onboarding
- `GET /members?q=` → authenticated directory (nickname search)
- Socket: connect with Clerk token; join personal room; emit `presence:update` for self; server tracks connection counts

## 9. Testing plan

- Unit: nickname validation; intent allowlist
- Integration: Clerk JWT mock → upsert user; onboarding gate; unauthorized `/me`
- UI: RTL smoke; breakpoints checklist; hero LCP asset present
- Manual visual QA screenshots at 360/390/768/1024/1440
- Presence: two tabs → still one online member

## 10. Open items (must not invent)

| ID | Handling in M2 |
|---|---|
| OPEN-016 admin bootstrap | Document procedure; implement minimal safe bootstrap if needed for `/admin` shell only |
| OPEN-018 copy/breakpoints | Use proposed copy; flag for owner visual QA |
| OPEN-027 presence edge cases | Basic connection-count presence; defer multi-tab races hardening notes |
| Vector logo | Provisional only |

## 11. Approval gate

Owner approves this LLD + M2 acceptance checklist before any M2 application code beyond docs.
