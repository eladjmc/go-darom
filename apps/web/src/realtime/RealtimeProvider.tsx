import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import type { NotificationDto } from "@go-darom/shared";
import { useAuth } from "../auth/AuthContext";
import { fetchDmUnreadTotal, fetchNotificationUnreadCount } from "../auth/community-api";
import { openNotificationCenter } from "../notifications/openNotificationCenter";

interface ToastItem {
  id: string;
  /** Dedupe key — inviteId for game invites */
  dedupeKey?: string;
  title: string;
  body: string;
  href?: string;
  /** Open bell overlay instead of navigating */
  openNotifications?: boolean;
  inviteId?: string;
  actionLabel?: string;
}

interface RealtimeContextValue {
  socket: Socket | null;
  onlineIds: Set<string>;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  /** Local branded toast (game errors, etc.) — deduped by dedupeKey. */
  pushToast: (item: Omit<ToastItem, "id"> & { id?: string; ttlMs?: number }) => void;
  /** System notifications (bell) — excludes dm.message */
  unreadNotifications: number;
  /** Private messages (Messages icon) — DB watermark total */
  unreadDmTotal: number;
  refreshNotificationBadge: () => void;
  refreshDmUnread: () => void;
  setUnreadDmTotal: (total: number) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function toastFromNotification(n: NotificationDto): ToastItem {
  if (n.type === "dm.message") {
    return {
      id: n.id,
      title: "הודעה פרטית חדשה",
      body:
        typeof n.payload.preview === "string"
          ? n.payload.preview
          : typeof n.payload.fromNickname === "string"
            ? String(n.payload.fromNickname)
            : "יש הודעה חדשה",
      href:
        typeof n.payload.threadId === "string" ? `/messages/${n.payload.threadId}` : "/messages",
      actionLabel: "פתיחה",
    };
  }
  if (n.type === "game.invite") {
    const nick =
      typeof n.payload.inviterNickname === "string" ? n.payload.inviterNickname : "חבר/ה";
    const inviteId = typeof n.payload.inviteId === "string" ? n.payload.inviteId : "";
    return {
      id: n.id,
      dedupeKey: inviteId ? `game.invite:${inviteId}` : undefined,
      title: "הזמנה למשחק חי",
      body: `${nick} הזמין/ה אתכם למשחק`,
      openNotifications: true,
      inviteId: inviteId || undefined,
      actionLabel: "לפתיחת ההזמנה",
    };
  }
  if (n.type === "game.invite_accepted") {
    return {
      id: n.id,
      title: "ההזמנה התקבלה",
      body: "המשחק החי נפתח",
      href: typeof n.payload.gameId === "string" ? `/play/${n.payload.gameId}` : "/play",
      actionLabel: "למשחק",
    };
  }
  if (n.type === "game.invite_rejected") {
    return {
      id: n.id,
      title: "ההזמנה נדחתה",
      body:
        typeof n.payload.recipientNickname === "string"
          ? `${n.payload.recipientNickname} דחה/תה את ההזמנה`
          : "ההזמנה למשחק נדחתה",
    };
  }
  if (n.type === "game.invite_cancelled") {
    return {
      id: n.id,
      title: "ההזמנה בוטלה",
      body: "ההזמנה למשחק בוטלה",
      openNotifications: true,
      actionLabel: "להתראות",
    };
  }
  if (n.type === "game.live_turn") {
    return {
      id: n.id,
      title: "התור שלכם",
      body: "מגיע תורכם במשחק החי",
      href: typeof n.payload.gameId === "string" ? `/play/${n.payload.gameId}` : "/play",
      actionLabel: "חזרה למשחק",
    };
  }
  return {
    id: n.id,
    title: "התראה",
    body: "יש עדכון חדש",
    openNotifications: true,
    actionLabel: "להתראות",
  };
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { me, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadDmTotal, setUnreadDmTotal] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((item: Omit<ToastItem, "id"> & { id?: string; ttlMs?: number }) => {
    const id = item.id ?? `local-${crypto.randomUUID()}`;
    const ttl = item.ttlMs ?? 4500;
    setToasts((prev) => {
      const withoutDup = item.dedupeKey ? prev.filter((t) => t.dedupeKey !== item.dedupeKey) : prev;
      return [...withoutDup, { ...item, id }];
    });
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ttl);
  }, []);

