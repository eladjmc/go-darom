import { and, desc, eq, sql } from "drizzle-orm";
import type { ReportStatus, ReportTargetType } from "@go-darom/shared";
import type { Db } from "../../infra/db/client.js";
import {
  moderationAuditLog,
  moderationReports,
  users,
} from "../../infra/db/schema.js";
import type { ChatService } from "../chat/chat-service.js";
import { AuthError } from "../identity/token-verifier.js";
import type { AuthenticatedActor } from "../identity/types.js";
import type { IdentityService } from "../identity/identity-service.js";

export class ModerationService {
  constructor(
    private readonly db: Db["db"],
    private readonly chat: ChatService,
    private readonly identity: IdentityService,
  ) {}

  async createReport(
    actor: AuthenticatedActor,
    input: { targetType: ReportTargetType; messageId: string; reason: string },
  ) {
    const reason = input.reason?.trim();
    if (!reason || reason.length < 3 || reason.length > 500) {
      throw new AuthError("נא לכתוב סיבה קצרה לדיווח", 400);
    }
    const snapshot = await this.chat.buildReportContextSnapshot(input.messageId);
    if (snapshot.targetType !== input.targetType) {
      throw new AuthError("סוג הדיווח אינו תואם להודעה", 400);
    }
    const [row] = await this.db
      .insert(moderationReports)
      .values({
        targetType: input.targetType,
        messageId: input.messageId,
        threadId: snapshot.threadId,
        reporterId: actor.userId,
        reason,
        contextSnapshot: snapshot,
      })
      .returning();
    return { id: row!.id, status: row!.status };
  }

  async listReports(actor: AuthenticatedActor, status?: ReportStatus) {
    this.identity.requireAdmin(actor);
    const rows = status
      ? await this.db
          .select({
            id: moderationReports.id,
            targetType: moderationReports.targetType,
            status: moderationReports.status,
            reason: moderationReports.reason,
            createdAt: moderationReports.createdAt,
            reporterNickname: users.nickname,
          })
          .from(moderationReports)
          .innerJoin(users, eq(users.id, moderationReports.reporterId))
          .where(eq(moderationReports.status, status))
          .orderBy(desc(moderationReports.createdAt))
          .limit(100)
      : await this.db
          .select({
            id: moderationReports.id,
            targetType: moderationReports.targetType,
            status: moderationReports.status,
            reason: moderationReports.reason,
            createdAt: moderationReports.createdAt,
            reporterNickname: users.nickname,
          })
          .from(moderationReports)
          .innerJoin(users, eq(users.id, moderationReports.reporterId))
          .orderBy(desc(moderationReports.createdAt))
          .limit(100);
    return {
      items: rows.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        reporterNickname: r.reporterNickname,
      })),
    };
  }

  async getReport(actor: AuthenticatedActor, reportId: string) {
    this.identity.requireAdmin(actor);
    const rows = await this.db.select().from(moderationReports).where(eq(moderationReports.id, reportId)).limit(1);
    const report = rows[0];
    if (!report) throw new AuthError("דיווח לא נמצא", 404);

    if (report.targetType === "dm_message") {
      await this.db.insert(moderationAuditLog).values({
        actorId: actor.userId,
        action: "dm_report_context_read",
        entityType: "moderation_report",
        entityId: report.id,
        detail: { targetType: report.targetType },
      });
    }

    return {
      id: report.id,
      targetType: report.targetType,
      status: report.status,
      reason: report.reason,
      createdAt: report.createdAt.toISOString(),
      contextSnapshot: report.contextSnapshot,
      resolutionNote: report.resolutionNote,
    };
  }

  async resolveReport(
    actor: AuthenticatedActor,
    reportId: string,
    body: { resolution: "resolved" | "dismissed"; note?: string },
  ) {
    this.identity.requireAdmin(actor);
    if (body.resolution !== "resolved" && body.resolution !== "dismissed") {
      throw new AuthError("סטטוס פתרון אינו תקין", 400);
    }
    const [row] = await this.db
      .update(moderationReports)
      .set({
        status: body.resolution,
        resolutionNote: body.note?.trim() || null,
        resolvedBy: actor.userId,
        resolvedAt: sql`now()`,
      })
      .where(and(eq(moderationReports.id, reportId), eq(moderationReports.status, "open")))
      .returning();
    if (!row) throw new AuthError("דיווח לא נמצא או שכבר טופל", 404);
    await this.db.insert(moderationAuditLog).values({
      actorId: actor.userId,
      action: `report_${body.resolution}`,
      entityType: "moderation_report",
      entityId: reportId,
      detail: { note: body.note ?? null },
    });
    return { ok: true };
  }

  async suspendUser(actor: AuthenticatedActor, userId: string, reason: string) {
    this.identity.requireAdmin(actor);
    if (!reason?.trim()) throw new AuthError("נדרשת סיבה", 400);
    const [row] = await this.db
      .update(users)
      .set({ suspendedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!row) throw new AuthError("משתמש לא נמצא", 404);
    await this.db.insert(moderationAuditLog).values({
      actorId: actor.userId,
      action: "user_suspend",
      entityType: "user",
      entityId: userId,
      detail: { reason: reason.trim() },
    });
    return { ok: true };
  }

  async unsuspendUser(actor: AuthenticatedActor, userId: string, reason: string) {
    this.identity.requireAdmin(actor);
    if (!reason?.trim()) throw new AuthError("נדרשת סיבה", 400);
    const [row] = await this.db
      .update(users)
      .set({ suspendedAt: null, updatedAt: sql`now()` })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!row) throw new AuthError("משתמש לא נמצא", 404);
    await this.db.insert(moderationAuditLog).values({
      actorId: actor.userId,
      action: "user_unsuspend",
      entityType: "user",
      entityId: userId,
      detail: { reason: reason.trim() },
    });
    return { ok: true };
  }
}
