import { useMemo, useState } from "react";
import "../styles/global.css";
import "../play/play.css";
import "../pages/members.css";
import { PlayModalShell } from "../play/PlayModalShell";

type Scene = "pick" | "settings";

function parseScene(): Scene {
  const q = new URLSearchParams(window.location.search).get("scene");
  return q === "settings" ? "settings" : "pick";
}

/**
 * Visual fixture: /dev/invite-flow-smoke?scene=pick|settings
 * Static markup of the two-step invite modal for Chromium QA.
 */
export function InviteFlowSmoke() {
  const initial = useMemo(() => parseScene(), []);
  const [step, setStep] = useState<Scene>(initial);
  const [selected, setSelected] = useState(initial === "settings" ? "משה" : "אלעד");

  if (step === "pick") {
    return (
      <div className="play-hub section" dir="rtl" lang="he" data-testid="invite-flow-smoke" data-scene="pick">
        <div className="play-hub-inner">
          <p className="play-hub-lede">Fixture behind modal — hub visible for backdrop check.</p>
        </div>
        <PlayModalShell
          title="למי שולחים הזמנה?"
          onClose={() => undefined}
          testId="invite-flow-modal"
          footer={
            <>
              <button type="button" className="btn btn-secondary">
                ביטול
              </button>
              <button type="button" className="btn btn-primary">
                המשך להגדרות
              </button>
            </>
          }
        >
          <p className="play-modal-lede">חפשו חבר מהקהילה. למשחק חי אפשר להזמין רק מי שמחובר/ת כרגע.</p>
          <div className="play-modal-filters">
            <form className="members-search play-modal-search" onSubmit={(e) => e.preventDefault()}>
              <input defaultValue="" placeholder="חיפוש לפי כינוי" aria-label="חיפוש לפי כינוי" />
            </form>
            <label className="toggle-switch">
              <span className="toggle-switch-label">מחוברים בלבד</span>
              <input type="checkbox" role="switch" defaultChecked aria-checked="true" />
              <span className="toggle-switch-track" aria-hidden="true">
                <span className="toggle-switch-thumb" />
              </span>
            </label>
          </div>
          <ul className="play-opponent-list">
            {["אלעד", "נועה", "יואב"].map((name, i) => {
              const online = i < 2;
              const isSelected = selected === name;
              return (
                <li key={name}>
                  <button
                    type="button"
                    className={`play-opponent-row${isSelected ? " is-selected" : ""}${!online ? " is-disabled" : ""}`}
                    disabled={!online}
                    aria-pressed={isSelected}
                    onClick={() => setSelected(name)}
                  >
                    <span className="member-avatar-fallback" aria-hidden="true">
                      {name.slice(0, 1)}
                    </span>
                    <span className="play-opponent-copy">
                      <strong>{name}</strong>
                      <span className={online ? "online" : "offline"}>
                        <span className={`presence-dot${online ? " is-on" : ""}`} aria-hidden="true" />
                        {online ? "מחובר/ת" : "לא מחובר/ת"}
                      </span>
                      {!online ? (
                        <span className="play-opponent-reason">ניתן להזמין רק יריב מחובר למשחק חי</span>
                      ) : null}
                    </span>
                    {isSelected ? <span className="play-opponent-check">✓</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </PlayModalShell>
      </div>
    );
  }

  return (
    <div className="play-hub section" dir="rtl" lang="he" data-testid="invite-flow-smoke" data-scene="settings">
      <div className="play-hub-inner">
        <p className="play-hub-lede">Fixture behind modal — settings step.</p>
      </div>
      <PlayModalShell
        title="הגדרות המשחק"
        wide
        onClose={() => undefined}
        testId="invite-flow-modal"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setStep("pick")}>
              חזרה לבחירת חבר
            </button>
            <button type="button" className="btn btn-primary">
              שליחת הזמנה
            </button>
          </>
        }
      >
        <div className="play-invite-opponent">
          <span className="member-avatar-fallback" aria-hidden="true">
            {selected.slice(0, 1)}
          </span>
          <div>
            <strong>{selected}</strong>
            <p>סיכום: 9×9 · ללא שעון · צבע אקראי · קומי 6.5</p>
          </div>
        </div>
        <form className="play-settings-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset>
            <legend>גודל לוח</legend>
            <div className="play-choice-row">
              <label className="play-choice is-on">
                <input type="radio" name="board" defaultChecked readOnly />
                9×9
              </label>
              <label className="play-choice">
                <input type="radio" name="board" readOnly />
                13×13
              </label>
              <label className="play-choice">
                <input type="radio" name="board" readOnly />
                19×19
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>שעון</legend>
            <div className="play-choice-row">
              <label className="play-choice is-on">
                <input type="radio" name="clock" defaultChecked readOnly />
                ללא שעון
              </label>
              <label className="play-choice">
                <input type="radio" name="clock" readOnly />
                15 דק׳ לכל שחקן
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>צבעים</legend>
            <div className="play-choice-row">
              <label className="play-choice is-on">
                <input type="radio" name="color" defaultChecked readOnly />
                הגרלה אקראית
              </label>
              <label className="play-choice">
                <input type="radio" name="color" readOnly />
                אני שחור
              </label>
              <label className="play-choice">
                <input type="radio" name="color" readOnly />
                אני לבן
              </label>
            </div>
          </fieldset>
          <div className="play-settings-grid">
            <label>
              יתרון (אבני שחור)
              <select defaultValue={0}>
                <option value={0}>ללא יתרון</option>
                <option value={2}>2</option>
              </select>
              <span className="play-field-hint">עם יתרון: שחור מקבל אבנים, לבן מתחיל.</span>
            </label>
            <label>
              קומי
              <input type="number" step="0.5" defaultValue="6.5" />
              <span className="play-field-hint">ברירת מחדל 6.5, או 0.5 כשיש יתרון.</span>
            </label>
          </div>
        </form>
      </PlayModalShell>
    </div>
  );
}
