# M2 Acceptance Criteria

**Milestone:** M2 Visual shell + authenticated identity  
**Status:** COMPLETED AND APPROVED (owner 2026-10-30) — see `docs/07-delivery/M2_FINAL_ACCEPTANCE_REPORT.md`  
**Return-intent clarification (ACC-M2-A04):** explicit homepage login may return `/`; login from a protected destination returns to that allowlisted path after authentication and onboarding.

## Visual shell

| ID | Criterion |
|---|---|
| ACC-M2-V01 | Home uses selected hero derivatives (`HR-001-*`); Hebrew DOM overlay; photo not mirrored |
| ACC-M2-V02 | Provisional logo/brand text `גו דרום`; no claim of final vector master |
| ACC-M2-V03 | Design tokens applied (cream/wood/sage); Heebo or approved Hebrew font |
| ACC-M2-V04 | Primary nav RTL; usable at 360, 390, 768, 1024, 1440 |
| ACC-M2-V05 | Shop Coming Soon page polished placeholder |
| ACC-M2-V06 | `prefers-reduced-motion` respected; focus-visible on interactive controls |
| ACC-M2-V07 | Owner visual QA screenshots reviewed (OPEN-018) |

## Identity

| ID | Criterion |
|---|---|
| ACC-M2-A01 | Google-only Clerk sign-in works in local/dev configuration |
| ACC-M2-A02 | Server verifies JWT; upserts internal UUID + auth identity |
| ACC-M2-A03 | First login shows nickname/photo confirmation before member features |
| ACC-M2-A04 | After onboarding, user returns to original allowlisted intent when still valid |
| ACC-M2-A05 | `GET/PATCH /me` enforce auth; nickname validation; no public email |
| ACC-M2-A06 | Authenticated member directory lists nickname/photo; search by nickname |
| ACC-M2-A07 | Presence: user with ≥1 authenticated socket shows online to members |
| ACC-M2-A08 | `/admin` route exists in SPA but privileged APIs reject non-admin |
| ACC-M2-A09 | No secrets in frontend bundle; `.env.example` documents Clerk keys |

## Regression / quality

| ID | Criterion |
|---|---|
| ACC-M2-Q01 | `npm run typecheck`, `lint`, `test` pass |
| ACC-M2-Q02 | M1 engine POC suite still passes |
| ACC-M2-Q03 | Health endpoint still reports DB up locally |

## Explicit non-acceptance (not M2)

Chat, DMs, games, events registration, CMS publishing, puzzle solving beyond placeholders.