  const refreshNotificationBadge = useCallback(() => {
    if (!token || !me?.onboardingCompleted) {
      setUnreadNotifications(0);
      return;
    }
    void fetchNotificationUnreadCount(token)
      .then((r) => setUnreadNotifications(r.total))
      .catch(() => {
        /* keep last known */
      });
  }, [token, me?.onboardingCompleted]);

  const refreshDmUnread = useCallback(() => {
    if (!token || !me?.onboardingCompleted) {
      setUnreadDmTotal(0);
      return;
    }
    void fetchDmUnreadTotal(token)
      .then((r) => setUnreadDmTotal(r.total))
      .catch(() => {
        /* keep last known */
      });
  }, [token, me?.onboardingCompleted]);

  useEffect(() => {
    refreshNotificationBadge();
    refreshDmUnread();
  }, [refreshNotificationBadge, refreshDmUnread]);

  // Connect once per onboarded session; JWT refreshes update auth via tokenRef (no socket remount).
  useEffect(() => {
    if (!token || !me?.onboardingCompleted) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setOnlineIds(new Set());
      setUnreadNotifications(0);
      setUnreadDmTotal(0);
      return;
    }

    const s = io(import.meta.env.VITE_API_URL || window.location.origin, {
      path: "/socket.io",
      auth: (cb) => {
        cb({ token: tokenRef.current });
      },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = s;
    setSocket(s);

    s.on("presence:snapshot", (payload: { onlineUserIds: string[] }) => {
      setOnlineIds(new Set(payload.onlineUserIds));
    });
    s.on("presence:user", (payload: { userId: string; online: boolean }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    });
    s.on("notification:created", (n: NotificationDto) => {
      if (n.type !== "dm.message") {
        setUnreadNotifications((count) => count + 1);
      }
    });
    s.on("dm:unread", (payload: { total: number }) => {
      if (typeof payload?.total === "number") setUnreadDmTotal(payload.total);
    });
    s.on("notification:toast", (n: NotificationDto) => {
      const inviteId = typeof n.payload?.inviteId === "string" ? n.payload.inviteId : "";
      const inviteDedupe = inviteId ? `game.invite:${inviteId}` : undefined;
      // Terminal invite events clear any open-invite toast for that invite.
      if (
        inviteDedupe &&
        (n.type === "game.invite_cancelled" ||
          n.type === "game.invite_accepted" ||
          n.type === "game.invite_rejected")
      ) {
        setToasts((prev) => prev.filter((t) => t.dedupeKey !== inviteDedupe));
      }
      const item = toastFromNotification(n);
      setToasts((prev) => {
        const withoutDup = item.dedupeKey
          ? prev.filter((t) => t.dedupeKey !== item.dedupeKey)
          : prev;
        return [...withoutDup, item];
      });
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 8000);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [me?.id, me?.onboardingCompleted, Boolean(token)]);

  const value = useMemo(
    () => ({
      socket,
      onlineIds,
      toasts,
      dismissToast,
      pushToast,
      unreadNotifications,
      unreadDmTotal,
      refreshNotificationBadge,
      refreshDmUnread,
      setUnreadDmTotal,
    }),
    [
      socket,
      onlineIds,
      toasts,
      dismissToast,
      pushToast,
      unreadNotifications,
      unreadDmTotal,
      refreshNotificationBadge,
      refreshDmUnread,
    ],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-card">
            <strong>{t.title}</strong>
            <p>{t.body}</p>
            <div className="toast-actions">
              {t.openNotifications ? (
                <button
                  type="button"
                  className="btn btn-primary btn-compact"
                  onClick={() => {
                    dismissToast(t.id);
                    openNotificationCenter({ inviteId: t.inviteId });
                  }}
                >
                  {t.actionLabel ?? "להתראות"}
                </button>
              ) : t.href ? (
                <Link
                  className="btn btn-primary btn-compact"
                  to={t.href}
                  onClick={() => dismissToast(t.id)}
                >
                  {t.actionLabel ?? "פתיחה"}
                </Link>
              ) : null}
              <button type="button" className="btn btn-secondary btn-compact" onClick={() => dismissToast(t.id)}>
                סגור
              </button>
            </div>
          </div>
        ))}
      </div>
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime outside RealtimeProvider");
  return ctx;
}
