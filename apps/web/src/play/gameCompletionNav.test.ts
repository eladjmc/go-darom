import { describe, expect, it } from "vitest";
import { shouldAutoExitLiveRoom } from "./gameCompletionNav";

describe("shouldAutoExitLiveRoom", () => {
  it("exits only after live active→finished transition", () => {
    expect(
      shouldAutoExitLiveRoom({
        sawActiveInSession: true,
        status: "finished",
        alreadyHandled: false,
      }),
    ).toBe(true);
  });

  it("does not exit when opening finished history/replay", () => {
    expect(
      shouldAutoExitLiveRoom({
        sawActiveInSession: false,
        status: "finished",
        alreadyHandled: false,
      }),
    ).toBe(false);
  });

  it("does not duplicate exit once handled", () => {
    expect(
      shouldAutoExitLiveRoom({
        sawActiveInSession: true,
        status: "finished",
        alreadyHandled: true,
      }),
    ).toBe(false);
  });

  it("ignores still-active games", () => {
    expect(
      shouldAutoExitLiveRoom({
        sawActiveInSession: true,
        status: "active",
        alreadyHandled: false,
      }),
    ).toBe(false);
  });
});
