import * as GobanEngineModule from "goban-engine";
import type { GoEnginePort } from "./go-engine-port.js";
import type {
  BoardSize,
  BoardSnapshot,
  Coord,
  CreateGameOptions,
  EngineGame,
  EnginePhase,
  FollowResult,
  HandicapResult,
  ImportResult,
  Player,
  PlayResult,
  ScoreSummary,
  ScoringView,
  UndoResult,
  VariationInfo,
} from "./types.js";

type GobanEngineCtor = new (config: Record<string, unknown>) => GobanEngineInstance;

interface GobanEngineInstance {
  width: number;
  height: number;
  board: number[][];
  komi: number;
  handicap: number;
  phase: "play" | "stone removal" | "finished";
  rules: string;
  move_tree: MoveTreeNode;
  cur_move: MoveTreeNode;
  place(
    x: number,
    y: number,
    checkForKo?: boolean,
    errorOnSuperKo?: boolean,
    dontCheckForSuperKo?: boolean,
    dontCheckForSelfCapture?: boolean,
    isTrunkMove?: boolean,
    removed_stones?: unknown[],
  ): number;
  colorToMove(): Player;
  getMoveNumber(): number;
  getBlackPrisoners(): number;
  getWhitePrisoners(): number;
  currentPositionId(): string;
  computeScore(only_prisoners?: boolean): {
    black: ScoreSide;
    white: ScoreSide;
  };
  removal: boolean[][];
  setRemoved(x: number, y: number, removed: boolean): void;
  toggleSingleGroupRemoval?(
    x: number,
    y: number,
    force_removal?: boolean,
  ): { removed: boolean; group?: Array<{ x: number; y: number }> };
  jumpTo(node: MoveTreeNode | null | undefined): void;
  showPrevious(): boolean;
  computeInitialStateForForkedGame(): { black: string; white: string };
}

interface ScoreSide {
  total: number;
  territory: number;
  prisoners: number;
  stones: number;
  komi: number;
  scoring_positions?: string;
}

interface MoveTreeNode {
  x: number;
  y: number;
  trunk_next?: MoveTreeNode;
  branches?: MoveTreeNode[];
}

interface SerializedGame {
  width: number;
  height: number;
  komi: number;
  handicap: number;
  phase: GobanEngineInstance["phase"];
  initialState: { black: string; white: string };
  moves: Coord[];
  /** Stone-removal marks — must survive serialize/restore during scoring */
  removal?: boolean[][];
}

/** Decode OGS-style aa/ab… pairs from engine scoring_positions. */
export function decodeScoringPositions(encoded: string): Coord[] {
  const out: Coord[] = [];
  const s = encoded || "";
  for (let i = 0; i + 1 < s.length; i += 2) {
    const x = s.charCodeAt(i)! - 97;
    const y = s.charCodeAt(i + 1)! - 97;
    if (x >= 0 && y >= 0) out.push({ x, y });
  }
  return out;
}

function scoreDetail(side: ScoreSide): ScoreSummary["black"] {
  return {
    total: side.total,
    territory: side.territory,
    prisoners: side.prisoners,
    stones: side.stones,
    komi: side.komi,
  };
}

interface InternalGame extends EngineGame {
  engine: GobanEngineInstance;
  /** Moves played after initial/handicap setup; used for serialize/undo. */
  moves: Coord[];
  initialState: { black: string; white: string };
}

function resolveGobanEngineCtor(): GobanEngineCtor {
  const mod = GobanEngineModule as unknown as {
    GobanEngine?: GobanEngineCtor;
    default?: { GobanEngine?: GobanEngineCtor } | GobanEngineCtor;
  };
  const fromNamed = mod.GobanEngine;
  const fromDefaultObject =
    mod.default && typeof mod.default === "object" ? mod.default.GobanEngine : undefined;
  const ctor = fromNamed ?? fromDefaultObject;
  if (!ctor) {
    throw new Error("goban-engine: GobanEngine export not found (Node/Vite interop)");
  }
  return ctor;
}

