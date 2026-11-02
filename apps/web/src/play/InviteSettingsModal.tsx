import { useMemo, useState } from "react";
import type { BoardSize, ClockMode, ColorMode, LiveInviteSettings, MemberListItem } from "@go-darom/shared";
import { maxHandicapForSize } from "@go-darom/shared";

type Props = {
  opponent: MemberListItem;
  busy?: boolean;
  error?: string | null;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: (settings: LiveInviteSettings) => void;
};

export function InviteSettingsModal({ opponent, busy, error, onBack, onCancel, onSubmit }: Props) {
  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const [clockMode, setClockMode] = useState<ClockMode>("none");
  const [colorMode, setColorMode] = useState<ColorMode>("random");
  const [handicap, setHandicap] = useState(0);
  const [komiRaw, setKomiRaw] = useState("6.5");
  const [komiTouched, setKomiTouched] = useState(false);

  const maxHc = maxHandicapForSize(boardSize);

  const settings = useMemo((): LiveInviteSettings => {
    let komi = Number(komiRaw);
    if (!komiTouched) {
      komi = handicap > 0 ? 0.5 : 6.5;
    }
    if (!Number.isFinite(komi)) komi = handicap > 0 ? 0.5 : 6.5;
    return {
      boardSize,
      clockMode,
      colorMode,
      handicap: Math.min(Math.max(0, handicap), maxHc),
      komi,
    };
  }, [boardSize, clockMode, colorMode, handicap, komiRaw, komiTouched, maxHc]);

  const displayKomi = komiTouched ? komiRaw : String(settings.komi);

  return (
    <div className="play-picker" role="dialog" aria-modal="true" aria-labelledby="play-invite-settings-title">
      <div className="play-modal-card play-modal-card-wide">
        <header className="play-modal-header">
          <h2 id="play-invite-settings-title">הזמנת {opponent.nickname} למשחק</h2>
          <button type="button" className="btn btn-secondary btn-compact" onClick={onCancel}>
            סגירה
          </button>
        </header>

        <div className="play-invite-opponent">
          {opponent.avatarUrl ? (
            <img src={opponent.avatarUrl} alt="" width={44} height={44} />
          ) : (
            <span className="member-avatar-fallback" aria-hidden="true">
              {opponent.nickname.slice(0, 1)}
            </span>
          )}
          <div>
            <strong>{opponent.nickname}</strong>
            <p>היריב יראה את כל ההגדרות לפני הקבלה.</p>
          </div>
        </div>

        <form
          className="play-settings-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(settings);
          }}
        >
          <fieldset>
            <legend>גודל לוח</legend>
            <div className="play-choice-row">
              {([9, 13, 19] as BoardSize[]).map((size) => (
                <label key={size} className={`play-choice${boardSize === size ? " is-on" : ""}`}>
                  <input
                    type="radio"
                    name="boardSize"
                    checked={boardSize === size}
                    onChange={() => {
                      setBoardSize(size);
                      setHandicap((h) => Math.min(h, maxHandicapForSize(size)));
                    }}
                  />
                  {size}×{size}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>שעון</legend>
            <div className="play-choice-row">
              <label className={`play-choice${clockMode === "none" ? " is-on" : ""}`}>
                <input type="radio" name="clock" checked={clockMode === "none"} onChange={() => setClockMode("none")} />
                ללא שעון
              </label>
              <label className={`play-choice${clockMode === "absolute_15m" ? " is-on" : ""}`}>
                <input
                  type="radio"
                  name="clock"
                  checked={clockMode === "absolute_15m"}
                  onChange={() => setClockMode("absolute_15m")}
                />
                15 דק׳ לכל שחקן
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>צבעים</legend>
            <div className="play-choice-row">
              {(
                [
                  ["random", "אקראי"],
                  ["inviter_black", "אני שחור"],
                  ["inviter_white", "אני לבן"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className={`play-choice${colorMode === value ? " is-on" : ""}`}>
                  <input
                    type="radio"
                    name="color"
                    checked={colorMode === value}
                    onChange={() => setColorMode(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="play-settings-grid">
            <label>
              יתרון (אבני שחור)
              <select
                value={handicap}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setHandicap(next);
                  if (!komiTouched) setKomiRaw(next > 0 ? "0.5" : "6.5");
                }}
              >
                {Array.from({ length: maxHc + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? "ללא יתרון" : `${i}`}
                  </option>
                ))}
              </select>
              <span className="play-field-hint">עם יתרון: שחור מקבל אבנים, לבן מתחיל.</span>
            </label>
            <label>
              קומי
              <input
                type="number"
                step="0.5"
                value={displayKomi}
                onChange={(e) => {
                  setKomiTouched(true);
                  setKomiRaw(e.target.value);
                }}
              />
              <span className="play-field-hint">ברירת מחדל 6.5, או 0.5 כשיש יתרון.</span>
            </label>
          </div>

          {error ? (
            <p className="play-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="play-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onBack} disabled={busy}>
              חזרה לבחירת יריב
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "שולחים…" : "שליחת הזמנה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
