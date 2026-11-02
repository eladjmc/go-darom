import type { LiveInviteSettings } from "@go-darom/shared";

export function settingsFromInvitePayload(
  payload: Record<string, unknown>,
): LiveInviteSettings | null {
  const s = payload.settings;
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  const boardSize = Number(o.boardSize);
  if (boardSize !== 9 && boardSize !== 13 && boardSize !== 19) return null;
  return {
    boardSize,
    clockMode: o.clockMode === "absolute_15m" ? "absolute_15m" : "none",
    colorMode:
      o.colorMode === "inviter_black" || o.colorMode === "inviter_white" ? o.colorMode : "random",
    komi: Number(o.komi ?? 6.5),
    handicap: Number(o.handicap ?? 0),
  };
}

export function inviteTitle(nickname: string): string {
  return `${nickname} הזמין/ה אותך למשחק`;
}

export type InviteSettingRow = { label: string; value: string };

export function inviteSettingRows(settings: LiveInviteSettings): InviteSettingRow[] {
  const rows: InviteSettingRow[] = [
    { label: "גודל לוח", value: `${settings.boardSize}×${settings.boardSize}` },
    {
      label: "שעון",
      value: settings.clockMode === "absolute_15m" ? "15 דקות מוחלטות" : "ללא שעון",
    },
    {
      label: "צבעים",
      value:
        settings.colorMode === "inviter_black"
          ? "המזמין/ה שחור"
          : settings.colorMode === "inviter_white"
            ? "המזמין/ה לבן"
            : "הגרלה אקראית",
    },
    { label: "קומי", value: String(settings.komi) },
  ];
  if (settings.handicap > 0) {
    rows.push({ label: "יתרון", value: String(settings.handicap) });
  }
  return rows;
}
