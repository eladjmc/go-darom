import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { isToastNotificationType, type NotificationDto } from "@go-darom/shared";
import type { Db } from "../../infra/db/client.js";
import { notifications } from "../../infra/db/schema.js";
import type { AuthenticatedActor } from "../identity/types.js";

export type NotificationEmitter = (recipientId: string, notification: NotificationDto, toast: boolean) => void;

export class NotificationService {
  private emit: NotificationEmitter | null = null;

  constructor(private readonly db: Db["db"]) {}

  setEmitter(emit: NotificationEmitter) {
    this.emit = emit;
  }

  async create(input: {
    recipientId: string;
    type: string;
    payload: Record<string, unknown>;
  }): Promise<NotificationDto> {
    const [row] = await this.db
      .insert(notifications)
      .values({
        recipientId: input.recipientId,
        type: input.type,
        payload: input.payload,
      })
      .returning();
    const dto = this.toDto(row);
    this.emit?.(input.recipientId, dto, isToastNotificationType(input.type));
    return dto;
  }

  async list(actor: AuthenticatedActor, cursor?: string, limit = 30) {
    const lim = Math.min(Math.max(limit, 1), 50);
    const rows = cursor
      ? await this.db
          .select()
          .from(notifications)
          .where(and(eq(notifications.recipientId, actor.userId), lt(notifications.createdAt, new Date(cursor))))
          .orderBy(desc(notifications.createdAt))
          .limit(lim)
      : await this.db
          .select()
          .from(notifications)
          .where(eq(notifications.recipientId, actor.userId))
          .orderBy(desc(notifications.createdAt))
          .limit(lim);
    return {
      items: rows.map((r) => this.toDto(r)),
      nextCursor: rows.length === lim ? rows[rows.length - 1]!.createdAt.toISOString() : null,
    };
  }

  /** Bell badge: unread system notifications only (excludes dm.message). */
  async countSystemUnread(userId: string): Promise<number> {
    const rows = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt),
          sql`${notifications.type} <> 'dm.message'`,
        ),
      );
    return rows[0]?.c ?? 0;
  }

  async markRead(actor: AuthenticatedActor, body: { ids?: string[]; all?: boolean }) {
    if (body.all) {
      await this.db
        .update(notifications)
        .set({ readAt: sql`now()` })
        .where(and(eq(notifications.recipientId, actor.userId), isNull(notifications.readAt)));
      return { ok: true };
    }
    const ids = body.ids ?? [];
    if (ids.length === 0) return { ok: true };
    await this.db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(and(eq(notifications.recipientId, actor.userId), inArray(notifications.id, ids)));
    return { ok: true };
  }

  private toDto(row: typeof notifications.$inferSelect): NotificationDto {
    return {
      id: row.id,
      type: row.type,
      payload: row.payload,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
