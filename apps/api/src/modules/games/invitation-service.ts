import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import {
  LIVE_INVITE_TTL_MS,
  assignColors,
  parseLiveInviteSettings,
  type LiveInviteDto,
  type LiveInviteParty,
  type LiveInviteSettings,
} from "@go-darom/shared";
import { createGobanEngineAdapter } from "@go-darom/go-engine";
import type { Db } from "../../infra/db/client.js";
import { gameInvites, games, liveGameOccupancy, users } from "../../infra/db/schema.js";
import { AuthError } from "../identity/token-verifier.js";
import type { AuthenticatedActor } from "../identity/types.js";
import type { NotificationService } from "../notifications/notification-service.js";
import type { TrustService } from "../trust/trust-service.js";
import type { PresenceRegistry } from "../../realtime/presence-registry.js";
import { ABSOLUTE_CLOCK_MS } from "./game-settings.js";
import type { GameService } from "./game-service.js";

export class InvitationService {
  constructor(
    private readonly db: Db["db"],
    private readonly trust: TrustService,
    private readonly notifications: NotificationService,
    private readonly presence: PresenceRegistry,
    private readonly games: GameService,
  ) {}

  async createLiveInvite(actor: AuthenticatedActor, body: unknown): Promise<LiveInviteDto> {
    await this.requirePlayable(actor);
    const parsed = parseLiveInviteSettings(body);
    if (!parsed.ok) throw new AuthError(parsed.message, 400);
    const recipientId = String((body as { recipientId?: string })?.recipientId ?? "");
    if (!recipientId || recipientId === actor.userId) {
      throw new AuthError("נמען הזמנה אינו תקין", 400);
    }
    const recipient = await this.db
      .select({ id: users.id, suspendedAt: users.suspendedAt, onboardingCompleted: users.onboardingCompleted })
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1);
    if (!recipient[0] || !recipient[0].onboardingCompleted) {
      throw new AuthError("המשתמש לא נמצא", 404);
    }
    if (recipient[0].suspendedAt) throw new AuthError("לא ניתן להזמין משתמש מושעה", 403);
    if (await this.trust.isEitherBlocked(actor.userId, recipientId)) {
      throw new AuthError("לא ניתן להזמין עקב חסימה", 403);
    }
    const busy = await this.db
      .select({ userId: liveGameOccupancy.userId })
      .from(liveGameOccupancy)
      .where(eq(liveGameOccupancy.userId, actor.userId))
      .limit(1);
    if (busy[0]) throw new AuthError("כבר יש לכם משחק חי פעיל", 409);

    const now = new Date();
    const [row] = await this.db
      .insert(gameInvites)
      .values({
        kind: "live",
        inviterId: actor.userId,
        recipientId,
        status: "pending",
        settings: parsed.settings,
        expiresAt: new Date(now.getTime() + LIVE_INVITE_TTL_MS),
      })
      .returning();

    const inviterParty = await this.loadParty(actor.userId);
    await this.notifications.create({
      recipientId,
      type: "game.invite",
      payload: {
        inviteId: row!.id,
        inviterId: actor.userId,
        inviterNickname: inviterParty.nickname,
        inviterAvatarUrl: inviterParty.avatarUrl,
        settings: parsed.settings,
        expiresAt: row!.expiresAt.toISOString(),
      },
    });