const GobanEngine = resolveGobanEngineCtor();

function asInternal(game: EngineGame): InternalGame {
  return game as InternalGame;
}

function mapPhase(phase: GobanEngineInstance["phase"]): EnginePhase {
  if (phase === "stone removal") return "stone_removal";
  if (phase === "finished") return "finished";
  return "play";
}

function cloneGrid(board: number[][]): number[][] {
  return board.map((row) => row.slice());
}

function collectBlackStones(engine: GobanEngineInstance): Coord[] {
  const placements: Coord[] = [];
  for (let y = 0; y < engine.height; y += 1) {
    for (let x = 0; x < engine.width; x += 1) {
      if (engine.board[y][x] === 1) {
        placements.push({ x, y });
      }
    }
  }
  return placements;
}

function errorCode(err: unknown): { code: string; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("stone_already_placed_here")) {
    return { code: "occupied", message };
  }
  if (message.includes("illegal_self_capture")) {
    return { code: "suicide", message };
  }
  if (message.includes("illegal_ko_move")) {
    return { code: "ko", message };
  }
  if (message.includes("illegal_board_repetition")) {
    return { code: "superko", message };
  }
  return { code: "illegal_move", message };
}

function buildEngine(config: Record<string, unknown>): GobanEngineInstance {
  return new GobanEngine({ ...config, throw_all_errors: true });
}

function rebuildFromLog(internal: InternalGame): void {
  const engine = buildEngine({
    width: internal.engine.width,
    height: internal.engine.height,
    rules: "japanese",
    komi: internal.engine.komi,
    handicap: internal.engine.handicap,
    initial_state: internal.initialState,
    moves: internal.moves.map((m) => ({ x: m.x, y: m.y })),
  });
  internal.engine = engine;
}

export class GobanEngineAdapter implements GoEnginePort {
  createGame(options: CreateGameOptions): EngineGame {
    const handicap = options.handicap ?? 0;
    const engine = buildEngine({
      width: options.size,
      height: options.size,
      rules: options.rules ?? "japanese",
      komi: options.komi,
      handicap,
    });
    const initialState = engine.computeInitialStateForForkedGame();
    const game: InternalGame = {
      id: crypto.randomUUID(),
      engine,
      moves: [],
      initialState,
    };
    return game;
  }

  snapshot(game: EngineGame): BoardSnapshot {
    const { engine } = asInternal(game);
    return {
      size: engine.width as BoardSize,
      grid: cloneGrid(engine.board),
      toMove: engine.colorToMove(),
      phase: mapPhase(engine.phase),
      moveNumber: engine.getMoveNumber(),
      blackPrisoners: engine.getBlackPrisoners(),
      whitePrisoners: engine.getWhitePrisoners(),
      komi: engine.komi,
      handicap: engine.handicap,
      positionId: engine.currentPositionId(),
    };
  }

  play(game: EngineGame, coord: Coord): PlayResult {
    const internal = asInternal(game);
    try {
      internal.engine.place(coord.x, coord.y, true, true, false, false, true);
      internal.moves.push({ x: coord.x, y: coord.y });
      return { ok: true };
    } catch (err) {
      return { ok: false, ...errorCode(err) };
    }
  }

  pass(game: EngineGame): PlayResult {
    return this.play(game, { x: -1, y: -1 });
  }

  isLegal(game: EngineGame, coord: Coord): boolean {
    const clone = this.deserialize(this.serialize(game));
    return this.play(clone, coord).ok;
  }

