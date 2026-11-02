import {
  formatNonScoreResultHe,
  formatScoreHeadlineHe,
  type GameProjection,
  type GameResultDto,
  type ScoreSideDto,
} from "@go-darom/shared";

export function scoreSides(result: GameResultDto | null | undefined): {
  black: ScoreSideDto;
  white: ScoreSideDto;
} | null {
  if (!result || result.type !== "score" || !result.score) return null;
  return result.score;
}

export function gameResultHeadline(game: GameProjection): string {
  const r = game.result;
  if (!r) return "";
  if (r.type === "score") return formatScoreHeadlineHe(r);
  const winnerNick = game.players.find((p) => p.userId === r.winnerUserId)?.nickname ?? null;
  return formatNonScoreResultHe(r, winnerNick);
}

export function formatSideBreakdownHe(side: ScoreSideDto, label: string): string {
  return `${label}: שטח ${side.territory} · נלקחו ${side.prisoners} · אבנים ${side.stones} · קומי ${side.komi} · סה״כ ${side.total}`;
}

/** Leading side from Japanese totals, or null if tied / missing. */
export function leadingSideHe(score: { black: ScoreSideDto; white: ScoreSideDto } | null | undefined): string | null {
  if (!score) return null;
  if (score.black.total === score.white.total) return "תיקו זמני";
  return score.black.total > score.white.total ? "שחור מוביל זמנית" : "לבן מוביל זמנית";
}
