# M1 Acceptance Scenarios

**Milestone:** M1 Foundation + Goban Engine POC  
**Rule:** Record actual commands and results; do not claim pass without execution.

## Foundation

| ID | Scenario | Expected |
|---|---|---|
| ACC-F-01 | `docker compose up -d` | Postgres healthy |
| ACC-F-02 | Apply Drizzle migrations | Succeeds |
| ACC-F-03 | `GET /health` with DB up | `status: ok`, `db: up` |
| ACC-F-04 | Web stub loads | `dir=rtl`, Hebrew title גו דרום |
| ACC-F-05 | `npm run typecheck` | Exit 0 |
| ACC-F-06 | `npm run lint` | Exit 0 |
| ACC-F-07 | `.env.example` present; no live secrets in git | Pass |
| ACC-F-08 | CI workflow file present | Pass |

## Engine POC

See `go-engine-poc-matrix.md`. Suite must be executed via `npm run poc:go-engine` (or equivalent).

## Sign-off

M1 complete when foundation ACC rows pass and POC matrix is fully executed with pass/fail/gap recorded. Owner approval required before M2.
