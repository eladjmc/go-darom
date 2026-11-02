import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { GameProjection, LiveInviteDto, LiveInviteSettings, MemberListItem } from "@go-darom/shared";
import { useAuth } from "../auth/AuthContext";
import { useRealtime } from "../realtime/RealtimeProvider";
import { InviteFlowModal } from "./InviteFlowModal";
import {
  acceptLiveInvite,
  cancelLiveInvite,
  createLiveInvite,
  fetchActiveGame,
  fetchFinishedGames,
  fetchLiveInvites,
  formatInviteSettings,
  rejectLiveInvite,
  remainingInviteLabel,
} from "./play-api";
import { finishedGameSummaryHe, formatFinishedAtHe, opponentOf } from "./historyFormat";
import "./play.css";
import "../pages/members.css";

type Phase = "loading" | "ready" | "error";
type InviteTab = "incoming" | "outgoing";

function isInviteActive(inv: LiveInviteDto, now: number): boolean {
  return inv.status === "pending" && new Date(inv.expiresAt).getTime() > now;
}

function phaseLabel(game: GameProjection, myId: string): string {
  if (game.status === "finished") return "המשחק הסתיים";
  if (game.phase === "scoring") return "סימון אבנים / ניקוד";
  const board = game.board as { toMove?: string };
  const myColor = game.blackUserId === myId ? "black" : "white";
  return board.toMove === myColor ? "התור שלכם" : "ממתינים ליריב";
}

function clockSummary(game: GameProjection, myId: string, now: number): string | null {
  if (game.clockMode !== "absolute_15m" || !game.clock) return null;
  const myColor = game.blackUserId === myId ? "black" : "white";
  const remaining = Number(game.clock[myColor] ?? NaN);
  if (!Number.isFinite(remaining)) return "שעון 15 דק׳";
  const board = game.board as { toMove?: string };
  let ms = remaining;
  if (board.toMove === myColor && typeof game.clock.updatedAt === "string") {
    const updatedAt = new Date(game.clock.updatedAt).getTime();
    if (game.clock.runningFor === myColor) ms = Math.max(0, remaining - (now - updatedAt));
  }
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `שעון ${m}:${r.toString().padStart(2, "0")}`;
}

function PartyAvatar({
  nickname,
  avatarUrl,
  size = 40,
}: {
  nickname: string | null;
  avatarUrl: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return <img className="play-hub-avatar" src={avatarUrl} alt="" width={size} height={size} />;
  }
  return (
    <span className="play-hub-avatar play-hub-avatar-fallback" aria-hidden="true" style={{ width: size, height: size }}>
      {(nickname ?? "?").slice(0, 1)}
    </span>
  );
}

