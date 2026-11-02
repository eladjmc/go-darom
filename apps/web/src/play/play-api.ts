import type { GameProjection, LiveInviteDto, LiveInviteSettings } from "@go-darom/shared";
import { ApiError } from "../auth/api";

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

export function fetchActiveGame(token: string) {
  return request<{ gameId: string; game: GameProjection } | null>("/games/active", { token });
}

export function fetchGame(token: string, gameId: string) {
  return request<GameProjection>(`/games/${gameId}`, { token });
}

export function fetchFinishedGames(token: string, opts?: { cursor?: string | null; limit?: number }) {
  const q = new URLSearchParams({ status: "finished" });
  if (opts?.cursor) q.set("cursor", opts.cursor);
  if (opts?.limit) q.set("limit", String(opts.limit));
  return request<{ items: GameProjection[]; nextCursor: string | null }>(`/games/mine?${q}`, {
    token,
  });
}

export function fetchGameReplay(token: string, gameId: string) {
  return request<GameProjection>(`/games/${gameId}/replay`, { token });
}

export function fetchLiveInvites(token: string) {
  return request<{ items: LiveInviteDto[] }>("/invites/live/mine", { token });
}

export function fetchLiveInvite(token: string, inviteId: string) {
  return request<LiveInviteDto>(`/invites/live/${inviteId}`, { token });
}

export function createLiveInvite(token: string, recipientId: string, settings: Partial<LiveInviteSettings>) {
  return request<LiveInviteDto>("/invites/live", {
    method: "POST",
    token,
    body: JSON.stringify({ recipientId, ...settings }),
  });
}

export function acceptLiveInvite(token: string, inviteId: string) {
  return request<{ gameId: string; game: GameProjection }>(`/invites/live/${inviteId}/accept`, {
    method: "POST",
    token,
  });
}

export function rejectLiveInvite(token: string, inviteId: string) {
  return request<LiveInviteDto>(`/invites/live/${inviteId}/reject`, { method: "POST", token });
}

export function cancelLiveInvite(token: string, inviteId: string) {
  return request<LiveInviteDto>(`/invites/live/${inviteId}/cancel`, { method: "POST", token });
}

export function formatInviteSettings(s: LiveInviteSettings): string {
  const clock = s.clockMode === "absolute_15m" ? "שעון 15 דק׳" : "ללא שעון";
  const color =
    s.colorMode === "inviter_black"
      ? "המזמין שחור"
      : s.colorMode === "inviter_white"
        ? "המזמין לבן"
        : "צבע אקראי";
  const hc = s.handicap > 0 ? ` · יתרון ${s.handicap}` : "";
  return `${s.boardSize}×${s.boardSize} · ${clock} · ${color} · קומי ${s.komi}${hc}`;
}

export function remainingInviteLabel(expiresAt: string, now = Date.now()): string {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "פגה";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m <= 0) return `${s} שנ׳`;
  return `${m} דק׳ ${s.toString().padStart(2, "0")} שנ׳`;
}
