/** Standard Go column letters — skip I. */
export const GO_COLUMN_LETTERS = "ABCDEFGHJKLMNOPQRST";

/** Column letter for 0-based x (A…H,J…). */
export function goColumnLetter(x: number): string {
  return GO_COLUMN_LETTERS[x] ?? "";
}

/**
 * Display row number for engine y (0 = top of SVG).
 * Numbers increase from bottom to top: y=size-1 → 1, y=0 → size.
 */
export function goRowNumber(y: number, size: number): number {
  return size - y;
}

/** Parse "D4"-style label back to engine {x,y} for tests. */
export function parseGoCoordinate(label: string, size: number): { x: number; y: number } | null {
  const m = /^([A-HJ-T])(\d{1,2})$/i.exec(label.trim());
  if (!m) return null;
  const letter = m[1]!.toUpperCase();
  const row = Number(m[2]);
  const x = GO_COLUMN_LETTERS.indexOf(letter);
  if (x < 0 || x >= size || row < 1 || row > size) return null;
  return { x, y: size - row };
}
