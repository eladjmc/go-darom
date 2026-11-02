import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import {
  LIVE_IDLE_MS,
  decodeFinishedGamesCursor,
  encodeFinishedGamesCursor,
  evaluateProposalRespond,
  evaluateProposalWithdraw,
  evaluateUndoProposal,
  resolveCommandIdempotency,
  type GameCommandType,
  type GameProjection,
  type GameResultDto,
  type UndoProposalOverlay,
} from "@go-darom/shared";
import { createGobanEngineAdapter, type Coord } from "@go-darom/go-engine";
import type { Db } from "../../infra/db/client.js";
import { gameCommandReceipts, games, liveGameOccupancy, users } from "../../infra/db/schema.js";
import { AuthError } from "../identity/token-verifier.js";
import type { AuthenticatedActor } from "../identity/types.js";
import type { NotificationService } from "../notifications/notification-service.js";
import type { PresenceRegistry } from "../../realtime/presence-registry.js";
import { sanitizeOverlaysForFinish } from "./finish-overlays.js";

export type GameBroadcast = (gameId: string, event: string, payload: unknown) => void;
export type GameRoomMembers = (gameId: string) => string[];

type GameRow = typeof games.$inferSelect;

export class GameService {
  private broadcast: GameBroadcast | null = null;
  private roomMembers: GameRoomMembers | null = null;

  constructor(
    private readonly db: Db["db"],
    private readonly notifications: NotificationService,
    private readonly presence: PresenceRegistry,
  ) {}

  setBroadcast(fn: GameBroadcast) {
    this.broadcast = fn;
  }

  setRoomMembers(fn: GameRoomMembers) {
    this.roomMembers = fn;
  }

  async getActive(
    actor: AuthenticatedActor,
  ): Promise<{ gameId: string; game: GameProjection } | null> {
    const occ = await this.db
      .select()
      .from(liveGameOccupancy)
      .where(eq(liveGameOccupancy.userId, actor.userId))
      .limit(1);
    if (!occ[0]) return null;
    await this.recoverOccupancyIfFinished(occ[0].gameId);
    const still = await this.db
      .select()
      .from(liveGameOccupancy)
      .where(eq(liveGameOccupancy.userId, actor.userId))
      .limit(1);
    if (!still[0]) return null;
    const game = await this.getProjection(actor, still[0].gameId);
    return { gameId: still[0].gameId, game };
  }

  async getProjection(actor: AuthenticatedActor, gameId: string): Promise<GameProjection> {
    const row = await this.loadGame(gameId);
    this.assertParticipant(actor.userId, row);
    if (row.status === "finished") {
      await this.recoverOccupancyIfFinished(gameId);
    } else {
      await this.applyClockTimeoutIfNeeded(row);
    }
    const fresh = await this.loadGame(gameId);
    return this.toProjection(fresh);
  }

