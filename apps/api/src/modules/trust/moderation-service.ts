import { and, asc, desc, eq, ilike, isNotNull, isNull, sql } from "drizzle-orm";
import type {
  AdminAuditRow,
  AdminMemberRow,
  AdminOverviewCounts,
  AdminReportDetail,
  ModerationReportSummary,
  ReportStatus,
  ReportTargetType,
} from "@go-darom/shared";
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
import { parseReportSnapshot } from "./report-snapshot.js";

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

  async getOverview(actor: AuthenticatedActor): Promise<AdminOverviewCounts> {
    this.identity.requireAdmin(actor);
    const [openReports] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(moderationReports)
      .where(eq(moderationReports.status, "open"));
    const [suspendedMembers] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(isNotNull(users.suspendedAt));
    const [registeredMembers] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.onboardingCompleted} = true`);
    return {
      openReports: openReports?.n ?? 0,
      suspendedMembers: suspendedMembers?.n ?? 0,
      registeredMembers: registeredMembers?.n ?? 0,
    };
  }

  async listAdminMembers(
    actor: AuthenticatedActor,
    opts: { q?: string; status?: "all" | "active" | "suspended" } = {},
  ): Promise<{ items: AdminMemberRow[] }> {
    this.identity.requireAdmin(actor);
    const q = opts.q?.trim();
    const status = opts.status ?? "all";
    const statusClause =
      status === "active"
        ? isNull(users.suspendedAt)
        : status === "suspended"
          ? isNotNull(users.suspendedAt)
          : sql`true`;
    const rows = await this.db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        role: users.role,
        suspendedAt: users.suspendedAt,
        onboardingCompleted: users.onboardingCompleted,
      })
      .from(users)
      .where(
        and(
          statusClause,
          q ? ilike(users.nickname, `%${q}%`) : sql`true`,
          sql`${users.nickname} is not null`,
        ),
      )
      .orderBy(asc(users.nickname), asc(users.id))
      .limit(100);
    return {
      items: rows
        .filter((r): r is typeof r & { nickname: string } => Boolean(r.nickname))
        .map((r) => ({
          id: r.id,
          nickname: r.nickname,
          avatarUrl: r.avatarUrl,
          role: r.role,
          status: r.suspendedAt ? ("suspended" as const) : ("active" as const),
          onboardingCompleted: r.onboardingCompleted,
        })),
    };
  }

  async listReports(actor: AuthenticatedActor, status?: ReportStatus): Promise<{ items: ModerationReportSummary[] }> {
    this.identity.requireAdmin(actor);
    const baseSelect = {
      id: moderationReports.id,
      targetType: moderationReports.targetType,
      status: moderationReports.status,
      reason: moderationReports.reason,
      createdAt: moderationReports.createdAt,
      contextSnapshot: moderationReports.contextSnapshot,
      reporterId: users.id,
      reporterNickname: users.nickname,
      reporterAvatarUrl: users.avatarUrl,
    };
    const rows = status
      ? await this.db
          .select(baseSelect)
          .from(moderationReports)
          .innerJoin(users, eq(users.id, moderationReports.reporterId))
          .where(eq(moderationReports.status, status))
          .orderBy(desc(moderationReports.createdAt))
          .limit(100)
      : await this.db
          .select(baseSelect)
          .from(moderationReports)
          .innerJoin(users, eq(users.id, moderationReports.reporterId))
          .orderBy(desc(moderationReports.createdAt))
          .limit(100);

    return {
      items: rows.map((r) => {
        const parsed = parseReportSnapshot(r.contextSnapshot);
        const reporter = {
          id: r.reporterId,
          nickname: r.reporterNickname ?? "?",
          avatarUrl: r.reporterAvatarUrl,
        };
        return {
          id: r.id,
          targetType: r.targetType,
          status: r.status,
          reason: r.reason,
          createdAt: r.createdAt.toISOString(),
          reporterNickname: reporter.nickname,
          reporter,
          reported: parsed.reported,
        };
      }),
    };
  }

  async getReport(actor: AuthenticatedActor, reportId: string): Promise<AdminReportDetail> {
    this.identity.requireAdmin(actor);
    const rows = await this.db
      .select({
        report: moderationReports,
        reporterId: users.id,
        reporterNickname: users.nickname,
        reporterAvatarUrl: users.avatarUrl,
      })
      .from(moderationReports)
      .innerJoin(users, eq(users.id, moderationReports.reporterId))
      .where(eq(moderationReports.id, reportId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new AuthError("דיווח לא נמצא", 404);
    const report = row.report;

    if (report.targetType === "dm_message") {
      await this.db.insert(moderationAuditLog).values({
        actorId: actor.userId,
        action: "dm_report_context_read",
        entityType: "moderation_report",
        entityId: report.id,
        detail: { targetType: report.targetType },
      });
    }

    const parsed = parseReportSnapshot(report.contextSnapshot);
    const reporter = {
      id: row.reporterId,
      nickname: row.reporterNickname ?? "?",
      avatarUrl: row.reporterAvatarUrl,
    };
    return {
      id: report.id,
      targetType: report.targetType,
      status: report.status,
      reason: report.reason,
      createdAt: report.createdAt.toISOString(),
      resolutionNote: report.resolutionNote,
      reporter,
      reported: parsed.reported,
      reportedMessageId: parsed.reportedMessageId,
      messages: parsed.messages,
    };
  }

  async listAudit(actor: AuthenticatedActor, limit = 50): Promise<{ items: AdminAuditRow[] }> {
    this.identity.requireAdmin(actor);
    const lim = Math.min(Math.max(limit, 1), 100);
    const rows = await this.db
      .select({
        id: moderationAuditLog.id,
        action: moderationAuditLog.action,
        entityType: moderationAuditLog.entityType,
        entityId: moderationAuditLog.entityId,
        createdAt: moderationAuditLog.createdAt,
        actorNickname: users.nickname,
      })
      .from(moderationAuditLog)
      .leftJoin(users, eq(users.id, moderationAuditLog.actorId))
      .orderBy(desc(moderationAuditLog.createdAt))
      .limit(lim);
    return {
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        createdAt: r.createdAt.toISOString(),
        actorNickname: r.actorNickname,
      })),
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
    if (userId === actor.userId) throw new AuthError("לא ניתן להשעות את עצמכם", 400);
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
