import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { OpenNotificationsDetail } from "../notifications/openNotificationCenter";

/**
 * Deep-link / bookmark entry: redirect to an in-app surface and open the
 * global notification overlay (popover / drawer) — not a dedicated empty page.
 */
export function NotificationsPage() {
  const { me, loading } = useAuth();
  const [params] = useSearchParams();
  const inviteId = params.get("invite") ?? undefined;

  if (!loading && !me) return <Navigate to="/sign-in" replace />;
  if (me && !me.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  if (loading || !me) {
    return (
      <section className="auth-page">
        <p className="auth-status">טוענים…</p>
      </section>
    );
  }

  const notifications: OpenNotificationsDetail = inviteId ? { inviteId } : {};
  return <Navigate to="/play" replace state={{ notifications }} />;
}
