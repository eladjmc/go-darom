import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Flag, MoreHorizontal, Undo2 } from "lucide-react";
import { reconstructReplayPositions, type BoardSnapshot } from "@go-darom/go-engine";
import {
  describeRetractableMoveHe,
  evaluateUndoProposal,
  extractReplayPlies,
  findLastRetractableMove,
  type GameProjection,
  type ScoringOverlayDto,
  type UndoProposalOverlay,
} from "@go-darom/shared";
import { useAuth } from "../auth/AuthContext";
import { useRealtime } from "../realtime/RealtimeProvider";
import { BoardViewport } from "./BoardViewport";
import { LIVE_FINISH_EXIT_MS, shouldAutoExitLiveRoom } from "./gameCompletionNav";
import { gameErrorDedupeKey, hebrewGameError } from "./gameErrors";
import { formatSideBreakdownHe, gameResultHeadline, leadingSideHe, scoreSides } from "./gameResult";
import { GameRoomChat } from "./GameRoomChat";
import { ReplayControls } from "./ReplayControls";
import { ResignConfirmModal } from "./ResignConfirmModal";
import { SnapshotBoard } from "./SnapshotBoard";
import "./play.css";

function useIsNarrow(breakpoint = 900) {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return narrow;
}

async function api<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
    game?: GameProjection;
  };
  if (!res.ok) {
    const err = new Error(data.error || "שגיאה") as Error & {
      status: number;
      code?: string;
      game?: GameProjection;
    };
    err.status = res.status;
    err.code = data.code;
    err.game = data.game;
    throw err;
  }
  return data;
}

function formatClockMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function PlayGamePage() {
  const { gameId = "" } = useParams();
  const navigate = useNavigate();
  const { token, me } = useAuth();
  const { socket, onlineIds, pushToast } = useRealtime();
  const isNarrow = useIsNarrow();
  const [game, setGame] = useState<GameProjection | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const [now, setNow] = useState(Date.now());
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const [connLost, setConnLost] = useState(false);
  const gesturingRef = useRef(false);
  const hasGameRef = useRef(false);
  hasGameRef.current = Boolean(game);
  const sawActiveInSessionRef = useRef(false);
  const [liveSession, setLiveSession] = useState(false);
  const [replayPly, setReplayPly] = useState(0);
  const finishExitHandledRef = useRef(false);
  const finishExitTimerRef = useRef<number | null>(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const pushToastRef = useRef(pushToast);
  pushToastRef.current = pushToast;
  const gameRef = useRef(game);
  gameRef.current = game;

  const load = useCallback(async () => {
    if (!token || !gameId) return;
    try {
      const g = await api<GameProjection>(token, `/games/${gameId}`);
      setGame(g);
      setFatalError(null);
      setConnLost(false);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (!hasGameRef.current) {
        setFatalError(hebrewGameError({ message: err.message, status: err.status }));
      } else {
        pushToast({
          title: "חיבור",
          body: hebrewGameError({ code: "NETWORK", status: err.status }),
          dedupeKey: "game-conn",
        });
        setConnLost(true);
      }
    }
  }, [token, gameId, pushToast]);

  useEffect(() => {
    sawActiveInSessionRef.current = false;
    setLiveSession(false);
    finishExitHandledRef.current = false;
    if (finishExitTimerRef.current != null) {
      window.clearTimeout(finishExitTimerRef.current);
      finishExitTimerRef.current = null;
    }
    void load();
  }, [load]);

  useEffect(() => {
    if (!socket || !gameId) return;
    socket.emit("game:join", { gameId }, () => undefined);
    const onUpdate = (payload: { game?: GameProjection }) => {
      if (payload.game) {
        setGame(payload.game);
        setConnLost(false);
        return;
      }
      void load();
    };
    const onEnded = (payload: { game?: GameProjection }) => {
      if (payload.game) {
        setGame(payload.game);
        setConnLost(false);
        return;
      }
      void load();
    };
    const onDisconnect = () => setConnLost(true);
    const onConnect = () => {
      setConnLost(false);
      void load();
    };
    socket.on("game:update", onUpdate);
    socket.on("game:ended", onEnded);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);
    return () => {
      socket.emit("game:leave", { gameId });
      socket.off("game:update", onUpdate);
      socket.off("game:ended", onEnded);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
    };
  }, [socket, gameId, load]);

  useEffect(() => {
    if (game?.status === "active") {
      sawActiveInSessionRef.current = true;
      setLiveSession(true);
    }
  }, [game?.status, game?.id]);

  useEffect(() => {
    const current = gameRef.current;
    if (
      !shouldAutoExitLiveRoom({
        sawActiveInSession: sawActiveInSessionRef.current,
        status: current?.status,
        alreadyHandled: finishExitHandledRef.current,
      })
    ) {
      return;
    }
    if (!current) return;
    finishExitHandledRef.current = true;
    setConfirmResign(false);
    setMoreOpen(false);
    const headline = gameResultHeadline(current);
    pushToastRef.current({
      title: "המשחק הסתיים",
      body: headline || "המשחק הסתיים",
      dedupeKey: `game-ended:${current.id}`,
      href: "/play",
      ttlMs: 5200,
    });
    const timer = window.setTimeout(() => {
      navigateRef.current("/play", { replace: true });
    }, LIVE_FINISH_EXIT_MS);
    finishExitTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (finishExitTimerRef.current === timer) {
        finishExitTimerRef.current = null;
      }
    };
  }, [game?.id, game?.status]);

  useEffect(() => {
    if (game?.clockMode !== "absolute_15m" || game.status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [game?.clockMode, game?.status]);

  useEffect(() => {
    setPreview(null);
  }, [game?.version, game?.id]);

  const authoritativeSnapshot = game?.board as BoardSnapshot | undefined;
  const replayBundle = useMemo(() => {
    if (!game || game.status !== "finished") return null;
    try {
      return reconstructReplayPositions({
        boardSize: game.boardSize,
        komi: game.komi,
        handicap: game.handicap,
        moveHistory: game.moveHistory,
        authoritativeBoard: game.board as { grid?: unknown },
      });
    } catch {
      return null;
    }
  }, [game]);

  const showReplayChrome = Boolean(game?.status === "finished" && !liveSession && replayBundle);

  useEffect(() => {
    if (!replayBundle) return;
    setReplayPly(replayBundle.plyCount);
  }, [game?.id, replayBundle?.plyCount]);

  const snapshot = useMemo(() => {
    if (showReplayChrome && replayBundle) {
      return replayBundle.positions[Math.min(replayPly, replayBundle.positions.length - 1)]!;
    }
    return authoritativeSnapshot;
  }, [showReplayChrome, replayBundle, replayPly, authoritativeSnapshot]);

  const myColor = useMemo(() => {
    if (!game || !me) return null;
    return game.blackUserId === me.id ? "black" : game.whiteUserId === me.id ? "white" : null;
  }, [game, me]);

  const lastMove = useMemo(() => {
    if (showReplayChrome && replayBundle) {
      if (replayPly <= 0) return null;
      const ply = extractReplayPlies(game?.moveHistory ?? [])[replayPly - 1];
      if (!ply || ply.type !== "play") return null;
      const x = ply.payload?.x;
      const y = ply.payload?.y;
      if (typeof x === "number" && typeof y === "number") return { x, y };
      return null;
    }
    const last = findLastRetractableMove(game?.moveHistory ?? []);
    if (!last || last.type !== "play") return null;
    const x = last.payload?.x;
    const y = last.payload?.y;
    if (typeof x === "number" && typeof y === "number") return { x, y };
    return null;
  }, [game?.moveHistory, showReplayChrome, replayBundle, replayPly]);

  const scoringOverlay = game?.overlays?.scoring as ScoringOverlayDto | undefined;
  const showTerritoryViz = Boolean(
    game &&
      Array.isArray(scoringOverlay?.ownership) &&
      (game.phase === "scoring" ||
        (game.status === "finished" &&
          game.result?.type === "score" &&
          scoringOverlay?.committed &&
          (!showReplayChrome || (replayBundle && replayPly >= replayBundle.plyCount)))),
  );

  const deadMarks = useMemo(() => {
    const set = new Set<string>();
    if (!showTerritoryViz) return set;
    const marks = scoringOverlay?.proposedRemoved;
    if (Array.isArray(marks)) {
      for (const m of marks) {
        if (m && typeof m.x === "number" && typeof m.y === "number") {
          set.add(`${m.x},${m.y}`);
        }
      }
    }
    return set;
  }, [scoringOverlay?.proposedRemoved, showTerritoryViz]);

  const ownership = showTerritoryViz && Array.isArray(scoringOverlay?.ownership) ? scoringOverlay!.ownership! : null;

  const undoOverlay = game?.overlays?.undo as UndoProposalOverlay | undefined;
  const noWinnerOverlay = game?.overlays?.noWinner as { by?: string; status?: string } | undefined;
  const undoEval = useMemo(() => {
    if (!game || !me) return null;
    return evaluateUndoProposal(
      game.moveHistory,
      me.id,
      Boolean(undoOverlay?.status === "pending"),
    );
  }, [game, me, undoOverlay?.status]);

  const clockRemaining = useCallback(
    (color: "black" | "white") => {
      if (!game?.clock || game.clockMode !== "absolute_15m") return null;
      const key = color === "black" ? "blackRemainingMs" : "whiteRemainingMs";
      let ms = Number(game.clock[key] ?? 0);
      const runningFor = game.clock.runningFor;
      const updatedAt = game.clock.updatedAt ? new Date(String(game.clock.updatedAt)).getTime() : now;
      if (game.status === "active" && runningFor === color) {
        ms -= Math.max(0, now - updatedAt);
      }
      return Math.max(0, ms);
    },
    [game, now],
  );

  const showGameToast = useCallback(
    (input: { code?: string; message?: string; status?: number }) => {
      const body = hebrewGameError(input);
      pushToast({
        title: "משחק",
        body,
        dedupeKey: `game-err:${gameErrorDedupeKey(input)}`,
        ttlMs: 4200,
      });
    },
    [pushToast],
  );

  const command = async (type: string, payload?: unknown) => {
    if (!token || !game || busy) return;
    setBusy(true);
    try {
      const res = await api<{ game: GameProjection }>(token, `/games/${game.id}/commands`, {
        method: "POST",
        body: JSON.stringify({
          expectedVersion: game.version,
          commandId: crypto.randomUUID(),
          type,
          payload,
        }),
      });
      setGame(res.game);
      setConfirmResign(false);
      setMoreOpen(false);
      setConnLost(false);
    } catch (e) {
      const err = e as Error & { game?: GameProjection; code?: string; status?: number };
      if (err.game) setGame(err.game);
      showGameToast({ code: err.code, message: err.message, status: err.status });
      if (!err.status || err.status >= 500) setConnLost(true);
    } finally {
      setBusy(false);
    }
  };

  const needsConfirmPlacement = Boolean(game && game.boardSize === 19 && isNarrow);

  const onBoardClick = (x: number, y: number) => {
    if (!game || gesturingRef.current) return;
    if (game.phase === "scoring") {
      setPreview(null);
      void command("mark_dead", { x, y });
      return;
    }
    if (needsConfirmPlacement && game.phase === "active_play") {
      setPreview((prev) => (prev && prev.x === x && prev.y === y ? prev : { x, y }));
      return;
    }
    setPreview(null);
    void command("play", { x, y });
  };

  const commitPreview = () => {
    if (!preview || busy) return;
    const { x, y } = preview;
    setPreview(null);
    void command("play", { x, y });
  };

  if (fatalError && !game) {
    return (
      <section className="game-room">
        <p className="play-error" role="alert">
          {fatalError}
        </p>
        <Link to="/play">חזרה למשחקים</Link>
      </section>
    );
  }

  if (!game || !snapshot || !me) {
    return (
      <section className="game-room">
        <p className="game-room-loading">טוענים משחק…</p>
      </section>
    );
  }

  const toMove = snapshot.toMove;
  const idle = Boolean(game.overlays.idle);
  const scoring = game.phase === "scoring" && game.status === "active";
  const activePlay = game.status === "active" && game.phase === "active_play";
  const myTurn = activePlay && toMove === myColor;
  const interactive =
    !showReplayChrome &&
    (myTurn || scoring) &&
    game.status === "active" &&
    (scoring || toMove === myColor);
  const canUndo = Boolean(undoEval?.ok) && activePlay && !busy;
  const undoHint = undoEval && !undoEval.ok ? undoEval.messageHe : null;
  const iAmUndoRequester = undoOverlay?.by === me.id;
  const showUndoRespond = Boolean(undoOverlay?.status === "pending" && !iAmUndoRequester);
  const iAmNoWinnerRequester = Boolean(
    noWinnerOverlay?.status === "pending" && noWinnerOverlay.by === me.id,
  );
  const noWinnerPending = noWinnerOverlay?.status === "pending";

  const requesterNick =
    game.players.find((p) => p.userId === undoOverlay?.by)?.nickname ?? "היריב";
  const undoMoveLabel = undoOverlay
    ? describeRetractableMoveHe({
        index: undoOverlay.historyIndex,
        type: undoOverlay.moveType,
        actorUserId: undoOverlay.by,
        payload: undoOverlay.payload,
      })
    : "";

  const orderedPlayers = [...game.players].sort((a, b) =>
    a.color === "black" ? -1 : b.color === "black" ? 1 : 0,
  );

  return (
    <section className="game-room" data-testid="game-room">
      <div className="game-room-bar">
        <Link className="game-room-back" to="/play">
          ← למשחקים
        </Link>
        <span className="game-room-meta">
          {game.boardSize}×{game.boardSize}
          {game.clockMode === "absolute_15m" ? " · שעון 15 דק׳" : " · ללא שעון"}
          {game.handicap > 0 ? ` · יתרון ${game.handicap}` : ""}
          {` · קומי ${game.komi}`}
        </span>
        {connLost ? (
          <span className="game-conn-status" role="status">
            אין חיבור יציב — מנסים שוב…
          </span>
        ) : null}
      </div>

      <div className="game-room-layout">
        <div className="game-room-board-wrap">
          <div className="game-board-stage" data-testid="board-stage">
            <BoardViewport
              onGestureChange={(g) => {
                gesturingRef.current = g;
              }}
              onViewChange={() => setPreview(null)}
            >
              <SnapshotBoard
                snapshot={snapshot}
                interactive={interactive}
                lastMove={scoring ? null : lastMove}
                preview={preview}
                deadMarks={deadMarks}
                ownership={ownership}
                hoverColor={myTurn ? myColor : null}
                onPlay={onBoardClick}
              />
            </BoardViewport>
          </div>
          {preview ? (
            <div className="board-preview-bar" role="status">
              <span>
                בחירה: {preview.x + 1},{preview.y + 1} — אשרו כדי לשלוח מהלך
              </span>
              <div className="board-preview-actions">
                <button type="button" className="btn btn-primary btn-compact" disabled={busy} onClick={commitPreview}>
                  אישור מהלך
                </button>
                <button type="button" className="btn btn-secondary btn-compact" onClick={() => setPreview(null)}>
                  ביטול
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="game-room-panel" data-testid="game-controls">
          <div className="game-players game-players-compact" role="list">
            {orderedPlayers.map((p) => {
              const turn = toMove === p.color && game.status === "active" && !scoring;
              const clockMs = clockRemaining(p.color);
              const online = onlineIds.has(p.userId);
              const captures =
                p.color === "black" ? snapshot.blackPrisoners : snapshot.whitePrisoners;
              return (
                <div
                  key={p.userId}
                  className={`game-player-row${turn ? " is-turn" : ""}`}
                  role="listitem"
                >
                  <span className={`game-stone game-stone-${p.color}`} aria-hidden="true" />
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" width={28} height={28} className="game-player-avatar-sm" />
                  ) : (
                    <span className="game-player-avatar-sm" aria-hidden="true">
                      {(p.nickname ?? "?").slice(0, 1)}
                    </span>
                  )}
                  <div className="game-player-row-copy">
                    <strong>
                      {p.nickname ?? "שחקן"}
                      {p.userId === me.id ? " · אתם" : ""}
                    </strong>
                    <span>
                      {online ? "מחובר/ת" : "לא מחובר/ת"} · נלקחו {captures}
                      {turn ? " · התור" : ""}
                    </span>
                  </div>
                  {clockMs != null ? (
                    <span className={`game-clock${turn ? " is-running" : ""}`}>{formatClockMs(clockMs)}</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {scoring ? (
            <div className="game-phase-banner game-scoring-banner" data-testid="scoring-phase">
              <strong>שלב סימון וניקוד</strong>
              <p>לחצו על אבנים לסימון/ביטול מתות. שני השחקנים חייבים לאשר את אותו סימון.</p>
              {scoringOverlay?.provisionalScore ? (
                <>
                  <p className="game-score-provisional-label">ניקוד זמני (עד אישור משותף)</p>
                  <ul className="game-score-breakdown" data-testid="provisional-score">
                    <li>{formatSideBreakdownHe(scoringOverlay.provisionalScore.black, "שחור")}</li>
                    <li>{formatSideBreakdownHe(scoringOverlay.provisionalScore.white, "לבן")}</li>
                  </ul>
                  {leadingSideHe(scoringOverlay.provisionalScore) ? (
                    <p className="game-score-lead">{leadingSideHe(scoringOverlay.provisionalScore)}</p>
                  ) : null}
                </>
              ) : null}
              <p className="game-confirm-status">
                אישור שחור: {scoringOverlay?.blackConfirmed ? "כן" : "ממתין"} · אישור לבן:{" "}
                {scoringOverlay?.whiteConfirmed ? "כן" : "ממתין"}
              </p>
            </div>
          ) : null}

          {game.status === "finished" ? (
            <div className="game-phase-banner game-result-card" data-testid="game-result">
              <strong>{gameResultHeadline(game)}</strong>
              {showReplayChrome ? <p className="game-replay-mode-label">צפייה במשחק · קריאה בלבד</p> : null}
              {(() => {
                const sides = scoreSides(game.result);
                if (!sides) return null;
                return (
                  <ul className="game-score-breakdown">
                    <li>{formatSideBreakdownHe(sides.black, "שחור")}</li>
                    <li>{formatSideBreakdownHe(sides.white, "לבן")}</li>
                  </ul>
                );
              })()}
            </div>
          ) : null}

          {showReplayChrome && replayBundle ? (
            <ReplayControls
              plyIndex={replayPly}
              plyCount={replayBundle.plyCount}
              onFirst={() => setReplayPly(0)}
              onPrev={() => setReplayPly((p) => Math.max(0, p - 1))}
              onNext={() => setReplayPly((p) => Math.min(replayBundle.plyCount, p + 1))}
              onLast={() => setReplayPly(replayBundle.plyCount)}
            />
          ) : null}

          {game.status === "active" && undoOverlay?.status === "pending" ? (
            <div className="game-proposal is-enter" data-testid="undo-proposal">
              {iAmUndoRequester ? (
                <>
                  <p>ממתינים לתשובת היריב לביטול: {undoMoveLabel}</p>
                  <div className="game-proposal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      disabled={busy}
                      onClick={() => void command("withdraw_undo")}
                    >
                      ביטול הבקשה
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    {requesterNick} מבקש/ת לבטל: {undoMoveLabel}
                  </p>
                  {showUndoRespond ? (
                    <div className="game-proposal-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-compact"
                        disabled={busy}
                        onClick={() => void command("respond_undo", { accept: true })}
                      >
                        אישור ביטול
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        disabled={busy}
                        onClick={() => void command("respond_undo", { accept: false })}
                      >
                        דחייה
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {game.status === "active" && noWinnerOverlay ? (
            <div className="game-proposal" data-testid="no-winner-proposal">
              {iAmNoWinnerRequester ? (
                <>
                  <p>ממתינים לתשובת היריב</p>
                  <div className="game-proposal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      disabled={busy}
                      onClick={() => void command("withdraw_no_winner")}
                    >
                      ביטול ההצעה
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>היריב מציע סיום ללא מנצח</p>
                  <div className="game-proposal-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-compact"
                      disabled={busy}
                      onClick={() => void command("respond_no_winner", { accept: true })}
                    >
                      אישור
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      disabled={busy}
                      onClick={() => void command("respond_no_winner", { accept: false })}
                    >
                      דחייה
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {activePlay ? (
            <div className="game-toolbar">
              <button
                type="button"
                className="btn btn-primary game-action-pass"
                disabled={busy || !myTurn}
                onClick={() => void command("pass")}
              >
                ויתור על התור
              </button>
              <div className="game-toolbar-secondary">
                <button
                  type="button"
                  className="game-tool-btn"
                  disabled={!canUndo}
                  title={undoHint ?? "בקשת ביטול המהלך האחרון שלכם"}
                  aria-label={undoHint ?? "בקשת ביטול מהלך"}
                  onClick={() => void command("propose_undo")}
                >
                  <Undo2 size={16} aria-hidden="true" />
                  <span>ביטול מהלך</span>
                </button>
                <div className="game-more">
                  <button
                    ref={moreBtnRef}
                    type="button"
                    className="game-tool-btn"
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((v) => !v)}
                  >
                    <MoreHorizontal size={16} aria-hidden="true" />
                    <span>עוד</span>
                  </button>
                  {moreOpen ? (
                    <div className="game-more-menu is-open" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={busy || noWinnerPending}
                        onClick={() => {
                          setMoreOpen(false);
                          void command("propose_no_winner");
                        }}
                      >
                        סיום ללא מנצח
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="is-danger"
                        disabled={busy}
                        onClick={() => {
                          setMoreOpen(false);
                          setConfirmResign(true);
                        }}
                      >
                        <Flag size={14} aria-hidden="true" /> כניעה
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              {undoHint && !canUndo ? <p className="game-tool-hint">{undoHint}</p> : null}
            </div>
          ) : null}

          {scoring ? (
            <div className="game-toolbar">
              <button
                type="button"
                className="btn btn-primary game-action-pass"
                disabled={busy}
                onClick={() => void command("confirm_score")}
              >
                אישור תוצאה
              </button>
              <div className="game-toolbar-secondary">
                <button
                  type="button"
                  className="game-tool-btn"
                  disabled={busy}
                  onClick={() => void command("dispute_score")}
                >
                  מחלוקת / חזרה למשחק
                </button>
              </div>
            </div>
          ) : null}

          {idle && game.status === "active" && !noWinnerPending ? (
            <div className="game-proposal is-enter">
              <p>המשחק לא פעיל 48 שעות. ניתן להציע סיום ללא מנצח בהסכמה הדדית בלבד.</p>
              <button
                type="button"
                className="btn btn-primary btn-compact"
                disabled={busy}
                onClick={() => void command("propose_no_winner")}
              >
                הצעת סיום ללא מנצח
              </button>
            </div>
          ) : null}

          <GameRoomChat
            token={token!}
            gameId={game.id}
            myUserId={me.id}
            readOnly={game.status === "finished"}
          />
        </aside>
      </div>

      {confirmResign ? (
        <ResignConfirmModal
          busy={busy}
          returnFocusRef={moreBtnRef}
          onCancel={() => {
            if (busy) return;
            setConfirmResign(false);
          }}
          onConfirm={() => void command("resign")}
        />
      ) : null}
    </section>
  );
}
