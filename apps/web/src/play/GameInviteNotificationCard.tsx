import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LiveInviteDto, LiveInviteSettings, NotificationDto } from "@go-darom/shared";
import { useRealtime } from "../realtime/RealtimeProvider";
import {
  inviteSettingRows,
  inviteTitle,
  settingsFromInvitePayload,
} from "./invite-notification-helpers";
import {
  acceptLiveInvite,
  fetchLiveInvite,
  rejectLiveInvite,
  remainingInviteLabel,
} from "./play-api";

export type InviteCardState =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled"
  | "busy"
  | "error";

type Props = {
  token: string;
  notification: NotificationDto;
  /** Highlight when opened from toast deep-link */
  focused?: boolean;
  /** Tighter layout for popover / drawer */
  compact?: boolean;
  onResolved?: (inviteId: string, state: InviteCardState) => void;
};

function statusLabel(state: InviteCardState): string {
  switch (state) {
    case "accepted":
      return "ההזמנה התקבלה — המשחק נפתח.";
    case "rejected":
      return "דחיתם את ההזמנה.";
    case "expired":
      return "תוקף ההזמנה פג.";
    case "cancelled":
      return "ההזמנה בוטלה.";
    case "busy":
      return "מבצעים…";
    case "error":
      return "לא ניתן לבצע את הפעולה כרגע.";
    default:
      return "";
  }
}

function mapInviteStatus(status: LiveInviteDto["status"]): InviteCardState {
  if (status === "pending") return "pending";
  if (status === "accepted") return "accepted";
  if (status === "rejected") return "rejected";
  if (status === "expired") return "expired";
  return "cancelled";
}

