import type { GameProjection } from "@go-darom/shared";
import { gameResultHeadline } from "./gameResult";

export function opponentOf(game: GameProjection, myId: string) {
  return game.players.find((p) => p.userId !== myId) ?? null;
}

export function formatFinishedAtHe(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("he-IL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString("he-IL");
  }
}

export function finishedGameSummaryHe(game: GameProjection): string {
  return gameResultHeadline(game) || "המשחק הסתיים";
}
