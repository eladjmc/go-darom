# Go Darom — Cursor Implementation Kickoff & Delivery Contract

**Version:** 1.0  
**Purpose:** Binding execution instructions for Cursor after owner-approved Product Baseline v0.1 and HLD v0.2.  
**Implementation state at handoff:** Documentation and assets only; no application code.  
**Language:** Engineering documents, identifiers, code comments in English; all end-user product copy in Hebrew, RTL.

## 0. Your first action

Read `README.md` at repo root, then `docs/01-product/PRD.md`, `docs/01-product/BUSINESS_RULES.md`, `docs/02-architecture/SYSTEM_HLD.md`, `docs/02-architecture/MODULE_BOUNDARIES.md`, `docs/02-architecture/ADR_REGISTER.md`, `docs/03-design/BRAND_ASSET_SPEC.md`, `docs/00-governance/source-reconciliation/OPEN_ISSUES.md`, and this file. Inspect remaining documents before planning dependent modules. Present a short requirements coverage overview, unresolved blockers, milestone plan and first milestone's LLD before writing implementation code. Never claim a test or a POC passed without running it.

## 1. Non-negotiable scope and boundaries

Go Darom is a free Hebrew-RTL Go (baduk) community website for southern Israel, expected <500 weekly active members with relatively few concurrent games. Community friendliness is the priority; no competitive ELO/rank/leaderboards/matching/tournaments or AI analysis. The full approved MVP includes public homepage/content/learning/puzzles/events, community chat and DMs, Google-only Clerk onboarding, Live+async games, private replays, shared/personal free-form Study Board, notifications, CMS and admin/moderation. Shop is Coming Soon only. All modules belong to MVP though delivered in controlled milestones. Never silently postpone a feature beyond MVP.

Approved stack: Vite + React + TypeScript, Node/Express + TypeScript, Socket.IO, Supabase PostgreSQL + Drizzle, Clerk Google-only with stable internal user UUID, Supabase Storage adapter, Brevo email adapter. One Express backend/modular monolith, one React SPA including `/admin`; Netlify web / Render initial backend / possible always-on VPS production later. Docker Compose local environment; Local and Production only, no staging. Avoid microservices, Redis, Kubernetes, gratuitous abstraction, or new provider without explicit decision.

Normal Go moves: server validates, calculates next authoritative game state, atomically saves state + embedded history through a single revision-conditioned UPDATE (optimistic locking); emit realtime only after commit; use a short DB transaction where cross-row invariants require it. Treat server downtime pragmatically, derive deadlines from persisted timestamps, do not assume timers always execute. Account deletion must be resumable, idempotent and module-owned. Engine remains **POC REQUIRED**, never mark it approved based on an interface sketch.

## 2. Authority, conflicts, changes

- **Approved product behavior:** `docs/01-product/` (PRD, business rules, journeys, MVP scope).
- **Approved macro architecture:** `docs/02-architecture/` HLD v0.2; technical choices accepted only as specified, including POC-dependent/open decisions.
- **UX and brand implementation references:** `docs/03-design/docs/` and `docs/03-design/BRAND_ASSET_SPEC.md` plus `ASSET_MANIFEST.json`. Visual direction and selected source logo #2, hero #3 are confirmed, but exact layout/derived assets and raster logo exports are not final approvals.
- **Open issues:** `docs/00-governance/source-reconciliation/OPEN_ISSUES.md`; superseded by explicit user decisions recorded in this kickoff and approved documents. Do not automatically treat all unresolved points as decided.
- **Milestone LLD / API contracts / tests:** authored and approved before corresponding implementation. They may elaborate on approved higher-level requirements, never contradict them.
- **ADRs:** document any substantial change; proposed ADRs are not carte blanche to alter approved requirements.

If two documents conflict, identify the exact quotations/paths, propose the smallest compliant resolution, and ask the owner when it changes product behavior, privacy, vendor, scope, or cost. For minor engineering details within approved boundaries, choose a simple solution, document it in LLD/ADR and proceed at the applicable gate. Keep a change log. No invented decisions or fake approvals.

