import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import type { ChatMessageDto, MemberListItem } from "@go-darom/shared";
import { useAuth } from "../auth/AuthContext";
import {
  blockUser,
  createReport,
  fetchCommunityMessages,
  fetchMembers,
  markCommunityRead,
  openDmThread,
  postCommunityMessage,
} from "../auth/community-api";
import { rememberReturnIntent } from "../auth/return-intent";
import { ChatComposer } from "../components/chat/ChatComposer";
import { MessageThread } from "../components/chat/MessageThread";
import { useRealtime } from "../realtime/RealtimeProvider";
import {
  COMMUNITY_CHAT_PATH,
  COMMUNITY_PATH,
  messagesConversationPath,
} from "../routing/chatRoutes";
import "./community.css";
import "./members.css";
import "./messaging.css";

type Tab = "chat" | "members";

function tabFromPath(pathname: string): Tab {
  return pathname.startsWith(COMMUNITY_CHAT_PATH) ? "chat" : "members";
}

export function CommunityPage() {
  const { me, token, loading } = useAuth();
  const { socket, onlineIds } = useRealtime();
  const navigate = useNavigate();
  const location = useLocation();
  const tab = tabFromPath(location.pathname);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [chatPhase, setChatPhase] = useState<"loading" | "ready" | "error">("loading");
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [nextBeforeSeq, setNextBeforeSeq] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [q, setQ] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [membersPhase, setMembersPhase] = useState<"loading" | "ready" | "error">("loading");
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const initialChatLoad = useRef(false);

  useEffect(() => {
    const t = tokenRef.current;
    if (!t || !me?.onboardingCompleted) return;
    if (initialChatLoad.current) return;
    let cancelled = false;
    setChatPhase("loading");
    setChatError(null);
    fetchCommunityMessages(t)
      .then((page) => {
        if (cancelled) return;
        const ordered = [...page.items].reverse();
        setMessages(ordered);
        setNextBeforeSeq(page.nextBeforeSeq);
        setChatPhase("ready");
        initialChatLoad.current = true;
        const maxSeq = ordered.reduce((m, x) => Math.max(m, x.threadSeq), 0);
        if (maxSeq > 0) void markCommunityRead(t, maxSeq);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setChatError(err instanceof Error ? err.message : "טעינת הצ׳אט נכשלה");
          setChatPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [me?.id, me?.onboardingCompleted]);

  useEffect(() => {
    if (!socket || !me?.onboardingCompleted) return;
    socket.emit("chat:join", { room: "community" });
    const onMessage = (msg: ChatMessageDto) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      const t = tokenRef.current;
      if (t && msg.sender.id !== me.id) {
        void markCommunityRead(t, msg.threadSeq);
      }
    };
    const onDeleted = (payload: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { ...m, body: "", deletedAt: new Date().toISOString() } : m)),
      );
    };
    const onReconnect = () => {
      socket.emit("chat:join", { room: "community" });
    };
    socket.on("chat:message", onMessage);
    socket.on("chat:messageDeleted", onDeleted);
    socket.on("connect", onReconnect);
    return () => {
      socket.emit("chat:leave", { room: "community" });
      socket.off("chat:message", onMessage);
      socket.off("chat:messageDeleted", onDeleted);
      socket.off("connect", onReconnect);
    };
  }, [socket, me?.onboardingCompleted, me?.id]);

  useEffect(() => {
    if (!token || !me?.onboardingCompleted || tab !== "members") return;
    let cancelled = false;
    setMembersPhase("loading");
    fetchMembers(token, q || undefined, onlineOnly)
      .then((res) => {
        if (!cancelled) {
          setMembers(res.items);
          setMembersPhase("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setMembersPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token, me?.onboardingCompleted, tab, q, onlineOnly]);

  const sendChat = useCallback(
    async (text: string) => {
      if (!token) throw new Error("לא מחוברים");
      setSending(true);
      setChatError(null);
      try {
        const { message } = await postCommunityMessage(token, text, crypto.randomUUID());
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
        await markCommunityRead(token, message.threadSeq);
      } catch (err) {
        setChatError(err instanceof Error ? err.message : "שליחה נכשלה");
        throw err;
      } finally {
        setSending(false);
      }
    },
    [token],
  );

  if (loading && !me) {
    return <p className="container section">טוענים…</p>;
  }

  if (!me) {
    return (
      <section className="section placeholder-page">
        <div className="container">
          <div className="state-block placeholder-shell">
            <h1 className="section-title">הקהילה</h1>
            <p className="section-lede">התחברו כדי לשוחח, לראות חברים ומי מחובר.</p>
            <Link
              className="btn btn-primary"
              to="/sign-in"
              onClick={() => rememberReturnIntent(`${location.pathname}${location.search}`)}
            >
              התחברות עם Google
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!me.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  const loadOlder = async () => {
    if (!token || nextBeforeSeq == null || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchCommunityMessages(token, nextBeforeSeq);
      const older = [...page.items].reverse();
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !ids.has(m.id)), ...prev];
      });
      setNextBeforeSeq(page.nextBeforeSeq);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "טעינת הודעות קודמות נכשלה");
    } finally {
      setLoadingOlder(false);
    }
  };

  const startDm = async (peerUserId: string) => {
    if (!token) return;
    try {
      const { threadId } = await openDmThread(token, peerUserId);
      navigate(messagesConversationPath(threadId));
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "פתיחת שיחה נכשלה");
    }
  };

  const chatFocus = tab === "chat";

  return (
    <section className={`section messaging-page${chatFocus ? " is-chat-focus" : ""}`}>
      <div className="chat-frame">
        <div className="chat-frame-head">
          <h1 className="section-title">הקהילה</h1>
          <p className="section-lede">צ׳אט מרכזי וחברים — בלי אימיילים ציבוריים.</p>

          <div className="community-tabs" role="tablist" aria-label="אזור קהילה">
            <Link
              role="tab"
              aria-selected={tab === "chat"}
              className={`tab${tab === "chat" ? " is-active" : ""}`}
              to={COMMUNITY_CHAT_PATH}
            >
              צ׳אט
            </Link>
            <Link
              role="tab"
              aria-selected={tab === "members"}
              className={`tab${tab === "members" ? " is-active" : ""}`}
              to={COMMUNITY_PATH}
            >
              חברים
            </Link>
          </div>

          {chatError && (
            <p className="members-error" role="alert">
              {chatError}
            </p>
          )}
        </div>

        {tab === "chat" && (
          <div className="msg-shell community-chat-wrap" aria-label="צ׳אט הקהילה">
            <header className="msg-header">
              <div>
                <h2>צ׳אט הקהילה</h2>
                <p className="sub">שיחה פתוחה לכל החברים</p>
              </div>
            </header>
            <MessageThread
              threadKey="community"
              messages={messages}
              myUserId={me.id}
              loading={chatPhase === "loading"}
              emptyLabel="עדיין אין הודעות — היו הראשונים לכתוב."
              error={chatPhase === "error" ? chatError : null}
              hasOlder={nextBeforeSeq != null}
              loadingOlder={loadingOlder}
              onLoadOlder={() => void loadOlder()}
              onReport={(m) =>
                void createReport(token!, {
                  targetType: "public_message",
                  messageId: m.id,
                  reason: "דיווח על הודעה בקהילה",
                })
                  .then(() => setChatError("הדיווח נשלח. תודה."))
                  .catch((e: unknown) => setChatError(e instanceof Error ? e.message : "דיווח נכשל"))
              }
            />
            <ChatComposer
              draft={draft}
              onDraftChange={setDraft}
              onSend={sendChat}
              sending={sending}
              disabled={chatPhase === "error" && messages.length === 0}
              placeholder="כתבו הודעה לקהילה…"
            />
          </div>
        )}

        {tab === "members" && (
          <div className="members-directory community-directory">
            <div className="filter-row">
              <form
                className="members-search"
                onSubmit={(e) => e.preventDefault()}
                style={{ flex: 1, marginBottom: 0 }}
              >
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="חיפוש לפי כינוי"
                  aria-label="חיפוש לפי כינוי"
                />
              </form>
              <label className="toggle-switch">
                <span className="toggle-switch-label">מחוברים בלבד</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                  aria-checked={onlineOnly}
                />
                <span className="toggle-switch-track" aria-hidden="true">
                  <span className="toggle-switch-thumb" />
                </span>
              </label>
            </div>
            {membersPhase === "loading" && <p className="auth-status">טוענים חברים…</p>}
            {membersPhase === "ready" && members.length === 0 && <p>לא נמצאו חברים.</p>}
            {membersPhase === "error" && <p className="members-error">טעינת החברים נכשלה.</p>}
            <ul className="member-list member-list-compact">
              {members.map((member) => {
                const online = onlineIds.has(member.id) || member.online;
                return (
                  <li key={member.id} className="member-row">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" width={36} height={36} />
                    ) : (
                      <span className="member-avatar-fallback" aria-hidden="true">
                        {member.nickname.slice(0, 1)}
                      </span>
                    )}
                    <div className="member-row-main">
                      <strong>{member.nickname}</strong>
                      <span className={online ? "online" : "offline"}>
                        <span className={`presence-dot${online ? " is-on" : ""}`} aria-hidden="true" />
                        {online ? "מחובר/ת" : "לא מחובר/ת"}
                      </span>
                    </div>
                    {member.id !== me.id && (
                      <div className="member-row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          onClick={() => void startDm(member.id)}
                        >
                          הודעה פרטית
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          onClick={() =>
                            void blockUser(token!, member.id)
                              .then(() => setChatError(`${member.nickname} נחסם/ה`))
                              .catch((e: unknown) =>
                                setChatError(e instanceof Error ? e.message : "חסימה נכשלה"),
                              )
                          }
                        >
                          חסימה
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
