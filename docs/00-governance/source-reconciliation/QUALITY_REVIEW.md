# Consolidation Quality Gate

**Status: DRAFT — not yet approved.**

## Review checklist

- [ ] Owner confirms that the approved choices in DECISION_REGISTER faithfully reflect discovery.
- [ ] Every originally approved MVP module appears in REQUIREMENTS_INVENTORY.
- [ ] Open issues distinguish POC dependencies, decisions and ordinary engineering detail.
- [ ] No proposed feature is presented as approved (check user profiles, onboarding pathways, shop, AI, ratings and admin powers).
- [ ] Scope remains all approved modules, implemented in milestones.
- [ ] Language policy: engineering English; UI and UX-facing copy Hebrew RTL.
- [ ] Provider choices are Brevo and Supabase Storage; environment count is Local + Production.
- [ ] Game and study board state/permissions are consistent across the register.
- [ ] Retention and deletion policies are not contradicted by backup/export descriptions.
- [ ] No screenshots, design mockups or unverified tool citations are treated as source-code contracts.

## Risk register / watch points

1. **Game engine support:** POC-dependent; prioritize Japanese scoring, 9×9 handicap placements and SGF branching.
2. **Realtime consistency:** invitation accept races, move idempotency, timers and study-board global Undo.
3. **Free-hosting resilience:** process sleeps/restarts, database/storage quotas and guaranteed recoverability.
4. **Personal data:** account deletion, private-message reports, guest PII purge and manually exported CSVs.
5. **UX fidelity:** the team prefers a refined visual baseline; source imagery is replaceable; game interaction remains conventional.

## Promotion to Approved Product Baseline

The owner reviews this packet, corrects material mistakes and explicitly approves the corrected consolidation. Then the PRD, product flows and approved HLD are authored in the agreed phase order. No implementation should start from these draft records alone.
