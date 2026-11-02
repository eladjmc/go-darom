import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { AdminReportDetail } from "@go-darom/shared";
import { useAuth } from "../../auth/AuthContext";
import {
  adminDeleteChatMessage,
  adminSuspendUser,
  adminUnsuspendUser,
  fetchAdminReport,
  resolveAdminReport,
} from "../../auth/community-api";
import { formatAdminTime, reportStatusLabel, reportTypeLabel } from "../adminLabels";
import { AdminPageFrame, AdminPerson } from "../AdminShell";

export function AdminReportDetailPage() {
  const { reportId = "" } = useParams();
  const { token, me } = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !reportId) return;
    let cancelled = false;
    fetchAdminReport(token, reportId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        if (d.targetType === "dm_message") {
          setMsg("נפתח הקשר לדיווח פרטי — הגישה נרשמה ביומן הביקורת.");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינה נכשלה");
      });
    return () => {
      cancelled = true;
    };
  }, [token, reportId]);

  return (
    <AdminPageFrame
      title="פירוט דיווח"
      description="ראיות מוגבלות לדיווח זה בלבד. בהודעות פרטיות מוצגת רק ההודעה המדווחת ועד חמש הודעות לפני ואחרי."
    >
      <p>
        <Link to="/admin/reports">← חזרה לתור הדיווחים</Link>
      </p>
      {msg && <p className="admin-success">{msg}</p>}
      {error && <p className="admin-error">{error}</p>}
      {!detail && !error && <p className="admin-status">טוענים…</p>}
      {detail && (
        <>
          <div className="admin-detail-grid">
            <div className="admin-detail-card">
              <h2>סיכום</h2>
              <p>
                <strong>סוג:</strong> {reportTypeLabel(detail.targetType)}
              </p>
              <p>
                <strong>סטטוס:</strong>{" "}
                <span className={`admin-badge is-${detail.status}`}>
                  {reportStatusLabel(detail.status)}
                </span>
              </p>
              <p>
                <strong>זמן:</strong> {formatAdminTime(detail.createdAt)}
              </p>
              <p>
                <strong>סיבה:</strong> {detail.reason}
              </p>
            </div>
            <div className="admin-detail-card">
              <h2>מדווח/ת</h2>
              <AdminPerson nickname={detail.reporter.nickname} avatarUrl={detail.reporter.avatarUrl} />
            </div>
            <div className="admin-detail-card">
              <h2>מדווח/ת עליו/ה</h2>
              {detail.reported ? (
                <AdminPerson nickname={detail.reported.nickname} avatarUrl={detail.reported.avatarUrl} />
              ) : (
                <p className="admin-status">לא זוהה</p>
              )}
            </div>
          </div>

          <h2 className="section-title" style={{ fontSize: "1.1rem" }}>
            ראיות
          </h2>
          <div className="admin-evidence" aria-label="הקשר הודעות לדיווח">
            {detail.messages.map((m) => (
              <article
                key={m.id}
                className={`admin-evidence-item${m.isReported ? " is-reported" : ""}`}
              >
                <div className="admin-evidence-meta">
                  <AdminPerson nickname={m.sender.nickname} avatarUrl={m.sender.avatarUrl} />
                  <span>{formatAdminTime(m.createdAt)}</span>
                  {m.isReported && <span className="admin-badge is-open">הודעה מדווחת</span>}
                </div>
                <div className="admin-evidence-body">{m.body}</div>
              </article>
            ))}
            {detail.messages.length === 0 && <p className="admin-empty">אין הודעות בהקשר.</p>}
          </div>

          <div className="admin-actions">
            {detail.status === "open" && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => {
                  if (!token || !window.confirm("לסמן את הדיווח כטופל?")) return;
                  setBusy(true);
                  void resolveAdminReport(token, detail.id, "resolved")
                    .then(() => navigate("/admin/reports"))
                    .catch((e: unknown) => setError(e instanceof Error ? e.message : "סיום נכשל"))
                    .finally(() => setBusy(false));
                }}
              >
                סיום טיפול
              </button>
            )}
            {detail.targetType === "public_message" && detail.reportedMessageId && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => {
                  if (!token || !window.confirm("להסיר את ההודעה הציבורית המדווחת?")) return;
                  setBusy(true);
                  void adminDeleteChatMessage(token, detail.reportedMessageId!)
                    .then(() => setMsg("ההודעה הציבורית הוסרה"))
                    .catch((e: unknown) => setError(e instanceof Error ? e.message : "הסרה נכשלה"))
                    .finally(() => setBusy(false));
                }}
              >
                הסרת הודעה ציבורית
              </button>
            )}
            {detail.reported && detail.reported.id !== me?.id && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt(
                      `סיבת השעיה עבור ${detail.reported!.nickname}`,
                      "הפרת כללי הקהילה",
                    );
                    if (!reason?.trim() || !token) return;
                    if (!window.confirm(`להשעות את ${detail.reported!.nickname}?`)) return;
                    setBusy(true);
                    void adminSuspendUser(token, detail.reported!.id, reason.trim())
                      .then(() => setMsg(`${detail.reported!.nickname} הושעה/תה`))
                      .catch((e: unknown) => setError(e instanceof Error ? e.message : "השעיה נכשלה"))
                      .finally(() => setBusy(false));
                  }}
                >
                  השעיית מדווח/ת עליו/ה
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt(
                      `סיבת ביטול השעיה עבור ${detail.reported!.nickname}`,
                      "בדיקת QA",
                    );
                    if (!reason?.trim() || !token) return;
                    setBusy(true);
                    void adminUnsuspendUser(token, detail.reported!.id, reason.trim())
                      .then(() => setMsg(`השעיית ${detail.reported!.nickname} בוטלה`))
                      .catch((e: unknown) => setError(e instanceof Error ? e.message : "ביטול נכשל"))
                      .finally(() => setBusy(false));
                  }}
                >
                  ביטול השעיה
                </button>
              </>
            )}
          </div>
        </>
      )}
    </AdminPageFrame>
  );
}
