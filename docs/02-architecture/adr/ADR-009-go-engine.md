# ADR-009: External Go Engine Behind an Adapter

**Status:** POC PASSED (M1, 2026-10-29, 20/20) — `goban-engine` viable via `GoEnginePort`; permanent lock deferred until M4 Game LLD absorbs GAP-PHASE-01 / GAP-SEKI-01

## Context
Live/async Go, Japanese territory scoring, dead stone mutual agreement, handicap placement, replay and SGF branching puzzles are full MVP commitments. Implementing full rules from scratch is high-risk.

## Proposed decision
Use `GoEngine` interface and a third-party engine (`goban-engine` candidate), with `Goban` candidate UI renderer. Backend validates authoritative game commands; UI board component is reused across game, puzzles, guides and Study with separate interaction policies.

## POC acceptance areas
1. Legal placements, captures, suicide, ko and relevant Japanese rules across 9×9/13×13/19×19.
2. Japanese territory scoring including seki/neutral points, two-pass scoring, dead-stone proposals, disagreements and resume.
3. Custom normal/handicap komi, automatic handicap placements within approved target ranges, correct color selection and starting player.
4. Deterministic serialization/deserialization, undo agreement and replay after restart.
5. SGF import/tree variations, known-correct branches, puzzle response to alternate sequences and safe malformed file handling.
6. React and Node/TypeScript compatibility; performance on representative boards and mobile.

## Decision gate
Any unsupported requirement becomes a documented gap with measured workaround cost or alternative-engine comparison. Do **not** silently remove user-approved MVP capabilities.
