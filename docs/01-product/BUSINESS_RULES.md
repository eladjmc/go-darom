# Go Darom — Product Business Rules

**Status:** DRAFT. Rules here reference confirmed decisions; any unresolved choice stays marked OPEN.

## Invariants
- BR-AUTH-01: Only Clerk-authenticated, non-suspended members can perform member-only social/game actions; admins additionally require server role authorization.
- BR-AUTH-02: Public profile consists of nickname and avatar only, with no public email.
- BR-COMM-01: Mutual direct-contact block prevents new DMs and Live/async/Study invites, not public chat visibility or continuation of active games.
- BR-GAME-01: No user can be participant in more than one **active Live** game at the same time.
- BR-GAME-02: Each accepted game operation is validated, persisted and sequentially applied by the authoritative server; duplicate submission cannot produce duplicate moves.
- BR-GAME-03: Live invitations expire no later than creation + 5 minutes, and sooner on confirmed inviter explicit logout or entering another Live game; unknown disconnection is allowed 10s reconnect grace.
- BR-GAME-04: Invite acceptance is mutually exclusive with competing accepts and must satisfy permissions, invited settings and both-player availability.
- BR-GAME-05: Game setup is immutable after acceptance; normal komi 6.5 by default, handicap komi 0.5 by default, both editable before sending.
- BR-GAME-06: No-winner ending requires affirmative agreement of both players and may be proposed at any game phase.
- BR-GAME-07: Untimed Live idle for 48h triggers resolution/conversion affordance, **not automatic timeout loss**. OPEN: unilateral resolution authority.
- BR-ASYNC-01: Async invites expire after three days; async move timer is independent, selected from none/24h/3d/7d and reset at each move.
- BR-STUDY-01: Shared boards have no more than two editors; any committed shared board edit participates in one global operation order; Undo targets most recent applicable operation.
- BR-STUDY-02: Creator alone may delete for everyone; partner hiding from personal list does not itself delete shared data.
- BR-EVENT-01: Confirmed participants + nonexpired guest seat reservations must not exceed event capacity.
- BR-EVENT-02: Guest registration is not confirmed until email verified; capped-event pending seat reservation ends at 15 minutes.
- BR-EVENT-03: Guest event PII removed 90 days after event, subject to applicable legal holds and backup/export lifecycle rules.
- BR-NOTIF-01: Significant user-facing notifications persist and are visible through bell; ordinary public-chat messages do not cause individual toasts.
- BR-PRIV-01: Admin has no general-purpose DM browsing permission; reported DMs exposed within bounded, auditable context only.
- BR-PRIV-02: Chat retained until deletion; closed reports up to one year unless justified legal retention applies.
- BR-PRIV-03: Account deletion removes personal identifiers and anonymizes retained shared content; shared Study Board ownership passes to surviving partner.

## Explicit unresolved details (must not be invented)
- `OPEN-003`: whether 48h inactive Live permits unilateral end, and result classification.
- `OPEN-005`, `OPEN-006`: pending invitation dedup and Study invite expiry.
- `OPEN-007`, `OPEN-008`: remove/hide re-entry, concurrency and Undo/Redo races.
- `OPEN-010`, `OPEN-011`: complete privacy deletion matrix and number of neighboring DM messages visible on report.
- `OPEN-019`–`OPEN-022`: SGF subset, interactive guide board precise controls, color/handicap and engine-supported legality.

## Source hierarchy
- Decision register is a consolidation of owner-approved choices; if this draft differs, flag conflict and resolve before approval.
- OPEN_ISSUES are not requirements. Example values are illustrative, not binding.
