import type { Player } from "@go-darom/go-engine";

/** CSS class for empty-intersection hover ghost; must track side to move. */
export function hoverPreviewClass(toMove: Player): "poc-preview-black" | "poc-preview-white" {
  return toMove === "black" ? "poc-preview-black" : "poc-preview-white";
}
