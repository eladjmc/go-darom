import { describe, expect, it } from "vitest";
import type { GameProjection } from "@go-darom/shared";
import { finishedGameSummaryHe, formatFinishedAtHe, opponentOf } from "./historyFormat";

describe("historyFormat", () => {
  const game = {
    id: "g1",
    result: { type: "no_winner", winnerUserId: null },
    finishedAt: "2026-11-02T10:00:00.000Z",
    players: [
      { userId: "me", nickname: "מישה", avatarUrl: null, color: "black" },
      { userId: "opp", nickname: "אלעד", avatarUrl: null, color: "white" },
    ],
  } as GameProjection;

  it("picks the opponent for the current user", () => {
    expect(opponentOf(game, "me")?.nickname).toBe("אלעד");
  });

  it("formats no-winner summary for history rows", () => {
    expect(finishedGameSummaryHe(game)).toContain("ללא מנצח");
  });

  it("formats finished date in he-IL", () => {
    expect(formatFinishedAtHe(game.finishedAt)).toMatch(/2026|נוב/);
  });
});
