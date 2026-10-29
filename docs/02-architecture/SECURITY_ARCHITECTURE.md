# Security, Privacy and Authorization Architecture

**Status:** DRAFT · Not legal advice. Review against deployment jurisdiction and actual data handling before launch.

## Trust boundaries
Browser is untrusted. Express authenticates Clerk token and binds stable internal UUID; never trust actor IDs/roles provided in request body or WebSocket event. Drizzle repositories use least-privilege DB access; vendor keys are server-only. Auth/AuthZ separate: user Google identity does not imply admin rights.

## Authorization matrix (HLD level)
| Resource/action | Public visitor | Member | Admin |
|---|---|---|---|
| Published content, public events, puzzles | read | read | read/manage |
| Guest event registration + verify/cancel by token | limited token flow | permitted where applicable | manage |
| Own profile/settings | none | own | own; moderation separate |
| Member directory/presence | none | read | read |
| Public community chat | none | read/write if not suspended | read/write + moderation |
| DM | none | participants, subject to mutual blocking | normal participant rights; no universal browse |
| Game/Study | none | authorized participants | no arbitrary override of private games/boards |
| Notifications | none | recipient only | personal notifications only |
| Event roster/CSV, CMS, puzzles, media moderation | none | none | management |
| Reports | submit only authenticated reports | own submission | bounded handling and auditable evidence access |

## Abuse prevention
- Rate limits per identity/IP/route: login initiation, public guest registration, verification resend, invite spam, chat writes, report filing, media upload.
- Validate input shapes/lengths; HTML-rich Tiptap content sanitized on storage/render, links allowlisted for safe protocols, prevent stored XSS; protect against CSRF where cookie auth applies and secure CORS.
- Uploads: authorized server-issued flows, MIME/type validation, size limits, safe object naming, virus scanning risk assessment; never expose service-role credentials to browser.
- External API failures circuit/retry bounded; service token/secret management; logs redact auth tokens, emails (where possible), private content and verification URLs.
- Header/security policies (CSP, HSTS, Referrer Policy), secure cookie/session settings, abuse monitoring and dependency updates.

## Moderation and DM privacy
- A block prevents direct DMs and Live/async/Study invitations in both directions; public chat remains visible and existing games may continue or end normally.
- Admin can remove public messages, review reports and suspend users; actions need reason, actor and audit trail.
- Reported DM evidence: reported message plus **bounded neighboring messages** only; context size remains OPEN. The privileged read must be scoped to report, auditable and limited in time/role.
- Prevent admin's arbitrary DM history browsing. Logs must not inadvertently duplicate DM content.

## Data protection / deletion
- PII minimization: public profile only nickname/avatar; member emails not public. Guest event name/email mandatory, phone and Go experience optional.
- Guest PII purge 90 days after event; reports up to year after closure unless legal retention applies; chat until deletion.
- Account deletion: coordinate Clerk account/identity removal with DB PII erase/anonymization, event cancellations, personal Study removal, transfer shared Study ownership and continued anonymous game replay.
- Deletion of DMs/public chat content, exports and backup erasure policy require Privacy LLD prior to release. No overclaim of retroactive third-party CSV deletion.
- Ensure vendor DPAs/terms, consent for community/event photos (especially minors), privacy policy, record retention and legal requirements reviewed prior to production launch.

## Bootstrap admin
- One-time bootstrap with explicit configured principal and proof of access / deployment secret, audited and repeat-safe, disabled after initialization. No automatic promotion based solely on matching a user-supplied email.
- Admin role assignments stored and checked on backend for REST/Socket; provide secure procedure for future admin grants/revocations in admin LLD.

## Verification tokens
- Guest verification/cancellation tokens high entropy, single use where appropriate, hashed at rest, scoped to one event/registration and expiring; rate-limited resend and invalidation. Avoid identity enumeration and leakage in referrers.
- 15-minute capped-event hold is not an unbounded confirmed seat. Authorization and capacity re-evaluated on verification.

## Resumable account-deletion coordinator (v0.2)
- Start with a verified account-owner request; revoke new mutations and active socket sessions immediately; record a minimal deletion-workflow marker and step status without retaining unnecessary personal data.
- Run module-owned cleanup steps idempotently: cancel invites and future registrations; settle active games with a noncompetitive no-winner account-deletion result; remove personal Study boards; transfer shared Study ownership to surviving partner; anonymize retained shared game/chat content and remove user-identifying references from accessible views; prune user notifications and media that is not retained by policy.
- Steps run in small transactions and are retryable; use a deletion coordinator, not a global cross-provider transaction. Record failures for operator retry. Delete/revoke Clerk identity after DB-side deactivation/cleanup succeeds, with independent retry and verification; prevent re-provisioning the pending-deletion principal.
- Handle private/public message deletion semantics, report/legal-hold exceptions, object storage, CSV exports and backup expiry in Privacy LLD. Never claim immediate erasure of independent exports or immutable backups.
- Keep only a minimal nonidentifying completion marker for operational auditing, subject to approved policy.