    return await this.toInviteDto(row!);
  }

  /** Participant-scoped invite fetch for notification sync (pending or terminal). */
  async getForParticipant(actor: AuthenticatedActor, inviteId: string): Promise<LiveInviteDto> {
    await this.expireDue();
    const rows = await this.db.select().from(gameInvites).where(eq(gameInvites.id, inviteId)).limit(1);
    const invite = rows[0];
    if (!invite || invite.kind !== "live") throw new AuthError("הזמנה לא נמצאה", 404);
    if (invite.inviterId !== actor.userId && invite.recipientId !== actor.userId) {
      throw new AuthError("אין הרשאה", 403);
    }
    if (invite.status === "pending" && invite.expiresAt.getTime() <= Date.now()) {
      const [expired] = await this.db
        .update(gameInvites)
        .set({ status: "expired", resolvedAt: sql`now()` })
        .where(and(eq(gameInvites.id, invite.id), eq(gameInvites.status, "pending")))
        .returning();
      if (expired) return await this.toInviteDto(expired);
    }
    return await this.toInviteDto(invite);
  }

  async listMine(actor: AuthenticatedActor): Promise<LiveInviteDto[]> {
    await this.expireDue();
    const rows = await this.db
      .select()
      .from(gameInvites)
      .where(
        and(
          eq(gameInvites.kind, "live"),
          eq(gameInvites.status, "pending"),
          or(eq(gameInvites.inviterId, actor.userId), eq(gameInvites.recipientId, actor.userId)),
        ),
      );
    return Promise.all(rows.map((r) => this.toInviteDto(r)));
  }

  async reject(actor: AuthenticatedActor, inviteId: string): Promise<LiveInviteDto> {
    const invite = await this.getPendingForRecipient(inviteId, actor.userId);
    const [row] = await this.db
      .update(gameInvites)
      .set({ status: "rejected", resolvedAt: sql`now()` })
      .where(and(eq(gameInvites.id, invite.id), eq(gameInvites.status, "pending")))
      .returning();
    if (!row) throw new AuthError("ההזמנה אינה זמינה עוד", 409);
    const recipientParty = await this.loadParty(row.recipientId);
    await this.notifications.create({
      recipientId: row.inviterId,
      type: "game.invite_rejected",
      payload: {
        inviteId: row.id,
        recipientNickname: recipientParty.nickname,
      },
    });
    return await this.toInviteDto(row);
  }

  async cancel(actor: AuthenticatedActor, inviteId: string): Promise<LiveInviteDto> {
    const [row] = await this.db
      .update(gameInvites)
      .set({ status: "cancelled", resolvedAt: sql`now()` })
      .where(
        and(
          eq(gameInvites.id, inviteId),
          eq(gameInvites.inviterId, actor.userId),
          eq(gameInvites.status, "pending"),
        ),
      )
      .returning();
    if (!row) throw new AuthError("ההזמנה אינה זמינה לביטול", 409);
    const inviterParty = await this.loadParty(row.inviterId);
    await this.notifications.create({
      recipientId: row.recipientId,
      type: "game.invite_cancelled",
      payload: {
        inviteId: row.id,
        inviterNickname: inviterParty.nickname,
      },
    });
    return await this.toInviteDto(row);
  }

  /** Explicit logout only — not transient disconnect. */
  async cancelPendingOnExplicitLogout(userId: string): Promise<number> {
    const result = await this.db
      .update(gameInvites)
      .set({ status: "cancelled", resolvedAt: sql`now()` })
      .where(
        and(
          eq(gameInvites.kind, "live"),
          eq(gameInvites.inviterId, userId),
          eq(gameInvites.status, "pending"),
        ),
      )
      .returning({ id: gameInvites.id });
    return result.length;
  }

  async accept(actor: AuthenticatedActor, inviteId: string) {
    await this.requirePlayable(actor);
    await this.expireDue();

    const outcome = await this.db.transaction(async (tx) => {
      const invites = await tx
        .select()
        .from(gameInvites)
        .where(eq(gameInvites.id, inviteId))
        .limit(1);
      const invite = invites[0];
      if (!invite || invite.kind !== "live") throw new AuthError("הזמנה לא נמצאה", 404);
      if (invite.recipientId !== actor.userId) throw new AuthError("אין הרשאה", 403);
      if (invite.status !== "pending") throw new AuthError("ההזמנה אינה זמינה עוד", 410);
      if (invite.expiresAt.getTime() <= Date.now()) {
        await tx
          .update(gameInvites)
          .set({ status: "expired", resolvedAt: sql`now()` })
          .where(eq(gameInvites.id, invite.id));
        throw new AuthError("ההזמנה פגה", 410);
      }

      if (await this.trust.isEitherBlocked(invite.inviterId, invite.recipientId)) {
        throw new AuthError("לא ניתן לקבל עקב חסימה", 403);
      }
      if (!this.presence.isOnline(invite.inviterId)) {
        throw new AuthError("המזמין אינו מחובר כעת — נסו שוב כשיהיה מחובר", 409);
      }

      const settings = invite.settings as LiveInviteSettings;
      const colors = assignColors(
        invite.inviterId,
        invite.recipientId,
        settings.colorMode,
        (Math.random() < 0.5 ? 0 : 1) as 0 | 1,
      );

      const adapter = createGobanEngineAdapter();
      const engineGame = adapter.createGame({
        size: settings.boardSize,
        komi: settings.komi,
        handicap: settings.handicap > 0 ? settings.handicap : undefined,
      });
      // Handicap stones come from engine create options (POC HC-*); White to move.
      const snapshot = adapter.snapshot(engineGame);
      const engineBlob = adapter.serialize(engineGame);

      const clock =
        settings.clockMode === "absolute_15m"
          ? {
              blackRemainingMs: ABSOLUTE_CLOCK_MS,
              whiteRemainingMs: ABSOLUTE_CLOCK_MS,
              runningFor: snapshot.toMove,
              updatedAt: new Date().toISOString(),
            }
          : null;

      const [game] = await tx
        .insert(games)
        .values({
          mode: "live",
          status: "active",
          phase: "active_play",
          boardSize: settings.boardSize,
          komi: String(settings.komi),
          handicap: settings.handicap,
          clockMode: settings.clockMode,
          colorMode: settings.colorMode,
          blackUserId: colors.blackUserId,
          whiteUserId: colors.whiteUserId,
          version: 1,
          engineBlob,
          boardSnapshot: snapshot as unknown as Record<string, unknown>,
          moveHistory: [],
          overlays: {},
          clock,
        })
        .returning();

      try {
        await tx.insert(liveGameOccupancy).values([
          { userId: colors.blackUserId, gameId: game!.id },
          { userId: colors.whiteUserId, gameId: game!.id },
        ]);
      } catch {
        throw new AuthError("אחד השחקנים כבר במשחק חי", 409);
      }

      const cas = await tx
        .update(gameInvites)
        .set({
          status: "accepted",
          resolvedAt: sql`now()`,
          gameId: game!.id,
        })
        .where(and(eq(gameInvites.id, invite.id), eq(gameInvites.status, "pending")))
        .returning({ id: gameInvites.id });
      if (!cas[0]) {
        throw new AuthError("ההזמנה התקבלה במקביל על ידי בקשה אחרת", 409);
      }

      const superseded = await tx
        .update(gameInvites)
        .set({ status: "cancelled", resolvedAt: sql`now()` })
        .where(
          and(
            eq(gameInvites.kind, "live"),
            eq(gameInvites.status, "pending"),
            ne(gameInvites.id, invite.id),
            or(
              inArray(gameInvites.inviterId, [colors.blackUserId, colors.whiteUserId]),
              inArray(gameInvites.recipientId, [colors.blackUserId, colors.whiteUserId]),
            ),
          ),
        )
        .returning({
          id: gameInvites.id,
          inviterId: gameInvites.inviterId,
          recipientId: gameInvites.recipientId,
        });

      return { gameId: game!.id, superseded };
    });

    const acceptedInvite = (
      await this.db.select().from(gameInvites).where(eq(gameInvites.id, inviteId))
    )[0]!;
    await this.notifications.create({
      recipientId: acceptedInvite.inviterId,
      type: "game.invite_accepted",
      payload: { inviteId, gameId: outcome.gameId },
    });

    // Superseded invites: notify the other participant so notification cards go inert.
    for (const row of outcome.superseded) {
      const inviterParty = await this.loadParty(row.inviterId);
      const targets = new Set<string>([row.recipientId, row.inviterId]);
      targets.delete(actor.userId);
      for (const recipientId of targets) {
        await this.notifications.create({
          recipientId,
          type: "game.invite_cancelled",
          payload: {
            inviteId: row.id,
            inviterNickname: inviterParty.nickname,
            reason: "player_busy",
          },
        });
      }
    }

    const projection = await this.games.getProjection(actor, outcome.gameId);
    return { gameId: outcome.gameId, game: projection };
  }

  private async getPendingForRecipient(inviteId: string, recipientId: string) {
    await this.expireDue();
    const rows = await this.db.select().from(gameInvites).where(eq(gameInvites.id, inviteId)).limit(1);
    const invite = rows[0];
    if (!invite) throw new AuthError("הזמנה לא נמצאה", 404);
    if (invite.recipientId !== recipientId) throw new AuthError("אין הרשאה", 403);
    if (invite.status !== "pending") throw new AuthError("ההזמנה אינה זמינה עוד", 410);
    return invite;
  }

  private async expireDue() {
    await this.db
      .update(gameInvites)
      .set({ status: "expired", resolvedAt: sql`now()` })
      .where(
        and(
          eq(gameInvites.status, "pending"),
          eq(gameInvites.kind, "live"),
          sql`${gameInvites.expiresAt} <= now()`,
        ),
      );
  }

  private async requirePlayable(actor: AuthenticatedActor) {
    if (actor.suspended) throw new AuthError("החשבון מושעה", 403);
    const me = await this.db
      .select({ onboardingCompleted: users.onboardingCompleted })
      .from(users)
      .where(eq(users.id, actor.userId))
      .limit(1);
    if (!me[0]?.onboardingCompleted) throw new AuthError("יש להשלים הרשמה", 403);
  }

  private async loadParty(userId: string): Promise<LiveInviteParty> {
    const rows = await this.db
      .select({ id: users.id, nickname: users.nickname, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const u = rows[0];
    return { id: userId, nickname: u?.nickname ?? null, avatarUrl: u?.avatarUrl ?? null };
  }

  private async toInviteDto(row: typeof gameInvites.$inferSelect): Promise<LiveInviteDto> {
    const [inviter, recipient] = await Promise.all([
      this.loadParty(row.inviterId),
      this.loadParty(row.recipientId),
    ]);
    return {
      id: row.id,
      inviterId: row.inviterId,
      recipientId: row.recipientId,
      inviter,
      recipient,
      status: row.status,
      settings: row.settings as LiveInviteSettings,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      gameId: row.gameId,
    };
  }
}
