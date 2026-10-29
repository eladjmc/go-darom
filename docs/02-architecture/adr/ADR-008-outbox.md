# ADR-008: Lightweight Durable Email Outbox and Catch-up

**Status:** PROPOSED v0.2 — architecture review recommendation, pending owner HLD approval.

## Context
Brevo delivery may fail after an event registration/verification request is accepted. The initial API may run on Render with keepalive; future production may run on an always-on VPS. The community tolerates occasional transient delivery delay, but lost verification emails and missed privacy-deletion deadlines are not acceptable operational defaults.

## Proposed decision
- For operations requiring reliable delivery (especially guest verification and cancellation/changes), atomically record the email intent alongside the business record in PostgreSQL, using a short transaction **only when separate records must be committed together**.
- Send promptly from the API process after commit, and retry pending messages via small startup catch-up / opportunistic drain and an inexpensive scheduled invocation before launch. Keep persistence across restarts. No Redis or separate worker service in the MVP.
- Acknowledgement of registration submission means the **pending hold exists**, not that the email was delivered. Present a resend pathway; a 15-minute capped-event hold is authoritative by expiry timestamp even if cleanup is delayed.
- Implement attempt counter, next retry time, deduplication key, redacted error status and bounded failures. Provider delivery is not guaranteed exactly once; ensure duplicate emails do not confirm duplicate registrations.
- Privacy-retention purge needs a dependable scheduled invocation before release (not just an on-site user visit), even if email retries are best-effort.

## Alternatives
Inline-only send: simplest but risks lost delivery on transient errors. Always-on queue/Redis: unnecessary complexity for initial community scale. Separate cron worker: defer until needed.

## Acceptance / deferred LLD
Specify transactional email-intent boundary, worker wake-up strategy, retries, provider errors, resend limits, privacy cleanup schedule and observability. Avoid unapproved guarantees of real-time delivery.
