import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { CircleDot } from "lucide-react";
import type { ChatMessageDto, DmThreadSummary, LiveInviteSettings, MemberListItem } from "@go-darom/shared";
import { ApiError } from "../auth/api";
import { useAuth } from "../auth/AuthContext";
import {
  createReport,
  fetchDmMessages,
  fetchDmThreads,
  markDmRead,
  postDmMessage,
} from "../auth/community-api";
import { ChatComposer } from "../components/chat/ChatComposer";
import { MessageThread } from "../components/chat/MessageThread";
import { InviteFlowModal } from "../play/InviteFlowModal";
import { createLiveInvite, fetchActiveGame } from "../play/play-api";
import { useRealtime } from "../realtime/RealtimeProvider";
import { MESSAGES_PATH, messagesConversationPath } from "../routing/chatRoutes";
import "./community.css";
import "./messaging.css";
import "../play/play.css";

function useIsNarrow(breakpoint = 860) {
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

function ThreadList({
  items,
  activeId,
  loading,
  error,
  onSelect,
}: {
  items: DmThreadSummary[];
  activeId?: string;
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="dm-list-pane">
      <h1>הודעות</h1>
      {error && (
        <p className="members-error" role="alert" style={{ padding: "0 1rem" }}>
          {error}
        </p>
      )}
      {loading && items.length === 0 && <p className="msg-status">טוענים שיחות…</p>}
      {!loading && items.length === 0 && !error && (
        <p className="msg-empty">
          אין שיחות עדיין —{" "}
          <Link to="/community">פתחו הודעה מרשימת החברים</Link>.
        </p>
      )}
      <ul className="dm-thread-list">
        {items.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              className={`dm-thread-item${activeId === t.id ? " is-active" : ""}`}
              onClick={() => onSelect(t.id)}
              aria-current={activeId === t.id ? "page" : undefined}
            >
              {t.peer.avatarUrl ? (
                <img className="chat-avatar" src={t.peer.avatarUrl} alt="" width={40} height={40} />
              ) : (
                <span className="chat-avatar is-fallback" aria-hidden="true">
                  {t.peer.nickname.slice(0, 1)}
                </span>
              )}
              <span className="dm-thread-copy">
                <strong>
                  {t.peer.nickname}
                  {t.unreadCount > 0 && (
                    <span className="dm-unread-dot" aria-label={`${t.unreadCount} לא נקראו`}>
                      {t.unreadCount > 99 ? "99+" : t.unreadCount}
                    </span>
                  )}
                </strong>
                <span className="preview">{t.lastMessagePreview ?? "אין הודעות עדיין"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DmConversation({
  threadId,
  peer,
  onRead,
}: {
  threadId: string;
  peer: DmThreadSummary["peer"] | null;
  onRead: () => void;
}) {
  const { me, token } = useAuth();
  const { socket, setUnreadDmTotal, onlineIds, pushToast } = useRealtime();
  const navigate = useNavigate();
  const narrow = useIsNarrow();
  const inviteBtnRef = useRef<HTMLButtonElement | null>(null);
  const inviteTitleId = useId();
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [accessKind, setAccessKind] = useState<"forbidden" | "not-found" | null>(null);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [nextBeforeSeq, setNextBeforeSeq] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const advanceRead = useCallback(
    async (seq: number) => {
      const t = tokenRef.current;
      if (!t || seq <= 0) return;
      try {
        const res = await markDmRead(t, threadId, seq);
        setUnreadDmTotal(res.total);
        onReadRef.current();
      } catch {
        /* ignore transient */
      }
    },
    [threadId, setUnreadDmTotal],
  );

  useEffect(() => {
    const t = tokenRef.current;
    if (!t || !threadId) return;
    let cancelled = false;
    setPhase("loading");
    setError(null);
    setAccessKind(null);
    setMessages([]);
    setDraft("");
    fetchDmMessages(t, threadId)
      .then((page) => {
        if (cancelled) return;
        const ordered = [...page.items].reverse();
        setMessages(ordered);
        setNextBeforeSeq(page.nextBeforeSeq);
        setPhase("ready");
        const maxSeq = ordered.reduce((m, x) => Math.max(m, x.threadSeq), 0);
        if (maxSeq > 0) void advanceRead(maxSeq);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 403) {
            setAccessKind("forbidden");
            setError(err.message);
            setPhase("error");
            return;
          }
          if (err.status === 404) {
            setAccessKind("not-found");
            setError(err.message);
            setPhase("error");
            return;
          }
        }
        setError(err instanceof Error ? err.message : "טעינה נכשלה");
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, advanceRead]);

  useEffect(() => {
    if (!socket || !threadId || accessKind) return;
    socket.emit("chat:join", { room: { dmThreadId: threadId } });
    const onMessage = (msg: ChatMessageDto) => {
      if (msg.threadId !== threadId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender.id !== me?.id) void advanceRead(msg.threadSeq);
    };
    const onReconnect = () => {
      socket.emit("chat:join", { room: { dmThreadId: threadId } });
    };
    socket.on("chat:message", onMessage);
    socket.on("connect", onReconnect);
    return () => {
      socket.emit("chat:leave", { room: { dmThreadId: threadId } });
      socket.off("chat:message", onMessage);
      socket.off("connect", onReconnect);
    };
  }, [socket, threadId, me?.id, advanceRead, accessKind]);

  const send = useCallback(
    async (text: string) => {
      const t = tokenRef.current;
      if (!t) throw new Error("לא מחוברים");
      setSending(true);
      setError(null);
      try {
        const { message } = await postDmMessage(t, threadId, text, crypto.randomUUID());
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
        await advanceRead(message.threadSeq);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שליחה נכשלה");
        throw err;
      } finally {
        setSending(false);
      }
    },
    [threadId, advanceRead],
  );

  const loadOlder = async () => {
    const t = tokenRef.current;
    if (!t || nextBeforeSeq == null || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchDmMessages(t, threadId, nextBeforeSeq);
      const older = [...page.items].reverse();
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !ids.has(m.id)), ...prev];
      });
      setNextBeforeSeq(page.nextBeforeSeq);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת הודעות קודמות נכשלה");
    } finally {
      setLoadingOlder(false);
    }
  };

  if (!me) return null;

  if (accessKind) {
    return (
      <div className="dm-chat-pane" role="alert">
        <div className="dm-access-error">
          <h2>{accessKind === "forbidden" ? "אין הרשאה לשיחה" : "השיחה לא נמצאה"}</h2>
          <p>
            {accessKind === "forbidden"
              ? "אין לכם גישה לשיחה הפרטית הזו. ייתכן שאינכם משתתפים בה."
              : "ייתכן שהקישור אינו תקין או שהשיחה נמחקה."}
          </p>
          {error && <p className="members-error">{error}</p>}
          <Link className="btn btn-primary" to={MESSAGES_PATH}>
            חזרה להודעות
          </Link>
        </div>
      </div>
    );
  }

  const peerFromMessages = messages.find((m) => m.sender.id !== me.id)?.sender ?? null;
  const displayPeer = peer ?? peerFromMessages;

  const inviteOpponent: MemberListItem | null = displayPeer
    ? {
        id: displayPeer.id,
        nickname: displayPeer.nickname,
        avatarUrl: displayPeer.avatarUrl,
        online: onlineIds.has(displayPeer.id),
      }
    : null;

  const openGameInvite = async () => {
    if (!token || !inviteOpponent || inviteOpponent.id === me.id) return;
    if (!onlineIds.has(inviteOpponent.id)) {
      pushToast({
        title: "היריב אינו מחובר",
        body: "למשחק חי אפשר להזמין רק חבר שמחובר כרגע.",
        dedupeKey: "dm-invite-offline",
      });
      return;
    }
    try {
      const active = await fetchActiveGame(token);
      if (active) {
        pushToast({
          title: "משחק פעיל",
          body: "כבר יש לכם משחק חי. סיימו אותו לפני הזמנה חדשה.",
          dedupeKey: "dm-invite-active",
        });
        return;
      }
    } catch (err: unknown) {
      pushToast({
        title: "לא ניתן להזמין",
        body: err instanceof Error ? err.message : "נסו שוב בעוד רגע.",
        dedupeKey: "dm-invite-check-error",
      });
      return;
    }
    setInviteError(null);
    setInviteOpen(true);
  };

  const submitGameInvite = async (opponent: MemberListItem, settings: LiveInviteSettings) => {
    if (!token) return;
    setInviteBusy(true);
    setInviteError(null);
    try {
      await createLiveInvite(token, opponent.id, settings);
      pushToast({
        title: "ההזמנה נשלחה",
        body: `ההזמנה ל־${opponent.nickname} ממתינה לאישור.`,
        dedupeKey: "dm-invite-sent",
      });
      setInviteOpen(false);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "שליחת ההזמנה נכשלה");
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <div className="dm-chat-pane" aria-label={displayPeer ? `שיחה עם ${displayPeer.nickname}` : "שיחה"}>
      <header className="msg-header">
        {narrow && (
          <button type="button" className="btn btn-secondary" onClick={() => navigate(MESSAGES_PATH)}>
            חזרה
          </button>
        )}
        {displayPeer?.avatarUrl ? (
          <img className="chat-avatar" src={displayPeer.avatarUrl} alt="" width={36} height={36} />
        ) : (
          <span className="chat-avatar is-fallback" aria-hidden="true">
            {(displayPeer?.nickname || "?").slice(0, 1)}
          </span>
        )}
        <div className="msg-header-copy">
          <h2 id={inviteTitleId}>{displayPeer?.nickname ?? "שיחה"}</h2>
          <p className="sub">הודעה פרטית</p>
        </div>
        {inviteOpponent && inviteOpponent.id !== me.id ? (
          <button
            ref={inviteBtnRef}
            type="button"
            className="dm-invite-game-btn"
            onClick={() => void openGameInvite()}
            aria-labelledby={`${inviteTitleId}-invite`}
            title="הזמנה למשחק חי"
          >
            <CircleDot size={16} aria-hidden="true" />
            <span id={`${inviteTitleId}-invite`} className="dm-invite-game-label">
              הזמנה למשחק
            </span>
          </button>
        ) : null}
      </header>
      {error && messages.length > 0 && (
        <p className="members-error" role="alert" style={{ margin: "0.5rem 1rem" }}>
          {error}
        </p>
      )}
      <MessageThread
        threadKey={threadId}
        messages={messages}
        myUserId={me.id}
        loading={phase === "loading"}
        emptyLabel="אין הודעות עדיין — כתבו את הראשונה."
        error={phase === "error" ? error : null}
        hasOlder={nextBeforeSeq != null}
        loadingOlder={loadingOlder}
        onLoadOlder={() => void loadOlder()}
        onReport={(m) =>
          void createReport(token!, {
            targetType: "dm_message",
            messageId: m.id,
            reason: "דיווח על הודעה פרטית",
          })
            .then(() => setError("הדיווח נשלח למנהלים."))
            .catch((e: unknown) => setError(e instanceof Error ? e.message : "דיווח נכשל"))
        }
      />
      <ChatComposer
        draft={draft}
        onDraftChange={setDraft}
        onSend={send}
        sending={sending}
        placeholder="כתבו הודעה…"
        disabled={phase === "error" && messages.length === 0}
      />
      {inviteOpen && token && inviteOpponent ? (
        <InviteFlowModal
          token={token}
          selfId={me.id}
          busy={inviteBusy}
          error={inviteError}
          initialOpponent={inviteOpponent}
          initialStep="settings"
          lockOpponent
          returnFocusRef={inviteBtnRef}
          onCancel={() => {
            setInviteOpen(false);
            setInviteError(null);
          }}
          onSubmit={(opponent, settings) => void submitGameInvite(opponent, settings)}
        />
      ) : null}
    </div>
  );
}

/** Inbox + optional conversation under `/messages` and `/messages/:conversationId`. */
export function DmInboxPage() {
  const { "*": splat = "" } = useParams();
  const conversationId = splat.split("/").filter(Boolean)[0] ?? "";
  const { me, token, loading } = useAuth();
  const { refreshDmUnread } = useRealtime();
  const navigate = useNavigate();
  const narrow = useIsNarrow();
  const [items, setItems] = useState<DmThreadSummary[]>([]);
  const [listPhase, setListPhase] = useState<"loading" | "ready" | "error">("loading");
  const [listError, setListError] = useState<string | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const reloadThreads = useCallback(() => {
    const t = tokenRef.current;
    if (!t || !me?.onboardingCompleted) return;
    fetchDmThreads(t)
      .then((res) => {
        setItems(res.items);
        setListPhase("ready");
        setListError(null);
        refreshDmUnread();
      })
      .catch((err: unknown) => {
        setListError(err instanceof Error ? err.message : "טעינה נכשלה");
        setListPhase("error");
      });
  }, [me?.onboardingCompleted, refreshDmUnread]);

  useEffect(() => {
    if (!token || !me?.onboardingCompleted) return;
    setListPhase((prev) => (prev === "ready" ? prev : "loading"));
    reloadThreads();
  }, [me?.id, me?.onboardingCompleted, reloadThreads, token]);

  if (loading && !me) return <p className="container section">טוענים…</p>;
  if (!loading && !me) return <Navigate to="/sign-in" replace />;
  if (me && !me.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  const active = items.find((t) => t.id === conversationId) ?? null;
  const modeClass = narrow ? (conversationId ? "is-thread" : "is-list") : "";

  return (
    <section className="section messaging-page is-chat-focus">
      <div className="chat-frame">
        <div className={`dm-layout ${modeClass}`}>
          <ThreadList
            items={items}
            activeId={conversationId || undefined}
            loading={listPhase === "loading"}
            error={listError}
            onSelect={(id) => navigate(messagesConversationPath(id))}
          />
          {conversationId ? (
            <DmConversation
              key={conversationId}
              threadId={conversationId}
              peer={active?.peer ?? null}
              onRead={reloadThreads}
            />
          ) : (
            !narrow && (
              <div className="dm-chat-pane">
                <div className="msg-empty">בחרו שיחה מהרשימה, או פתחו הודעה חדשה מהקהילה.</div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

/** @deprecated Prefer DmInboxPage under `/messages/*`; kept for typed imports during transition. */
export function DmThreadPage() {
  return <DmInboxPage />;
}
