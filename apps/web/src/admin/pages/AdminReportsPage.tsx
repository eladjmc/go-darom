import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { ModerationReportSummary } from "@go-darom/shared";
import { useAuth } from "../../auth/AuthContext";
import { fetchAdminReports } from "../../auth/community-api";
import { formatAdminTime, reportStatusLabel, reportTypeLabel } from "../adminLabels";
import { AdminPageFrame, AdminPerson, type AdminOutletContext } from "../AdminShell";

export function AdminReportsPage() {
  const { token } = useAuth();
  const { setOpenReportsBadge } = useOutletContext<AdminOutletContext>();
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed" | "all">("open");
  const [items, setItems] = useState<ModerationReportSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const qs = status === "all" ? undefined : status;
    fetchAdminReports(token, qs)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        if (status === "open") setOpenReportsBadge(res.items.length);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינה נכשלה");
      });
    return () => {
      cancelled = true;
    };
  }, [token, status, setOpenReportsBadge]);

  return (
    <AdminPageFrame
      title="דיווחים ומודרציה"
      description="תור דיווחים לקריאה אנושית — בלי JSON גולמי ובלי גישה לשיחות פרטיות מחוץ לדיווח."
    >
      <div className="admin-toolbar">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="סינון סטטוס דיווח"
        >
          <option value="open">פתוחים</option>
          <option value="resolved">טופלו</option>
          <option value="dismissed">נדחו</option>
          <option value="all">הכול</option>
        </select>
      </div>
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>סוג</th>
              <th>מדווח/ת</th>
              <th>מדווח/ת עליו/ה</th>
              <th>סיבה</th>
              <th>זמן</th>
              <th>סטטוס</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{reportTypeLabel(r.targetType)}</td>
                <td>
                  <AdminPerson nickname={r.reporter.nickname} avatarUrl={r.reporter.avatarUrl} />
                </td>
                <td>
                  {r.reported ? (
                    <AdminPerson nickname={r.reported.nickname} avatarUrl={r.reported.avatarUrl} />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{r.reason}</td>
                <td>{formatAdminTime(r.createdAt)}</td>
                <td>
                  <span className={`admin-badge is-${r.status}`}>{reportStatusLabel(r.status)}</span>
                </td>
                <td>
                  <Link className="btn btn-secondary" to={`/admin/reports/${r.id}`}>
                    פתיחה
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && !error && <p className="admin-empty">אין דיווחים להצגה.</p>}
    </AdminPageFrame>
  );
}
