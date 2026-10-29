# M1 Go Engine POC — Low-Level Design

**Status:** APPROVED for M1 implementation (owner plan approval 2026-10-29)  
**Addresses:** OPEN-001, ADR-009  
**Authority:** Feasibility gate only; does not finalize Game LLD or approve the library as permanent without evidence.

## 1. Goals

Prove or falsify `goban-engine` (and optional `goban` UI smoke) against Product Baseline requirements:

- Legal moves, captures, ko, suicide under Japanese rules on 9×9 / 13×13 / 19×19
- Japanese territory scoring, seki/neutral handling, dead-stone marking, resume after dispute
- Handicap auto-placement targets: ≤4 on 9×9; ≤9 on 13×13 and 19×19 (OPEN-022)
- Serialization / restore / engine-level undo
- SGF import, variation branches, safe malformed handling
- Report 19×19 snapshot size/time for future CAS JSONB assessment (ADR-013)

## 2. Adapter boundary

```ts
// Conceptual — implemented in packages/go-engine
interface GoEnginePort {
  createGame(options: CreateGameOptions): EngineGame;
  play(game: EngineGame, coord: Coord): PlayResult;
  pass(game: EngineGame): PlayResult;
  isLegal(game: EngineGame, coord: Coord): boolean;
  applyHandicap(game: EngineGame, stones: number): HandicapResult;
  beginScoring(game: EngineGame): void;
  setRemoved(game: EngineGame, coords: Coord[], removed: boolean): void;
  computeJapaneseScore(game: EngineGame): ScoreSummary;
  resumePlay(game: EngineGame): void;
  serialize(game: EngineGame): string;
  deserialize(payload: string): EngineGame;
  undo(game: EngineGame): UndoResult;
  importSgf(sgf: string): ImportResult;
  listVariations(game: EngineGame): VariationInfo;
  followVariation(game: EngineGame, path: number[]): FollowResult;
}
```

Only `GobanEngineAdapter` may import `goban-engine`. Application/game services (future) depend on `GoEnginePort`.

## 3. Candidate libraries

| Package | Role | Status |
|---|---|---|
| `goban-engine` | Node/server rules & scoring | POC candidate |
| `goban` | Optional React board render smoke | POC optional |

If a required capability fails, document `GAP-xxx`, severity, and alternatives **before** changing product scope or architecture.

## 4. Scoring / phase model (engine-level)

Mirror engine phases where available (`play` → scoring/stone-removal → finished). Product mutual-approval UX is M4; POC only needs engine capability for marking removals, scoring, and resume.

## 5. Handicap

Request engine/standard hoshi placement for N stones. Record exact coordinates. If placement invalid or unsupported for a size, mark GAP and propose workaround (manual coordinate tables) without removing handicap from MVP.

## 6. SGF

Define provisional supported subset for POC:

- Board size, komi, handicap, move sequence (`;B[xx]` / `;W[xx]`)
- Parenthesized variations
- Reject/catch oversized or malformed input safely

Full puzzle SGF policy remains OPEN-019 (formalized after POC).

## 7. Evidence rule

Pass/fail only from executed tests. Source inspection alone is not acceptance.
