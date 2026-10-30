import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError, fetchAdminSession } from "../auth/api";
import {
  adminDeleteChatMessage,
  fetchAdminReport,
  fetchAdminReports,
  resolveAdminReport,
} from "../auth/community-api";
import { AppErrorPage } from "./errors/AppErrorPage";
import "./auth.css";
import "./community.css";
import "./members.css";

export function AdminPage() {
  const { me, token, loading } = useAuth();
  const [ok, setOk] = useState<boolean | null>(null);
  const [deny, setDeny] = useState(false);
  const [networkFail, setNetworkFail] = useState(false);
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !me?.onboardingCompleted) return;
    fetchAdminSession(token)
      .then(async () => {
        setOk(true);
        const list = await fetchAdminReports(token, "open");
        setReports(list.items as Array<Record<string, unknown>>);
      })
      .catch((err: unknown) => {
        setOk(false);
        if (err instanceof ApiError && err.status === 403) {
          setDeny(true);
          return;
        }
        setNetworkFail(true);
      });
  }, [token, me?.onboardingCompleted]);

  if (!loading && !me) return <Navigate to="/sign-in" replace />;
  if (me && !me.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  if (deny) return <AppErrorPage kind="forbidden" showSignIn={false} />;
  if (networkFail) return <AppErrorPage kind="network" showSignIn={false} />;

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">ניהול</h1>
        {ok === null && <p className="auth-status">בודקים הרשאות…</p>}
        {ok && (
          <div className="community-layout">
            <p className="section-lede">דיווחים פתוחים והסרת הודעות ציבוריות.</p>
            {msg && <p className="auth-success">{msg}</p>}
            <ul className="member-list">
              {reports.map((r) => (
                <li key={String(r.id)}>
                  <div>
                    <strong>{String(r.targetType)}</strong>
                    <span className="offline">{String(r.reason)}</span>
                    <div className="chat-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          void fetchAdminReport(token!, String(r.id)).then((detail) => setSelected(detail))
                        }
                      >
                        פתיחה
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          void resolveAdminReport(token!, String(r.id), "resolved").then(() => {
                            setReports((prev) => prev.filter((x) => x.id !== r.id));
                            setMsg("הדיווח סומן כטופל");
                          })
                        }
                      >
                        סיום טיפול
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {reports.length === 0 && <p>אין דיווחים פתוחים.</p>}
            {selected && (
              <div className="chat-panel">
                <h2 className="section-title">פירוט דיווח</h2>
                <pre style={{ whiteSpace: "pre-wrap", direction: "rtl" }}>
                  {JSON.stringify(selected.contextSnapshot ?? selected, null, 2)}
                </pre>
                {typeof selected.contextSnapshot === "object" &&
                  selected.contextSnapshot &&
                  "reportedMessageId" in (selected.contextSnapshot as object) && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        void adminDeleteChatMessage(
                          token!,
                          String((selected.contextSnapshot as { reportedMessageId: string }).reportedMessageId),
                        ).then(() => setMsg("הודעה ציבורית הוסרה (אם הייתה ציבורית)"))
                      }
                    >
                      הסרת הודעה ציבורית מדווחת
                    </button>
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
