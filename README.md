# Go Darom

Hebrew RTL Go community platform for southern Israel.

**Start here:** [`docs/07-delivery/CURSOR_IMPLEMENTATION_KICKOFF.md`](docs/07-delivery/CURSOR_IMPLEMENTATION_KICKOFF.md)

## Milestone status

| Milestone | Status |
|---|---|
| M0 Documentation audit | Done |
| M1 Foundation + Goban Engine POC | Approved |
| M2 Visual shell + identity | Implemented — awaiting owner sign-off |
| M3+ | Not started |

## Local development

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:5173
```

### Auth locally

- **Stub (default in `.env.example`):** `IDENTITY_DEV_STUB=true` and `VITE_IDENTITY_DEV_STUB=true` — use «התחברות עם Google» / sign-in stub to exercise onboarding without Clerk keys.
- **Real Clerk:** set `CLERK_SECRET_KEY` + `VITE_CLERK_PUBLISHABLE_KEY`, set both stub flags to `false`, enable Google-only in Clerk.

### Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

### Useful URLs

- Home: http://localhost:5173/
- Shop: http://localhost:5173/shop
- Members: http://localhost:5173/members
- Health: http://localhost:4000/health
- M1 engine demo (dev only): http://localhost:5173/dev/goban-poc

## Authority

Approved Product Baseline v0.1 and HLD v0.2 are binding. UX/brand derivatives need visual QA. Selected logo #2 and hero #3 sources must not be substituted.
