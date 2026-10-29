# Realtime, Presence and Recovery Architecture

**Status:** DRAFT · Socket.IO preferred and already aligned as technical direction.

## 1. Connectivity
- Same Express backend terminates REST and Socket.IO; Socket handshake authenticates verified Clerk session token and maps to internal user UUID.
- Re-check authorization when joining a room and before **every** privileged mutation; a once-authenticated socket is not indefinite authorization.
- Room categories: user inbox, public community chat, authorized DM thread, authorized game, authorized Study board. IDs in room names are not sufficient authorization.
- A user may have many tabs/devices; presence derives from **at least one active authenticated connection**, with disconnect debounce policy. No status inference from Clerk signed-in state.

## 2. REST vs Socket responsibilities
- Use REST for durable initial snapshots, pagination, content CRUD, event registration and actions needing normal HTTP semantics.
- Use Socket.IO for live presence changes, persisted-notification push, chat delivery, game and Study operation broadcasts, invitation changes.
- **All authoritative changes** should pass the same application services regardless of REST/Socket transport; avoid divergent business rules.
- Commands carry unique client request/command ID and expected revision where appropriate. Server events carry entity ID, server revision/event ID, and enough information to detect gaps.
- Never promise exactly-once network delivery; provide effectively-once domain effects through deduplication, transactionality, replay/snapshot resync.

## 3. Snapshot + increment protocol
1. Join authorized room and fetch snapshot + revision.
2. Subscribe to ordered server events, applying only sequential revisions; if a gap or mismatch is detected, fetch fresh snapshot.
3. On reconnect, refresh authentication/permissions, resubscribe and reconcile using last known revision; server is authoritative.
4. For action pending during disconnect, show `pending` and send/retry with the **same** command ID; do not mark successful until server ack/reconcile proves commit.
5. Multi-tab writes remain serialized at DB/service boundary, not by frontend locks.

## 4. Presence and invitation lifecycle
- Live invite TTL 5m; explicit logout or known deliberate exit cancels immediately; unclassified network loss/refresh gets 10-second reconnect grace. A passive close cannot always be classified as deliberate: HLD must be honest about this limit.
- Inviter entering an accepted Live game cancels *all* other outstanding Live invitations, preventing simultaneous live games.
- Async invites last 3 days and persist independent of presence.
- Study invitation policy remains OPEN; must not inherit Live/async expiry by accident.
- Expiration must be validated from timestamps at action time; background cleanup is convenience, not correctness.

## 5. Game and Study broadcasts
- Server only broadcasts **committed** operations after successful conditional DB write/commit; clients render confirmed state and pending interaction separately.
- Game events include phase, active player, board revision, clock snapshot and latest move; scoring proposals and undo requests are separate lifecycle commands.
- Study ops use one global version order; global Undo reverts the most recent eligible committed operation, regardless of actor. Redo invalidated by a new edit; exact edge rules in Study LLD.
- On Render restart, connected clients retry with exponential backoff; DB snapshot and move/op log restore state.

## 6. Notifications and chat
- Persist significant notifications (game/study invites, async turns, DM, accepted invites) and stream recipient-specific updates; no individual toast for every public-chat message.
- Chat messages persist before broadcast, with server ID and thread sequence. Private thread subscription only to participants not suspended/blocked per product policy.
- Avoid presence blasts to all site users at high frequency; use coalesced state changes.

## 7. Timers and free-host implications
- Live clock source of truth is server timestamps and recorded clock state, not a timer held exclusively in JS memory; on-demand evaluation after sleep/restart is required.
- Async deadline calculated from per-turn start and configured duration; expiry evaluated at read/command time plus a catch-up job; no dependence on continuously running interval.
- MVP favors a small best-effort worker with catch-up on startup, opportunistic invocation and an optional external scheduled HTTP trigger when appropriate. Render keepalive is an operational convenience, not a correctness requirement. For privacy purge and delayed email retries, a credible scheduled trigger is required before public launch, but no always-on worker or Redis is needed.
- This is a casual service: short downtime can delay delivery/UI updates. The system must not fabricate accepted moves or corrupt records. Unexpected infrastructure outages affecting timed games should have a documented fair-administration policy (e.g. suspend/adjudicate affected games without automatic punitive outcomes) in Game LLD.

## 8. Later LLD contracts
Exact event names/payloads, sequence scope, disconnect detection algorithm, clock formula, join/rejoin handshake, bandwidth and rate limits, blocked-user restrictions, and socket token refresh need approved LLD + tests.

## 9. Lightweight game move contract (v0.2)
- Each move command includes a stable command ID; no move is advertised as accepted before PostgreSQL acknowledges the authoritative version-conditional state update.
- Engine validation and next-state calculation operate on a copied immutable snapshot; failed writes discard the proposal.
- On optimistic conflict, fetch latest snapshot and respond with a conflict/resync outcome. Do not blindly reapply a move to an updated game.
- Persist accepted command IDs with the authoritative game state (or in a separately constrained log if the LLD shows this is necessary) to make ambiguous retries safe.
- Gameplay reliability target: appropriate to a noncompetitive community. No HA cluster, distributed lock, or elaborate clock infrastructure in MVP.
