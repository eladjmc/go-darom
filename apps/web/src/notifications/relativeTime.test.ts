import { describe, expect, it } from "vitest";
import { formatAbsoluteHe, formatRelativeHe } from "./relativeTime";

describe("formatRelativeHe", () => {
  it("formats recent times in Hebrew", () => {
    const now = Date.parse("2026-10-30T12:00:00.000Z");
    expect(formatRelativeHe(new Date(now - 5_000).toISOString(), now)).toBe("עכשיו");
    expect(formatRelativeHe(new Date(now - 120_000).toISOString(), now)).toBe("לפני 2 דקות");
    expect(formatRelativeHe(new Date(now - 7_200_000).toISOString(), now)).toBe("לפני 2 שעות");
  });

  it("builds absolute tooltip text", () => {
    expect(formatAbsoluteHe("2026-10-30T12:00:00.000Z").length).toBeGreaterThan(4);
  });
});
