# Module Boundaries and Dependency Rules

**Status:** DRAFT · Modular-monolith architecture.

| Domain module | Owns | Exposes to other modules | Explicitly does not own |
|---|---|---|---|
| Identity & Members | Internal UUID, Clerk identity mapping, nickname/avatar, status, roles | Authenticated actor, profile/directory lookup | OAuth token issuance (Clerk) |
| Social Safety | Mutual blocks, reports, suspension and moderation actions | `canContact`, `canAct`, report workflows | Reading all DMs by default |
| Invitations | Typed Live/async/Study invites, state and expiry | Create, accept, reject, cancel, expire | Actual game moves or Study board edits |
| Games | Lifecycle, setup, phases, clock/deadlines, move history, scoring, Replay | Game queries and authoritative commands | Rendering Goban, general user messaging |
| Study | Personal/shared boards, membership, ownership, revisions, global undo | Board edit/query, invite acceptance completion | Go rules enforcement for free placement |
| Chat | One public channel, one-to-one threads, message history | Send/read/stream messages | General notification persistence |
| Notifications | Persisted inbox, read state and eligible toast emissions | Notify, mark-read, fetch inbox | Chat history, email send transport |
| Events | Public events, capacities, member/guest registrations, cancellation | Registration/attendance administration | Brevo APIs |
| Content CMS | Announcements, guides, publication states, Tiptap body data, video metadata | Public content/admin CRUD | Arbitrary dynamic page builder |
| Puzzles | Positions, solution trees, SGF import/export subset, weekly featured selection | Solve/playback/admin editor APIs | Public player ranks/solved tracking |
| Media | Photo metadata and storage authorization | Secure upload/read/delete | Content publication policy |
| Email | Templates, delivery/outbox worker, provider adapter | Transactional email dispatch | Event business decisions |
| Admin | Admin HTTP screens / orchestration, audit views | Management workflows via domain services | Bypassing domain authorizations |

## Dependency directions
- Transport (`controllers`, `socket handlers`, scheduled job runners) → application services → repository/provider interfaces → adapters/DAL.
- Domain services may call other domain services **through defined use cases or ports**, not access a neighbor's tables directly; cross-module orchestration is explicit and transactionally reviewed.
- Core domain entities should not import React, Express, Drizzle, Clerk, Supabase or Brevo types.
- `GameService` owns games; `GoEngineAdapter` maps domain operations to a third-party engine. UI component reuse (game, guide demonstration, puzzle, study) does **not** imply shared business rules.
- Notification events are domain facts, not permission to reveal private payloads to unauthorized clients.
- Avoid circular service dependencies; use orchestrator or domain events/outbox when multiple modules coordinate.

## Initial intended public/private boundaries
- Public reads: homepage, published announcements/guides/videos, events, event gallery (subject to content permissions), weekly puzzle, puzzle library, shop placeholder.
- Member actions: chat/DM, profile directory, invites/games, Study, personal participation/history, in-app inbox.
- Admin actions: protected `/admin`, publication, events/CSV, puzzles/media, account moderation; recheck `ADMIN` on every server endpoint/socket action.

## Unresolved cross-module ownership (LLD gate)
- Unified invitation record vs domain-specific invitation records; recommendation: **typed invitations** through one app service, while game/study setup remains in the target module.
- Durable job worker execution/co-ordination on one Render instance and schedule-based cleanup; determine reliable cadence and catch-up semantics in deployment LLD.
- Account deletion workflow coordinates identity, social, chat, events, games and Study in a recoverable multi-step procedure (no single giant cross-service opaque call).

## Ownership enforcement (v0.2)
Use the ownership table in `DATA_ARCHITECTURE.md` as the architectural rule. Controller and socket handlers call the module owning a business command; another module cannot bypass its validation by editing the same database tables. Cross-module workflows (notably account deletion and invite acceptance) have an explicit orchestration service but call owning-module contracts. An individual SQL transaction is permitted for tightly related cross-row invariants; do not enforce a transaction framework for ordinary one-row game state updates.
