# Deployment and Operations High-Level Design

**Status:** DRAFT · Local + Production only for MVP.

## Environments
| | Local | Production |
|---|---|---|
| Web | Vite dev server / build preview | Netlify static hosting |
| API | Docker Compose Node service | Render single Express service (free tier target) |
| DB | Local PostgreSQL container | Supabase PostgreSQL |
| Storage | Local adapter/emulation or isolated dev Supabase bucket | Supabase Storage, production bucket |
| Auth | Clerk development credentials | Separate Clerk production instance/credentials |
| Email | Safe stub/isolated test mode | Brevo verified domain, transactional sender |
| Secrets | local env, never committed | hosting secret configuration |

## Deploy topology and CI/CD (proposal)
1. CI runs formatting/lint, TypeScript build, unit tests, integration with ephemeral Postgres, migrations validation, and UI smoke tests.
2. Tagged/reviewed app deployment goes to Render; static build to Netlify; DB migrations deployed through controlled release step with rollback/readiness plan.
3. No automatic deploy of destructive migration without backup + explicit owner review.
4. Production smoke test includes auth, basic member read, socket handshake, game snapshot, event public page and object access.

## Resilience on free hosting
- Render free is an initial inexpensive deployment, not necessarily permanent production hosting. The owner uses keepalive monitoring, reducing idle-sleep risk. A later always-on VPS is planned. Keepalive cannot prevent all redeploys/crashes/outages; authoritative data remains durable.
- All critical state lives in PostgreSQL; no local file storage persistence. All timers are derivable from persisted timestamps.
- Background email retries/cleanup and the 90-day guest-PII deletion must catch up after downtime. Use startup catch-up, opportunistic processing and a lightweight scheduled wake-up/HTTP trigger where needed. **Before launch**, verify an actual reliable invocation path for privacy deletion and overdue mail; avoid unnecessary always-on infrastructure. Time-based game states/expiries are derived from DB timestamps on demand, not worker ticks.
- Failure of third-party email should not roll back a committed registration; durable outbox records intent and retry status.

## Backups / restores
- During development manual backups acceptable.
- **Before production launch** automate daily PostgreSQL backups to storage outside the primary Supabase project, encrypted and retention-controlled; test restore regularly.
- Separately back up Supabase Storage images/SGF assets and reconcile DB metadata; DB snapshots don't include object bytes.
- Plan deletion lifecycle for backups (including account/guest PII), storage access restriction, restoration drills, recovery objectives (`RPO`, `RTO`) in Ops LLD.
- Maintain an operator runbook for data corruption, leaked secret, accidental admin action, Brevo outage and game desync.

## Monitoring and cost
- Structured JSON logs with request IDs, aggregate error and latency metrics, job/outbox backlog, email delivery failures, socket disconnect rates and DB connection utilization.
- Health checks must not disclose secrets or personal data; alert on repeated failures and budget/usage threshold approaches.
- Check live provider plan quotas, limits, verification obligations and acceptable use **during implementation and before launch**; prices and free-tier capacities can change.

## Exit path to VPS
- Containerized Express and PostgreSQL-compatible repository layer; versioned Drizzle migrations; env-based endpoints.
- Storage and Email adapters allow provider changes; migration still needs data transport and functional/security revalidation.
- Scaling to multiple API processes would require a shared Socket.IO adapter/presence coordination and stronger job coordination; not in single-instance MVP.

## Operational proportionality and time-based outcomes (v0.2)
- Go Darom is a small, casual, noncompetitive community. Do not introduce high-availability clusters, Redis, distributed cron or fault-tolerant clock infrastructure solely to avoid rare disrupted games.
- Preserve game data, provide clear reconnect/resync messaging, and make time accounting derived from persisted timestamps. During confirmed platform outage, prevent unjustified forced losses through a simple documented game-dispute/administrative handling rule to be specified in Game LLD.
- The future VPS migration is a deployment/ops milestone, not a reason to increase the initial MVP hosting stack.
