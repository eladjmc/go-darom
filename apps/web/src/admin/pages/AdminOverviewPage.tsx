import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { AdminOverviewCounts } from "@go-darom/shared";
import { useAuth } from "../../auth/AuthContext";
import { fetchAdminOverview } from "../../auth/community-api";
import { AdminPageFrame, type AdminOutletContext } from "../AdminShell";

export function AdminOverviewPage() {
  const { token } = useAuth();
  const { setOpenReportsBadge } = useOutletContext<AdminOutletContext>();
  const [counts, setCounts] = useState<AdminOverviewCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchAdminOverview(token)
      .then((data) => {
        if (cancelled) return;
        setCounts(data);
        setOpenReportsBadge(data.openReports);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינה נכשלה");
      });
    return () => {
      cancelled = true;
    };
  }, [token, setOpenReportsBadge]);

  return (
    <AdminPageFrame
      title="סקירה כללית"
      description="מדדים זמינים כעת ממקורות האמת של המערכת — בלי נתונים משוערים."
    >
      {error && <p className="admin-error">{error}</p>}
      {!counts && !error && <p className="admin-status">טוענים…</p>}
      {counts && (
        <div className="admin-stat-grid">
          <Link className="admin-stat-card" to="/admin/reports">
            <strong>{counts.openReports}</strong>
            <span>דיווחים פתוחים</span>
          </Link>
          <Link className="admin-stat-card" to="/admin/members?status=suspended">
            <strong>{counts.suspendedMembers}</strong>
            <span>משתמשים מושעים</span>
          </Link>
          <Link className="admin-stat-card" to="/admin/members">
            <strong>{counts.registeredMembers}</strong>
            <span>חברים רשומים</span>
          </Link>
        </div>
      )}
    </AdminPageFrame>
  );
}
