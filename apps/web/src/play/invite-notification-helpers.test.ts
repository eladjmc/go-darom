import { describe, expect, it } from "vitest";
import {
  inviteSettingRows,
  inviteTitle,
  settingsFromInvitePayload,
} from "./invite-notification-helpers";

describe("invite notification helpers", () => {
  it("builds Hebrew invitation title without raw ids", () => {
    expect(inviteTitle("דנה")).toBe("דנה הזמין/ה אותך למשחק");
  });

  it("parses enriched invite payload settings", () => {
    const settings = settingsFromInvitePayload({
      inviteId: "should-not-surface-in-ui",
      settings: {
        boardSize: 13,
        clockMode: "absolute_15m",
        colorMode: "inviter_white",
        komi: 0.5,
        handicap: 3,
      },
    });
    expect(settings).toEqual({
      boardSize: 13,
      clockMode: "absolute_15m",
      colorMode: "inviter_white",
      komi: 0.5,
      handicap: 3,
    });
    const rows = inviteSettingRows(settings!);
    expect(rows.map((r) => r.label)).toEqual(["גודל לוח", "שעון", "צבעים", "קומי", "יתרון"]);
    expect(rows.find((r) => r.label === "יתרון")?.value).toBe("3");
  });

  it("omits handicap row when zero and rejects invalid board", () => {
    expect(settingsFromInvitePayload({ settings: { boardSize: 11 } })).toBeNull();
    const rows = inviteSettingRows({
      boardSize: 9,
      clockMode: "none",
      colorMode: "random",
      komi: 6.5,
      handicap: 0,
    });
    expect(rows.some((r) => r.label === "יתרון")).toBe(false);
  });
});
