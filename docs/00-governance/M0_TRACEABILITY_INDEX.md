# M0 Traceability Index

**Status:** Documentation hygiene for handoff. Does not alter Product Baseline or HLD decisions.

## Authority

| Layer | Path | Binding? |
|---|---|---|
| Kickoff | `docs/07-delivery/CURSOR_IMPLEMENTATION_KICKOFF.md` | Yes — delivery contract |
| Product | `docs/01-product/` | Yes — Baseline v0.1 |
| Architecture | `docs/02-architecture/` | Yes — HLD v0.2 |
| Decisions | `docs/00-governance/source-reconciliation/DECISION_REGISTER.md` | Yes — owner choices |
| Open issues | `docs/00-governance/source-reconciliation/OPEN_ISSUES.md` | Not requirements |
| UX/brand | `docs/03-design/` | Draft; selected logo #2 / hero #3 sources only |
| Milestone LLD | `docs/05-modules/` | Binding after owner approval per milestone |

## Milestone → primary req groups

| Milestone | Requirement groups | Open issues to resolve first |
|---|---|---|
| M1 | OPERATIONS foundation; LIVE_GAME engine POC | OPEN-001 (POC itself) |
| M2 | IDENTITY; HOME shell; DESIGN tokens | OPEN-018 (visual QA) |
| M3 | CHAT; TRUST baseline; DIRECTORY presence | OPEN-011, OPEN-027 |
| M4 | LIVE_INVITES; LIVE_GAME | OPEN-003, OPEN-004, OPEN-021, OPEN-022 |
| M5 | ASYNC_GAME; STUDY | OPEN-005–008 |
| M6 | EVENTS; email | OPEN-012–014 |
| M7 | CONTENT; LEARNING; PUZZLES | OPEN-019, OPEN-020 |
| M8 | PRIVACY; ADMIN; OPERATIONS launch | OPEN-010, OPEN-015–017 |

## Doc hygiene notes (non-normative)

- Nested Markdown files may still say `DRAFT` in headers; folder READMEs + kickoff record owner approval of PRD v0.1 and HLD v0.2.
- Prefer links to `docs/00-governance/source-reconciliation/` over obsolete `go-darom-consolidation` paths.
