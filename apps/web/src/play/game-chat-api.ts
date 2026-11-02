import type { GameChatMessageDto, GameChatMessagesPage } from "@go-darom/shared";
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

export function fetchGameChatMessages(token: string, gameId: string, before?: string | null) {
  const params = new URLSearchParams();
  if (before) params.set("before", before);
  const qs = params.toString() ? `?${params}` : "";
  return request<GameChatMessagesPage>(`/games/${gameId}/chat${qs}`, { token });
}

export function postGameChatMessage(
  token: string,
  gameId: string,
  body: string,
  clientCommandId: string,
) {
  return request<{ message: GameChatMessageDto }>(`/games/${gameId}/chat`, {
    method: "POST",
    token,
    body: JSON.stringify({ body, clientCommandId }),
  });
}
