# Architecture Decision Register

**Status:** DRAFT register. Prior product/technical choices marked `PREVIOUSLY AGREED` represent conversation decisions; specific new HLD details await review.

| ADR | Decision | State | Rationale / condition |
|---|---|---|---|
| ADR-001 | React + TypeScript + Vite, separate Express + TypeScript backend | PREVIOUSLY AGREED | Simple static UI and independent API |
| ADR-002 | Modular monolith; controller → service → repository contract → Drizzle DAL | PREVIOUSLY AGREED | Domain boundaries without microservices |
| ADR-003 | Supabase PostgreSQL + Drizzle Kit | PREVIOUSLY AGREED | Relational transactions, migration portability |
| ADR-004 | Clerk Google-only, internal UUID + external identity mapping | PREVIOUSLY AGREED | Stable domain identity |
| ADR-005 | Socket.IO on one Express service, durable DB state | PREVIOUSLY AGREED DIRECTION | Realtime + restart recovery; validate on implementation |
| ADR-006 | Netlify + Render + Supabase, Local/Production only | PREVIOUSLY AGREED | Cost-aware MVP, VPS exit path |
| ADR-007 | Supabase Storage via adapter; Brevo via adapter | PREVIOUSLY AGREED | Portability, managed ops |
| ADR-008 | Lightweight PostgreSQL email outbox + prompt delivery + catch-up | PROPOSED v0.2 | Durable verification email without Redis or permanent worker; scheduled purge required |
| ADR-009 | `goban-engine` & Goban via domain adapters | POC REQUIRED | Go rules/scoring/SGF support must be demonstrated |
| ADR-010 | API commands with idempotency keys and revision preconditions | PROPOSED HLD BASELINE | Race/retry correctness |
| ADR-011 | One internal user UUID; admins assigned through one-time bootstrap | PREVIOUSLY AGREED | Identity decoupled from Clerk and admin safety |
| ADR-012 | No staging; local Docker Compose, automated production backup prior to launch | PREVIOUSLY AGREED | Lean operation with explicit release risk mitigation |

See `adr/ADR-008-outbox.md` and `adr/ADR-009-go-engine.md` for records needing explicit review.

## Architecture review decisions (v0.2)
| ADR | Decision | State | Notes |
|---|---|---|---|
| ADR-013 | Authoritative Game state + move history in one versioned game row; one CAS-style UPDATE per ordinary move | OWNER DIRECTION CONFIRMED | Assess JSONB size, deduplication and concurrent retries in POC/LLD; splitting history later may require short transactions |
| ADR-014 | Pragmatic time/restart recovery, no high-availability infrastructure | OWNER DIRECTION CONFIRMED | Keepalive in initial Render, future always-on hosting, timestamp-derived expiries, tolerate rare interrupted casual games |
| ADR-015 | Resumable account-deletion coordinator with module-owned idempotent steps | PROPOSED ENGINEERING DESIGN | Review retention and external identity cleanup in Privacy LLD |
| ADR-016 | Explicit data mutation ownership by domain module | PROPOSED ENGINEERING DESIGN | Refine table-level ownership / cross-module contracts in LLD |
