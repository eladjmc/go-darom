# Go Darom — System HLD v0.2

**Status: APPROVED by product owner (HLD v0.2).** Product Baseline v0.1 also approved. No implementation code included.

## Document map
- `SYSTEM_HLD.md` — system context, layers and workflows
- `MODULE_BOUNDARIES.md` — modular ownership rules
- `DATA_ARCHITECTURE.md` — logical records, single-row CAS game writes, other transaction boundaries, data owners
- `REALTIME_ARCHITECTURE.md` — Socket.IO, commands, resync and pragmatic time handling
- `SECURITY_ARCHITECTURE.md` — authentication, roles, moderation and resumable deletion
- `DEPLOYMENT_OPERATIONS.md` — local/production, pragmatically resilient hosting, backup strategy
- `ADR_REGISTER.md` — decisions and status; `adr/` full ADR notes
- `HLD_REVIEW.md` — scope coverage, unresolved issues and v0.2 change log

## Key update from v0.1
An ordinary move is calculated server-side and saved as **one atomic, revision-conditional PostgreSQL UPDATE** of authoritative Game state and embedded move history. Cross-row invariants still use small transactions. No high-availability architecture is proposed for the casual MVP. Account deletion is a resumable sequence, and domain data ownership is explicit.

## Implementation gate
`goban-engine` / Goban POC must prove rules, Japanese scoring, Handicap and SGF/puzzle branches before dependent implementation. Final API/Socket schemas and SQL indexes belong to milestone LLD.
