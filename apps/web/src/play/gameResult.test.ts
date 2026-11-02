import { describe, expect, it } from "vitest";
import { formatScoreHeadlineHe, type GameProjection, type GameResultDto } from "@go-darom/shared";
import { formatSideBreakdownHe, gameResultHeadline, leadingSideHe, scoreSides } from "./gameResult";

describe("score result UI mapping", () => {
  const scoreResult: GameResultDto = {
    type: "score",
    winnerUserId: "w",
    margin: 3.5,
    score: {
      black: { total: 40, territory: 30, prisoners: 2, stones: 20, komi: 0 },
      white: { total: 43.5, territory: 28, prisoners: 1, stones: 18, komi: 6.5 },
    },
  };

  it("formats score headline from committed margin", () => {
    expect(formatScoreHeadlineHe(scoreResult)).toBe("הלבן ניצח ב־3.5 נקודות");
  });

  it("does not invent margins for resign / no-winner", () => {
    const game = {
      result: { type: "resignation", winnerUserId: "w" },
      players: [{ userId: "w", nickname: "אלעד", avatarUrl: null, color: "white" }],
    } as GameProjection;
    expect(gameResultHeadline(game)).toContain("כניעה");
    expect(scoreSides({ type: "resignation", winnerUserId: "w" })).toBeNull();
    expect(gameResultHeadline({ ...game, result: { type: "no_winner", winnerUserId: null } })).toBe(
      "המשחק הסתיים בהסכמה, ללא מנצח",
    );
  });

  it("maps side breakdown lines from authoritative totals", () => {
    const line = formatSideBreakdownHe(scoreResult.score!.white, "לבן");
    expect(line).toContain("שטח 28");
    expect(line).toContain("קומי 6.5");
    expect(line).toContain("סה״כ 43.5");
  });

  it("labels provisional leading side without inventing territory", () => {
    expect(leadingSideHe(scoreResult.score)).toBe("לבן מוביל זמנית");
    expect(
      leadingSideHe({
        black: { total: 10, territory: 10, prisoners: 0, stones: 0, komi: 0 },
        white: { total: 10, territory: 3.5, prisoners: 0, stones: 0, komi: 6.5 },
      }),
    ).toBe("תיקו זמני");
  });
});
