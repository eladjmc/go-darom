# M2 — Member Directory Verification

**Date:** 2026-10-30  
**Scope:** Verify directory/search/presence/protection vs Product Baseline + `docs/06-quality/m2-acceptance.md`.  
**Non-goals:** No M2 implementation of pagination, online-only filter, or extra directory UX.

## Findings (evidence)

### 1. Member search — server-side (DB)

| Question | Answer |
|---|---|
| Backend or frontend-only filter? | **Backend.** |

- UI (`apps/web/src/pages/MembersPage.tsx`) calls `fetchMembers(token, q)` on query change.
- Client (`apps/web/src/auth/api.ts`) requests `GET /members?q=…`.
- API (`apps/api/src/http/routes/members.ts`) passes `q` to `IdentityService.listMembers`.
- Repository (`apps/api/src/modules/identity/user-repository.ts` → `listMembers`) applies PostgreSQL `ilike(nickname, '%q%')` with filters: not suspended, `onboardingCompleted = true`, nickname not null.

**Not** a filter over an already-loaded full client list.

### 2. Online / offline — real connection presence (foundation), not a stub flag

| Question | Answer |
|---|---|
| Placeholder? | **No.** Live Socket.IO + in-memory connection counts. |

- `PresenceRegistry` counts authenticated sockets per internal user id; multi-tab = one online member (`presence-registry.test.ts`).
- Handshake authenticates Clerk/stub token → internal UUID (`socket-server.ts`).
- Events: `presence:snapshot`, `presence:user` `{ userId, online }` (matches `m2-identity-api.md`).
- `GET /members` sets `online` from `presence.isOnline(row.id)` at response time; UI also merges socket updates.

**Limits (expected for M2 foundation, not product-complete “site presence”):**

- Registry is **in-process memory** (lost on API restart; not multi-instance safe).
- Web client opens the presence socket primarily from the community/members view today — browsing other pages without a socket does **not** mark the user online. Matches ACC-M2-A07 (“≥1 authenticated socket”), not full “any page = online”.

### 3. Result limit and ordering

| Concern | Current behavior |
|---|---|
| Limit | **Yes:** default `limit = 50` in `UserRepository.listMembers`. |
| Deterministic ordering | **Yes (2026-10-30):** `ORDER BY nickname ASC, id ASC`. |

No cursor/offset pagination in API or UI (acceptable for M2; see M3 follow-ups).

### 4. Protection vs Product Baseline (AUTH-003–005, PRD profile/directory)

| Rule | Status |
|---|---|
| Directory only for authenticated members (AUTH-004) | **Pass (API):** `GET /members` behind auth middleware. Guests get 401. Suspended users fail authenticate (403). |
| Nickname + photo only (AUTH-003 / PRD) | **Pass:** response fields `id`, `nickname`, `avatarUrl`, `online` — no email/role/stats. |
| Listed members are onboarded, non-suspended | **Pass:** SQL filters `onboardingCompleted`, `suspendedAt IS NULL`, nickname present. |
| Online = active connection, not Clerk session alone (AUTH-005) | **Pass (foundation):** connection-count presence; see limits above. |
| SPA gate after onboarding | **Pass (UI):** `/community` / members UI require completed onboarding. |
| Server requires onboarding for directory | **Pass (2026-10-30):** `IdentityService.listMembers` rejects callers without `onboardingCompleted` (**403**). |

## M2 acceptance mapping (directory-related)

| ID | Criterion | Status |
|---|---|---|
| ACC-M2-A06 | Authenticated directory; nickname/photo; search by nickname | **Met** (server search + auth + field set) |
| ACC-M2-A07 | ≥1 authenticated socket → online to members | **Met as foundation** (real presence; page-scoped socket + in-memory registry) |
| ACC-M2-A03–A05 | Onboarding / me / no public email | **Met** (separate identity work; directory does not expose email) |
| ACC-M2-A04 | Return to original allowlisted intent after onboarding | **Met with clarified UX:** homepage explicit login → `/`; protected destination login → that allowlisted path after auth/onboarding. |

Explicit non-acceptance still holds: chat, DMs, games, etc. are not M2.

## Explicit M3 follow-ups (do not implement in M2)

1. **Site-wide real-time member presence** — open/auth presence socket for signed-in sessions across the SPA (or shared shell), durable/multi-instance presence if deployment requires it, OPEN-027 edge hardening.
2. **Online-only filtering** — UI + API filter for currently online members.
3. **Server-side member search** — *already implemented*; M3 only if product wants ranking, Hebrew normalization, debounce/rate limits, or LIKE-metacharacter escaping.
4. **Load More / pagination** — when member count approaches/exceeds the 50 cap; add stable `ORDER BY` (e.g. nickname ASC, id ASC) with the same change.
5. ~~Caller onboarding gate on `GET /members`~~ — **done in M2 (2026-10-30).**
6. ~~Deterministic directory ordering~~ — **done in M2 (2026-10-30).**

## M2 acceptance status (summary for sign-off)

| Area | Status |
|---|---|
| Visual shell (ACC-M2-V*) | Delivered; owner visual QA / OPEN-018 still the main soft gate |
| Google Clerk identity + onboarding | Functional (owner-confirmed) |
| Directory search | **Server/DB — verified** |
| Presence | **Real socket foundation — verified** (not placeholder; not full site-wide yet) |
| Limit 50 / no pagination | **OK for M2**; pagination = M3 |
| Ordering stability | **Gap → M3** (document only) |
| Quality gates | Re-run `typecheck` / `lint` / `test` / `build` before final sign-off as usual |

### Remaining blockers before final M2 sign-off

1. **Owner product confirmation** of post-login destination (home for returning users vs ACC-M2-A04 return-intent wording).
2. **Owner visual QA** still open where previously required (OPEN-018 / brand provisional assets).
3. **No directory feature blockers** for M2: search is server-side; presence is real foundation; pagination/online-only filter explicitly deferred to M3.

**Recommendation:** Accept M2 directory scope as complete for milestone criteria; track the M3 follow-ups above without delaying M2.
