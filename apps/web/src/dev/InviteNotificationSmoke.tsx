import "../styles/global.css";
import "../play/play.css";
import "../pages/messaging.css";
import "../pages/members.css";
import "../notifications/notification-center.css";
import "../components/icons/app-icon.css";

/**
 * Visual fixture: compact notification rows + expandable invite.
 * Route: /dev/invite-notification-smoke
 */
export function InviteNotificationSmoke() {
  return (
    <div className="section notif-page" data-testid="invite-notif-smoke" dir="rtl" lang="he">
      <div className="container notif-page-inner" style={{ maxWidth: "48rem" }}>
        <p className="play-hub-eyebrow">Go Darom · QA</p>
        <h1 className="section-title">מרכז התראות</h1>
        <p className="section-lede">שורות קומפקטיות, הרחבת הזמנה, זמן יחסי והסרה.</p>

        <div
          className="notif-popover is-open"
          data-testid="notification-center"
          style={{ position: "relative", width: 400, maxHeight: 520, marginBlock: "1rem" }}
        >
          <header className="notif-center-header">
            <div className="notif-center-heading">
              <h2>התראות</h2>
              <span className="notif-center-count">2</span>
            </div>
            <button type="button" className="notif-center-close" aria-label="סגירה">
              ×
            </button>
          </header>
          <div className="notif-center-body">
            <ul className="notif-row-list">
              <li className="notif-row is-unread is-expanded" data-testid="game-invite-card">
                <div className="notif-row-main">
                  <span className="notif-row-icon" aria-hidden="true">
                    ●
                  </span>
                  <span className="notif-row-dot" />
                  <button type="button" className="notif-row-body">
                    <span className="notif-row-primary">מישה הזמין/ה אותך למשחק</span>
                    <time className="notif-row-time">לפני 2 דקות</time>
                  </button>
                  <span className="notif-row-chevron is-open">▾</span>
                  <button type="button" className="notif-row-dismiss" aria-label="הסרה">
                    ×
                  </button>
                </div>
                <div className="notif-expand-panel">
                  <dl className="notif-expand-meta">
                    <div className="notif-expand-meta-row">
                      <dt>גודל לוח</dt>
                      <dd>19×19</dd>
                    </div>
                    <div className="notif-expand-meta-row">
                      <dt>שעון</dt>
                      <dd>15 דקות מוחלטות</dd>
                    </div>
                    <div className="notif-expand-meta-row">
                      <dt>צבעים</dt>
                      <dd>המזמין/ה שחור</dd>
                    </div>
                    <div className="notif-expand-meta-row">
                      <dt>קומי</dt>
                      <dd>6.5</dd>
                    </div>
                    <div className="notif-expand-meta-row">
                      <dt>יתרון</dt>
                      <dd>2</dd>
                    </div>
                    <div className="notif-expand-meta-row">
                      <dt>תוקף</dt>
                      <dd>4 דק׳ 32 שנ׳</dd>
                    </div>
                  </dl>
                  <div className="notif-expand-actions">
                    <button type="button" className="btn btn-primary btn-compact">
                      אישור והתחלת משחק
                    </button>
                    <button type="button" className="btn btn-secondary btn-compact">
                      דחייה
                    </button>
                  </div>
                </div>
              </li>
              <li className="notif-row">
                <div className="notif-row-main">
                  <span className="notif-row-icon" aria-hidden="true">
                    ●
                  </span>
                  <button type="button" className="notif-row-body">
                    <span className="notif-row-primary">מגיע תורכם במשחק החי</span>
                    <time className="notif-row-time">לפני שעה</time>
                  </button>
                  <span className="notif-row-chevron">▾</span>
                  <button type="button" className="notif-row-dismiss" aria-label="הסרה">
                    ×
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
