import { describe, expect, it, beforeEach } from "vitest";
import { consumeReturnIntent, rememberReturnIntent } from "./return-intent";

describe("return intent", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores allowlisted paths and consumes once", () => {
    rememberReturnIntent("/members");
    expect(consumeReturnIntent("/")).toBe("/members");
    expect(consumeReturnIntent("/")).toBe("/");
  });

  it("ignores external URLs", () => {
    rememberReturnIntent("https://evil.example");
    expect(consumeReturnIntent("/me")).toBe("/me");
  });

  it("homepage intent returns home; protected destination is preserved", () => {
    rememberReturnIntent("/");
    expect(consumeReturnIntent("/")).toBe("/");

    rememberReturnIntent("/community");
    expect(consumeReturnIntent("/")).toBe("/community");

    rememberReturnIntent("/me");
    expect(consumeReturnIntent("/")).toBe("/me");
  });
});
