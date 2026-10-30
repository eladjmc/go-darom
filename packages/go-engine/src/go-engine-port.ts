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
  computeJapaneseScore(game: EngineGame): ScoreSummary;
  resumePlay(game: EngineGame): void;
  serialize(game: EngineGame): string;
  deserialize(payload: string): EngineGame;
  undo(game: EngineGame): UndoResult;
  importSgf(sgf: string): ImportResult & { game?: EngineGame };
  listVariations(game: EngineGame): VariationInfo;
  followVariation(game: EngineGame, childIndex: number): FollowResult;
}
