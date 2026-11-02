import type { GameResultDto } from "@go-darom/shared";

/**
 * Strip live-only proposals when a game reaches finished.
 * Score results keep the committed scoring overlay for territory replay.
 */
export function sanitizeOverlaysForFinish(
  overlays: Record<string, unknown>,
  result: GameResultDto,
): Record<string, unknown> {
  const next = { ...overlays };
  delete next.noWinner;
  delete next.undo;
  delete next.idle;
  if (result.type !== "score") {
    delete next.scoring;
  }
  return next;
}
