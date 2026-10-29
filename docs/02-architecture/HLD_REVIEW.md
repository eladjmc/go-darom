# HLD Review, Traceability and Gates

**Status:** DRAFT v0.2 — revisions incorporated from owner architecture review; final sign-off pending.

## 1. Coverage mapping
| Product baseline area | HLD ownership | LLD follow-up |
|---|---|---|
| Identity, public/member/admin profiles | System, Modules, Security, Data | Clerk integration, RBAC, first-login UX |
| Live/async games and invitations | System, Data, Realtime, Engine ADR | Game lifecycles, commands, clocks, scoring |
| Study personal/shared | Modules, Data, Realtime, Security | Operation log, global undo/redo, ownership |
| Chat, DMs, notifications and moderation | Modules, Data, Realtime, Security | Message contracts, safety workflow |
| Events, guests, Brevo | System, Data, Security, Ops | Holds, verification, outbox, cancellations, CSV |
| CMS, media, galleries, learning | Modules, Data, Security | Tiptap schema, media ACL, guide boards |
| Weekly puzzle and SGF branches | Modules, Data, Engine ADR | Puzzle editor/tree, imports, solver |
| Visual system / RTL / mobile | System goals; separate UX baseline required | Design system and screen specs |
| Privacy and production readiness | Security, Ops, Data | Retention, backup/deletion and release playbooks |

## 2. Product ambiguities explicitly **not** resolved by this HLD
- Live inactivity after 48h: whether one player can force finish, and exact no-result vs resignation rules.
- Study invite expiry, Study participant hiding and re-entry, precise redo conflict behavior.
- Private DM report context message count; exact chat deletion semantics and account-deletion impact on conversations.
- Final event registration verification/cancellation token security and existing-account email collision rules.
- Interactive guide board behavior beyond required interactivity.
- Exact normal/handicap color override rules and specific legal handicap arrangements, conditional on POC.
- Async invitation duplicate/quantity limits; presence handling edge cases.
- Notification retention, backups retention period, picture permissions, specific email retry/job schedule, mobile 19×19 interaction behavior.

## 3. Feasibility and external dependencies
- `goban-engine` + `Goban` POC is a **blocking technical gate** before dependent Game/Puzzle LLD approval.
- Verify actual Brevo API, verified sending domain, quotas and error behavior and Supabase Storage/DB free-tier characteristics at implementation time.
- Reliable scheduled jobs for timeouts/PII purge/outbox retries must be designed for sleep/restart behavior; a keepalive ping is not a durability guarantee.

## 4. Formal review checklist
- [ ] HLD preserves all approved Product Baseline domains and exclusions; no unauthorized features introduced.
- [ ] Every module has a single business owner and defined dependencies.
- [ ] Identity and admin permissions enforced server-side for REST and Socket.
- [ ] Main transaction boundaries and idempotency semantics stated clearly.
- [ ] No authoritative state depends on RAM, browser storage or Render ephemeral filesystem.
- [ ] Backup/restore, privacy lifecycle, outbox and vendor failure are addressed.
- [ ] Conditional POC decisions clearly labeled; ADRs identified.
- [ ] RTL, accessibility and visual reference requirements are carried to UX spec.
- [ ] No HLD proposal marked as owner-approved without review.
- [ ] Product owner reviewed the HLD and approves progression to UX/contracts baseline.

## 5. Sign-off record
- Product Baseline v0.1: **owner-approved** (see `docs/01-product/README.md`). Individual nested Markdown headers may still say DRAFT; folder README + kickoff govern.
- HLD v0.2: **owner-approved** (see `docs/02-architecture/README.md`). HLD v0.1 remains historical/superseded.
- Implementation: authorized **per milestone** after that milestone's LLD/acceptance gate is approved. M1 LLD approved 2026-10-29.

## 6. v0.2 change log and assessment
**Owner review direction incorporated:**
1. Proportional operational resilience: Render keepalive and future always-on VPS acknowledged; reduced severity of rare downtime for noncompetitive games; no HA or Redis.
2. Single-row authoritative `Game` state update with optimistic revision compare-and-swap and durable command deduplication, including move history in initial snapshot; no multi-statement transaction for ordinary move. POC to test 19×19 state size/replay overhead.
3. Short DB transactions remain for invitation accept/sibling cancel and reservation/seat capacity invariants.
4. `ADR-008` simplified to lightweight durable email outbox, immediate attempt, retry/catch-up, with dependable scheduled privacy purge before launch.
5. Resumable/idempotent account deletion workflow with module-owned cleanup, subsequent Clerk deletion and verification.
6. Explicit high-level data ownership boundaries added, details deferred to LLD.
7. `goban-engine` POC moved to initial implementation gate.

**Remaining owner-facing/POC gates:** engine compatibility, operational schedule for prelaunch data cleanup, exact retention exceptions, timed-outage fair-handling in Game LLD, and any documented unresolved Product Baseline questions. All are not authorized to be silently invented by implementation agents.

**Recommendation:** HLD v0.2 is ready for owner review, not automatically approved.
