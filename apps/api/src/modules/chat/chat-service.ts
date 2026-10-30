import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import {
  DM_REPORT_CONTEXT_RADIUS,
  validateChatBody,
  type ChatMessageDto,
  type ChatMessagesPage,
  type DmThreadSummary,
} from "@go-darom/shared";
import type { Db } from "../../infra/db/client.js";
import {
  chatMessages,
  chatThreadReads,
  chatThreads,
  users,
} from "../../infra/db/schema.js";
import { AuthError } from "../identity/token-verifier.js";
import type { AuthenticatedActor } from "../identity/types.js";
import type { NotificationService } from "../notifications/notification-service.js";
import type { TrustService } from "../trust/trust-service.js";

export type ChatBroadcast = (room: string, event: string, payload: unknown) => void;

function dmPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export class ChatService {
  private broadcast: ChatBroadcast | null = null;

  constructor(
    private readonly db: Db["db"],
    private readonly trust: TrustService,
    private readonly notifications: NotificationService,
  ) {}

  setBroadcast(fn: ChatBroadcast) {
    this.broadcast = fn;
  }

  async ensureCommunityThread() {
    const existing = await this.db
      .select({ id: chatThreads.id })
      .from(chatThreads)
      .where(eq(chatThreads.kind, "community"))
      .limit(1);
    if (existing[0]) return existing[0].id;
    const [row] = await this.db.insert(chatThreads).values({ kind: "community" }).returning({ id: chatThreads.id });
    return row!.id;
  }

  async getCommunityThreadId() {
    return this.ensureCommunityThread();
  }

  async listCommunityMessages(beforeSeq?: number, limit = 50): Promise<ChatMessagesPage> {
    const threadId = await this.getCommunityThreadId();
    return this.listMessages(threadId, beforeSeq, limit);
  }

  async postCommunityMessage(actor: AuthenticatedActor, body: unknown, clientCommandId: string) {
    const threadId = await this.getCommunityThreadId();
    const message = await this.postMessage(actor, threadId, body, clientCommandId, "community");
    this.broadcast?.(`chat:community`, "chat:message", message);
    return message;
  }

  async markCommunityRead(actor: AuthenticatedActor, lastReadSeq: number) {
    const threadId = await this.getCommunityThreadId();
    return this.markRead(actor, threadId, lastReadSeq);
  }

  async softDeleteMessage(actor: AuthenticatedActor, messageId: string, asAdmin: boolean) {
    const rows = await this.db
      .select({
        id: chatMessages.id,
        threadId: chatMessages.threadId,
        senderId: chatMessages.senderId,
        kind: chatThreads.kind,
      })
      .from(chatMessages)
      .innerJoin(chatThreads, eq(chatThreads.id, chatMessages.threadId))
      .where(eq(chatMessages.id, messageId))
      .limit(1);
    const msg = rows[0];
    if (!msg) throw new AuthError("הודעה לא נמצאה", 404);
    if (!asAdmin && msg.senderId !== actor.userId) {
      throw new AuthError("אין הרשאה", 403);
    }
    if (!asAdmin && msg.kind !== "community" && msg.kind !== "dm") {
      throw new AuthError("אין הרשאה", 403);
    }
    // Members may delete own; admins may delete public (community). Admin delete of DM body not for browsing — only via moderation soft-delete of public.
    if (asAdmin && msg.kind !== "community" && msg.senderId !== actor.userId) {
      throw new AuthError("מנהלים יכולים להסיר הודעות ציבוריות בלבד", 403);
    }
    await this.db
      .update(chatMessages)
      .set({ deletedAt: sql`now()`, deletedBy: actor.userId })
      .where(eq(chatMessages.id, messageId));
    const room = msg.kind === "community" ? "chat:community" : `dm:${msg.threadId}`;
    this.broadcast?.(room, "chat:messageDeleted", { threadId: msg.threadId, messageId });
    return { ok: true };
  }

  async getOrCreateDmThread(actor: AuthenticatedActor, peerUserId: string) {
    await this.trust.assertCanDirectContact(actor.userId, peerUserId);
    const peer = await this.db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        onboardingCompleted: users.onboardingCompleted,
        suspendedAt: users.suspendedAt,
      })
      .from(users)
      .where(eq(users.id, peerUserId))
      .limit(1);
    const p = peer[0];
    if (!p?.onboardingCompleted || p.suspendedAt || !p.nickname) {
      throw new AuthError("לא ניתן לפתוח שיחה עם משתמש זה", 403);
    }
    const [low, high] = dmPair(actor.userId, peerUserId);
    const existing = await this.db
      .select()
      .from(chatThreads)
      .where(and(eq(chatThreads.kind, "dm"), eq(chatThreads.userLowId, low), eq(chatThreads.userHighId, high)))
      .limit(1);
    if (existing[0]) {
      return { threadId: existing[0].id, peer: { id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl } };
    }
    const [created] = await this.db
      .insert(chatThreads)
      .values({ kind: "dm", userLowId: low, userHighId: high })
      .returning();
    return { threadId: created!.id, peer: { id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl } };
  }

  async assertDmParticipant(actorId: string, threadId: string) {
    const rows = await this.db.select().from(chatThreads).where(eq(chatThreads.id, threadId)).limit(1);
    const t = rows[0];
    if (!t || t.kind !== "dm") throw new AuthError("שיחה לא נמצאה", 404);
    if (t.userLowId !== actorId && t.userHighId !== actorId) {
      throw new AuthError("אין הרשאה", 403);
    }
    const peerId = t.userLowId === actorId ? t.userHighId! : t.userLowId!;
    if (await this.trust.isEitherBlocked(actorId, peerId)) {
      throw new AuthError("לא ניתן ליצור קשר — קיימת חסימה בין המשתמשים", 403);
    }
    return { thread: t, peerId };
  }

  async listDmThreads(actor: AuthenticatedActor): Promise<DmThreadSummary[]> {
    const threads = await this.db
      .select()
      .from(chatThreads)
      .where(
        and(
          eq(chatThreads.kind, "dm"),
          sql`(${chatThreads.userLowId} = ${actor.userId} OR ${chatThreads.userHighId} = ${actor.userId})`,
        ),
      )
      .orderBy(desc(chatThreads.updatedAt));

    const out: DmThreadSummary[] = [];
    for (const t of threads) {
      const peerId = t.userLowId === actor.userId ? t.userHighId! : t.userLowId!;
      const peerRows = await this.db
        .select({ id: users.id, nickname: users.nickname, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, peerId))
        .limit(1);
      const peer = peerRows[0];
      if (!peer?.nickname) continue;

      const readRows = await this.db
        .select({ lastReadSeq: chatThreadReads.lastReadSeq })
        .from(chatThreadReads)
        .where(and(eq(chatThreadReads.threadId, t.id), eq(chatThreadReads.userId, actor.userId)))
        .limit(1);
      const lastRead = readRows[0]?.lastReadSeq ?? 0;
      const unreadRows = await this.db
        .select({ c: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.threadId, t.id),
            gt(chatMessages.threadSeq, lastRead),
            sql`${chatMessages.senderId} <> ${actor.userId}`,
            sql`${chatMessages.deletedAt} is null`,
          ),
        );
      const lastMsg = await this.db
        .select({ body: chatMessages.body, deletedAt: chatMessages.deletedAt })
        .from(chatMessages)
        .where(eq(chatMessages.threadId, t.id))
        .orderBy(desc(chatMessages.threadSeq))
        .limit(1);

      out.push({
        id: t.id,
        peer: { id: peer.id, nickname: peer.nickname, avatarUrl: peer.avatarUrl },
        unreadCount: unreadRows[0]?.c ?? 0,
        lastMessagePreview: lastMsg[0] && !lastMsg[0].deletedAt ? lastMsg[0].body.slice(0, 120) : null,
        updatedAt: t.updatedAt.toISOString(),
      });
    }
    return out;
  }

  async listDmMessages(actor: AuthenticatedActor, threadId: string, beforeSeq?: number, limit = 50) {
    await this.assertDmParticipant(actor.userId, threadId);
    return this.listMessages(threadId, beforeSeq, limit);
  }

  async postDmMessage(actor: AuthenticatedActor, threadId: string, body: unknown, clientCommandId: string) {
    const { peerId } = await this.assertDmParticipant(actor.userId, threadId);
    const message = await this.postMessage(actor, threadId, body, clientCommandId, "dm");
    this.broadcast?.(`dm:${threadId}`, "chat:message", message);
    await this.notifications.create({
      recipientId: peerId,
      type: "dm.message",
      payload: {
        threadId,
        messageId: message.id,
        fromUserId: actor.userId,
        fromNickname: message.sender.nickname,
        preview: message.body.slice(0, 80),
      },
    });
    const peerUnread = await this.totalDmUnread(peerId);
    this.broadcast?.(`user:${peerId}`, "dm:unread", { total: peerUnread });
    return message;
  }

  async markDmRead(actor: AuthenticatedActor, threadId: string, lastReadSeq: number) {
    await this.assertDmParticipant(actor.userId, threadId);
    await this.markRead(actor, threadId, lastReadSeq);
    const total = await this.totalDmUnread(actor.userId);
    this.broadcast?.(`user:${actor.userId}`, "dm:unread", { total });
    return { ok: true, total };
  }

  /** Sum of unread DM messages across all threads for this user (DB-backed). */
  async totalDmUnread(userId: string): Promise<number> {
    const threads = await this.listDmThreads({
      userId,
      clerkUserId: "",
      role: "member",
      suspended: false,
    });
    return threads.reduce((sum, t) => sum + t.unreadCount, 0);
  }

  /** Build OPEN-011 bounded snapshot around a message. */
  async buildReportContextSnapshot(messageId: string) {
    const rows = await this.db
      .select({
        id: chatMessages.id,
        threadId: chatMessages.threadId,
        threadSeq: chatMessages.threadSeq,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
        senderId: chatMessages.senderId,
        deletedAt: chatMessages.deletedAt,
        kind: chatThreads.kind,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
      })
      .from(chatMessages)
      .innerJoin(chatThreads, eq(chatThreads.id, chatMessages.threadId))
      .innerJoin(users, eq(users.id, chatMessages.senderId))
      .where(eq(chatMessages.id, messageId))
      .limit(1);
    const target = rows[0];
    if (!target) throw new AuthError("הודעה לא נמצאה", 404);

    const neighbors = await this.db
      .select({
        id: chatMessages.id,
        threadSeq: chatMessages.threadSeq,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
        senderId: chatMessages.senderId,
        deletedAt: chatMessages.deletedAt,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
      })
      .from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.senderId))
      .where(
        and(
          eq(chatMessages.threadId, target.threadId),
          sql`${chatMessages.threadSeq} BETWEEN ${target.threadSeq - DM_REPORT_CONTEXT_RADIUS} AND ${target.threadSeq + DM_REPORT_CONTEXT_RADIUS}`,
        ),
      )
      .orderBy(asc(chatMessages.threadSeq));

    return {
      targetType: target.kind === "community" ? ("public_message" as const) : ("dm_message" as const),
      threadId: target.threadId,
      reportedMessageId: target.id,
      messages: neighbors.map((m) => ({
        id: m.id,
        threadSeq: m.threadSeq,
        body: m.deletedAt ? "[הודעה הוסרה]" : m.body,
        createdAt: m.createdAt.toISOString(),
        isReported: m.id === target.id,
        sender: {
          id: m.senderId,
          nickname: m.nickname ?? "?",
          avatarUrl: m.avatarUrl,
        },
      })),
    };
  }

  private async listMessages(threadId: string, beforeSeq?: number, limit = 50): Promise<ChatMessagesPage> {
    const lim = Math.min(Math.max(limit, 1), 100);
    const rows = beforeSeq
      ? await this.db
          .select({
            id: chatMessages.id,
            threadId: chatMessages.threadId,
            threadSeq: chatMessages.threadSeq,
            body: chatMessages.body,
            createdAt: chatMessages.createdAt,
            deletedAt: chatMessages.deletedAt,
            senderId: chatMessages.senderId,
            nickname: users.nickname,
            avatarUrl: users.avatarUrl,
          })
          .from(chatMessages)
          .innerJoin(users, eq(users.id, chatMessages.senderId))
          .where(and(eq(chatMessages.threadId, threadId), lt(chatMessages.threadSeq, beforeSeq)))
          .orderBy(desc(chatMessages.threadSeq))
          .limit(lim)
      : await this.db
          .select({
            id: chatMessages.id,
            threadId: chatMessages.threadId,
            threadSeq: chatMessages.threadSeq,
            body: chatMessages.body,
            createdAt: chatMessages.createdAt,
            deletedAt: chatMessages.deletedAt,
            senderId: chatMessages.senderId,
            nickname: users.nickname,
            avatarUrl: users.avatarUrl,
          })
          .from(chatMessages)
          .innerJoin(users, eq(users.id, chatMessages.senderId))
          .where(eq(chatMessages.threadId, threadId))
          .orderBy(desc(chatMessages.threadSeq))
          .limit(lim);

    const items: ChatMessageDto[] = rows.map((r) => ({
      id: r.id,
      threadId: r.threadId,
      threadSeq: r.threadSeq,
      body: r.deletedAt ? "" : r.body,
      createdAt: r.createdAt.toISOString(),
      deletedAt: r.deletedAt?.toISOString() ?? null,
      sender: {
        id: r.senderId,
        nickname: r.nickname ?? "?",
        avatarUrl: r.avatarUrl,
      },
    }));

    return {
      items,
      nextBeforeSeq: rows.length === lim ? rows[rows.length - 1]!.threadSeq : null,
    };
  }

  private async postMessage(
    actor: AuthenticatedActor,
    threadId: string,
    rawBody: unknown,
    clientCommandId: string,
    _kind: "community" | "dm",
  ): Promise<ChatMessageDto> {
    const parsed = validateChatBody(rawBody);
    if (!parsed.ok) throw new AuthError(parsed.message, 400);
    if (!clientCommandId || clientCommandId.length > 80) {
      throw new AuthError("מזהה פקודה אינו תקין", 400);
    }

    const existing = await this.db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(and(eq(chatMessages.senderId, actor.userId), eq(chatMessages.clientCommandId, clientCommandId)))
      .limit(1);
    if (existing[0]) {
      const full = await this.db
        .select({
          id: chatMessages.id,
          threadId: chatMessages.threadId,
          threadSeq: chatMessages.threadSeq,
          body: chatMessages.body,
          createdAt: chatMessages.createdAt,
          deletedAt: chatMessages.deletedAt,
          senderId: chatMessages.senderId,
          nickname: users.nickname,
          avatarUrl: users.avatarUrl,
        })
        .from(chatMessages)
        .innerJoin(users, eq(users.id, chatMessages.senderId))
        .where(eq(chatMessages.id, existing[0].id))
        .limit(1);
      const r = full[0]!;
      return {
        id: r.id,
        threadId: r.threadId,
        threadSeq: r.threadSeq,
        body: r.deletedAt ? "" : r.body,
        createdAt: r.createdAt.toISOString(),
        deletedAt: r.deletedAt?.toISOString() ?? null,
        sender: { id: r.senderId, nickname: r.nickname ?? "?", avatarUrl: r.avatarUrl },
      };
    }

    const message = await this.db.transaction(async (tx) => {
      const [thread] = await tx
        .update(chatThreads)
        .set({ nextSeq: sql`${chatThreads.nextSeq} + 1`, updatedAt: sql`now()` })
        .where(eq(chatThreads.id, threadId))
        .returning({ nextSeq: chatThreads.nextSeq });
      if (!thread) throw new AuthError("שיחה לא נמצאה", 404);
      const seq = thread.nextSeq - 1;
      const [row] = await tx
        .insert(chatMessages)
        .values({
          threadId,
          senderId: actor.userId,
          threadSeq: seq,
          body: parsed.body,
          clientCommandId,
        })
        .returning();
      return row!;
    });

    const me = await this.db
      .select({ nickname: users.nickname, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, actor.userId))
      .limit(1);

    return {
      id: message.id,
      threadId: message.threadId,
      threadSeq: message.threadSeq,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      deletedAt: null,
      sender: {
        id: actor.userId,
        nickname: me[0]?.nickname ?? "?",
        avatarUrl: me[0]?.avatarUrl ?? null,
      },
    };
  }

  private async markRead(actor: AuthenticatedActor, threadId: string, lastReadSeq: number) {
    if (!Number.isFinite(lastReadSeq) || lastReadSeq < 0) {
      throw new AuthError("סימון קריאה אינו תקין", 400);
    }
    await this.db
      .insert(chatThreadReads)
      .values({
        threadId,
        userId: actor.userId,
        lastReadSeq,
      })
      .onConflictDoUpdate({
        target: [chatThreadReads.threadId, chatThreadReads.userId],
        set: {
          lastReadSeq: sql`GREATEST(${chatThreadReads.lastReadSeq}, ${lastReadSeq})`,
          updatedAt: sql`now()`,
        },
      });
    return { ok: true };
  }
}
