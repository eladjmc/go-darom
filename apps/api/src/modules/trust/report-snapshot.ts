import type { AdminPersonRef, AdminReportEvidenceMessage } from "@go-darom/shared";

/** Extract reported sender + evidence messages from a frozen report context snapshot. */
export function parseReportSnapshot(snapshot: unknown): {
  reported: AdminPersonRef | null;
  reportedMessageId: string | null;
  messages: AdminReportEvidenceMessage[];
} {
  if (!snapshot || typeof snapshot !== "object") {
    return { reported: null, reportedMessageId: null, messages: [] };
  }
  const raw = snapshot as {
    reportedMessageId?: unknown;
    messages?: unknown;
  };
  const reportedMessageId = typeof raw.reportedMessageId === "string" ? raw.reportedMessageId : null;
  const messages: AdminReportEvidenceMessage[] = [];
  if (Array.isArray(raw.messages)) {
    for (const item of raw.messages) {
      if (!item || typeof item !== "object") continue;
      const m = item as Record<string, unknown>;
      const senderRaw = m.sender;
      if (!senderRaw || typeof senderRaw !== "object") continue;
      const s = senderRaw as Record<string, unknown>;
      if (typeof m.id !== "string" || typeof s.id !== "string") continue;
      messages.push({
        id: m.id,
        threadSeq: typeof m.threadSeq === "number" ? m.threadSeq : 0,
        body: typeof m.body === "string" ? m.body : "",
        createdAt: typeof m.createdAt === "string" ? m.createdAt : "",
        isReported: Boolean(m.isReported),
        sender: {
          id: s.id,
          nickname: typeof s.nickname === "string" ? s.nickname : "?",
          avatarUrl: typeof s.avatarUrl === "string" ? s.avatarUrl : null,
        },
      });
    }
  }
  const reportedMsg = messages.find((m) => m.isReported) ?? messages[0];
  return {
    reported: reportedMsg?.sender ?? null,
    reportedMessageId: reportedMessageId ?? reportedMsg?.id ?? null,
    messages,
  };
}
