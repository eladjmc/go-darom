import { useEffect, useMemo, useState } from "react";
import type { MemberListItem } from "@go-darom/shared";
import { fetchMembers } from "../auth/community-api";
import { useRealtime } from "../realtime/RealtimeProvider";
import "../pages/members.css";

type Props = {
  token: string;
  selfId: string;
  disabled?: boolean;
  onSelect: (member: MemberListItem) => void;
  onCancel: () => void;
};

export function OpponentPicker({ token, selfId, disabled, onSelect, onCancel }: Props) {
  const { onlineIds } = useRealtime();
  const [q, setQ] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    const t = window.setTimeout(() => {
      fetchMembers(token, q.trim() || undefined, onlineOnly)
        .then((res) => {
          if (cancelled) return;
          setMembers(res.items.filter((m) => m.id !== selfId));
          setPhase("ready");
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "טעינת החברים נכשלה");
          setPhase("error");
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [token, selfId, q, onlineOnly]);

  const emptyHint = useMemo(() => {
    if (onlineOnly) return "אין חברים מחוברים כרגע. נסו להסיר את הסינון או לחפש לפי כינוי.";
    return "לא נמצאו חברים. נסו חיפוש אחר.";
  }, [onlineOnly]);

  return (
    <div className="play-picker" role="dialog" aria-modal="true" aria-labelledby="play-picker-title">
      <div className="play-modal-card">
        <header className="play-modal-header">
          <h2 id="play-picker-title">בחירת יריב</h2>
          <button type="button" className="btn btn-secondary btn-compact" onClick={onCancel}>
            סגירה
          </button>
        </header>
        <p className="play-modal-lede">חפשו חבר מהקהילה והזמינו למשחק חי. לא ניתן להזמין את עצמכם.</p>
        <div className="filter-row">
          <form className="members-search" onSubmit={(e) => e.preventDefault()} style={{ flex: 1, marginBottom: 0 }}>
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
        {phase === "loading" && <p className="auth-status">טוענים חברים…</p>}
        {phase === "error" && <p className="members-error">{error}</p>}
        {phase === "ready" && members.length === 0 && <p className="play-empty">{emptyHint}</p>}
        <ul className="member-list member-list-compact play-picker-list">
          {members.map((member) => {
            const online = onlineIds.has(member.id) || member.online;
            return (
              <li key={member.id} className="member-row">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" width={36} height={36} />
                ) : (
                  <span className="member-avatar-fallback" aria-hidden="true">
                    {member.nickname.slice(0, 1)}
                  </span>
                )}
                <div className="member-row-main">
                  <strong>{member.nickname}</strong>
                  <span className={online ? "online" : "offline"}>
                    <span className={`presence-dot${online ? " is-on" : ""}`} aria-hidden="true" />
                    {online ? "מחובר/ת" : "לא מחובר/ת"}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-compact"
                  disabled={disabled || !online}
                  title={!online ? "ניתן להזמין רק יריב מחובר למשחק חי" : undefined}
                  onClick={() => onSelect(member)}
                >
                  בחירה
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
