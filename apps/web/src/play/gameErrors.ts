/**
 * Central game-error presentation: map stable API/engine codes → Hebrew UI copy.
 * Raw engine messages must never be shown to users.
 */

export type GameErrorInput = {
  code?: string | null;
  message?: string | null;
  status?: number;
};

const CODE_HE: Record<string, string> = {
  OCCUPIED: "המקום הזה כבר תפוס",
  WRONG_TURN: "עכשיו התור של היריב",
  ILLEGAL_MOVE: "אי אפשר להניח כאן אבן",
  SUICIDE: "אי אפשר להניח כאן אבן",
  KO: "אי אפשר להניח כאן אבן",
  ILLEGAL_PASS: "לא ניתן לוותר על התור כעת",
  VERSION_CONFLICT: "המשחק התעדכן. נסו שוב",
  WRONG_PHASE: "הפעולה אינה זמינה בשלב זה",
  UNDO_NOT_OWN_MOVE: "ניתן לבקש ביטול רק של המהלך האחרון שלכם",
  UNDO_NOTHING: "אין מהלך שניתן לבטל",
  UNDO_PENDING: "כבר ממתינה בקשת ביטול",
  UNDO_NONE: "אין בקשת ביטול ממתינה",
  UNDO_SELF: "לא ניתן לאשר או לדחות את הבקשה של עצמכם",
  UNDO_NOT_OWNER: "רק מגיש הבקשה יכול לבטל אותה",
  UNDO_FAILED: "ביטול המהלך נכשל",
  NO_WINNER_NONE: "אין הצעת סיום ללא מנצח ממתינה",
  NO_WINNER_SELF: "לא ניתן לאשר או לדחות את ההצעה של עצמכם",
  NO_WINNER_NOT_OWNER: "רק מגיש ההצעה יכול לבטל אותה",
  NO_WINNER_PENDING: "כבר ממתינה הצעת סיום מהיריב",
  NETWORK: "לא הצלחנו לשלוח את המהלך. נסו שוב",
};

/** Detect raw goban/engine strings that must never reach the UI. */
export function looksLikeRawEngineError(text: string): boolean {
  return /Move error|stone_already_placed|illegal_self_capture|illegal_ko|GobanEngine|at [A-T]\d+/i.test(
    text,
  );
}

export function hebrewGameError(input: GameErrorInput): string {
  const code = (input.code ?? "").toUpperCase();
  if (code && CODE_HE[code]) return CODE_HE[code]!;
  const msg = (input.message ?? "").trim();
  if (!msg || looksLikeRawEngineError(msg)) {
    if (input.status === 409) return CODE_HE.VERSION_CONFLICT!;
    if (input.status && input.status >= 500) return CODE_HE.NETWORK!;
    return "אי אפשר להניח כאן אבן";
  }
  // Server already sent Hebrew — allow if not engine dump
  return msg;
}

export function gameErrorDedupeKey(input: GameErrorInput): string {
  return `${(input.code ?? "").toUpperCase()}|${hebrewGameError(input)}`;
}