  applyHandicap(game: EngineGame, stones: number): HandicapResult {
    const snap = this.snapshot(game);
    if (stones < 2) {
      return { ok: false, code: "invalid_handicap", message: "Handicap must be at least 2" };
    }
    if (snap.size === 9 && stones > 4) {
      return { ok: false, code: "invalid_handicap", message: "9×9 handicap max is 4" };
    }
    if ((snap.size === 13 || snap.size === 19) && stones > 9) {
      return { ok: false, code: "invalid_handicap", message: "13×13/19×19 handicap max is 9" };
    }
    if (snap.moveNumber > 0 || asInternal(game).moves.length > 0) {
      return {
        ok: false,
        code: "handicap_already_set",
        message: "Handicap must be applied on a fresh empty game",
      };
    }
    const rebuilt = this.createGame({
      size: snap.size,
      komi: snap.komi,
      handicap: stones,
      rules: "japanese",
    });
    const internal = asInternal(game);
    const src = asInternal(rebuilt);
    internal.engine = src.engine;
    internal.moves = [];
    internal.initialState = src.initialState;
    return { ok: true, placements: collectBlackStones(internal.engine) };
  }

  beginScoring(game: EngineGame): void {
    asInternal(game).engine.phase = "stone removal";
  }

  setRemoved(game: EngineGame, coords: Coord[], removed: boolean): void {
    const { engine } = asInternal(game);
    for (const c of coords) {
      engine.setRemoved(c.x, c.y, removed);
    }
  }

  toggleRemoved(game: EngineGame, coord: Coord): { removed: boolean } {
    const { engine } = asInternal(game);
    const currently = Boolean(engine.removal?.[coord.y]?.[coord.x]);
    const next = !currently;
    // force_removal=true: allow marking groups the heuristic considers "alive"
    if (typeof engine.toggleSingleGroupRemoval === "function") {
      const r = engine.toggleSingleGroupRemoval(coord.x, coord.y, true);
      const after = Boolean(engine.removal?.[coord.y]?.[coord.x]);
      if (after === next || Boolean(r.removed) === next) {
        return { removed: after };
      }
    }
    engine.setRemoved(coord.x, coord.y, next);
    return { removed: next };
  }

  listRemoved(game: EngineGame): Coord[] {
    const { engine } = asInternal(game);
    const out: Coord[] = [];
    const rem = engine.removal;
    if (!rem) return out;
    for (let y = 0; y < rem.length; y++) {
      const row = rem[y]!;
      for (let x = 0; x < row.length; x++) {
        if (row[x]) out.push({ x, y });
      }
    }
    return out;
  }

  computeJapaneseScore(game: EngineGame): ScoreSummary {
    const { engine } = asInternal(game);
    engine.rules = "japanese";
    const score = engine.computeScore();
    return {
      black: scoreDetail(score.black),
      white: scoreDetail(score.white),
    };
  }

  getScoringView(game: EngineGame): ScoringView {
    const { engine } = asInternal(game);
    engine.rules = "japanese";
    const score = engine.computeScore();
    const w = engine.width;
    const h = engine.height;
    const ownership = Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
    for (const c of decodeScoringPositions(score.black.scoring_positions ?? "")) {
      if (c.y >= 0 && c.y < h && c.x >= 0 && c.x < w) ownership[c.y]![c.x] = 1;
    }
    for (const c of decodeScoringPositions(score.white.scoring_positions ?? "")) {
      if (c.y >= 0 && c.y < h && c.x >= 0 && c.x < w) ownership[c.y]![c.x] = 2;
    }
    return {
      score: {
        black: scoreDetail(score.black),
        white: scoreDetail(score.white),
      },
      ownership,
      removed: this.listRemoved(game),
    };
  }

  resumePlay(game: EngineGame): void {
    const { engine } = asInternal(game);
    // Clear removal marks when returning to play
    const rem = engine.removal;
    if (rem) {
      for (let y = 0; y < rem.length; y++) {
        for (let x = 0; x < rem[y]!.length; x++) {
          if (rem[y]![x]) engine.setRemoved(x, y, false);
        }
      }
    }
    engine.phase = "play";
  }

  serialize(game: EngineGame): string {
    const internal = asInternal(game);
    const payload: SerializedGame = {
      width: internal.engine.width,
      height: internal.engine.height,
      komi: internal.engine.komi,
      handicap: internal.engine.handicap,
      phase: internal.engine.phase,
      initialState: internal.initialState,
      moves: internal.moves.map((m) => ({ x: m.x, y: m.y })),
      removal: internal.engine.removal?.map((row) => row.map((v) => Boolean(v))),
    };
    return JSON.stringify(payload);
  }

