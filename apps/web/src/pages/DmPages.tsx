import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import type { ChatMessageDto, DmThreadSummary } from "@go-darom/shared";
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
import { useRealtime } from "../realtime/RealtimeProvider";
import "./community.css";
import "./messaging.css";

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
  const { socket, setUnreadDmTotal } = useRealtime();
  const navigate = useNavigate();
  const narrow = useIsNarrow();
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [nextBeforeSeq, setNextBeforeSeq] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const loadedThreadRef = useRef<string | null>(null);

  const advanceRead = useCallback(async (seq: number) => {
    const t = tokenRef.current;
    if (!t || seq <= 0) return;
    try {
      const res = await markDmRead(t, threadId, seq);
      setUnreadDmTotal(res.total);
      onReadRef.current();
    } catch {
      /* ignore transient */
    }
  }, [threadId, setUnreadDmTotal]);

  useEffect(() => {
    const t = tokenRef.current;
    if (!t || !threadId) return;
    let cancelled = false;
    setPhase("loading");
    setError(null);
    setMessages([]);
    setDraft("");
    loadedThreadRef.current = null;
    fetchDmMessages(t, threadId)
      .then((page) => {
        if (cancelled) return;
        const ordered = [...page.items].reverse();
        setMessages(ordered);
        setNextBeforeSeq(page.nextBeforeSeq);
        setPhase("ready");
        loadedThreadRef.current = threadId;
        const maxSeq = ordered.reduce((m, x) => Math.max(m, x.threadSeq), 0);
        if (maxSeq > 0) void advanceRead(maxSeq);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "טעינה נכשלה");
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    if (!socket || !threadId) return;
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
  }, [socket, threadId, me?.id, advanceRead]);

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

  const peerFromMessages = messages.find((m) => m.sender.id !== me.id)?.sender ?? null;
  const displayPeer = peer ?? peerFromMessages;

  return (
    <div className="dm-chat-pane" aria-label={displayPeer ? `שיחה עם ${displayPeer.nickname}` : "שיחה"}>
      <header className="msg-header">
        {narrow && (
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/dms")}>
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
        <div>
          <h2>{displayPeer?.nickname ?? "שיחה"}</h2>
          <p className="sub">הודעה פרטית</p>
        </div>
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
      />
    </div>
  );
}

function useDmShell(activeThreadId?: string) {
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
    if (items.length === 0) setListPhase("loading");
    reloadThreads();
  }, [me?.id, me?.onboardingCompleted, reloadThreads]);

  const active = items.find((t) => t.id === activeThreadId) ?? null;
  const modeClass = narrow ? (activeThreadId ? "is-thread" : "is-list") : "";

  return {
    me,
    loading,
    items,
    listPhase,
    listError,
    active,
    modeClass,
    narrow,
    navigate,
    reloadThreads,
  };
}

export function DmInboxPage() {
  const shell = useDmShell();
  if (shell.loading && !shell.me) return <p className="container section">טוענים…</p>;
  if (!shell.loading && !shell.me) return <Navigate to="/sign-in" replace />;
  if (shell.me && !shell.me.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return (
    <section className="section messaging-page">
      <div className="container messaging-page">
        <div className={`dm-layout ${shell.modeClass}`}>
          <ThreadList
            items={shell.items}
            loading={shell.listPhase === "loading"}
            error={shell.listError}
            onSelect={(id) => shell.navigate(`/dms/${id}`)}
          />
          {!shell.narrow && (
            <div className="dm-chat-pane">
              <div className="msg-empty">בחרו שיחה מהרשימה, או פתחו הודעה חדשה מהקהילה.</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function DmThreadPage() {
  const { threadId = "" } = useParams();
  const shell = useDmShell(threadId);
  if (shell.loading && !shell.me) return <p className="container section">טוענים…</p>;
  if (!shell.loading && !shell.me) return <Navigate to="/sign-in" replace />;
  if (shell.me && !shell.me.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return (
    <section className="section messaging-page">
      <div className="container messaging-page">
        <div className={`dm-layout ${shell.modeClass}`}>
          <ThreadList
            items={shell.items}
            activeId={threadId}
            loading={shell.listPhase === "loading"}
            error={shell.listError}
            onSelect={(id) => shell.navigate(`/dms/${id}`)}
          />
          <DmConversation
            key={threadId}
            threadId={threadId}
            peer={shell.active?.peer ?? null}
            onRead={shell.reloadThreads}
          />
        </div>
      </div>
    </section>
  );
}
