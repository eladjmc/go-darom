# Go Darom — Consolidation Baseline (Draft)

**Status:** DRAFT — awaiting owner review.  
**Purpose:** Capture approved product and architecture decisions made during collaborative discovery, separate them from proposals, and identify unresolved matters **before** writing approved Product/HLD documentation.  
**Language policy:** Engineering documentation in English; interface copy, screen UX and localization in Hebrew (RTL).  
**Audience:** Project owner, reviewers, and eventually Cursor.

## Contents

1. [DECISION_REGISTER.md](DECISION_REGISTER.md) — approved decisions, grouped by domain; includes implementation implications without treating proposals as approvals.
2. [OPEN_ISSUES.md](OPEN_ISSUES.md) — decisions not yet settled and inconsistencies requiring reconciliation.
3. [REQUIREMENTS_INVENTORY.md](REQUIREMENTS_INVENTORY.md) — initial traceable requirement inventory, not yet a full PRD or LLD.
4. [QUALITY_REVIEW.md](QUALITY_REVIEW.md) — review checklist, risks, acceptance conditions for promoting these drafts to Product Baseline.

## Governing rules

- **Approved** means explicitly chosen by the owner. **Proposed** is not binding. **POC-dependent** must be verified before selecting a final integration approach.
- Preserve approved decisions even where they may later prove difficult to implement. Record the issue rather than silently downgrading the feature.
- A business rule has one authoritative home. Future LLDs and API contracts reference it by ID.
- This deliverable **is not executable code, a completed HLD, or an approved PRD**.
- No new product capabilities are approved solely because they appear as examples or recommendations in earlier conversation.

## Proposed workflow from here

1. Review the decision register and open issues for factual fidelity.
2. Resolve material conflicts and mark the baseline approved.
3. Develop PRD and Product User Journeys for the complete MVP.
4. Develop system-wide HLD, architecture decisions, UX baseline and cross-system conventions.
5. Approve POC plan; run Goban/goban-engine POC during implementation initiation.
6. Produce approved LLD + tasks + acceptance tests *per milestone* before building it.

## Design references

- Use the **first visual mockup** as the leading UI design direction (light, cream/wood/sage, clean cards and welcoming composition).
- Use **photography style from the third mockup** as secondary inspiration; photos remain replaceable.
- Use established online-Go platforms (such as OGS) as **interaction/layout inspiration** for game room UX; do not reproduce ranking/competitive features.
- When final design documentation is authored, add verified visual assets as separate repository files with source/usage notes. These files do not embed unverified mockup links.