  deserialize(payload: string): EngineGame {
    const data = JSON.parse(payload) as SerializedGame;
    const engine = buildEngine({
      width: data.width,
      height: data.height,
      rules: "japanese",
      komi: data.komi,
      handicap: data.handicap,
      initial_state: data.initialState,
      moves: data.moves,
    });
    if (data.phase) {
      engine.phase = data.phase;
    }
    if (data.removal && Array.isArray(data.removal)) {
      for (let y = 0; y < data.removal.length; y++) {
        const row = data.removal[y]!;
        for (let x = 0; x < row.length; x++) {
          if (row[x]) engine.setRemoved(x, y, true);
        }
      }
    }
    const game: InternalGame = {
      id: crypto.randomUUID(),
      engine,
      moves: data.moves.map((m) => ({ x: m.x, y: m.y })),
      initialState: data.initialState,
    };
    return game;
  }

  undo(game: EngineGame): UndoResult {
    const internal = asInternal(game);
    if (internal.moves.length === 0) {
      return { ok: false, code: "nothing_to_undo", message: "No moves to undo" };
    }
    internal.moves.pop();
    rebuildFromLog(internal);
    return { ok: true };
  }

  importSgf(sgf: string): ImportResult & { game?: EngineGame } {
    try {
      if (!sgf || typeof sgf !== "string" || !sgf.includes("(")) {
        return { ok: false, code: "malformed_sgf", message: "SGF missing tree structure" };
      }
      const engine = buildEngine({ original_sgf: sgf });
      const initialState = engine.computeInitialStateForForkedGame();
      // Record path from root to current as moves for later undo/serialize of linear trunks.
      const moves: Coord[] = [];
      let node = engine.move_tree.trunk_next;
      let guard = 0;
      while (node && guard < 1000) {
        moves.push({ x: node.x, y: node.y });
        if (node === engine.cur_move) break;
        node = node.trunk_next;
        guard += 1;
      }
      const game: InternalGame = {
        id: crypto.randomUUID(),
        engine,
        moves,
        initialState,
      };
      return { ok: true, game };
    } catch (err) {
      return {
        ok: false,
        code: "sgf_import_failed",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  listVariations(game: EngineGame): VariationInfo {
    const { engine } = asInternal(game);
    const node = engine.cur_move;
    const children: VariationInfo["children"] = [];
    if (node.trunk_next) {
      children.push({
        index: 0,
        coord: node.trunk_next.x < 0 ? null : { x: node.trunk_next.x, y: node.trunk_next.y },
        isPass: node.trunk_next.x < 0,
        isTrunk: true,
      });
    }
    const branches = node.branches ?? [];
    for (let i = 0; i < branches.length; i += 1) {
      const b = branches[i];
      children.push({
        index: children.length,
        coord: b.x < 0 ? null : { x: b.x, y: b.y },
        isPass: b.x < 0,
        isTrunk: false,
      });
    }
    return { moveNumber: engine.getMoveNumber(), children };
  }

  followVariation(game: EngineGame, childIndex: number): FollowResult {
    const { engine } = asInternal(game);
    const info = this.listVariations(game);
    const child = info.children[childIndex];
    if (!child) {
      return { ok: false, code: "invalid_variation", message: "No such variation child" };
    }
    const node = engine.cur_move;
    const target = child.isTrunk
      ? node.trunk_next
      : (node.branches ?? [])[childIndex - (node.trunk_next ? 1 : 0)];
    if (!target) {
      return { ok: false, code: "invalid_variation", message: "Variation node missing" };
    }
    engine.jumpTo(target);
    return { ok: true };
  }

  viewPrevious(game: EngineGame): boolean {
    return asInternal(game).engine.showPrevious();
  }

  jumpToRoot(game: EngineGame): void {
    const { engine } = asInternal(game);
    engine.jumpTo(engine.move_tree);
  }
}

export function createGobanEngineAdapter(): GobanEngineAdapter {
  return new GobanEngineAdapter();
}
