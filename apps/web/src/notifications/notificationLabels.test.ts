import { describe, expect, it } from "vitest";
import { labelForNotification, notificationIcon } from "./notificationLabels";

describe("notificationLabels", () => {
  it("never surfaces raw notification type strings in list copy", () => {
    const label = labelForNotification({
      id: "n1",
      type: "game.invite_rejected",
      payload: { recipientNickname: "דנה" },
      readAt: null,
      createdAt: new Date().toISOString(),
    });
    expect(label.primary).toContain("דנה");
    expect(JSON.stringify(label)).not.toContain("game.invite");
  });

  it("maps invite and study types to product icons", () => {
    expect(notificationIcon("game.invite")).toBe("play");
    expect(notificationIcon("game.live_turn")).toBe("play");
    expect(notificationIcon("study.invite")).toBe("learn");
    expect(notificationIcon("other")).toBe("bell");
  });

  it("marks live invites as expandable", () => {
    const label = labelForNotification({
      id: "n2",
      type: "game.invite",
      payload: { inviterNickname: "מישה" },
      readAt: null,
      createdAt: new Date().toISOString(),
    });
    expect(label.expandable).toBe(true);
    expect(label.primary).toContain("מישה");
  });
});
