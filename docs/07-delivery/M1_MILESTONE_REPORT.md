# M1 Milestone Report — Foundation + Goban Engine POC

**Status:** approved by owner (2026-10-29) after manual 9×9 board testing  
**Date:** 2026-10-29  
**Follow-up:** hover preview color fix + regression test (same date); see `m1-dev-goban-poc.md`.

## Requirements covered

| ID / theme | Doc path | Coverage |
|---|---|---|
| Modular monolith skeleton | HLD / ARCH-001–003 | `apps/api`, `apps/web`, workspaces |
| Local Docker Postgres + Drizzle | ARCH-003, ARCH-005 | `docker-compose.yml`, migrations |
| Health / ops baseline | OPERATIONS | `GET /health` |
| Hebrew RTL stub | UX / kickoff | `apps/web` `dir=rtl` `lang=he` |
| Engine adapter + POC | ADR-009, OPEN-001, ARCH-011 | `packages/go-engine` |
| No invented vendors/scope | Kickoff | Clerk/Brevo/Storage deferred |

## Tasks completed / files

- M1 LLD + contracts + acceptance under `docs/04-contracts`, `docs/05-modules`, `docs/06-quality`
- Monorepo: `apps/api`, `apps/web`, `packages/shared`, `packages/go-engine`
- Docker Compose Postgres 16, Drizzle baseline `health_checks`, `.env.example`, CI workflow
- `GobanEngineAdapter` implementing `GoEnginePort` over `goban-engine@8.3.226`
- Executable POC matrix (20 tests)
- Docs hygiene: product links, HLD review sign-off note, M0 traceability index

## Commands run and results

```text
docker compose up -d                          → PASS (Postgres started)
npm run db:generate && npm run db:migrate     → PASS
npm run typecheck                             → PASS
npm run lint                                  → PASS
npm test                                      → PASS (20 go-engine + 2 API)
npm run poc:go-engine                         → PASS 20/20
npm run build                                 → PASS (api + web Vite build)
curl -s http://localhost:4000/health
  → {"status":"ok","db":"up","version":"0.1.0-m1"}
```

POC-PERF-01 sample: `moves=40 serializeBytes=702 serializeMs≈0.03–0.05`.

## Gaps (no silent scope cut)

1. **GAP-PHASE-01** — Engine does not auto-enter scoring after two passes; adapter `beginScoring()` required (M4 state machine).
2. **GAP-SEKI-01** — Deep seki fixtures deferred to Game LLD scoring tests.
3. **GAP-UI-01** — Optional `goban` React smoke deferred to M2/M4.
4. Game CAS one-row persistence **not** implemented in M1 (intentionally M4 per plan/HLD).

## Engine verdict

`goban-engine` is **viable** for MVP rules/handicap/SGF/scoring primitives behind the adapter. Keep candidate status until M4 absorbs gaps; **do not** change approved architecture or drop handicap/Japanese scoring.

## Approval requested

Please **approve M1** (or request changes).  
**Do not start M2** until approved. Proposed M2: visual shell, design tokens, selected hero, provisional logo, Clerk Google onboarding.
