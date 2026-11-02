import type { ChatSender } from "./community.js";

export type BoardSize = 9 | 13 | 19;
export type ClockMode = "none" | "absolute_15m";
export type ColorMode = "random" | "inviter_black" | "inviter_white";
export type GamePhase = "active_play" | "scoring" | "finished";
export type GameStatus = "active" | "finished";

export type LiveInviteSettings = {
  boardSize: BoardSize;
  clockMode: ClockMode;
  komi: number;
  handicap: number;
  colorMode: ColorMode;
};

export type LiveInviteParty = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
};

export type LiveInviteDto = {
  id: string;
  inviterId: string;
  recipientId: string;
  inviter: LiveInviteParty;
  recipient: LiveInviteParty;
  status: string;
  settings: LiveInviteSettings;
  createdAt: string;
  expiresAt: string;
  gameId: string | null;
};

export type GamePlayerPublic = {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
  color: "black" | "white";
};

export type ScoreSideDto = {
  total: number;
  territory: number;
  prisoners: number;
  stones: number;
  komi: number;
};

export type GameResultDto = {
  type: "score" | "resignation" | "timeout" | "no_winner";
  winnerUserId?: string | null;
  /** Authoritative Japanese score breakdown when type === "score" */
  score?: { black: ScoreSideDto; white: ScoreSideDto };
  /** Absolute point margin when type === "score" */
  margin?: number;
};

export type ScoringOverlayDto = {
  proposedRemoved: Array<{ x: number; y: number }>;
  /** Row-major [y][x]: 0 dame, 1 black territory, 2 white — from engine scoring_positions */
  ownership?: number[][];
  provisionalScore?: { black: ScoreSideDto; white: ScoreSideDto };
  blackConfirmed: boolean;
  whiteConfirmed: boolean;
  /** True after both players agreed; kept on finished games for territory restore */
  committed?: boolean;
};

export type GameProjection = {
  id: string;
  mode: "live";
  status: GameStatus;
  phase: GamePhase;
  version: number;
  boardSize: BoardSize;
  komi: number;
  handicap: number;
  clockMode: ClockMode;
  colorMode: ColorMode;
  blackUserId: string;
  whiteUserId: string;
  board: unknown;
  moveHistory: unknown[];
  overlays: Record<string, unknown>;
  clock: Record<string, unknown> | null;
  result: GameResultDto | null;
  lastActivityAt: string;
  players: GamePlayerPublic[];
  createdAt: string;
  finishedAt: string | null;
};

export type GameCommandType =
  | "play"
  | "pass"
  | "resign"
  | "propose_undo"
  | "respond_undo"
  | "withdraw_undo"
  | "propose_no_winner"
  | "respond_no_winner"
  | "withdraw_no_winner"
  | "mark_dead"
  | "clear_dead"
  | "confirm_score"
  | "dispute_score"
  | "resume";

export const LIVE_INVITE_TTL_MS = 5 * 60 * 1000;
export const LIVE_IDLE_MS = 48 * 60 * 60 * 1000;
export const ABSOLUTE_CLOCK_MS = 15 * 60 * 1000;

export function maxHandicapForSize(size: BoardSize): number {
  return size === 9 ? 4 : 9;
}

export function parseLiveInviteSettings(raw: unknown):
  | { ok: true; settings: LiveInviteSettings }
  | { ok: false; message: string } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const boardSize = Number(body.boardSize ?? 9);
  if (boardSize !== 9 && boardSize !== 13 && boardSize !== 19) {
    return { ok: false, message: "גודל לוח אינו נתמך" };
  }
  const size = boardSize as BoardSize;
  const clockMode = (body.clockMode ?? "none") as ClockMode;
  if (clockMode !== "none" && clockMode !== "absolute_15m") {
    return { ok: false, message: "מצב שעון אינו תקין" };
  }
  const colorMode = (body.colorMode ?? "random") as ColorMode;
  if (colorMode !== "random" && colorMode !== "inviter_black" && colorMode !== "inviter_white") {
    return { ok: false, message: "בחירת צבע אינה תקינה" };
  }
  const handicap = Number(body.handicap ?? 0);
  if (!Number.isInteger(handicap) || handicap < 0 || handicap > maxHandicapForSize(size)) {
    return { ok: false, message: `מספר אבני יתרון אינו חוקי (עד ${maxHandicapForSize(size)} ללוח זה)` };
  }
  let komi: number;
  if (body.komi === undefined || body.komi === null || body.komi === "") {
    komi = handicap > 0 ? 0.5 : 6.5;
  } else {
    komi = Number(body.komi);
    if (!Number.isFinite(komi)) {
      return { ok: false, message: "קומי אינו תקין" };
    }
  }
  return {
    ok: true,
    settings: { boardSize: size, clockMode, komi, handicap, colorMode },
  };
}

