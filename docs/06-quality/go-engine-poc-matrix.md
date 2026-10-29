# Goban Engine POC Test Matrix

**Milestone:** M1 · **ADR-009 / OPEN-001**  
**Execution:** `npm run poc:go-engine`  
**Evidence:** Fill Result column only after running tests.

| ID | Scenario | Sizes | Pass condition | Result |
|---|---|---|---|---|
| POC-MOVE-01 | Legal empty intersections | 9/13/19 | Accepted; state advances | PENDING |
| POC-MOVE-02 | Occupied / illegal | 9 | Rejected; state unchanged | PENDING |
| POC-CAP-01 | Capture | 9 | Prisoners + board correct | PENDING |
| POC-KO-01 | Simple ko | 9 | Immediate recapture illegal | PENDING |
| POC-SUI-01 | Suicide | 9 | Illegal under Japanese when applicable | PENDING |
| POC-PASS-01 | Two passes → scoring | 9 | Phase transition | PENDING |
| POC-SCORE-01 | Territory + prisoners + komi 6.5 | 9 | Matches fixture | PENDING |
| POC-SEKI-01 | Seki / neutral | 9/13 | No false territory in seki or GAP | PENDING |
| POC-DEAD-01 | Mark dead / resume | 9 | Score changes; resume works | PENDING |
| POC-HC-01 | Handicap 2–4 | 9 | Legal placements | PENDING |
| POC-HC-02 | Handicap 2–9 | 13, 19 | Valid placements (OPEN-022) | PENDING |
| POC-HC-03 | Handicap komi 0.5 | any | Komi/start consistent | PENDING |
| POC-SER-01 | Serialize → restore | 19 | Identical position/turn | PENDING |
| POC-UNDO-01 | Undo last move | 9 | Prior position restored | PENDING |
| POC-SGF-01 | Import linear SGF | 9 | Position matches | PENDING |
| POC-SGF-02 | Variation tree | 9 | Correct/incorrect branches | PENDING |
| POC-SGF-03 | Malformed SGF | — | Safe reject | PENDING |
| POC-PERF-01 | 19×19 snapshot metrics | 19 | Bytes/time reported | PENDING |
| POC-UI-01 | Optional Goban render smoke | 9 | Optional | PENDING |

## Gaps

Document any `GAP-xxx` here after execution (capability, severity, proposed alternative).
