export type UserRole = "member" | "admin";

export interface MeProfile {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
  suspended: boolean;
}

export interface MemberListItem {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  online: boolean;
}

export interface MembersResponse {
  items: MemberListItem[];
}

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 32;

/** Allowlisted return-intent path prefixes (internal only). */
export const RETURN_INTENT_PREFIXES = [
  "/",
  "/me",
  "/members",
  "/community",
  "/messages",
  "/dms", // legacy alias — redirected to /messages
  "/notifications",
  "/play",
  "/learn",
  "/puzzles",
  "/events",
  "/shop",
  "/admin",
  "/onboarding",
] as const;

export function isAllowedReturnIntent(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return false;
  }
  const normalized = path.split("?")[0] ?? path;
  if (normalized === "/") return true;
  return RETURN_INTENT_PREFIXES.filter((prefix) => prefix !== "/").some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateNickname(raw: string): { ok: true; nickname: string } | { ok: false; message: string } {
  if (/[<>\n\r\t]/.test(raw)) {
    return { ok: false, message: "כינוי מכיל תווים לא חוקיים" };
  }
  const nickname = normalizeNickname(raw);
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return { ok: false, message: `כינוי חייב להיות בין ${NICKNAME_MIN} ל־${NICKNAME_MAX} תווים` };
  }
  return { ok: true, nickname };
}