## 3. Cursor operating rules

1. Work one **milestone** at a time, broken into small testable tasks; no whole-site one-shot build.
2. Before a milestone: write `docs/05-modules/<module>/LLD.md`, API/Socket/event and data contracts as relevant under `docs/04-contracts/`, and acceptance scenarios under `docs/06-quality/`; explicitly identify open decisions and dependencies.
3. Await owner approval of new **product-facing** decisions and material architecture deviations. For the first milestone, show the detailed plan/LLD and get a go-ahead before coding.
4. Preserve the agreed modular monolith: controller -> service -> repositories, ownership of writes by module; perform auth and authorization server-side on REST and sockets.
5. Use stable requirement IDs and map requirement -> contract -> task -> test; label proposed/open/approved. No tests written only to assert mock behavior while claiming real integration works.
6. Add automated checks incrementally: TypeScript, lint, unit, integration and relevant UI/e2e; run actual checks and report commands/results. Never conceal skipped/failing tests.
7. For each finished milestone: give changed files, screenshots or user-visible demo where appropriate, tests run, unmet acceptance criteria, new ADRs, risks, and explicit request for sign-off.
8. Use environment variable placeholders; **never commit credentials**, live tokens, secret keys, production customer data or Supabase service-role keys to frontend. Provide `.env.example`.
9. Respect Hebrew RTL including dialogs, socket alerts, boards/control labels, accessibility/reduced motion and mobile. Actual Go board state must come from the engine, not rendered artwork.
10. Prioritize coherent, user-reviewable vertical slices. Do not turn every HLD suggestion into a complex framework.

## 4. Design assets: safe usage

Canonical assets are under `docs/03-design/assets/` with manifest at `docs/03-design/ASSET_MANIFEST.json`. The **selected original** logo art is `assets/source/BR-REF-002-selected-brand-board.png`; the **selected original** hero is `assets/source/HR-001-selected-hero-original.png`, both relative to `docs/03-design/`. Hero production derivatives live under `assets/hero/` and are provisional, subject to visual QA. Cropped brand PNGs are references **not** an approved transparent/vector logo. **Do not fabricate an exact SVG master or favicon from the raster and claim it's final**; use clearly identified temporary branding until a checked vector master is produced. The hero has negative space on the left, which may conflict with a standard right-side RTL headline: handle explicitly with real HTML text, not baked-in Hebrew image text; do not flip the photograph casually. Icons/patterns/empty states are proposal assets to be reviewed in running UI. Never use new unrelated searched art in place of approved selected originals.

## 5. Delivery sequence and gates

| Gate | Deliverable | Acceptance / dependencies |
|---|---|---|
| M0: Repository and documentation audit | Repo structure, canonical handoff paths, traceability index, small milestone roadmap, ADR/open-issue mapping | No scope inventions; no implementation work until M0 review. |
| M1: Foundation + engine feasibility | Detailed LLD; client/server skeleton, env example, Docker local DB, migrations, repo/service boundaries, health checks, basic CI; standalone **Goban/goban-engine POC** tests | App launches locally; baseline tests; engine POC provides actual pass/fail evidence for legal moves, captures/ko/suicide, Japanese territory/dead stone/seki, handicap all board sizes, SGF & branching for puzzles, replay and undo; enumerate gaps / replacements instead of claiming success. POC may run before full M1 scaffolding. |
| M2: Visual shell and authenticated identity | Design tokens, RTL responsive navigation, selected hero, safe provisional logo, home/public shells, Clerk Google signup/onboarding, profile/member presence foundation | Screens shown at 360/390/768/1024/1440; responsive/nav/accessibility tested; onboarding returns to original action. Review screenshot visual QA. |
| M3: Community core | Public central chat, DMs, blocking, reporting/moderation baseline, notifications, presence | Socket/reconnect/auth tests; blocked direct interactions but public chat stays visible; no unrestricted admin DM access. |
| M4: Live Go | Invitation settings/expiry, atomic accept, live game move flow, passes/scoring/dead stones/undo/resign, resume/replay, optional clock, handicap | **POC gate passed** and full game LLD approved; real 2-client tests, retry/revision behavior and mutual approvals verified; settle OPEN-003 before idle completion. |
| M5: Async Go + Study | Async invites and turn deadlines; personal/shared Study free-placement board, global undo/redo, ownership transfer/hide | Reconnect, expiry, cross-user edit conflict and account deletion cases; resolve applicable OPEN-005/006/007/008. |
| M6: Events | Admin event management, one-click member registration, guest email verification 15-min seat holds, cancel links, CSV, transactional Brevo | Race tests for capacity; expiry on timestamp, delivery retries, 90-day guest PII privacy policy. |
| M7: Content + learning + puzzles | Admin Tiptap, announcement/guide/public content, video embeds, interactive guide board, puzzle editor/SGF solution branching and weekly selection | POC-derived supported SGF spec; guide board behavior and moderation QA. |
| M8: Admin completion + launch QA | Audit, reports, suspensions, privacy deletion coordinator, retention, backup/restore, perf/accessibility/security, deployment | Automated backups **and restore test** before launch; checked domain/email/Storage policies, no secrets in client, all original MVP criteria verified. |

