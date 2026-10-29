# Open Issues and Reconciliation Log

**Status: DRAFT.** Items here are not implicitly approved by previous recommendations. Priority: P0 = blocks a specification or first milestone; P1 = must be resolved before relevant module LLD; P2 = operational/detail decision.

| ID | Priority | Issue / discrepancy | Proposed resolution path |
|---|---|---|---|
| OPEN-001 | P0 | Go rules/score engine viability: Japanese territory, seki, Ko variants, handicap on each supported board size, dead-stone agreement, undo, SGF tree support. | POC acceptance tests and engine adapter evaluation before Game LLD is finalized. |
| OPEN-002 | P0 | Exact consistency semantics for invitation acceptance, cancellation, move submission, timer expiry and reconnections are not specified in endpoint/event detail. | Cross-system invariants in HLD, then transaction boundaries, idempotency keys and state machines in per-module LLD. |
| OPEN-003 | P1 | **Live idle 48h**: phrase 'can end it' does not explicitly resolve whether one participant can terminate without the other's consent and, if so, what result is recorded. | Confirm outcome/authority; do not assume unilateral no-result. Mutual conversion to async is approved. |
| OPEN-004 | P1 | Live invitation cancellation on 'intentional site exit' cannot always be distinguished from tab close or connection loss. | Specify best-effort explicit logout handling; 10-second grace for unclassified transport disconnect. |
| OPEN-005 | P1 | Async invitation limit per pair and duplicate invitations, decline/cancel behavior, invitation notification policy. | Product decision before invitation LLD. |
| OPEN-006 | P1 | Study Board invitation expiry/accept/decline semantics. | Choose a consistent low-friction policy before Study Board LLD. |
| OPEN-007 | P1 | Study Board 'remove from my list' vs participant continuing to edit; re-entry rights after hidden; who can later re-invite. | Clarify visibility vs membership; keep board deletion and removal separate. |
| OPEN-008 | P1 | Study Board undo/redo conflicts: another user editing immediately after undo; how user-facing toast/history works. | Document server operation log, global undo stack and revision/version safeguards. |
| OPEN-009 | P1 | Whether users may download/share completed game SGF or expose public replay links was discussed only as future possibility. | Keep private replay; consider sharing later only if explicitly approved. |
| OPEN-010 | P1 | Detailed account deletion rules for DMs, public posts, event photos, reports, active async games, and retention under legal constraints. | Privacy data lifecycle matrix before release, respecting agreed anonymization. |
| OPEN-011 | P1 | Report context length ('several adjacent messages') not fixed; can include third parties' content. | Specify fixed bounded window and audit access before moderation LLD. |
| OPEN-012 | P1 | Guest email verification: token expiry/retries, existing member email collision, cancellation link security, duplicate submissions, event cancellation while pending. | Events LLD and security review; no need to reopen approved 15-minute reservation. |
| OPEN-013 | P1 | Guest record deletion after 90d may conflict with future retention of public aggregate event attendance, exports, send logs or backup retention. | Separate PII records from anonymous event counts; define backup lifetime and manual export guidance. |
| OPEN-014 | P1 | Brevo account-level requirements, verified sending domain, free-plan limits, deliverability and retries are environment-dependent. | Provider integration checklist and sandbox/local test strategy; provider itself is approved. |
| OPEN-015 | P1 | Supabase Storage file visibility, moderation for event photos, transformations and photo usage consent. | Storage contract/media privacy and permission design. |
| OPEN-016 | P1 | Initial admin bootstrap needs explicit secret/authorization procedure and immutable audit trail. | HLD security decision + deployment runbook. |
| OPEN-017 | P1 | Cost/operational resilience: Render free service sleeping/restarts, Supabase free limits, backup destination and automated restore verification. | Non-functional targets, deployment monitoring and launch gate. |
| OPEN-018 | P1 | Select canonical interface copy, responsive breakpoints, motion behavior and design-reference asset pack. | Approved UX baseline, visual specifications and asset provenance before frontend implementation. |
| OPEN-019 | P1 | Puzzle SGF imports may encode multiple branches, comment annotations and illegal setup; expected support/validation not fully specified. | Define supported SGF subset after POC. |
| OPEN-020 | P1 | Interactive guide board expected interaction was proposed as playback with optional 'try it'; exact free-play mode is not formally selected. | Confirm behavior before guide LLD; interactive board itself is approved. |
| OPEN-021 | P1 | Initial games from invite: precise random/color selection precedence, color+handicap compatibility and whether inviter can choose who receives black. | Product convention and validation in Game LLD. |
| OPEN-022 | P1 | Handicap bounds were approved subject to engine support; valid positioning on 9×9 and 13×13 not yet verified. | POC validation; preserve requested 9×9 up to 4 and 13×13/19×19 up to 9 as target. |
| OPEN-023 | P2 | Event image consent, photo removal requests and minors in galleries. | Media policy before public release. |
| OPEN-024 | P2 | Rules for retaining admin audit logs and notifications beyond initial suggested 90 days; no final user approval of automatic notification pruning. | Specify retention separately. |
| OPEN-025 | P2 | Exact source-of-truth precedence between product requirements, ADRs, contracts and LLD needs section ownership to avoid circular conflicts. | Governance policy with conflict escalation rather than simplistic document ranking. |
| OPEN-026 | P2 | Public site SEO, social share metadata and pre-rendering strategy are discussed as direction, not implementation contract. | HLD performance/SEO assessment. |
| OPEN-027 | P2 | Public member presence excludes unauthenticated visitors; presence accuracy during rapid reconnect and multi-tab race cases. | Realtime LLD. |

## Corrections / caution about earlier assistant statements

1. **No universal approval of all prior assistant recommendations.** Only explicit owner choices in DECISION_REGISTER are binding. Examples in UI mockups are not requirements.
2. **No Staging environment in MVP.** Earlier proposed Local+Staging+Production was explicitly rejected in favor of Local+Production.
3. **Brevo, not Resend.** Provider choice supersedes assistant recommendation.
4. **Full MVP scope, incremental delivery.** Do not silently shrink features into 'post-MVP' just because delivery takes multiple milestones.
5. **Handicap is in MVP**, contrary to earlier proposal to defer.
6. **No guided beginner learning pathway** and **no individual learning/puzzle progress tracking**, despite earlier proposed onboarding paths.
7. **Public chat remains visible even when participant is blocked**; block restricts direct interactions.
8. **No routine email reminders for events**; only transactional confirmations, cancellations and substantive changes.
9. **Shared study board global Undo** is deliberate, even when the latest operation was made by the other participant.
10. The first design mockup is the baseline; photography from the third is a replaceable reference, not a frozen asset.

## Approval rule

Do not mark this document resolved until each P0 is owned by a specific POC/specification gate and each P1 has a named responsible milestone or an explicit owner decision. Not all P1 decisions need resolving before *writing* Product/HLD; they must be clearly identified rather than guessed.
