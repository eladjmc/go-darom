import { describe, expect, it } from "vitest";
import { isAllowedReturnIntent, validateNickname } from "./identity.js";

describe("validateNickname", () => {
  it("accepts trimmed Hebrew nicknames in range", () => {
    expect(validateNickname("  מישה  ")).toEqual({ ok: true, nickname: "מישה" });
  });

  it("rejects too short or illegal characters", () => {
    expect(validateNickname("א").ok).toBe(false);
    expect(validateNickname("bad\nname").ok).toBe(false);
  });
});

describe("isAllowedReturnIntent", () => {
  it("allows internal prefixes only", () => {
    expect(isAllowedReturnIntent("/me")).toBe(true);
    expect(isAllowedReturnIntent("/members")).toBe(true);
    expect(isAllowedReturnIntent("/play/invite")).toBe(true);
    expect(isAllowedReturnIntent("https://evil.example")).toBe(false);
    expect(isAllowedReturnIntent("//evil.example")).toBe(false);
  });
});
