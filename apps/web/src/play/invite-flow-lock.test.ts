import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "InviteFlowModal.tsx"),
  "utf8",
);

describe("InviteFlowModal reusable preselected opponent", () => {
  it("supports lockOpponent to skip picker / hide back-to-pick", () => {
    expect(src).toMatch(/lockOpponent/);
    expect(src).toMatch(/initialOpponent/);
    expect(src).toMatch(/initialStep/);
    expect(src).toMatch(/חזרה לבחירת חבר/);
    expect(src).toMatch(/locked \? \(/);
  });
});