export function PlayHubPage() {
  const { token, me } = useAuth();
  const { socket, pushToast } = useRealtime();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<{ gameId: string; game: GameProjection } | null>(null);
  const [invites, setInvites] = useState<LiveInviteDto[]>([]);
  const [history, setHistory] = useState<GameProjection[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [actingId, setActingId] = useState<string | null>(null);
  const [inviteTab, setInviteTab] = useState<InviteTab>("incoming");
  const inviteCtaRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [activeRes, invitesRes, historyRes] = await Promise.all([
      fetchActiveGame(token),
      fetchLiveInvites(token),
      fetchFinishedGames(token, { limit: 10 }),
    ]);
    setActive(activeRes);
    setInvites(invitesRes.items ?? []);
    setHistory(historyRes.items ?? []);
    setHistoryCursor(historyRes.nextCursor ?? null);
  }, [token]);

  const loadMoreHistory = useCallback(async () => {
    if (!token || !historyCursor || historyLoadingMore) return;
    setHistoryLoadingMore(true);
    try {
      const page = await fetchFinishedGames(token, { cursor: historyCursor, limit: 10 });
      setHistory((prev) => [...prev, ...(page.items ?? [])]);
      setHistoryCursor(page.nextCursor ?? null);
    } finally {
      setHistoryLoadingMore(false);
    }
  }, [token, historyCursor, historyLoadingMore]);

  useEffect(() => {
    if (!token || !me?.onboardingCompleted) return;
    let cancelled = false;
    setPhase("loading");
    refresh()
      .then(() => {
        if (!cancelled) {
          setPhase("ready");
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPhase("error");
          setError(err instanceof Error ? err.message : "טעינת המשחקים נכשלה");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, me?.onboardingCompleted, refresh]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNotif = (n: { type?: string }) => {
      if (
        n.type === "game.invite" ||
        n.type === "game.invite_accepted" ||
        n.type === "game.invite_rejected" ||
        n.type === "game.invite_cancelled" ||
        n.type === "game.live_turn"
      ) {
        void refresh().catch(() => undefined);
      }
    };
    socket.on("notification:created", onNotif);
    socket.on("notification:toast", onNotif);
    return () => {
      socket.off("notification:created", onNotif);
      socket.off("notification:toast", onNotif);
    };
  }, [socket, refresh]);

  const incoming = useMemo(
    () => invites.filter((i) => i.recipientId === me?.id && isInviteActive(i, now)),
    [invites, me?.id, now],
  );
  const outgoing = useMemo(
    () => invites.filter((i) => i.inviterId === me?.id && isInviteActive(i, now)),
    [invites, me?.id, now],
  );

  useEffect(() => {
    if (inviteTab === "incoming" && incoming.length === 0 && outgoing.length > 0) {
      setInviteTab("outgoing");
    } else if (inviteTab === "outgoing" && outgoing.length === 0 && incoming.length > 0) {
      setInviteTab("incoming");
    }
  }, [incoming.length, outgoing.length, inviteTab]);

  const startInviteFlow = () => {
    if (active) {
      pushToast({
        title: "משחק פעיל",
        body: "כבר יש לכם משחק חי. סיימו אותו לפני הזמנה חדשה.",
        dedupeKey: "hub-active-block",
      });
      return;
    }
    setInviteError(null);
    setInviteOpen(true);
  };

  const submitInvite = async (opponent: MemberListItem, settings: LiveInviteSettings) => {
    if (!token) return;
    setInviteBusy(true);
    setInviteError(null);
    try {
      await createLiveInvite(token, opponent.id, settings);
      pushToast({
        title: "ההזמנה נשלחה",
        body: `ההזמנה ל־${opponent.nickname ?? "חבר"} ממתינה לאישור.`,
        dedupeKey: "hub-invite-sent",
      });
      setInviteOpen(false);
      setInviteTab("outgoing");
      await refresh();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "שליחת ההזמנה נכשלה");
    } finally {
      setInviteBusy(false);
    }
  };

  const actInvite = async (id: string, action: "accept" | "reject" | "cancel") => {
    if (!token) return;
    setActingId(id);
    try {
      if (action === "accept") {
        const out = await acceptLiveInvite(token, id);
        pushToast({
          title: "ההזמנה התקבלה",
          body: "עוברים למשחק.",
          dedupeKey: "hub-invite-accept",
        });
        navigate(`/play/${out.gameId}`);
        return;
      }
      if (action === "reject") {
        await rejectLiveInvite(token, id);
        pushToast({ title: "ההזמנה נדחתה", body: "ההזמנה הוסרה.", dedupeKey: "hub-invite-reject" });
      } else {
        await cancelLiveInvite(token, id);
        pushToast({ title: "ההזמנה בוטלה", body: "ההזמנה הוסרה.", dedupeKey: "hub-invite-cancel" });
      }
      await refresh();
    } catch (err: unknown) {
      pushToast({
        title: "הפעולה נכשלה",
        body: err instanceof Error ? err.message : "נסו שוב בעוד רגע.",
        dedupeKey: "hub-invite-error",
      });
    } finally {
      setActingId(null);
    }
  };

  if (!me) return null;

  const listed = inviteTab === "incoming" ? incoming : outgoing;

  return (
    <section className="play-hub section">
      <div className="play-hub-inner">
        <header className="play-hub-header">
          <div className="play-hub-header-copy">
            <h1>משחקים</h1>
            <p className="play-hub-lede">הזמינו חבר למשחק חי — בלי דירוגים ובלי טורנירים.</p>
          </div>
          <div className="play-hub-header-actions">
            <button
              ref={inviteCtaRef}
              type="button"
              className="btn btn-primary play-hub-cta"
              onClick={startInviteFlow}
              disabled={Boolean(active) || phase === "loading"}
              title={active ? "יש משחק חי פעיל" : undefined}
            >
              משחק חדש
            </button>
          </div>
        </header>

        {phase === "loading" ? <p className="play-hub-loading">טוענים את המשחקים שלכם…</p> : null}
        {phase === "error" ? (
          <div className="play-error-panel" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              onClick={() =>
                void refresh().then(() => {
                  setPhase("ready");
                  setError(null);
                })
              }
            >
              ניסיון חוזר
            </button>
          </div>
        ) : null}

        {phase === "ready" ? (
          <div className="play-hub-dashboard">
            <section className="play-hub-panel play-hub-panel-primary" aria-labelledby="my-game-title">
              <div className="play-hub-panel-head">
                <h2 id="my-game-title">המשחק שלי</h2>
              </div>
              {!active ? (
                <div className="play-hub-empty play-hub-empty-compact">
                  <div>
                    <p className="play-hub-empty-title">אין משחק חי כרגע</p>
                    <p className="play-hub-empty-copy">הזמינו חבר ותתחילו משחק ידידותי.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact"
                    onClick={startInviteFlow}
                    disabled={Boolean(active)}
                  >
                    משחק חדש
                  </button>
                </div>
              ) : (
                <article className="play-hub-active">
                  {(() => {
                    const opp = active.game.players.find((p) => p.userId !== me.id);
                    const clock = clockSummary(active.game, me.id, now);
                    return (
                      <>
                        <div className="play-hub-active-main">
                          <PartyAvatar nickname={opp?.nickname ?? null} avatarUrl={opp?.avatarUrl ?? null} size={44} />
                          <div className="play-hub-active-copy">
                            <strong>{opp?.nickname ?? "יריב"}</strong>
                            <ul className="play-hub-meta-chips" aria-label="פרטי המשחק">
                              <li>
                                {active.game.boardSize}×{active.game.boardSize}
                              </li>
                              <li className={phaseLabel(active.game, me.id) === "התור שלכם" ? "is-turn" : undefined}>
                                {phaseLabel(active.game, me.id)}
                              </li>
                              <li>{clock ?? "ללא שעון"}</li>
                            </ul>
                          </div>
                        </div>
                        <Link className="btn btn-primary" to={`/play/${active.gameId}`}>
                          חזרה למשחק
                        </Link>
                      </>
                    );
                  })()}
                </article>
              )}
            </section>

            <section className="play-hub-panel play-hub-panel-secondary" aria-labelledby="invites-title">
              <div className="play-hub-panel-head play-hub-panel-head-split">
                <h2 id="invites-title">הזמנות למשחק</h2>
                <div className="play-hub-tabs" role="tablist" aria-label="סוג הזמנות">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={inviteTab === "incoming"}
                    className={`play-hub-tab${inviteTab === "incoming" ? " is-on" : ""}`}
                    onClick={() => setInviteTab("incoming")}
                  >
                    נכנסות
                    {incoming.length > 0 ? <span className="play-hub-tab-count">{incoming.length}</span> : null}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={inviteTab === "outgoing"}
                    className={`play-hub-tab${inviteTab === "outgoing" ? " is-on" : ""}`}
                    onClick={() => setInviteTab("outgoing")}
                  >
                    יוצאות
                    {outgoing.length > 0 ? <span className="play-hub-tab-count">{outgoing.length}</span> : null}
                  </button>
                </div>
              </div>

              {listed.length === 0 ? (
                <div className="play-hub-empty play-hub-empty-compact">
                  <p className="play-hub-empty-title">
                    {inviteTab === "incoming" ? "אין הזמנות נכנסות" : "אין הזמנות יוצאות"}
                  </p>
                  <p className="play-hub-empty-copy">
                    {inviteTab === "incoming"
                      ? "כשחבר יזמין אתכם — ההזמנה תופיע כאן."
                      : "הזמנות ששלחתם יופיעו כאן עד לקבלה או לדחייה."}
                  </p>
                </div>
              ) : (
                <ul className="play-hub-invite-list" role="tabpanel">
                  {listed.map((inv) => {
                    const party = inviteTab === "incoming" ? inv.inviter : inv.recipient;
                    return (
                      <li key={inv.id} className="play-hub-invite">
                        <div className="play-hub-invite-main">
                          <PartyAvatar nickname={party.nickname} avatarUrl={party.avatarUrl} size={36} />
                          <div className="play-hub-invite-copy">
                            <strong>{party.nickname ?? "חבר"}</strong>
                            <p>{formatInviteSettings(inv.settings)}</p>
                            <p className="play-hub-invite-ttl">
                              נותרו <time dateTime={inv.expiresAt}>{remainingInviteLabel(inv.expiresAt, now)}</time>
                            </p>
                          </div>
                        </div>
                        <div className="play-hub-invite-actions">
                          {inviteTab === "incoming" ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-compact"
                                disabled={actingId === inv.id || Boolean(active)}
                                onClick={() => void actInvite(inv.id, "accept")}
                              >
                                קבלה
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-compact"
                                disabled={actingId === inv.id}
                                onClick={() => void actInvite(inv.id, "reject")}
                              >
                                דחייה
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-compact"
                              disabled={actingId === inv.id}
                              onClick={() => void actInvite(inv.id, "cancel")}
                            >
                              ביטול
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section
              className="play-hub-panel play-hub-panel-history"
              aria-labelledby="history-title"
              data-testid="play-history"
            >
              <div className="play-hub-panel-head">
                <h2 id="history-title">משחקים קודמים</h2>
              </div>
              {history.length === 0 ? (
                <div className="play-hub-empty play-hub-empty-compact">
                  <p className="play-hub-empty-title">עדיין אין משחקים שמורים</p>
                  <p className="play-hub-empty-copy">משחקים שסיימתם יופיעו כאן לצפייה פרטית.</p>
                </div>
              ) : (
                <>
                  <ul className="play-hub-history-list">
                    {history.map((g) => {
                      const opp = opponentOf(g, me.id);
                      return (
                        <li key={g.id} className="play-hub-history-row">
                          <div className="play-hub-history-main">
                            <PartyAvatar
                              nickname={opp?.nickname ?? null}
                              avatarUrl={opp?.avatarUrl ?? null}
                              size={36}
                            />
                            <div className="play-hub-history-copy">
                              <strong>{opp?.nickname ?? "יריב"}</strong>
                              <ul className="play-hub-meta-chips" aria-label="סיכום משחק">
                                <li>
                                  {g.boardSize}×{g.boardSize}
                                </li>
                                <li>{formatFinishedAtHe(g.finishedAt)}</li>
                              </ul>
                              <p className="play-hub-history-result">{finishedGameSummaryHe(g)}</p>
                            </div>
                          </div>
                          <Link className="btn btn-secondary btn-compact" to={`/play/${g.id}`}>
                            צפייה במשחק
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {historyCursor ? (
                    <div className="play-hub-history-more">
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        disabled={historyLoadingMore}
                        onClick={() => void loadMoreHistory()}
                      >
                        {historyLoadingMore ? "טוענים…" : "עוד משחקים"}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        ) : null}
      </div>

      {inviteOpen && token ? (
        <InviteFlowModal
          token={token}
          selfId={me.id}
          busy={inviteBusy}
          error={inviteError}
          returnFocusRef={inviteCtaRef}
          onCancel={() => {
            setInviteOpen(false);
            setInviteError(null);
          }}
          onSubmit={(opponent, settings) => void submitInvite(opponent, settings)}
        />
      ) : null}
    </section>
  );
}
