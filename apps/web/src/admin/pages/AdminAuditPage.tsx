import { useEffect, useState } from "react";
import type { AdminAuditRow } from "@go-darom/shared";
import { useAuth } from "../../auth/AuthContext";
import { fetchAdminAudit } from "../../auth/community-api";
import { auditActionLabel, formatAdminTime } from "../adminLabels";
import { AdminPageFrame } from "../AdminShell";

export function AdminAuditPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AdminAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchAdminAudit(token)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינה נכשלה");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AdminPageFrame
      title="יומן ניהול"
      description="רישום פעולות מודרציה אחרונות (כולל צפייה בהקשר דיווח פרטי)."
    >
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>זמן</th>
              <th>מבצע/ת</th>
              <th>פעולה</th>
              <th>סוג ישות</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>{formatAdminTime(row.createdAt)}</td>
                <td>{row.actorNickname ?? "—"}</td>
                <td>{auditActionLabel(row.action)}</td>
                <td>{row.entityType === "user" ? "משתמש" : row.entityType === "moderation_report" ? "דיווח" : row.entityType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && !error && <p className="admin-empty">אין רשומות עדיין.</p>}
    </AdminPageFrame>
  );
}
