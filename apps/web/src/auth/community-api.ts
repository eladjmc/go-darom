import type {
  ChatMessageDto,
  ChatMessagesPage,
  DmThreadSummary,
  NotificationDto,
  BlockListItem,
} from "@go-darom/shared";
import { ApiError } from "./api";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `שגיאה ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export function fetchMembers(token: string, q?: string, onlineOnly?: boolean) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (onlineOnly) params.set("online", "1");
  const qs = params.toString() ? `?${params}` : "";
  return request<{ items: Array<{ id: string; nickname: string; avatarUrl: string | null; online: boolean }> }>(
    `/members${qs}`,
    { token },
  );
}

export function fetchCommunityMessages(token: string, beforeSeq?: number) {
  const qs = beforeSeq != null ? `?beforeSeq=${beforeSeq}` : "";
  return request<ChatMessagesPage>(`/chat/community/messages${qs}`, { token });
}

export function postCommunityMessage(token: string, body: string, clientCommandId: string) {
  return request<{ message: ChatMessageDto }>("/chat/community/messages", {
    method: "POST",
    token,
    body: JSON.stringify({ body, clientCommandId }),
  });
}

export function markCommunityRead(token: string, lastReadSeq: number) {
  return request("/chat/community/read", {
    method: "POST",
    token,
    body: JSON.stringify({ lastReadSeq }),
  });
}

export function fetchDmThreads(token: string) {
  return request<{ items: DmThreadSummary[] }>("/dms/threads", { token });
}

export function openDmThread(token: string, peerUserId: string) {
  return request<{ threadId: string; peer: { id: string; nickname: string; avatarUrl: string | null } }>(
    "/dms/threads",
    { method: "POST", token, body: JSON.stringify({ peerUserId }) },
  );
}

export function fetchDmMessages(token: string, threadId: string, beforeSeq?: number) {
  const qs = beforeSeq != null ? `?beforeSeq=${beforeSeq}` : "";
  return request<ChatMessagesPage>(`/dms/threads/${threadId}/messages${qs}`, { token });
}

export function postDmMessage(token: string, threadId: string, body: string, clientCommandId: string) {
  return request<{ message: ChatMessageDto }>(`/dms/threads/${threadId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ body, clientCommandId }),
  });
}

export function markDmRead(token: string, threadId: string, lastReadSeq: number) {
  return request<{ ok: true; total: number }>(`/dms/threads/${threadId}/read`, {
    method: "POST",
    token,
    body: JSON.stringify({ lastReadSeq }),
  });
}

export function fetchDmUnreadTotal(token: string) {
  return request<{ total: number }>("/dms/unread-total", { token });
}

export function fetchBlocks(token: string) {
  return request<{ items: BlockListItem[] }>("/me/blocks", { token });
}

export function blockUser(token: string, userId: string) {
  return request<{ items: BlockListItem[] }>("/me/blocks", {
    method: "POST",
    token,
    body: JSON.stringify({ userId }),
  });
}

export function unblockUser(token: string, userId: string) {
  return request<{ items: BlockListItem[] }>(`/me/blocks/${userId}`, { method: "DELETE", token });
}

export function createReport(
  token: string,
  body: { targetType: "public_message" | "dm_message"; messageId: string; reason: string },
) {
  return request<{ id: string }>("/reports", { method: "POST", token, body: JSON.stringify(body) });
}

export function fetchNotifications(token: string) {
  return request<{ items: NotificationDto[]; nextCursor: string | null }>("/notifications", { token });
}

export function fetchNotificationUnreadCount(token: string) {
  return request<{ total: number }>("/notifications/unread-count", { token });
}

export function markNotificationsRead(token: string, body: { ids?: string[]; all?: boolean }) {
  return request("/notifications/read", { method: "POST", token, body: JSON.stringify(body) });
}

export function dismissNotifications(token: string, body: { ids: string[] }) {
  return request<{ ok: boolean; ids: string[] }>("/notifications/dismiss", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function fetchAdminOverview(token: string) {
  return request<import("@go-darom/shared").AdminOverviewCounts>("/admin/overview", { token });
}

export function fetchAdminMembers(
  token: string,
  opts: { q?: string; status?: "all" | "active" | "suspended" } = {},
) {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.status && opts.status !== "all") params.set("status", opts.status);
  const qs = params.toString() ? `?${params}` : "";
  return request<{ items: import("@go-darom/shared").AdminMemberRow[] }>(`/admin/members${qs}`, {
    token,
  });
}

export function fetchAdminReports(token: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<{ items: import("@go-darom/shared").ModerationReportSummary[] }>(
    `/admin/reports${qs}`,
    { token },
  );
}

export function fetchAdminReport(token: string, id: string) {
  return request<import("@go-darom/shared").AdminReportDetail>(`/admin/reports/${id}`, { token });
}

export function fetchAdminAudit(token: string, limit = 50) {
  return request<{ items: import("@go-darom/shared").AdminAuditRow[] }>(
    `/admin/audit?limit=${limit}`,
    { token },
  );
}

export function resolveAdminReport(token: string, id: string, resolution: "resolved" | "dismissed", note?: string) {
  return request(`/admin/reports/${id}/resolve`, {
    method: "POST",
    token,
    body: JSON.stringify({ resolution, note }),
  });
}

export function adminDeleteChatMessage(token: string, id: string) {
  return request(`/admin/chat/messages/${id}`, { method: "DELETE", token });
}

export function adminSuspendUser(token: string, userId: string, reason: string) {
  return request(`/admin/users/${userId}/suspend`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

export function adminUnsuspendUser(token: string, userId: string, reason: string) {
  return request(`/admin/users/${userId}/unsuspend`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}
