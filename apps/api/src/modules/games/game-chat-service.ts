import { and, desc, eq, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  validateChatBody,
  type GameChatAccessRole,
  type GameChatMessageDto,
  type GameChatMessagesPage,
} from "@go-darom/shared";
import * as schema from "../../infra/db/schema.js";
import { gameChatMessages, games, users } from "../../infra/db/schema.js";
import type { AuthenticatedActor } from "../identity/types.js";
import { AuthError } from "../identity/token-verifier.js";

type Db = NodePgDatabase<typeof schema>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

type GameChatAccess = {
  role: GameChatAccessRole;
  canSend: boolean;
  gameStatus: string;
};

/**
 * Dedicated per-game chat. Never touches community DM tables, unread, or notifications.
 * AuthZ resolves a role so spectators can be added later without redesigning storage.
 */
export class GameChatService {
  private broadcast: ((gameId: string, event: string, payload: unknown) => void) | null = null;
  private readonly sendTimestamps = new Map<string, number[]>();

  constructor(private readonly db: Db) {}

  setBroadcast(fn: (gameId: string, event: string, payload: unknown) => void) {
    this.broadcast = fn;
  }

  /** Socket / REST gate — knowing gameId is not enough. */
  async assertCanJoin(actor: AuthenticatedActor, gameId: string): Promise<GameChatAccess> {
    return this.resolveAccess(actor, gameId, "read");
  }

  async listMessages(
    actor: AuthenticatedActor,
    gameId: string,
    before?: string | null,
    limitRaw?: number,
  ): Promise<GameChatMessagesPage> {
    await this.resolveAccess(actor, gameId, "read");
    const limit = Math.min(Math.max(1, limitRaw ?? DEFAULT_LIMIT), MAX_LIMIT);

    const conditions = [eq(gameChatMessages.gameId, gameId)];
    if (before) {
      const cursor = new Date(before);
      if (Number.isNaN(cursor.getTime())) {
        throw new AuthError("סמן היסטוריה אינו תקין", 400);
      }
      conditions.push(lt(gameChatMessages.createdAt, cursor));
    }

    const rows = await this.db
      .select({
        id: gameChatMessages.id,
        gameId: gameChatMessages.gameId,
        body: gameChatMessages.body,
        createdAt: gameChatMessages.createdAt,
        senderId: gameChatMessages.senderUserId,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
      })
      .from(gameChatMessages)
      .innerJoin(users, eq(users.id, gameChatMessages.senderUserId))
      .where(and(...conditions))
      .orderBy(desc(gameChatMessages.createdAt))
      .limit(limit);

    const items = rows.map((r) => this.toDto(r)).reverse();
    const nextBefore =
      rows.length === limit ? rows[rows.length - 1]!.createdAt.toISOString() : null;
    return { items, nextBefore };
  }

  async postMessage(
    actor: AuthenticatedActor,
    gameId: string,
    rawBody: unknown,
    clientCommandId: string,
  ): Promise<{ message: GameChatMessageDto; created: boolean }> {
    const access = await this.resolveAccess(actor, gameId, "send");
    if (!access.canSend) {
      throw new AuthError("המשחק הסתיים — הצ'אט לקריאה בלבד", 410, "GAME_CHAT_READONLY");
    }
    if (actor.suspended) {
      throw new AuthError("החשבון מושעה", 403);
    }

    const parsed = validateChatBody(rawBody);
    if (!parsed.ok) throw new AuthError(parsed.message, 400);
    if (!clientCommandId || clientCommandId.length > 80) {
      throw new AuthError("מזהה פקודה אינו תקין", 400);
    }

    const existing = await this.db
      .select({
        id: gameChatMessages.id,
        gameId: gameChatMessages.gameId,
        body: gameChatMessages.body,
        createdAt: gameChatMessages.createdAt,
        senderId: gameChatMessages.senderUserId,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
      })
      .from(gameChatMessages)
      .innerJoin(users, eq(users.id, gameChatMessages.senderUserId))
      .where(
        and(
          eq(gameChatMessages.gameId, gameId),
          eq(gameChatMessages.senderUserId, actor.userId),
          eq(gameChatMessages.clientCommandId, clientCommandId),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return { message: this.toDto(existing[0]), created: false };
    }

    this.assertRateLimit(actor.userId);

    const [inserted] = await this.db
      .insert(gameChatMessages)
      .values({
        gameId,
        senderUserId: actor.userId,
        body: parsed.body,
        clientCommandId,
      })
      .returning();

    const me = await this.db
      .select({ nickname: users.nickname, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, actor.userId))
      .limit(1);

    const message: GameChatMessageDto = {
      id: inserted!.id,
      gameId,
      body: inserted!.body,
      createdAt: inserted!.createdAt.toISOString(),
      sender: {
        id: actor.userId,
        nickname: me[0]?.nickname ?? "?",
        avatarUrl: me[0]?.avatarUrl ?? null,
      },
    };

    this.broadcast?.(gameId, "game-chat:new", { message });
    return { message, created: true };
  }

  /**
   * M4: only participants. Spectators would be granted here later without schema change.
   */
  private async resolveAccess(
    actor: AuthenticatedActor,
    gameId: string,
    intent: "read" | "send",
  ): Promise<GameChatAccess> {
    const [row] = await this.db
      .select({
        id: games.id,
        status: games.status,
        blackUserId: games.blackUserId,
        whiteUserId: games.whiteUserId,
      })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    if (!row) throw new AuthError("משחק לא נמצא", 404);

    const isParticipant =
      actor.userId === row.blackUserId || actor.userId === row.whiteUserId;
    if (!isParticipant) {
      throw new AuthError("אין הרשאה לצ'אט המשחק", 403);
    }

    const role: GameChatAccessRole = "participant";
    const canSend = row.status === "active" && !actor.suspended;
    if (intent === "send" && !canSend && row.status !== "active") {
      // caller handles 410 via canSend
    }
    return { role, canSend, gameStatus: row.status };
  }

  private assertRateLimit(userId: string) {
    const now = Date.now();
    const prev = (this.sendTimestamps.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (prev.length >= RATE_MAX) {
      throw new AuthError("נשלחו יותר מדי הודעות — נסו שוב בעוד רגע", 400, "RATE_LIMIT");
    }
    prev.push(now);
    this.sendTimestamps.set(userId, prev);
  }

  private toDto(r: {
    id: string;
    gameId: string;
    body: string;
    createdAt: Date;
    senderId: string;
    nickname: string | null;
    avatarUrl: string | null;
  }): GameChatMessageDto {
    return {
      id: r.id,
      gameId: r.gameId,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      sender: {
        id: r.senderId,
        nickname: r.nickname ?? "?",
        avatarUrl: r.avatarUrl,
      },
    };
  }
}

/** Pure helpers for unit tests (no DB). */
export function gameChatAccessForParticipant(status: string, suspended: boolean): GameChatAccess {
  return {
    role: "participant",
    canSend: status === "active" && !suspended,
    gameStatus: status,
  };
}

export function gameChatRoomName(gameId: string): string {
  return `game-chat:${gameId}`;
}
