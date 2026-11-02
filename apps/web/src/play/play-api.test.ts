import { describe, expect, it } from "vitest";
import { formatInviteSettings, remainingInviteLabel } from "./play-api";

describe("play hub helpers", () => {
  it("formats invite settings in Hebrew", () => {
    expect(
      formatInviteSettings({
        boardSize: 13,
        clockMode: "absolute_15m",
        colorMode: "inviter_black",
        komi: 0.5,
        handicap: 2,
      }),
    ).toContain("13×13");
    expect(
      formatInviteSettings({
        boardSize: 9,
        clockMode: "none",
        colorMode: "random",
        komi: 6.5,
        handicap: 0,
      }),
    ).toContain("ללא שעון");
  });

  it("shows remaining invite validity", () => {
    const expires = new Date(Date.now() + 125_000).toISOString();
    expect(remainingInviteLabel(expires)).toMatch(/דק׳/);
    expect(remainingInviteLabel(new Date(Date.now() - 1000).toISOString())).toBe("פגה");
  });
});
