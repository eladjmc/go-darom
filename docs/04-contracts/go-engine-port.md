# Contract: GoEnginePort

**Milestone:** M1 (POC)  
**Package:** `packages/go-engine`  
**Consumers:** Future Games / Puzzles / Guides services; not wired to HTTP in M1.

## Types (normative summary)

- `BoardSize`: `9 | 13 | 19`
- `Coord`: `{ x: number; y: number }` — 0-based, `(0,0)` = upper-left from Black's perspective in engine space
- `Player`: `"black" | "white"`
- `CreateGameOptions`: `{ size: BoardSize; komi: number; handicap?: number; rules?: "japanese" }`
- `PlayResult`: `{ ok: true; game: EngineGame } | { ok: false; code: string; message: string }`
- `ScoreSummary`: `{ black: number; white: number; detail?: unknown }`
- `EngineGame`: opaque handle; callers use port methods only

## Invariants

1. Failed plays do not mutate authoritative engine state observed by subsequent reads.
2. Japanese rules are the only ruleset under test in M1.
3. Adapter isolates third-party types from the rest of the monorepo.
4. Serialization round-trip preserves board, turn, and capture counts for tested fixtures.

## Out of scope for this contract

HTTP/Socket payloads, DB game row schema, mutual undo approval, clocks (M4).