export function assignColors(
  inviterId: string,
  recipientId: string,
  colorMode: ColorMode,
  randomBit: 0 | 1,
): { blackUserId: string; whiteUserId: string } {
  if (colorMode === "inviter_black") {
    return { blackUserId: inviterId, whiteUserId: recipientId };
  }
  if (colorMode === "inviter_white") {
    return { blackUserId: recipientId, whiteUserId: inviterId };
  }
  return randomBit === 0
    ? { blackUserId: inviterId, whiteUserId: recipientId }
    : { blackUserId: recipientId, whiteUserId: inviterId };
}

/** Durable receipt wins; bounded rings must never re-apply after eviction. */
export function resolveCommandIdempotency(input: {
  commandId: string;
  durableReceiptVersion: number | null;
}): "replay_receipt" | "apply_new" {
  if (input.durableReceiptVersion != null) return "replay_receipt";
  return "apply_new";
}

/** Board-affecting history entry eligible for mutual undo (M4: latest only). */
export type RetractableMove = {
  index: number;
  type: "play" | "pass";
  actorUserId: string;
  payload?: { x?: number; y?: number } | null;
};

/**
 * Authoritative board plies for private replay.
 *
 * Approved undo truncates `move_history` through the retracted index before appending
 * `respond_undo`, so undone plays/passes are removed from the log. Filtering remaining
 * `play`/`pass` entries therefore does **not** reintroduce undone moves. Meta commands
 * (undo proposals, resign, no-winner, scoring marks, etc.) are skipped.
 */
export type ReplayPly = {
  historyIndex: number;
  type: "play" | "pass";
  actorUserId: string;
  payload?: { x?: number; y?: number } | null;
};

export function extractReplayPlies(history: unknown[]): ReplayPly[] {
  const out: ReplayPly[] = [];
  for (let i = 0; i < history.length; i++) {
    const h = history[i] as {
      type?: string;
      actorUserId?: string;
      payload?: { x?: number; y?: number } | null;
    };
    if (h?.type !== "play" && h?.type !== "pass") continue;
    if (typeof h.actorUserId !== "string") continue;
    out.push({
      historyIndex: i,
      type: h.type,
      actorUserId: h.actorUserId,
      payload: h.payload ?? null,
    });
  }
  return out;
}

/** Cursor for finished-game history pages (`finishedAt` + `id`, newest first). */
export type FinishedGamesCursor = {
  finishedAt: string;
  id: string;
};

export function encodeFinishedGamesCursor(c: FinishedGamesCursor): string {
  return `${encodeURIComponent(c.finishedAt)}~${c.id}`;
}

export function decodeFinishedGamesCursor(raw: string | null | undefined): FinishedGamesCursor | null {
  if (!raw) return null;
  const sep = raw.indexOf("~");
  if (sep <= 0) return null;
  try {
    const finishedAt = decodeURIComponent(raw.slice(0, sep));
    const id = raw.slice(sep + 1);
    if (!finishedAt || !id) return null;
    if (Number.isNaN(Date.parse(finishedAt))) return null;
    return { finishedAt, id };
  } catch {
    return null;
  }
}

export type UndoProposalOverlay = {
  by: string;
  status: "pending";
  moveType: "play" | "pass";
  payload?: { x: number; y: number } | null;
  historyIndex: number;
};

export function findLastRetractableMove(history: unknown[]): RetractableMove | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i] as {
      type?: string;
      actorUserId?: string;
      payload?: { x?: number; y?: number } | null;
    };
    if (h?.type !== "play" && h?.type !== "pass") continue;
    if (typeof h.actorUserId !== "string") return null;
    return {
      index: i,
      type: h.type,
      actorUserId: h.actorUserId,
      payload: h.payload ?? null,
    };
  }
  return null;
}

/**
 * Undo is a request to retract the requester's own latest committed play/pass
 * when it is also the latest retractable board move. Never undoes an opponent's move.
 */
export function evaluateUndoProposal(
  history: unknown[],
  actorUserId: string,
  pendingUndo: boolean,
):
  | { ok: true; target: RetractableMove }
  | { ok: false; code: "UNDO_PENDING" | "UNDO_NOTHING" | "UNDO_NOT_OWN_MOVE"; messageHe: string } {
  if (pendingUndo) {
    return { ok: false, code: "UNDO_PENDING", messageHe: "כבר ממתינה בקשת ביטול" };
  }
  const target = findLastRetractableMove(history);
  if (!target) {
    return { ok: false, code: "UNDO_NOTHING", messageHe: "אין מהלך שניתן לבטל" };
  }
  if (target.actorUserId !== actorUserId) {
    return {
      ok: false,
      code: "UNDO_NOT_OWN_MOVE",
      messageHe: "ניתן לבקש ביטול רק של המהלך האחרון שלכם",
    };
  }
  return { ok: true, target };
}

