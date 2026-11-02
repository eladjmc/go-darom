import { describe, expect, it, vi } from "vitest";
import { DM_REPORT_CONTEXT_RADIUS } from "@go-darom/shared";
import { AuthError } from "../identity/token-verifier.js";
import { ModerationService } from "./moderation-service.js";

describe("moderation authorization + OPEN-011 bounds", () => {
  it("keeps DM report context radius at ±5", () => {
    expect(DM_REPORT_CONTEXT_RADIUS).toBe(5);
  });

  it("rejects non-admin list/get/resolve/suspend", async () => {
    const identity = {
      requireAdmin: vi.fn(() => {
        throw new AuthError("אין הרשאה", 403);
      }),
    };
    const service = new ModerationService({} as never, {} as never, identity as never);
    const member = {
      userId: "u-member",
      clerkUserId: "c",
      role: "member" as const,
      suspended: false,
    };
    await expect(service.listReports(member)).rejects.toThrow(/הרשאה/);
    await expect(service.getReport(member, "r1")).rejects.toThrow(/הרשאה/);
    await expect(service.resolveReport(member, "r1", { resolution: "resolved" })).rejects.toThrow(
      /הרשאה/,
    );
    await expect(service.suspendUser(member, "u2", "reason")).rejects.toThrow(/הרשאה/);
    expect(identity.requireAdmin).toHaveBeenCalled();
  });

  it("records audit when an admin opens a DM report", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  report: {
                    id: "report-1",
                    targetType: "dm_message",
                    status: "open",
                    reason: "בדיקה",
                    createdAt: new Date("2026-10-30T00:00:00Z"),
                    contextSnapshot: {
                      reportedMessageId: "m1",
                      messages: [
                        {
                          id: "m1",
                          threadSeq: 1,
                          body: "היי",
                          createdAt: "2026-10-30T00:00:00.000Z",
                          isReported: true,
                          sender: { id: "u2", nickname: "ב", avatarUrl: null },
                        },
                      ],
                    },
                    resolutionNote: null,
                  },
                  reporterId: "u1",
                  reporterNickname: "א",
                  reporterAvatarUrl: null,
                },
              ]),
            }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({ values }),
    };
    const identity = { requireAdmin: vi.fn() };
    const service = new ModerationService(db as never, {} as never, identity as never);
    const admin = {
      userId: "u-admin",
      clerkUserId: "c-admin",
      role: "admin" as const,
      suspended: false,
    };
    const detail = await service.getReport(admin, "report-1");
    expect(detail.id).toBe("report-1");
    expect(detail.reporter.nickname).toBe("א");
    expect(detail.reported?.nickname).toBe("ב");
    expect(detail.messages).toHaveLength(1);
    expect(identity.requireAdmin).toHaveBeenCalledWith(admin);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "u-admin",
        action: "dm_report_context_read",
        entityType: "moderation_report",
        entityId: "report-1",
      }),
    );
  });
});
