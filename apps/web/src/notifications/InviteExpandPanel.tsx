import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LiveInviteDto, LiveInviteSettings, NotificationDto } from "@go-darom/shared";
import {
  inviteSettingRows,
  settingsFromInvitePayload,
} from "../play/invite-notification-helpers";
import {
  acceptLiveInvite,
  fetchLiveInvite,
  rejectLiveInvite,
  remainingInviteLabel,
} from "../play/play-api";

type Props = {
  token: string;
  notification: NotificationDto;
  onAccepted?: () => void;
  onRejected?: () => void;
  /** Invite already accepted / rejected / expired / cancelled — remove the notification. */
  onStale?: () => void;
};

export function InviteExpandPanel({ token, notification, onAccepted, onRejected, onStale }: Props) {
  const navigate = useNavigate();
  const inviteId = typeof notification.payload.inviteId === "string" ? notification.payload.inviteId : "";
  const payloadExpires =
    typeof notification.payload.expiresAt === "string" ? notification.payload.expiresAt : null;
  const payloadSettings = settingsFromInvitePayload(notification.payload);

  const [invite, setInvite] = useState<LiveInviteDto | null>(null);
  const [status, setStatus] = useState<"pending" | "terminal" | "error">("pending");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pendingAction, setPendingAction] = useState<"accept" | "reject" | null>(null);

  useEffect(() => {
    if (!inviteId || !token) return;
    let cancelled = false;
    void fetchLiveInvite(token, inviteId)
      .then((dto) => {
        if (cancelled) return;
        setInvite(dto);
        if (dto.status !== "pending" || new Date(dto.expiresAt).getTime() <= Date.now()) {
          setStatus("terminal");
          setStatusText(
            dto.status === "accepted"
              ? "ההזמנה כבר התקבלה."
              : dto.status === "rejected"
                ? "ההזמנה נדחתה."
                : dto.status === "expired" || new Date(dto.expiresAt).getTime() <= Date.now()
                  ? "תוקף ההזמנה פג."
                  : "ההזמנה בוטלה.",
          );
          onStale?.();
        }
      })
      .catch(() => {
        if (!cancelled && payloadExpires && new Date(payloadExpires).getTime() <= Date.now()) {
          setStatus("terminal");
          setStatusText("תוקף ההזמנה פג.");
          onStale?.();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, inviteId, payloadExpires, onStale]);

  useEffect(() => {
    if (status !== "pending") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const expiresAt = invite?.expiresAt ?? payloadExpires;
  const settings: LiveInviteSettings | null = invite?.settings ?? payloadSettings;
  const rows = useMemo(() => (settings ? inviteSettingRows(settings) : []), [settings]);
  const ttl = expiresAt ? remainingInviteLabel(expiresAt, now) : null;
  const expired = Boolean(expiresAt && new Date(expiresAt).getTime() <= now);
  const actionable = status === "pending" && !expired && !pendingAction;

  useEffect(() => {
    if (status === "pending" && expired) {
      setStatus("terminal");
      setStatusText("תוקף ההזמנה פג.");
      onStale?.();
    }
  }, [expired, status, onStale]);

  const runAccept = async () => {
    if (!actionable || !inviteId) return;
    setPendingAction("accept");
    setError(null);
    try {
      const out = await acceptLiveInvite(token, inviteId);
      setStatus("terminal");
      setStatusText("ההזמנה התקבלה — עוברים למשחק.");
      onAccepted?.();
      navigate(`/play/${out.gameId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "קבלת ההזמנה נכשלה");
      setStatus("error");
      try {
        const dto = await fetchLiveInvite(token, inviteId);
        setInvite(dto);
        if (dto.status !== "pending") {
          setStatus("terminal");
          setStatusText("ההזמנה אינה זמינה עוד.");
          onStale?.();
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus("pending");
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
      await rejectLiveInvite(token, inviteId);
      setStatus("terminal");
      setStatusText("דחיתם את ההזמנה.");
      onRejected?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "דחיית ההזמנה נכשלה");
      try {
        const dto = await fetchLiveInvite(token, inviteId);
        setInvite(dto);
        if (dto.status !== "pending") {
          setStatus("terminal");
          setStatusText("ההזמנה אינה זמינה עוד.");
          onStale?.();
        }
      } catch {
        /* keep */
      }
    } finally {
      setPendingAction(null);
    }
  };

  if (!settings) {
    return <p className="notif-expand-status">פרטי ההזמנה אינם זמינים.</p>;
  }

  return (
    <div className="notif-expand-panel" data-invite-id={inviteId}>
      <dl className="notif-expand-meta">
        {rows.map((row) => (
          <div key={row.label} className="notif-expand-meta-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
        {status === "pending" && ttl ? (
          <div className="notif-expand-meta-row">
            <dt>תוקף</dt>
            <dd>
              <time dateTime={expiresAt ?? undefined}>{ttl}</time>
            </dd>
          </div>
        ) : null}
      </dl>
      {statusText ? <p className="notif-expand-status">{statusText}</p> : null}
      {error ? (
        <p className="notif-expand-error" role="alert">
          {error}
        </p>
      ) : null}
      {status === "pending" && !expired ? (
        <div className="notif-expand-actions">
          <button
            type="button"
            className="btn btn-primary btn-compact"
            disabled={!actionable}
            aria-busy={pendingAction === "accept"}
            onClick={() => void runAccept()}
          >
            {pendingAction === "accept" ? "מאשרים…" : "אישור והתחלת משחק"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            disabled={!actionable}
            aria-busy={pendingAction === "reject"}
            onClick={() => void runReject()}
          >
            {pendingAction === "reject" ? "דוחים…" : "דחייה"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