export function describeRetractableMoveHe(move: RetractableMove): string {
  if (move.type === "pass") return "ויתור על התור";
  const x = move.payload?.x;
  const y = move.payload?.y;
  if (typeof x === "number" && typeof y === "number") {
    return `אבן ב־${x + 1},${y + 1}`;
  }
  return "המהלך האחרון";
}

export type PendingProposal = { by: string; status: string };

/**
 * Mutual proposal respond AuthZ: only the non-initiator may accept/reject.
 * Proposer consent is already recorded by submitting the proposal.
 */
export function evaluateProposalRespond(
  proposal: PendingProposal | null | undefined,
  actorUserId: string,
  kind: "undo" | "no_winner",
):
  | { ok: true }
  | {
      ok: false;
      code: "UNDO_NONE" | "UNDO_SELF" | "NO_WINNER_NONE" | "NO_WINNER_SELF";
      messageHe: string;
    } {
  if (!proposal || proposal.status !== "pending") {
    return kind === "undo"
      ? { ok: false, code: "UNDO_NONE", messageHe: "אין בקשת ביטול ממתינה" }
      : { ok: false, code: "NO_WINNER_NONE", messageHe: "אין הצעת סיום ללא מנצח ממתינה" };
  }
  if (proposal.by === actorUserId) {
    return kind === "undo"
      ? { ok: false, code: "UNDO_SELF", messageHe: "לא ניתן לאשר או לדחות את הבקשה של עצמכם" }
      : {
          ok: false,
          code: "NO_WINNER_SELF",
          messageHe: "לא ניתן לאשר או לדחות את ההצעה של עצמכם",
        };
  }
  return { ok: true };
}

/** Only the initiator may withdraw a pending mutual proposal. */
export function evaluateProposalWithdraw(
  proposal: PendingProposal | null | undefined,
  actorUserId: string,
  kind: "undo" | "no_winner",
):
  | { ok: true }
  | {
      ok: false;
      code: "UNDO_NONE" | "UNDO_NOT_OWNER" | "NO_WINNER_NONE" | "NO_WINNER_NOT_OWNER";
      messageHe: string;
    } {
  if (!proposal || proposal.status !== "pending") {
    return kind === "undo"
      ? { ok: false, code: "UNDO_NONE", messageHe: "אין בקשת ביטול ממתינה" }
      : { ok: false, code: "NO_WINNER_NONE", messageHe: "אין הצעת סיום ללא מנצח ממתינה" };
  }
  if (proposal.by !== actorUserId) {
    return kind === "undo"
      ? { ok: false, code: "UNDO_NOT_OWNER", messageHe: "רק מגיש הבקשה יכול לבטל אותה" }
      : {
          ok: false,
          code: "NO_WINNER_NOT_OWNER",
          messageHe: "רק מגיש ההצעה יכול לבטל אותה",
        };
  }
  return { ok: true };
}

/** Hebrew headline for a finished score result — uses committed totals only. */
export function formatScoreHeadlineHe(result: GameResultDto): string {
  if (result.type !== "score" || !result.score) return "";
  const b = result.score.black.total;
  const w = result.score.white.total;
  const margin = result.margin ?? Math.abs(b - w);
  if (b === w) return "תיקו בניקוד";
  return b > w ? `השחור ניצח ב־${margin} נקודות` : `הלבן ניצח ב־${margin} נקודות`;
}

export function formatNonScoreResultHe(
  result: GameResultDto,
  winnerNickname?: string | null,
): string {
  if (result.type === "no_winner") return "המשחק הסתיים בהסכמה, ללא מנצח";
  if (result.type === "resignation") {
    return winnerNickname ? `${winnerNickname} ניצח/ה בגלל כניעה` : "ניצחון בכניעה";
  }
  if (result.type === "timeout") {
    return winnerNickname ? `${winnerNickname} ניצח/ה בגלל שעון` : "ניצחון בשעון";
  }
  return formatScoreHeadlineHe(result);
}

/** Per-game room chat — independent of community DMs (ADR-017). */
export type GameChatMessageDto = {
  id: string;
  gameId: string;
  body: string;
  createdAt: string;
  sender: ChatSender;
};

export type GameChatMessagesPage = {
  items: GameChatMessageDto[];
  /** Exclusive cursor: ISO `createdAt` of the oldest item in this page, or null. */
  nextBefore: string | null;
};

/**
 * Access role for game chat. M4 grants only `participant`.
 * `spectator` is reserved so future read access does not require a storage redesign.
 */
export type GameChatAccessRole = "participant" | "spectator";
