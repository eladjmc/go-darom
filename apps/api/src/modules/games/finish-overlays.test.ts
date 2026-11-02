import { describe, expect, it } from "vitest";
import { sanitizeOverlaysForFinish } from "./finish-overlays.js";

describe("sanitizeOverlaysForFinish", () => {
  it("clears pending proposals on no-winner finish", () => {
    const out = sanitizeOverlaysForFinish(
      {
        noWinner: { by: "a", status: "pending" },
        undo: { by: "b", status: "pending" },
        idle: { offeredAt: "x", mutualNoWinnerOnly: true },
        scoring: { blackConfirmed: false },
      },
      { type: "no_winner", winnerUserId: null },
    );
    expect(out.noWinner).toBeUndefined();
    expect(out.undo).toBeUndefined();
    expect(out.idle).toBeUndefined();
    expect(out.scoring).toBeUndefined();
  });

  it("keeps committed scoring overlay for score finish", () => {
    const scoring = { committed: true, ownership: [[1]] };
    const out = sanitizeOverlaysForFinish(
      { noWinner: { by: "a", status: "pending" }, scoring },
      {
        type: "score",
        winnerUserId: "w",
        margin: 1.5,
        score: {
          black: { total: 10, territory: 10, prisoners: 0, stones: 0, komi: 0 },
          white: { total: 11.5, territory: 5, prisoners: 0, stones: 0, komi: 6.5 },
        },
      },
    );
    expect(out.noWinner).toBeUndefined();
    expect(out.scoring).toEqual(scoring);
  });

  it("clears scoring on resignation", () => {
    const out = sanitizeOverlaysForFinish(
      { scoring: { blackConfirmed: true }, noWinner: { by: "a", status: "pending" } },
      { type: "resignation", winnerUserId: "w" },
    );
    expect(out.scoring).toBeUndefined();
    expect(out.noWinner).toBeUndefined();
  });
});
