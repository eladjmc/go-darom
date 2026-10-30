import type { MeProfile, MembersResponse } from "@go-darom/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }
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

export function fetchMe(token: string) {
  return request<MeProfile>("/me", { token });
}

export function patchMe(
  token: string,
  body: { nickname?: string; avatarUrl?: string | null; completeOnboarding?: boolean },
) {
  return request<MeProfile>("/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export function fetchMembers(token: string, q?: string, onlineOnly?: boolean) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (onlineOnly) params.set("online", "1");
  const qs = params.toString() ? `?${params}` : "";
  return request<MembersResponse>(`/members${qs}`, { token });
}

export function fetchAdminSession(token: string) {
  return request<{ ok: boolean; role: string }>("/admin/session", { token });
}