export function GameInviteNotificationCard({
  token,
  notification,
  focused,
  compact,
  onResolved,
}: Props) {
  const navigate = useNavigate();
  const { socket } = useRealtime();
  const inviteId = typeof notification.payload.inviteId === "string" ? notification.payload.inviteId : "";
  const payloadNickname =
    typeof notification.payload.inviterNickname === "string"
      ? notification.payload.inviterNickname
      : "חבר/ה";
  const payloadAvatar =
    typeof notification.payload.inviterAvatarUrl === "string"
      ? notification.payload.inviterAvatarUrl
      : null;
  const payloadExpires =
    typeof notification.payload.expiresAt === "string" ? notification.payload.expiresAt : null;
  const payloadSettings = settingsFromInvitePayload(notification.payload);

  const [invite, setInvite] = useState<LiveInviteDto | null>(null);
  const [state, setState] = useState<InviteCardState>("pending");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pendingAction, setPendingAction] = useState<"accept" | "reject" | null>(null);

  const applyDto = (dto: LiveInviteDto) => {
    setInvite(dto);
    if (dto.status === "pending" && new Date(dto.expiresAt).getTime() <= Date.now()) {
      setState("expired");
      return "expired" as const;
    }
    const next = mapInviteStatus(dto.status);
    setState(next);
    return next;
  };

  useEffect(() => {
    if (!inviteId || !token) return;
    let cancelled = false;
    void fetchLiveInvite(token, inviteId)
      .then((dto) => {
        if (cancelled) return;
        applyDto(dto);
      })
      .catch(() => {
        if (!cancelled && payloadExpires && new Date(payloadExpires).getTime() <= Date.now()) {
          setState("expired");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, inviteId, payloadExpires]);

  useEffect(() => {
    if (!socket || !inviteId) return;
    const onNotif = (n: NotificationDto) => {
      const pid = n.payload?.inviteId;
      if (pid !== inviteId) return;
      if (n.type === "game.invite_cancelled") {
        setState("cancelled");
        onResolved?.(inviteId, "cancelled");
      } else if (n.type === "game.invite_accepted") {
        setState("accepted");
        onResolved?.(inviteId, "accepted");
      } else if (n.type === "game.invite_rejected") {
        setState("rejected");
        onResolved?.(inviteId, "rejected");
      }
    };
    socket.on("notification:created", onNotif);
    socket.on("notification:toast", onNotif);
    return () => {
      socket.off("notification:created", onNotif);
      socket.off("notification:toast", onNotif);
    };
  }, [socket, inviteId, onResolved]);

  useEffect(() => {
    if (state !== "pending") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  const expiresAt = invite?.expiresAt ?? payloadExpires;
  const settings: LiveInviteSettings | null = invite?.settings ?? payloadSettings;
  const nickname = invite?.inviter.nickname ?? payloadNickname;
  const avatarUrl = invite?.inviter.avatarUrl ?? payloadAvatar;

  useEffect(() => {
    if (state !== "pending" || !expiresAt) return;
    if (new Date(expiresAt).getTime() <= now) {
      setState("expired");
      onResolved?.(inviteId, "expired");
    }
  }, [expiresAt, now, state, inviteId, onResolved]);

  const actionable = state === "pending" && !pendingAction;
  const ttl = useMemo(
    () => (expiresAt ? remainingInviteLabel(expiresAt, now) : null),
    [expiresAt, now],
  );
  const settingRows = useMemo(() => (settings ? inviteSettingRows(settings) : []), [settings]);

  const runAccept = async () => {
    if (!actionable || !inviteId) return;
    setPendingAction("accept");
    setError(null);
    try {
      const out = await acceptLiveInvite(token, inviteId);
      setState("accepted");
      onResolved?.(inviteId, "accepted");
      navigate(`/play/${out.gameId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "קבלת ההזמנה נכשלה";
      setError(message);
      try {
        const dto = await fetchLiveInvite(token, inviteId);
        const next = applyDto(dto);
        if (next === "pending") setState("error");
      } catch {
        setState("error");
      }
    } finally {
      setPendingAction(null);
    }
  };

  const runReject = async () => {
    if (!actionable || !inviteId) return;
    setPendingAction("reject");
    setError(null);
    try {
      const dto = await rejectLiveInvite(token, inviteId);
      applyDto(dto);
      onResolved?.(inviteId, "rejected");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "דחיית ההזמנה נכשלה");
      try {
        const dto = await fetchLiveInvite(token, inviteId);
        const next = applyDto(dto);
        if (next === "pending") setState("error");
      } catch {
        setState("error");
      }
    } finally {
      setPendingAction(null);
    }
  };

  if (!inviteId || !settings) {
    return (
      <article className="invite-notif-card is-inert" aria-live="polite">
        <p>הזמנה למשחק (פרטים חסרים או שאינה זמינה עוד)</p>
      </article>
    );
  }

  return (
    <article
      className={`invite-notif-card${compact ? " is-compact" : ""}${focused ? " is-focused" : ""}${state !== "pending" ? " is-inert" : ""}`}
      aria-live="polite"
      data-invite-id={inviteId}
      data-testid="game-invite-card"
    >
      <header className="invite-notif-head">
        {avatarUrl ? (
          <img className="invite-notif-avatar" src={avatarUrl} alt="" width={52} height={52} />
        ) : (
          <span className="invite-notif-avatar member-avatar-fallback" aria-hidden="true">
            {(nickname || "?").slice(0, 1)}
          </span>
        )}
        <div className="invite-notif-copy">
          <h3>{inviteTitle(nickname || "חבר/ה")}</h3>
          {state === "pending" && ttl ? (
            <p className="invite-notif-ttl">
              תוקף נותר: <time dateTime={expiresAt ?? undefined}>{ttl}</time>
            </p>
          ) : (
            <p className="invite-notif-status">{statusLabel(state === "busy" ? "busy" : state)}</p>
          )}
        </div>
      </header>

      <dl className="invite-notif-meta">
        {settingRows.map((row) => (
          <div key={row.label} className="invite-notif-meta-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      {error ? (
        <p className="invite-notif-error" role="alert">
          {error}
        </p>
      ) : null}

      {state === "pending" ? (
        <div className="invite-notif-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!actionable}
            aria-busy={pendingAction === "accept"}
            onClick={() => void runAccept()}
          >
            {pendingAction === "accept" ? "מאשרים…" : "אישור והתחלת משחק"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!actionable}
            aria-busy={pendingAction === "reject"}
            onClick={() => void runReject()}
          >
            {pendingAction === "reject" ? "דוחים…" : "דחייה"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