Milestone order is a proposed dependency-based plan, **not a license to defer features out of MVP**. Cursor may propose alternative ordering with rationale and owner sign-off. In particular, engine POC must happen early; it blocks gameplay dependent modules, not unrelated UI work.

## 6. Testing principle and acceptance

For each feature require normal path, authorization failure, invalid input, duplication, concurrency where relevant, reconnect/refetch, loading/error/empty, mobile/RTL/accessibility. Validate key business invariants on server. Use minimal well-chosen test tooling and maintain fixture privacy. An M1 success claim requires actual local startup and recorded commands; an engine POC success claim requires executed tests/evidence, not statements or source inspection alone.

## 7. First prompt to Cursor (copy/paste)

> You are the lead implementer for Go Darom. Read the root README and `docs/07-delivery/CURSOR_IMPLEMENTATION_KICKOFF.md`, then the approved product baseline, HLD v0.2, UX/brand asset pack, and open-issue log at the paths referenced there. Treat Product Baseline v0.1 and HLD v0.2 as approved. UX specifications are an implementation draft; source logo #2 and hero #3 are owner-selected, but derived crops and exact layouts need visual QA. Do not silently invent product policy or vendor changes. First, **do not write implementation code yet**. (1) Audit document consistency and missing prerequisites; (2) give a concise milestone roadmap with dependencies and explicit approval gates; (3) draft M1 Foundation + Go Engine POC LLD, the POC test matrix and runnable acceptance criteria, with proposed directory structure and exact commands; (4) flag any true blocker. Stop and ask for approval of that plan. Only after approval, implement the first small tasks, run tests, and report observed results. Avoid scope creep and needless infrastructure.

## 8. Reporting format at every milestone checkpoint

- Milestone and status (planned / in progress / review / approved)
- Requirements covered, with IDs and cited doc paths
- Tasks completed and files changed
- Test commands actually run and results
- Screenshots / local URLs and reproduction steps where relevant
- Remaining blockers, ambiguous behavior and new ADRs
- Exact approval requested, plus proposed next task

## 9. Important decision status at handoff

- **Approved:** product baseline; HLD v0.2; one-row version-checked game state approach; pragmatic uptime/recovery; selected logo #2 concept and hero #3 original.
- **Design draft:** derived images/crops, icon SVGs and exact screen design; vector logo master outstanding.
- **Engineering to define in LLD:** API/Socket payloads, database tables/indexes, tests, job processing and account-deletion idempotency details within existing policy.
- **POC-dependent:** Goban/goban-engine viability including handicap and Japanese scoring/seki; no assertion of successful integration before tests.
- **Open product decisions:** see OPEN_ISSUES; resolve before the affected module, not by guessing.
