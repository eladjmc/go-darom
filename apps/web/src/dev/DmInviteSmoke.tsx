import { CircleDot } from "lucide-react";
import "../styles/global.css";
import "../pages/messaging.css";
import "../play/play.css";

/**
 * Visual fixture: DM header with game invite CTA.
 * Route: /dev/dm-invite-smoke?mode=desktop|mobile
 */
export function DmInviteSmoke() {
  const mode = new URLSearchParams(window.location.search).get("mode") === "mobile" ? "mobile" : "desktop";
  const narrow = mode === "mobile";

  return (
    <div
      className="messaging-shell"
      data-testid="dm-invite-smoke"
      data-mode={mode}
      dir="rtl"
      lang="he"
      style={{ maxWidth: narrow ? 390 : 720, margin: "1rem auto", minHeight: narrow ? 640 : 480 }}
    >
      <div className="dm-chat-pane" style={{ border: "1px solid rgba(145,169,148,0.35)", borderRadius: 16 }}>
        <header className="msg-header">
          {narrow ? (
            <button type="button" className="btn btn-secondary">
              חזרה
            </button>
          ) : null}
          <span className="chat-avatar is-fallback" aria-hidden="true">
            א
          </span>
          <div className="msg-header-copy">
            <h2>אלעד</h2>
            <p className="sub">הודעה פרטית</p>
          </div>
          <button type="button" className="dm-invite-game-btn" title="הזמנה למשחק חי">
            <CircleDot size={16} aria-hidden="true" />
            <span className="dm-invite-game-label">הזמנה למשחק</span>
          </button>
        </header>
        <div className="msg-thread" style={{ minHeight: 220 }}>
          <div className="chat-bubble-row is-theirs">
            <span className="chat-avatar is-fallback">א</span>
            <div className="chat-bubble is-theirs" dir="rtl">
              <div className="chat-bubble-name">אלעד</div>
              <div className="chat-bubble-body">רוצה משחק?</div>
            </div>
          </div>
          <div className="chat-bubble-row is-mine">
            <div className="chat-bubble is-mine" dir="rtl">
              <div className="chat-bubble-body">בטח — אשלח הזמנה</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
