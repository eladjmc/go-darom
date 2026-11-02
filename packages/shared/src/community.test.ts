import { describe, expect, it } from "vitest";
import { isToastNotificationType, validateChatBody } from "./community.js";

describe("validateChatBody", () => {
  it("accepts trimmed Hebrew text", () => {
    const r = validateChatBody("  שלום לכולם  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.body).toBe("שלום לכולם");
  });

  it("rejects empty and oversized bodies", () => {
    expect(validateChatBody("   ").ok).toBe(false);
    expect(validateChatBody("x".repeat(2001)).ok).toBe(false);
  });
});

describe("isToastNotificationType", () => {
  it("toasts DM but not arbitrary types", () => {
    expect(isToastNotificationType("dm.message")).toBe(true);
    expect(isToastNotificationType("moderation.report_resolved")).toBe(false);
  });

  it("toasts live invite lifecycle events", () => {
    expect(isToastNotificationType("game.invite")).toBe(true);
    expect(isToastNotificationType("game.invite_accepted")).toBe(true);
    expect(isToastNotificationType("game.invite_rejected")).toBe(true);
    expect(isToastNotificationType("game.invite_cancelled")).toBe(true);
    expect(isToastNotificationType("game.live_turn")).toBe(true);
  });
});
