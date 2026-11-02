export type BoardSize = 9 | 13 | 19;
export type Player = "black" | "white";
export type EnginePhase = "play" | "stone_removal" | "finished";

export interface Coord {
  x: number;
  y: number;
}

export interface CreateGameOptions {
  size: BoardSize;
  komi: number;
  handicap?: number;
  rules?: "japanese";
}

export interface ScoreDetail {
  total: number;
  territory: number;
  prisoners: number;
  stones: number;
  komi: number;
}

export interface ScoreSummary {
  black: ScoreDetail;
  white: ScoreDetail;
}

/**
 * Authoritative scoring view from goban-engine `computeScore` + removal matrix.
 * ownership: 0 neutral/empty undecided, 1 black territory, 2 white territory (empty points only).
 */
export interface ScoringView {
  score: ScoreSummary;
  /** Row-major [y][x] ownership of empty intersections from engine scoring_positions */
  ownership: number[][];
  removed: Coord[];
}

export type PlayResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export type UndoResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export type HandicapResult =
  | { ok: true; placements: Coord[] }
  | { ok: false; code: string; message: string };

export type ImportResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export interface VariationChild {
  index: number;
  coord: Coord | null;
  isPass: boolean;
  isTrunk: boolean;
}

export interface VariationInfo {
  moveNumber: number;
  children: VariationChild[];
}

export type FollowResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export interface BoardSnapshot {
  size: BoardSize;
  /** 0 empty, 1 black, 2 white — row-major [y][x] */
  grid: number[][];
  toMove: Player;
  phase: EnginePhase;
  moveNumber: number;
  blackPrisoners: number;
  whitePrisoners: number;
  komi: number;
  handicap: number;
  positionId: string;
}

/** Opaque game handle — only GoEnginePort methods may use internals. */
export interface EngineGame {
  readonly id: string;
}