  async listMine(
    actor: AuthenticatedActor,
    status: "active" | "finished",
    opts?: { limit?: number; cursor?: string | null },
  ): Promise<{ items: GameProjection[]; nextCursor: string | null }> {
    if (status === "active") {
      const rows = await this.db
        .select({ gameId: liveGameOccupancy.gameId })
        .from(liveGameOccupancy)
        .where(eq(liveGameOccupancy.userId, actor.userId));
      const out: GameProjection[] = [];
      for (const r of rows) {
        out.push(await this.getProjection(actor, r.gameId));
      }
      return { items: out, nextCursor: null };
    }

    const limit = Math.min(50, Math.max(1, Number(opts?.limit) || 20));
    const cursor = decodeFinishedGamesCursor(opts?.cursor ?? null);
    const participant = or(eq(games.blackUserId, actor.userId), eq(games.whiteUserId, actor.userId));
    const filters = [eq(games.status, "finished"), participant];
    if (cursor) {
      const cursorAt = new Date(cursor.finishedAt);
      filters.push(
        or(
          lt(games.finishedAt, cursorAt),
          and(eq(games.finishedAt, cursorAt), lt(games.id, cursor.id)),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(games)
      .where(and(...filters))
      .orderBy(desc(games.finishedAt), desc(games.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items: GameProjection[] = [];
    for (const row of page) {
      items.push(await this.toProjection(row));
    }
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last?.finishedAt
        ? encodeFinishedGamesCursor({ finishedAt: last.finishedAt.toISOString(), id: last.id })
        : null;
    return { items, nextCursor };
  }

  async submitCommand(
    actor: AuthenticatedActor,
    gameId: string,
    body: {
      expectedVersion?: number;
      commandId?: string;
      type?: GameCommandType;
      payload?: unknown;
    },
  ): Promise<GameProjection> {
    if (actor.suspended) throw new AuthError("החשבון מושעה", 403);
    const commandId = String(body.commandId ?? "");
    const type = body.type;
    const expectedVersion = Number(body.expectedVersion);
    if (!commandId || !type || !Number.isInteger(expectedVersion)) {
      throw new AuthError("פקודת משחק אינה תקינה", 400);
    }

    const receipt = await this.db
      .select()
      .from(gameCommandReceipts)
      .where(and(eq(gameCommandReceipts.gameId, gameId), eq(gameCommandReceipts.commandId, commandId)))
      .limit(1);
    if (resolveCommandIdempotency({ commandId, durableReceiptVersion: receipt[0]?.versionAfter ?? null }) === "replay_receipt") {
      return this.getProjection(actor, gameId);
    }

    let row = await this.loadGame(gameId);
    this.assertParticipant(actor.userId, row);
    if (row.status === "finished") throw new AuthError("המשחק הסתיים", 410);

    row = await this.applyClockTimeoutIfNeeded(row);
    if (row.status === "finished") {
      return this.toProjection(row);
    }

    if (row.version !== expectedVersion) {
      const err = new AuthError("המשחק התעדכן. נסו שוב", 409, "VERSION_CONFLICT");
      (err as AuthError & { game?: GameProjection }).game = await this.toProjection(row);
      throw err;
    }

    const result = await this.applyCommand(actor, row, type, body.payload, commandId);
    this.emitGameState(gameId, result);
    if (result.status !== "finished" && (type === "play" || type === "pass")) {
      await this.maybeNotifyTurn(result);
    }
    return result;
  }

  private emitGameState(gameId: string, game: GameProjection) {
    this.broadcast?.(gameId, "game:update", { gameId, version: game.version, game });
    if (game.status === "finished") {
      this.broadcast?.(gameId, "game:ended", {
        gameId,
        version: game.version,
        game,
        result: game.result,
      });
    }
  }

  private async applyCommand(
    actor: AuthenticatedActor,
    row: GameRow,
    type: GameCommandType,
    payload: unknown,
    commandId: string,
  ): Promise<GameProjection> {
    const adapter = createGobanEngineAdapter();
    const engine = adapter.deserialize(row.engineBlob);
    const overlays = { ...(row.overlays as Record<string, unknown>) };
    const history = [...(row.moveHistory as unknown[])];
    let phase = row.phase;
    let status = row.status;
    let result: GameResultDto | null = (row.result as GameResultDto | null) ?? null;
    let clock = row.clock as Record<string, unknown> | null;
    let finish = false;

    const color = actor.userId === row.blackUserId ? "black" : "white";
    const snap0 = adapter.snapshot(engine);

    const advanceClock = () => {
      if (!clock || row.clockMode !== "absolute_15m") return;
      const runningFor = clock.runningFor as string | null;
      const updatedAt = new Date(String(clock.updatedAt)).getTime();
      const elapsed = Math.max(0, Date.now() - updatedAt);
      if (runningFor === "black") {
        clock = {
          ...clock,
          blackRemainingMs: Math.max(0, Number(clock.blackRemainingMs) - elapsed),
          runningFor: "white",
          updatedAt: new Date().toISOString(),
        };
      } else if (runningFor === "white") {
        clock = {
          ...clock,
          whiteRemainingMs: Math.max(0, Number(clock.whiteRemainingMs) - elapsed),
          runningFor: "black",
          updatedAt: new Date().toISOString(),
        };
      }
    };

    if (type === "play" || type === "pass") {
      if (phase !== "active_play") throw new AuthError("לא בשלב משחק", 400, "WRONG_PHASE");
      if (snap0.toMove !== color) throw new AuthError("עכשיו התור של היריב", 400, "WRONG_TURN");
      delete overlays.undo;
      if (type === "play") {
        const p = payload as { x?: number; y?: number };
        const coord: Coord = { x: Number(p?.x), y: Number(p?.y) };
        const play = adapter.play(engine, coord);
        if (!play.ok) {
          const code =
            play.code === "occupied"
              ? "OCCUPIED"
              : play.code === "suicide"
                ? "SUICIDE"
                : play.code === "ko" || play.code === "superko"
                  ? "KO"
                  : "ILLEGAL_MOVE";
          const he =
            code === "OCCUPIED"
              ? "המקום הזה כבר תפוס"
              : code === "SUICIDE"
                ? "אי אפשר להניח כאן אבן"
                : code === "KO"
                  ? "אי אפשר להניח כאן אבן"
                  : "אי אפשר להניח כאן אבן";
          throw new AuthError(he, 400, code);
        }
        history.push({ commandId, type, actorUserId: actor.userId, payload: coord });
      } else {
        const play = adapter.pass(engine);
        if (!play.ok) throw new AuthError("לא ניתן לוותר על התור כעת", 400, "ILLEGAL_PASS");
        history.push({ commandId, type, actorUserId: actor.userId });
        const hist = history.filter((h) => (h as { type?: string }).type === "play" || (h as { type?: string }).type === "pass");
        const lastTwo = hist.slice(-2) as { type: string }[];
        if (lastTwo.length === 2 && lastTwo[0]!.type === "pass" && lastTwo[1]!.type === "pass") {
          adapter.beginScoring(engine);
          phase = "scoring";
          const view = adapter.getScoringView(engine);
          overlays.scoring = {
            proposedRemoved: view.removed,
            ownership: view.ownership,
            provisionalScore: view.score,
            blackConfirmed: false,
            whiteConfirmed: false,
          };
        }
      }
      advanceClock();
    } else if (type === "resign") {
      finish = true;
      status = "finished";
      phase = "finished";
      result = {
        type: "resignation",
        winnerUserId: color === "black" ? row.whiteUserId : row.blackUserId,
      };
      history.push({ commandId, type, actorUserId: actor.userId });
    } else if (type === "propose_undo") {
      if (phase !== "active_play") throw new AuthError("לא ניתן לבטל כעת", 400, "WRONG_PHASE");
      const pending = Boolean((overlays.undo as { status?: string } | undefined)?.status === "pending");
      const evalUndo = evaluateUndoProposal(history, actor.userId, pending);
      if (!evalUndo.ok) {
        throw new AuthError(evalUndo.messageHe, 400, evalUndo.code);
      }
      const target = evalUndo.target;
      const overlay: UndoProposalOverlay = {
        by: actor.userId,
        status: "pending",
        moveType: target.type,
        payload:
          target.type === "play" &&
          typeof target.payload?.x === "number" &&
          typeof target.payload?.y === "number"
            ? { x: target.payload.x, y: target.payload.y }
            : null,
        historyIndex: target.index,
      };
      overlays.undo = overlay;
      history.push({ commandId, type, actorUserId: actor.userId, payload: { historyIndex: target.index } });
    } else if (type === "respond_undo") {
      const undo = overlays.undo as UndoProposalOverlay | undefined;
      const gate = evaluateProposalRespond(undo, actor.userId, "undo");
      if (!gate.ok) throw new AuthError(gate.messageHe, 400, gate.code);
      const accept = Boolean((payload as { accept?: boolean })?.accept);
      if (!accept) {
        delete overlays.undo;
        history.push({ commandId, type, actorUserId: actor.userId, payload: { accept: false } });
      } else {
        // Truncate history through the retracted move (drops propose_undo trailing entries).
        const truncated = history.slice(0, undo!.historyIndex);
        const u = adapter.undo(engine);
        if (!u.ok) throw new AuthError("ביטול המהלך נכשל", 400, "UNDO_FAILED");
        delete overlays.undo;
        // Clock policy (documented): do not refund time for the retracted move.
        // Deduct elapsed from the current runner, then assign runningFor to restored toMove.
        if (clock && row.clockMode === "absolute_15m") {
          const runningFor = clock.runningFor as string | null;
          const updatedAt = new Date(String(clock.updatedAt)).getTime();
          const elapsed = Math.max(0, Date.now() - updatedAt);
          let black = Number(clock.blackRemainingMs);
          let white = Number(clock.whiteRemainingMs);
          if (runningFor === "black") black = Math.max(0, black - elapsed);
          if (runningFor === "white") white = Math.max(0, white - elapsed);
          const restored = adapter.snapshot(engine).toMove;
          clock = {
            ...clock,
            blackRemainingMs: black,
            whiteRemainingMs: white,
            runningFor: restored,
            updatedAt: new Date().toISOString(),
          };
        }
        history.length = 0;
        history.push(...truncated, {
          commandId,
          type,
          actorUserId: actor.userId,
          payload: { accept: true, retractedIndex: undo!.historyIndex },
        });
      }
    } else if (type === "withdraw_undo") {
      const undo = overlays.undo as UndoProposalOverlay | undefined;
      const gate = evaluateProposalWithdraw(undo, actor.userId, "undo");
      if (!gate.ok) throw new AuthError(gate.messageHe, 400, gate.code);
      delete overlays.undo;
      history.push({ commandId, type, actorUserId: actor.userId });
    } else if (type === "propose_no_winner") {
      if (status !== "active") {
        throw new AuthError("לא ניתן להציע סיום — המשחק אינו פעיל", 400, "WRONG_PHASE");
      }
      const existing = overlays.noWinner as { by?: string; status?: string } | undefined;
      if (existing?.status === "pending" && existing.by && existing.by !== actor.userId) {
        throw new AuthError("כבר ממתינה הצעת סיום מהיריב", 400, "NO_WINNER_PENDING");
      }
      overlays.noWinner = { by: actor.userId, status: "pending" };
      history.push({ commandId, type, actorUserId: actor.userId });
    } else if (type === "respond_no_winner") {
      const prop = overlays.noWinner as { by: string; status: string } | undefined;
      const gate = evaluateProposalRespond(prop, actor.userId, "no_winner");
      if (!gate.ok) throw new AuthError(gate.messageHe, 400, gate.code);
      const accept = Boolean((payload as { accept?: boolean })?.accept);
      if (!accept) {
        delete overlays.noWinner;
      } else {
        finish = true;
        status = "finished";
        phase = "finished";
        result = { type: "no_winner", winnerUserId: null };
        delete overlays.noWinner;
        delete overlays.undo;
        delete overlays.idle;
      }
      history.push({ commandId, type, actorUserId: actor.userId, payload });
    } else if (type === "withdraw_no_winner") {
      const prop = overlays.noWinner as { by: string; status: string } | undefined;
      const gate = evaluateProposalWithdraw(prop, actor.userId, "no_winner");
      if (!gate.ok) throw new AuthError(gate.messageHe, 400, gate.code);
      delete overlays.noWinner;
      history.push({ commandId, type, actorUserId: actor.userId });
    } else if (type === "mark_dead" || type === "clear_dead") {
      if (phase !== "scoring") throw new AuthError("לא בשלב סימון", 400, "WRONG_PHASE");
      const p = payload as { x?: number; y?: number; coords?: Coord[] };
      const points: Coord[] =
        Array.isArray(p?.coords) && p.coords.length > 0
          ? p.coords.map((c) => ({ x: Number(c.x), y: Number(c.y) }))
          : typeof p?.x === "number" && typeof p?.y === "number"
            ? [{ x: Number(p.x), y: Number(p.y) }]
            : [];
      if (points.length === 0) throw new AuthError("נקודה לסימון אינה תקינה", 400, "BAD_PAYLOAD");
      if (type === "clear_dead") {
        adapter.setRemoved(engine, points, false);
      } else if (points.length === 1) {
        adapter.toggleRemoved(engine, points[0]!);
      } else {
        adapter.setRemoved(engine, points, true);
      }
      const view = adapter.getScoringView(engine);
      const prev = (overlays.scoring as Record<string, unknown> | undefined) ?? {};
      overlays.scoring = {
        ...prev,
        proposedRemoved: view.removed,
        ownership: view.ownership,
        provisionalScore: view.score,
        blackConfirmed: false,
        whiteConfirmed: false,
      };
      history.push({ commandId, type, actorUserId: actor.userId, payload });
    } else if (type === "confirm_score") {
      if (phase !== "scoring") throw new AuthError("לא בשלב סימון", 400, "WRONG_PHASE");
      const view = adapter.getScoringView(engine);
      const prevScoring = (overlays.scoring as Record<string, unknown> | undefined) ?? {};
      const scoring = {
        proposedRemoved: view.removed,
        ownership: view.ownership,
        provisionalScore: view.score,
        blackConfirmed: Boolean(prevScoring.blackConfirmed),
        whiteConfirmed: Boolean(prevScoring.whiteConfirmed),
      };
      if (color === "black") scoring.blackConfirmed = true;
      else scoring.whiteConfirmed = true;
      overlays.scoring = scoring;
      if (scoring.blackConfirmed && scoring.whiteConfirmed) {
        const score = view.score;
        finish = true;
        status = "finished";
        phase = "finished";
        const blackTotal = score.black.total;
        const whiteTotal = score.white.total;
        result = {
          type: "score",
          winnerUserId:
            blackTotal === whiteTotal ? null : blackTotal > whiteTotal ? row.blackUserId : row.whiteUserId,
          score,
          margin: Math.abs(blackTotal - whiteTotal),
        };
        // Persist agreed ownership + dead marks so refresh restores territory visualization.
        overlays.scoring = {
          ...scoring,
          committed: true,
        };
      }
      history.push({ commandId, type, actorUserId: actor.userId });
    } else if (type === "dispute_score" || type === "resume") {
      if (phase !== "scoring") throw new AuthError("לא בשלב סימון", 400, "WRONG_PHASE");
      adapter.resumePlay(engine);
      phase = "active_play";
      delete overlays.scoring;
      history.push({ commandId, type, actorUserId: actor.userId });
    } else {
      throw new AuthError("סוג פקודה אינו נתמך", 400);
    }

    // Idle offer (untimed): surface after 48h — mutual no-winner only; no convert control
    if (
      row.clockMode === "none" &&
      status === "active" &&
      Date.now() - row.lastActivityAt.getTime() >= LIVE_IDLE_MS
    ) {
      overlays.idle = { offeredAt: new Date().toISOString(), mutualNoWinnerOnly: true };
    }

    const boardSnapshot = adapter.snapshot(engine) as unknown as Record<string, unknown>;
    const engineBlob = adapter.serialize(engine);
    const nextVersion = row.version + 1;

    if (finish) {
      return this.finishGameTx({
        row,
        commandId,
        actorUserId: actor.userId,
        nextVersion,
        engineBlob,
        boardSnapshot,
        moveHistory: history,
        overlays,
        clock,
        result: result!,
        phase: "finished",
      });
    }

    const updated = await this.db.transaction(async (tx) => {
      const cas = await tx
        .update(games)
        .set({
          version: nextVersion,
          phase,
          engineBlob,
          boardSnapshot,
          moveHistory: history,
          overlays,
          clock,
          lastActivityAt: sql`now()`,
        })
        .where(and(eq(games.id, row.id), eq(games.version, row.version)))
        .returning();
      if (!cas[0]) throw new AuthError("המצב השתנה — רעננו וחזרו", 409);
      await tx.insert(gameCommandReceipts).values({
        gameId: row.id,
        commandId,
        actorUserId: actor.userId,
        versionAfter: nextVersion,
      });
      return cas[0];
    });

    return this.toProjection(updated);
  }

  private async finishGameTx(input: {
    row: GameRow;
    commandId: string;
    actorUserId: string;
    nextVersion: number;
    engineBlob: string;
    boardSnapshot: Record<string, unknown>;
    moveHistory: unknown[];
    overlays: Record<string, unknown>;
    clock: Record<string, unknown> | null;
    result: GameResultDto;
    phase: string;
  }): Promise<GameProjection> {
    const overlays = sanitizeOverlaysForFinish(input.overlays, input.result);
    const updated = await this.db.transaction(async (tx) => {
      const cas = await tx
        .update(games)
        .set({
          version: input.nextVersion,
          status: "finished",
          phase: input.phase,
          engineBlob: input.engineBlob,
          boardSnapshot: input.boardSnapshot,
          moveHistory: input.moveHistory,
          overlays,
          clock: input.clock,
          result: input.result,
          finishedAt: sql`now()`,
          lastActivityAt: sql`now()`,
        })
        .where(and(eq(games.id, input.row.id), eq(games.version, input.row.version)))
        .returning();
      if (!cas[0]) throw new AuthError("המצב השתנה — רעננו וחזרו", 409);
      await tx.delete(liveGameOccupancy).where(eq(liveGameOccupancy.gameId, input.row.id));
      await tx.insert(gameCommandReceipts).values({
        gameId: input.row.id,
        commandId: input.commandId,
        actorUserId: input.actorUserId,
        versionAfter: input.nextVersion,
      });
      return cas[0];
    });
    return this.toProjection(updated);
  }

  /** Recovery if finished game still has occupancy rows. */
  async recoverOccupancyIfFinished(gameId: string): Promise<number> {
    const row = await this.loadGame(gameId);
    if (row.status !== "finished") return 0;
    const deleted = await this.db
      .delete(liveGameOccupancy)
      .where(eq(liveGameOccupancy.gameId, gameId))
      .returning({ userId: liveGameOccupancy.userId });
    return deleted.length;
  }

  private async applyClockTimeoutIfNeeded(row: GameRow): Promise<GameRow> {
    if (row.status !== "active" || row.clockMode !== "absolute_15m" || !row.clock) return row;
    const clock = { ...(row.clock as Record<string, unknown>) };
    const runningFor = clock.runningFor as string | null;
    const updatedAt = new Date(String(clock.updatedAt)).getTime();
    const elapsed = Math.max(0, Date.now() - updatedAt);
    let black = Number(clock.blackRemainingMs);
    let white = Number(clock.whiteRemainingMs);
    if (runningFor === "black") black -= elapsed;
    if (runningFor === "white") white -= elapsed;
    if (black > 0 && white > 0) return row;

    const loserIsBlack = black <= 0;
    const result: GameResultDto = {
      type: "timeout",
      winnerUserId: loserIsBlack ? row.whiteUserId : row.blackUserId,
    };
    const commandId = `timeout:${row.id}:${row.version}`;
    const existing = await this.db
      .select()
      .from(gameCommandReceipts)
      .where(and(eq(gameCommandReceipts.gameId, row.id), eq(gameCommandReceipts.commandId, commandId)))
      .limit(1);
    if (existing[0]) return this.loadGame(row.id);

    const finished = await this.finishGameTx({
      row,
      commandId,
      actorUserId: loserIsBlack ? row.blackUserId : row.whiteUserId,
      nextVersion: row.version + 1,
      engineBlob: row.engineBlob,
      boardSnapshot: row.boardSnapshot as Record<string, unknown>,
      moveHistory: row.moveHistory as unknown[],
      overlays: row.overlays as Record<string, unknown>,
      clock: { ...clock, blackRemainingMs: Math.max(0, black), whiteRemainingMs: Math.max(0, white), runningFor: null },
      result,
      phase: "finished",
    });
    this.emitGameState(row.id, finished);
    return this.loadGame(row.id);
  }

  private async maybeNotifyTurn(game: GameProjection) {
    const board = game.board as { toMove?: string };
    const toMove = board.toMove === "white" ? game.whiteUserId : game.blackUserId;
    const inRoom = new Set(this.roomMembers?.(game.id) ?? []);
    if (inRoom.has(toMove)) return;
    if (!this.presence.isOnline(toMove)) return;
    // D8: at most one notice per committed version (payload identity)
    const dedupeKey = `${game.id}:${game.version}`;
    if (this.recentTurnNotices.has(dedupeKey)) return;
    this.recentTurnNotices.add(dedupeKey);
    if (this.recentTurnNotices.size > 200) {
      const first = this.recentTurnNotices.values().next().value;
      if (first) this.recentTurnNotices.delete(first);
    }
    await this.notifications.create({
      recipientId: toMove,
      type: "game.live_turn",
      payload: { gameId: game.id, version: game.version },
    });
  }

  private readonly recentTurnNotices = new Set<string>();

  private async loadGame(gameId: string): Promise<GameRow> {
    const rows = await this.db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!rows[0]) throw new AuthError("משחק לא נמצא", 404);
    return rows[0];
  }

  private assertParticipant(userId: string, row: GameRow) {
    if (userId !== row.blackUserId && userId !== row.whiteUserId) {
      throw new AuthError("אין הרשאה למשחק זה", 403);
    }
  }

  private async toProjection(row: GameRow): Promise<GameProjection> {
    const playerIds = [row.blackUserId, row.whiteUserId];
    const profiles = await this.db
      .select({ id: users.id, nickname: users.nickname, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.id, playerIds));
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const idleEligible =
      row.clockMode === "none" &&
      row.status === "active" &&
      Date.now() - row.lastActivityAt.getTime() >= LIVE_IDLE_MS;
    const overlays = { ...(row.overlays as Record<string, unknown>) };
    if (idleEligible && !overlays.idle) {
      overlays.idle = { offeredAt: new Date().toISOString(), mutualNoWinnerOnly: true };
    }
    return {
      id: row.id,
      mode: "live",
      status: row.status as "active" | "finished",
      phase: row.phase as GameProjection["phase"],
      version: row.version,
      boardSize: row.boardSize as 9 | 13 | 19,
      komi: Number(row.komi),
      handicap: row.handicap,
      clockMode: row.clockMode as GameProjection["clockMode"],
      colorMode: row.colorMode as GameProjection["colorMode"],
      blackUserId: row.blackUserId,
      whiteUserId: row.whiteUserId,
      board: row.boardSnapshot,
      moveHistory: row.moveHistory as unknown[],
      overlays,
      clock: row.clock as Record<string, unknown> | null,
      result: (row.result as GameResultDto | null) ?? null,
      lastActivityAt: row.lastActivityAt.toISOString(),
      players: [
        {
          userId: row.blackUserId,
          nickname: byId.get(row.blackUserId)?.nickname ?? null,
          avatarUrl: byId.get(row.blackUserId)?.avatarUrl ?? null,
          color: "black",
        },
        {
          userId: row.whiteUserId,
          nickname: byId.get(row.whiteUserId)?.nickname ?? null,
          avatarUrl: byId.get(row.whiteUserId)?.avatarUrl ?? null,
          color: "white",
        },
      ],
      createdAt: row.createdAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
    };
  }
}
