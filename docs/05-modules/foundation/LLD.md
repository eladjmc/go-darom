# M1 Foundation — Low-Level Design

**Status:** APPROVED for M1 implementation (owner plan approval 2026-10-29)  
**Milestone:** M1 Foundation + Goban Engine POC  
**Authority:** Elaborates HLD v0.2; does not change Product Baseline v0.1.

## 1. Goals

- Runnable local monorepo: Vite React SPA stub + Express API + Docker PostgreSQL.
- Drizzle Kit baseline migrations and health check proving DB connectivity.
- Shared TypeScript workspace; `.env.example` with placeholders only.
- Basic lint, typecheck, unit/POC tests, and CI workflow.
- Explicit module folder layout matching controller → service → repository → DAL.

## 2. Non-goals (deferred)

- Clerk authentication (M2)
- Socket.IO rooms / presence (M3+)
- Domain tables for users, games, chat, events (later milestones)
- Brand homepage, hero integration, design tokens (M2)
- Game state CAS persistence (M4 Games LLD; approach already approved in HLD ADR-013)
- Brevo, Supabase Storage, production deploy (later)

## 3. Repository layout

```text
apps/web/                 Vite + React + TypeScript (RTL Hebrew stub)
apps/api/                 Express + TypeScript modular monolith skeleton
packages/shared/          Shared constants / health DTO types
packages/go-engine/       GoEnginePort + goban-engine adapter + POC tests
docker-compose.yml        Local PostgreSQL 16
.env.example              Placeholders only
```

## 4. Runtime contracts

### 4.1 Health

- `GET /health` → JSON `{ "status": "ok"|"degraded", "db": "up"|"down", "version": string }`
- HTTP 200 when process is up; `status` is `degraded` and `db` is `down` if DB ping fails (still 200 so orchestrators can inspect body; local acceptance requires `db: "up"`).
- No secrets in response.

### 4.2 Web stub

- `lang="he"`, `dir="rtl"`.
- Visible Hebrew title: גו דרום.
- Provisional branding text only; no fabricated final SVG logo master.
- Optional display of API health for local smoke.

## 5. Data

- PostgreSQL via Docker Compose (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from env).
- Drizzle schema in M1: minimal `health_checks` table (id, created_at) used only to prove migrations; no product entities.
- Migrations via Drizzle Kit; committed SQL under `apps/api/drizzle/`.

## 6. Layering (API)

```text
src/http/routes/*       Controllers / route handlers
src/app/*               Application services (HealthService)
src/infra/db/*          Drizzle client + repositories
src/config/env.ts       Env parsing
```

No heavy DI framework; explicit constructors.

## 7. Environment variables (M1)

| Name | Required local | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `API_PORT` | no (default 4000) | HTTP port |
| `WEB_ORIGIN` | no | CORS origin for local web |
| `NODE_ENV` | no | development/production/test |
| `CLERK_*` | no (placeholder) | Future M2 |
| `BREVO_*` | no (placeholder) | Future |
| `SUPABASE_*` | no (placeholder) | Future |

Never commit real secrets.

## 8. Testing and CI

- `packages/go-engine` Vitest POC suite (primary M1 evidence).
- `apps/api` unit/integration: health with DB when Compose is up.
- Root scripts: `typecheck`, `lint`, `test`, `poc:go-engine`.
- GitHub Actions: install, typecheck, lint, test (Postgres service for API health if feasible).

## 9. Open decisions carried forward

None invented for M1. Game CAS persistence remains M4. Engine gaps documented in go-engine LLD / POC matrix, not by shrinking MVP.
