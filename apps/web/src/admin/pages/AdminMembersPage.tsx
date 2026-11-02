import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { AdminMemberRow } from "@go-darom/shared";
import { useAuth } from "../../auth/AuthContext";
import { adminSuspendUser, adminUnsuspendUser, fetchAdminMembers } from "../../auth/community-api";
import { AdminPageFrame, AdminPerson } from "../AdminShell";

export function AdminMembersPage() {
  const { token, me } = useAuth();
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const status =
    statusParam === "active" || statusParam === "suspended" ? statusParam : ("all" as const);
  const qParam = params.get("q") ?? "";
  const [q, setQ] = useState(qParam);
  const [items, setItems] = useState<AdminMemberRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    if (!token) return;
    setError(null);
    fetchAdminMembers(token, { q: qParam.trim() || undefined, status })
      .then((res) => setItems(res.items))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "טעינה נכשלה"));
  }, [token, qParam, status]);

  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    setParams(next);
  };

  const setStatus = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete("status");
    else next.set("status", value);
    setParams(next);
  };

  return (
    <AdminPageFrame
      title="משתמשים"
      description="חיפוש חברים, סטטוס והשעיה — בלי חשיפת אימייל או מזהי Clerk."
    >
      <form className="admin-toolbar" onSubmit={onSearch}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש לפי כינוי"
          aria-label="חיפוש לפי כינוי"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="סינון סטטוס"
        >
          <option value="all">הכול</option>
          <option value="active">פעילים</option>
          <option value="suspended">מושעים</option>
        </select>
        <button type="submit" className="btn btn-secondary">
          חיפוש
        </button>
      </form>
      {msg && <p className="admin-success">{msg}</p>}
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>חבר/ת</th>
              <th>תפקיד</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td>
                  <AdminPerson nickname={m.nickname} avatarUrl={m.avatarUrl} />
                </td>
                <td>
                  <span className={`admin-badge${m.role === "admin" ? " is-admin" : ""}`}>
                    {m.role === "admin" ? "מנהל/ת" : "חבר/ה"}
                  </span>
                </td>
                <td>
                  <span className={`admin-badge is-${m.status}`}>
                    {m.status === "suspended" ? "מושעה" : "פעיל/ה"}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    {m.id !== me?.id && m.status === "active" && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt(
                            `סיבת השעיה עבור ${m.nickname}`,
                            "הפרת כללי הקהילה",
                          );
                          if (!reason?.trim() || !token) return;
                          if (!window.confirm(`להשעות את ${m.nickname}?`)) return;
                          setBusy(true);
                          void adminSuspendUser(token, m.id, reason.trim())
                            .then(() => {
                              setMsg(`${m.nickname} הושעה/תה`);
                              reload();
                            })
                            .catch((e: unknown) =>
                              setError(e instanceof Error ? e.message : "השעיה נכשלה"),
                            )
                            .finally(() => setBusy(false));
                        }}
                      >
                        השעיה
                      </button>
                    )}
                    {m.status === "suspended" && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt(
                            `סיבת ביטול השעיה עבור ${m.nickname}`,
                            "בדיקת QA",
                          );
                          if (!reason?.trim() || !token) return;
                          if (!window.confirm(`לבטל השעיה של ${m.nickname}?`)) return;
                          setBusy(true);
                          void adminUnsuspendUser(token, m.id, reason.trim())
                            .then(() => {
                              setMsg(`השעיית ${m.nickname} בוטלה`);
                              reload();
                            })
                            .catch((e: unknown) =>
                              setError(e instanceof Error ? e.message : "ביטול נכשל"),
                            )
                            .finally(() => setBusy(false));
                        }}
                      >
                        ביטול השעיה
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && !error && <p className="admin-empty">לא נמצאו משתמשים.</p>}
    </AdminPageFrame>
  );
}
