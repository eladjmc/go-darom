# M1 Acceptance Scenarios

**Milestone:** M1 Foundation + Goban Engine POC  
**Rule:** Record actual commands and results; do not claim pass without execution.

## Foundation

| ID | Scenario | Expected | Result (2026-10-29) |
|---|---|---|---|
| ACC-F-01 | `docker compose up -d` | Postgres healthy | **PASS** |
| ACC-F-02 | `npm run db:migrate` | Succeeds | **PASS** |
| ACC-F-03 | `GET /health` with DB up | `status: ok`, `db: up` | **PASS** `{"status":"ok","db":"up","version":"0.1.0-m1"}` |
| ACC-F-04 | Web stub loads | `dir=rtl`, Hebrew title גו דרום | **PASS** (source + build) |
| ACC-F-05 | `npm run typecheck` | Exit 0 | **PASS** |
| ACC-F-06 | `npm run lint` | Exit 0 | **PASS** |
| ACC-F-07 | `.env.example` present; no live secrets in git | Pass | **PASS** (`.env` gitignored) |
| ACC-F-08 | CI workflow file present | Pass | **PASS** (`.github/workflows/ci.yml`) |

## Engine POC

See `go-engine-poc-matrix.md` — **20/20 executed tests passed**.

## Sign-off

M1 complete when foundation ACC rows pass and POC matrix is fully executed with pass/fail/gap recorded. Owner approval required before M2.
