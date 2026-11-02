export type ChatThreadKind = "community" | "dm";

export interface ChatSender {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface ChatMessageDto {
  id: string;
  threadId: string;
  threadSeq: number;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  sender: ChatSender;
}

export interface ChatMessagesPage {
  items: ChatMessageDto[];
  nextBeforeSeq: number | null;
}

export interface DmThreadSummary {
  id: string;
  peer: ChatSender;
  unreadCount: number;
  lastMessagePreview: string | null;
  updatedAt: string;
}

export interface NotificationDto {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  /** Present only if the recipient dismissed/hid this row; list APIs omit dismissed rows. */
  dismissedAt?: string | null;
  createdAt: string;
}

export interface BlockListItem {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export type ReportTargetType = "public_message" | "dm_message";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface AdminPersonRef {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface ModerationReportSummary {
  id: string;
  targetType: ReportTargetType;
  status: ReportStatus;
  reason: string;
  createdAt: string;
  /** @deprecated prefer reporter.nickname */
  reporterNickname: string | null;
  reporter: AdminPersonRef;
  reported: AdminPersonRef | null;
}

export interface AdminReportEvidenceMessage {
  id: string;
  threadSeq: number;
  body: string;
  createdAt: string;
  isReported: boolean;
  sender: AdminPersonRef;
}

export interface AdminReportDetail {
  id: string;
  targetType: ReportTargetType;
  status: ReportStatus;
  reason: string;
  createdAt: string;
  resolutionNote: string | null;
  reporter: AdminPersonRef;
  reported: AdminPersonRef | null;
  reportedMessageId: string | null;
  messages: AdminReportEvidenceMessage[];
}

export interface AdminOverviewCounts {
  openReports: number;
  suspendedMembers: number;
  registeredMembers: number;
}

export interface AdminMemberRow {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  role: "member" | "admin";
  status: "active" | "suspended";
  onboardingCompleted: boolean;
}

export interface AdminAuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actorNickname: string | null;
}

export const CHAT_BODY_MAX = 2000;
export const DM_REPORT_CONTEXT_RADIUS = 5;
export const PRESENCE_OFFLINE_DEBOUNCE_MS = 10_000;

export function validateChatBody(raw: unknown): { ok: true; body: string } | { ok: false; message: string } {
  if (typeof raw !== "string") {
    return { ok: false, message: "תוכן ההודעה אינו תקין" };
  }
  const body = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (!body) {
    return { ok: false, message: "לא ניתן לשלוח הודעה ריקה" };
  }
  if (body.length > CHAT_BODY_MAX) {
    return { ok: false, message: `ההודעה ארוכה מדי (עד ${CHAT_BODY_MAX} תווים)` };
  }
  return { ok: true, body };
}

export function isToastNotificationType(type: string): boolean {
  return (
    type === "dm.message" ||
    type === "game.invite" ||
    type === "game.invite_accepted" ||
    type === "game.invite_rejected" ||
    type === "game.invite_cancelled" ||
    type === "game.live_turn" ||
    type === "game.turn" ||
    type === "study.invite"
  );
}
