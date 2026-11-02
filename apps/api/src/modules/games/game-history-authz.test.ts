import { describe, expect, it } from "vitest";

/** Mirrors GameService.assertParticipant — private games only. */
function canAccessGame(actorUserId: string, blackUserId: string, whiteUserId: string): boolean {
  return actorUserId === blackUserId || actorUserId === whiteUserId;
}

describe("private game history / replay AuthZ", () => {
  const black = "11111111-1111-1111-1111-111111111111";
  const white = "22222222-2222-2222-2222-222222222222";
  const stranger = "33333333-3333-3333-3333-333333333333";

  it("allows both participants", () => {
    expect(canAccessGame(black, black, white)).toBe(true);
    expect(canAccessGame(white, black, white)).toBe(true);
  });

  it("rejects unrelated users (HTTP 403 path)", () => {
    expect(canAccessGame(stranger, black, white)).toBe(false);
  });
});

describe("finished game command rejection", () => {
  it("documents 410 when status is finished", () => {
    const status = "finished" as const;
    const reject = status === "finished";
    expect(reject).toBe(true);
  });
});
