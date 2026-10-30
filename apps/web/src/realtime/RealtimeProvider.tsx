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
import { io, type Socket } from "socket.io-client";
import type { NotificationDto } from "@go-darom/shared";
import { useAuth } from "../auth/AuthContext";
import { fetchDmUnreadTotal, fetchNotificationUnreadCount } from "../auth/community-api";

interface ToastItem {
  id: string;
  title: string;
  body: string;
}

interface RealtimeContextValue {
  socket: Socket | null;
  onlineIds: Set<string>;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  /** System notifications (bell) — excludes dm.message */
  unreadNotifications: number;
  /** Private messages (Messages icon) — DB watermark total */
  unreadDmTotal: number;
  refreshNotificationBadge: () => void;
  refreshDmUnread: () => void;
  setUnreadDmTotal: (total: number) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

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
      const title = n.type === "dm.message" ? "הודעה פרטית חדשה" : "התראה";
      const body =
        typeof n.payload.preview === "string"
          ? n.payload.preview
          : typeof n.payload.fromNickname === "string"
            ? String(n.payload.fromNickname)
            : "יש עדכון חדש";
      setToasts((prev) => [...prev, { id: n.id, title, body }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== n.id));
      }, 6000);
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
            <button type="button" className="btn btn-secondary" onClick={() => dismissToast(t.id)}>
              סגור
            </button>
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
