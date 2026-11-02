import { useEffect, useMemo, useState, type RefObject } from "react";
import type {
  BoardSize,
  ClockMode,
  ColorMode,
  LiveInviteSettings,
  MemberListItem,
} from "@go-darom/shared";
import { maxHandicapForSize } from "@go-darom/shared";
import { fetchMembers } from "../auth/community-api";
import { useRealtime } from "../realtime/RealtimeProvider";
import { formatInviteSettings } from "./play-api";
import { PlayModalShell } from "./PlayModalShell";
import "../pages/members.css";

type Step = "pick" | "settings";

type Props = {
  token: string;
  selfId: string;
  busy?: boolean;
  error?: string | null;
  /** Preselect opponent and skip the picker (e.g. invite from a DM). */
  initialOpponent?: MemberListItem | null;
  initialStep?: Step;
  /** When true with initialOpponent, hide “back to pick” and start on settings. */
  lockOpponent?: boolean;
  onCancel: () => void;
  onSubmit: (opponent: MemberListItem, settings: LiveInviteSettings) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function InviteFlowModal({
  token,
  selfId,
  busy,
  error,
  initialOpponent = null,
  initialStep = "pick",
  lockOpponent = false,
  onCancel,
  onSubmit,
  returnFocusRef,
}: Props) {
  const { onlineIds } = useRealtime();
  const locked = Boolean(lockOpponent && initialOpponent);
  const [step, setStep] = useState<Step>(
    locked || (initialOpponent && initialStep === "settings") ? "settings" : "pick",
  );
  const [q, setQ] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MemberListItem | null>(initialOpponent);

  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const [clockMode, setClockMode] = useState<ClockMode>("none");
  const [colorMode, setColorMode] = useState<ColorMode>("random");
  const [handicap, setHandicap] = useState(0);
  const [komiRaw, setKomiRaw] = useState("6.5");
  const [komiTouched, setKomiTouched] = useState(false);

  useEffect(() => {
    if (step !== "pick") return;
    let cancelled = false;
    setPhase("loading");
    const t = window.setTimeout(() => {
      fetchMembers(token, q.trim() || undefined, onlineOnly)
        .then((res) => {
          if (cancelled) return;
          setMembers(res.items.filter((m) => m.id !== selfId));
          setPhase("ready");
          setListError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setListError(err instanceof Error ? err.message : "טעינת החברים נכשלה");
          setPhase("error");
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [token, selfId, q, onlineOnly, step]);

  const maxHc = maxHandicapForSize(boardSize);
  const settings = useMemo((): LiveInviteSettings => {
    let komi = Number(komiRaw);
    if (!komiTouched) komi = handicap > 0 ? 0.5 : 6.5;
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
  const emptyHint = onlineOnly
    ? "אין חברים מחוברים כרגע. נסו להסיר את הסינון או לחפש לפי כינוי."
    : "לא נמצאו חברים. נסו חיפוש אחר.";

  const goSettings = () => {
    if (!selected) return;
    const online = onlineIds.has(selected.id) || selected.online;
    if (!online) return;
    setStep("settings");
  };

  if (step === "pick") {
    return (
      <PlayModalShell
        title="למי שולחים הזמנה?"
        onClose={onCancel}
        returnFocusRef={returnFocusRef}
        testId="invite-flow-modal"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              ביטול
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selected || !(onlineIds.has(selected.id) || selected.online)}
              onClick={goSettings}
            >
              המשך להגדרות
            </button>
          </>
        }
      >
        <p className="play-modal-lede">חפשו חבר מהקהילה. למשחק חי אפשר להזמין רק מי שמחובר/ת כרגע.</p>
        <div className="play-modal-filters">
          <form className="members-search play-modal-search" onSubmit={(e) => e.preventDefault()}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="חיפוש לפי כינוי"
              aria-label="חיפוש לפי כינוי"
              autoFocus
            />
          </form>
          <label className="toggle-switch">
            <span className="toggle-switch-label">מחוברים בלבד</span>
            <input
              type="checkbox"
              role="switch"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
              aria-checked={onlineOnly}
            />
            <span className="toggle-switch-track" aria-hidden="true">
              <span className="toggle-switch-thumb" />
            </span>
          </label>
        </div>
        {phase === "loading" ? <p className="play-modal-status">טוענים חברים…</p> : null}
        {phase === "error" ? (
          <p className="play-error" role="alert">
            {listError}
          </p>
        ) : null}
        {phase === "ready" && members.length === 0 ? <p className="play-modal-status">{emptyHint}</p> : null}
        <ul className="play-opponent-list" aria-label="רשימת חברים">
          {members.map((member) => {
            const online = onlineIds.has(member.id) || member.online;
            const isSelected = selected?.id === member.id;
            const reason = !online ? "ניתן להזמין רק יריב מחובר למשחק חי" : undefined;
            return (
              <li key={member.id}>
                <button
                  type="button"
                  className={`play-opponent-row${isSelected ? " is-selected" : ""}${!online ? " is-disabled" : ""}`}
                  disabled={!online}
                  title={reason}
                  aria-pressed={isSelected}
                  onClick={() => setSelected(member)}
                >
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" width={36} height={36} />
                  ) : (
                    <span className="member-avatar-fallback" aria-hidden="true">
                      {member.nickname.slice(0, 1)}
                    </span>
                  )}
                  <span className="play-opponent-copy">
                    <strong>{member.nickname}</strong>
                    <span className={online ? "online" : "offline"}>
                      <span className={`presence-dot${online ? " is-on" : ""}`} aria-hidden="true" />
                      {online ? "מחובר/ת" : "לא מחובר/ת"}
                    </span>
                    {!online ? <span className="play-opponent-reason">{reason}</span> : null}
                  </span>
                  {isSelected ? <span className="play-opponent-check" aria-hidden="true">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PlayModalShell>
    );
  }

  const opponent = selected!;
  return (
    <PlayModalShell
      title="הגדרות המשחק"
      wide
      onClose={onCancel}
      returnFocusRef={returnFocusRef}
      testId="invite-flow-modal"
      footer={
        <>
          {locked ? (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>
              ביטול
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => setStep("pick")}
            >
              חזרה לבחירת חבר
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => onSubmit(opponent, settings)}
          >
            {busy ? "שולחים…" : "שליחת הזמנה"}
          </button>
        </>
      }
    >
      <div className="play-invite-opponent">
        {opponent.avatarUrl ? (
          <img src={opponent.avatarUrl} alt="" width={40} height={40} />
        ) : (
          <span className="member-avatar-fallback" aria-hidden="true">
            {opponent.nickname.slice(0, 1)}
          </span>
        )}
        <div>
          <strong>{opponent.nickname}</strong>
          <p>סיכום: {formatInviteSettings(settings)}</p>
        </div>
      </div>

      <form
        className="play-settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(opponent, settings);
        }}
      >
        <fieldset>
          <legend>גודל לוח</legend>
          <div className="play-choice-row" role="radiogroup" aria-label="גודל לוח">
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
          <div className="play-choice-row" role="radiogroup" aria-label="שעון">
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
          <div className="play-choice-row" role="radiogroup" aria-label="צבעים">
            {(
              [
                ["random", "הגרלה אקראית"],
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
      </form>
    </PlayModalShell>
  );
}
