import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError, fetchAdminSession } from "../auth/api";
import { AppErrorPage } from "../pages/errors/AppErrorPage";
import { AdminShell } from "./AdminShell";
import { AdminAuditPage } from "./pages/AdminAuditPage";
import { AdminMembersPage } from "./pages/AdminMembersPage";
import { AdminOverviewPage } from "./pages/AdminOverviewPage";
import { AdminReportDetailPage } from "./pages/AdminReportDetailPage";
import { AdminReportsPage } from "./pages/AdminReportsPage";

function AdminNotFound() {
  return (
    <section className="admin-page-head">
      <h1>העמוד לא נמצא</h1>
      <p>אין עמוד ניהול בכתובת הזו. אפשר לחזור לסקירה או לתור הדיווחים.</p>
      <p>
        <a className="btn btn-primary" href="/admin">
          לסקירה הכללית
        </a>
      </p>
    </section>
  );
}

export function AdminApp() {
  const { me, token, loading } = useAuth();
  const [gate, setGate] = useState<"loading" | "ok" | "deny" | "network">("loading");

  useEffect(() => {
    if (loading && !me) return;
    if (!me || !token) {
      setGate("deny");
      return;
    }
    if (me.role !== "admin") {
      setGate("deny");
      return;
    }
    let cancelled = false;
    fetchAdminSession(token)
      .then(() => {
        if (!cancelled) setGate("ok");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) setGate("deny");
        else setGate("network");
      });
    return () => {
      cancelled = true;
    };
  }, [me, token, loading]);

  if (!loading && !me) return <Navigate to="/sign-in" replace />;
  if (me && !me.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  if (gate === "loading") {
    return (
      <div className="admin-shell">
        <p className="admin-status" style={{ padding: "2rem" }}>
          בודקים הרשאות ניהול…
        </p>
      </div>
    );
  }
  if (gate === "deny") return <AppErrorPage kind="forbidden" showSignIn={false} />;
  if (gate === "network") return <AppErrorPage kind="network" showSignIn={false} />;

  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="members" element={<AdminMembersPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="reports/:reportId" element={<AdminReportDetailPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="*" element={<AdminNotFound />} />
      </Route>
    </Routes>
  );
}
