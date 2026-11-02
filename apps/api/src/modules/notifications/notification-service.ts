import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { isToastNotificationType, type NotificationDto } from "@go-darom/shared";
import type { Db } from "../../infra/db/client.js";
import { notifications } from "../../infra/db/schema.js";
import type { AuthenticatedActor } from "../identity/types.js";

export type NotificationEmitter = (recipientId: string, notification: NotificationDto, toast: boolean) => void;
export type NotificationDismissEmitter = (recipientId: string, ids: string[]) => void;

export class NotificationService {
  private emit: NotificationEmitter | null = null;
  private dismissEmit: NotificationDismissEmitter | null = null;

  constructor(private readonly db: Db["db"]) {}

  setEmitter(emit: NotificationEmitter) {
    this.emit = emit;
  }

  setDismissEmitter(emit: NotificationDismissEmitter) {
    this.dismissEmit = emit;
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
    const scope = and(
      eq(notifications.recipientId, actor.userId),
      isNull(notifications.dismissedAt),
    );
    const rows = cursor
      ? await this.db
          .select()
          .from(notifications)
          .where(and(scope, lt(notifications.createdAt, new Date(cursor))))
          .orderBy(desc(notifications.createdAt))
          .limit(lim)
      : await this.db
          .select()
          .from(notifications)
          .where(scope)
          .orderBy(desc(notifications.createdAt))
          .limit(lim);
    return {
      items: rows.map((r) => this.toDto(r)),
      nextCursor: rows.length === lim ? rows[rows.length - 1]!.createdAt.toISOString() : null,
    };
  }

  /** Bell badge: unread system notifications only (excludes dm.message and dismissed). */
  async countSystemUnread(userId: string): Promise<number> {
    const rows = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt),
          isNull(notifications.dismissedAt),
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
        .where(
          and(
            eq(notifications.recipientId, actor.userId),
            isNull(notifications.readAt),
            isNull(notifications.dismissedAt),
          ),
        );
      return { ok: true };
    }
    const ids = body.ids ?? [];
    if (ids.length === 0) return { ok: true };
    await this.db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(
        and(
          eq(notifications.recipientId, actor.userId),
          inArray(notifications.id, ids),
          isNull(notifications.dismissedAt),
        ),
      );
    return { ok: true };
  }

  /**
   * Hide notifications for the current recipient only.
   * Does not cancel game invites or delete rows for other users.
   */
  async dismiss(actor: AuthenticatedActor, body: { ids?: string[] }) {
    const ids = (body.ids ?? []).filter(Boolean);
    if (ids.length === 0) return { ok: true, ids: [] as string[] };
    const updated = await this.db
      .update(notifications)
      .set({
        dismissedAt: sql`now()`,
        readAt: sql`coalesce(${notifications.readAt}, now())`,
      })
      .where(
        and(
          eq(notifications.recipientId, actor.userId),
          inArray(notifications.id, ids),
          isNull(notifications.dismissedAt),
        ),
      )
      .returning({ id: notifications.id });
    const dismissedIds = updated.map((r) => r.id);
    if (dismissedIds.length > 0) {
      this.dismissEmit?.(actor.userId, dismissedIds);
    }
    return { ok: true, ids: dismissedIds };
  }

  private toDto(row: typeof notifications.$inferSelect): NotificationDto {
    return {
      id: row.id,
      type: row.type,
      payload: row.payload,
      readAt: row.readAt?.toISOString() ?? null,
      dismissedAt: row.dismissedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
