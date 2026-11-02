import { createGobanEngineAdapter } from "./goban-engine-adapter.js";
import type { GoEnginePort } from "./go-engine-port.js";
import type { BoardSnapshot, BoardSize, Coord } from "./types.js";

type ReplayPly = {
  historyIndex: number;
  type: "play" | "pass";
  payload?: { x?: number; y?: number } | null;
};

/** Same contract as shared.extractReplayPlies — kept local to avoid package cycles. */
export function extractEngineReplayPlies(history: unknown[]): ReplayPly[] {
  const out: ReplayPly[] = [];
  for (let i = 0; i < history.length; i++) {
    const h = history[i] as {
      type?: string;
      payload?: { x?: number; y?: number } | null;
    };
    if (h?.type !== "play" && h?.type !== "pass") continue;
    out.push({
      historyIndex: i,
      type: h.type,
      payload: h.payload ?? null,
    });
  }
  return out;
}

export type ReconstructReplayInput = {
  boardSize: BoardSize;
  komi: number;
  handicap: number;
  moveHistory: unknown[];
  /** Optional authoritative final board for verification. */
  authoritativeBoard?: { grid?: unknown } | null;
};

export type ReconstructReplayResult = {
  /** Index 0 = initial/handicap position; index k = after k plies. */
  positions: BoardSnapshot[];
  plyCount: number;
  /** True when reconstructed final grid matches authoritativeBoard.grid (if provided). */
  matchesAuthoritativeFinal: boolean | null;
};

function gridsEqual(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false;
  for (let y = 0; y < a.length; y++) {
    const ra = a[y]!;
    const rb = b[y]!;
    if (!rb || ra.length !== rb.length) return false;
    for (let x = 0; x < ra.length; x++) {
      if (ra[x] !== rb[x]) return false;
    }
  }
  return true;
}

/**
 * Deterministic private-replay reconstruction via GoEnginePort.
 * Relies on approved-undo truncation of move_history (see extractReplayPlies).
 */
export function reconstructReplayPositions(
  input: ReconstructReplayInput,
  port: GoEnginePort = createGobanEngineAdapter(),
): ReconstructReplayResult {
  const plies = extractEngineReplayPlies(input.moveHistory);
  const game = port.createGame({
    size: input.boardSize,
    komi: input.komi,
    handicap: input.handicap > 0 ? input.handicap : undefined,
  });
  const positions: BoardSnapshot[] = [port.snapshot(game)];

  for (const ply of plies) {
    if (ply.type === "pass") {
      const r = port.pass(game);
      if (!r.ok) {
        throw new Error(`Replay pass failed at historyIndex=${ply.historyIndex}: ${r.message}`);
      }
    } else {
      const x = ply.payload?.x;
      const y = ply.payload?.y;
      if (typeof x !== "number" || typeof y !== "number") {
        throw new Error(`Replay play missing coordinates at historyIndex=${ply.historyIndex}`);
      }
      const coord: Coord = { x, y };
      const r = port.play(game, coord);
      if (!r.ok) {
        throw new Error(`Replay play failed at historyIndex=${ply.historyIndex}: ${r.message}`);
      }
    }
    positions.push(port.snapshot(game));
  }

  let matchesAuthoritativeFinal: boolean | null = null;
  const authGrid = input.authoritativeBoard?.grid;
  if (Array.isArray(authGrid)) {
    const final = positions[positions.length - 1]!;
    matchesAuthoritativeFinal = gridsEqual(final.grid, authGrid as number[][]);
  }

  return {
    positions,
    plyCount: plies.length,
    matchesAuthoritativeFinal,
  };
}
