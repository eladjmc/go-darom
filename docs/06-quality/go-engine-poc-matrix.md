# Goban Engine POC Test Matrix

**Milestone:** M1 · **ADR-009 / OPEN-001**  
**Execution:** `npm run poc:go-engine`  
**Last run:** 2026-10-29 — **20/20 passed** (vitest)

| ID | Scenario | Sizes | Pass condition | Result |
|---|---|---|---|---|
| POC-MOVE-01 | Legal empty intersections | 9/13/19 | Accepted; state advances | **PASS** |
| POC-MOVE-02 | Occupied / illegal | 9 | Rejected; state unchanged | **PASS** |
| POC-CAP-01 | Capture | 9 | Prisoners + board correct | **PASS** |
| POC-KO-01 | Simple ko | 9 | Immediate recapture illegal (`ko`) | **PASS** |
| POC-SUI-01 | Suicide | 9 | Illegal under Japanese | **PASS** |
| POC-PASS-01 | Two passes → scoring | 9 | Phase via `beginScoring` | **PASS** (see GAP-PHASE-01) |
| POC-SCORE-01 | Territory + prisoners + komi 6.5 | 9 | Matches fixture | **PASS** |
| POC-SEKI-01 | Seki / neutral | 9 | Symmetric split; no crash | **PASS** (see GAP-SEKI-01) |
| POC-DEAD-01 | Mark dead / resume | 9 | Score changes; resume works | **PASS** |
| POC-HC-01 | Handicap 2–4 | 9 | Legal placements | **PASS** |
| POC-HC-02 | Handicap 2–9 | 13, 19 | Valid placements | **PASS** |
| POC-HC-03 | Handicap komi 0.5 | any | White to move; komi 0.5 | **PASS** |
| POC-SER-01 | Serialize → restore | 19 | Identical position/turn | **PASS** |
| POC-UNDO-01 | Undo last move | 9 | Prior position restored | **PASS** |
| POC-SGF-01 | Import linear SGF | 9 | Position matches | **PASS** |
| POC-SGF-02 | Variation tree | 9 | Trunk/branch walk | **PASS** |
| POC-SGF-03 | Malformed SGF | — | Safe reject | **PASS** |
| POC-PERF-01 | 19×19 snapshot metrics | 19 | Bytes/time reported | **PASS** (~702B / <1ms for 40 moves) |
| POC-UI-01 | Optional Goban render smoke | 9 | Deferred | **SKIP** (M2 visual; engine-only M1) |

## Gaps

### GAP-PHASE-01 — Two-pass auto phase (low)

`goban-engine` does **not** automatically enter `stone removal` after two consecutive passes; phase stays `play`. Adapter `beginScoring()` sets `stone removal` explicitly.

**Impact:** Game LLD (M4) must own the product state machine (two passes → scoring UX) and call the adapter. Not a rules-capability failure.

**Proposed:** Keep adapter method; Games service transitions phase after validating two passes. No library change required.

### GAP-SEKI-01 — Deep seki fixtures (low / observational)

POC verifies Japanese scoring runs with `strict_seki_mode` available and a symmetric wall position scores evenly. A full textbook seki eye-point fixture set was not exhaustively asserted.

**Impact:** Before locking scoring UX in M4, add curated seki fixtures (shared eyes, neutral points) and confirm territory omission matches Japanese expectations.

**Proposed:** Expand scoring fixtures in Game LLD tests; if a true rules mismatch appears, document and compare alternatives before any scope change.

### GAP-UI-01 — Goban React smoke (deferred)

Optional `goban` UI package not wired in M1 (foundation stub only). Functional board remains engine-driven per brand rules.

**Proposed:** M2/M4 board component integration.

## Candidate library verdict

`goban-engine@8.3.226` is **viable** for MVP Live/async rules, handicap targets, Japanese scoring primitives, undo/serialize (via adapter move log), and SGF import/branches. **Not** permanently locked until M4 Game LLD absorbs GAP-PHASE-01 and expands seki fixtures. No architecture or MVP scope change recommended from M1 evidence.
