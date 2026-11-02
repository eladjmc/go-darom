import type {
  BoardSnapshot,
  Coord,
  CreateGameOptions,
  EngineGame,
  FollowResult,
  HandicapResult,
  ImportResult,
  PlayResult,
  ScoreSummary,
  ScoringView,
  UndoResult,
  VariationInfo,
} from "./types.js";

export interface GoEnginePort {
  createGame(options: CreateGameOptions): EngineGame;
  snapshot(game: EngineGame): BoardSnapshot;
  play(game: EngineGame, coord: Coord): PlayResult;
  pass(game: EngineGame): PlayResult;
  isLegal(game: EngineGame, coord: Coord): boolean;
  applyHandicap(game: EngineGame, stones: number): HandicapResult;
  beginScoring(game: EngineGame): void;
  setRemoved(game: EngineGame, coords: Coord[], removed: boolean): void;
  /** Toggle dead/alive for the group containing the point (stone-removal phase). */
  toggleRemoved(game: EngineGame, coord: Coord): { removed: boolean };
  computeJapaneseScore(game: EngineGame): ScoreSummary;
  /** Territory ownership + provisional totals from the engine (not a client calc). */
  getScoringView(game: EngineGame): ScoringView;
  listRemoved(game: EngineGame): Coord[];
  resumePlay(game: EngineGame): void;
  serialize(game: EngineGame): string;
  deserialize(payload: string): EngineGame;
  undo(game: EngineGame): UndoResult;
  importSgf(sgf: string): ImportResult & { game?: EngineGame };
  listVariations(game: EngineGame): VariationInfo;
  followVariation(game: EngineGame, childIndex: number): FollowResult;
}
