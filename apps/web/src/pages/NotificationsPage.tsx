import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { NotificationDto } from "@go-darom/shared";
import { useAuth } from "../auth/AuthContext";
import { fetchNotifications, markNotificationsRead } from "../auth/community-api";
import { useRealtime } from "../realtime/RealtimeProvider";
import "./messaging.css";

function labelFor(n: NotificationDto): { title: string; body: string; href?: string } {
  if (n.type === "dm.message") {
    return {
      title: "הודעה פרטית",
      body: typeof n.payload.preview === "string" ? n.payload.preview : "הודעה חדשה",
      href: typeof n.payload.threadId === "string" ? `/dms/${n.payload.threadId}` : "/dms",
    };
  }
  if (n.type === "game.invite") return { title: "הזמנה למשחק", body: "יש הזמנה חדשה למשחק." };
  if (n.type === "game.turn") return { title: "תורך לשחק", body: "מגיע תורך במשחק." };
  if (n.type === "study.invite") return { title: "הזמנה ללימוד", body: "הוזמנתם לסשן לימוד." };
  return { title: "התראה", body: n.type };
}

export function NotificationsPage() {
  const { me, token, loading } = useAuth();
  const { refreshNotificationBadge } = useRealtime();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!token || !me?.onboardingCompleted) return;
    let cancelled = false;
    setPhase("loading");
    fetchNotifications(token)
      .then(async (res) => {
        if (cancelled) return;
        const system = res.items.filter((n) => n.type !== "dm.message");
        setItems(system);
        setPhase("ready");
        await markNotificationsRead(token, { all: true });
        refreshNotificationBadge();
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
  }, [token, me?.onboardingCompleted, refreshNotificationBadge]);

  if (!loading && !me) return <Navigate to="/sign-in" replace />;
  if (me && !me.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <h1 className="section-title">התראות</h1>
        <p className="section-lede">הזמנות למשחקים, תורות ולימוד — בנפרד מהודעות פרטיות.</p>
        {error && (
          <p className="members-error" role="alert">
            {error}
          </p>
        )}
        {phase === "loading" && <p className="auth-status">טוענים התראות…</p>}
        {phase === "ready" && items.length === 0 && <p>אין התראות מערכת כרגע.</p>}
        <ul className="member-list">
          {items.map((n) => {
            const meta = labelFor(n);
            return (
              <li key={n.id}>
                <div>
                  <strong>{meta.title}</strong>
                  <span className="offline">{meta.body}</span>
                  <span className="offline">{new Date(n.createdAt).toLocaleString("he-IL")}</span>
                  {meta.href && (
                    <Link className="btn btn-secondary" to={meta.href}>
                      פתיחה
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/dms">להודעות פרטיות</Link>
        </p>
      </div>
    </section>
  );
}
