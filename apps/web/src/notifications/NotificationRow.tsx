import { useState } from "react";
import { Link } from "react-router-dom";
import type { NotificationDto } from "@go-darom/shared";
import { AppIcon } from "../components/icons/AppIcon";
import { InviteExpandPanel } from "./InviteExpandPanel";
import { labelForNotification, notificationIcon } from "./notificationLabels";
import { formatAbsoluteHe, formatRelativeHe } from "./relativeTime";

type Props = {
  token: string;
  notification: NotificationDto;
  now: number;
  defaultExpanded?: boolean;
  onDismiss: (id: string) => void;
  onNavigate?: () => void;
};

export function NotificationRow({
  token,
  notification,
  now,
  defaultExpanded,
  onDismiss,
  onNavigate,
}: Props) {
  const meta = labelForNotification(notification);
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded && meta.expandable));
  const unread = !notification.readAt;
  const relative = formatRelativeHe(notification.createdAt, now);
  const absolute = formatAbsoluteHe(notification.createdAt);
  const icon = notificationIcon(notification.type);

  const toggleOrOpen = () => {
    if (meta.expandable) {
      setExpanded((v) => !v);
      return;
    }
    if (meta.href) onNavigate?.();
  };

  return (
    <li
      className={`notif-row${unread ? " is-unread" : ""}${expanded ? " is-expanded" : ""}`}
      data-notification-id={notification.id}
      data-invite-id={
        typeof notification.payload.inviteId === "string" ? notification.payload.inviteId : undefined
      }
    >
      <div className="notif-row-main">
        <span className="notif-row-icon" aria-hidden="true">
          <AppIcon name={icon} size={18} />
        </span>
        {unread ? <span className="notif-row-dot" aria-label="לא נקרא" /> : null}
        <button
          type="button"
          className="notif-row-body"
          onClick={toggleOrOpen}
          aria-expanded={meta.expandable ? expanded : undefined}
        >
          <span className="notif-row-primary">{meta.primary}</span>
          <time className="notif-row-time" dateTime={notification.createdAt} title={absolute}>
            {relative}
          </time>
        </button>
        {meta.expandable ? (
          <span className={`notif-row-chevron${expanded ? " is-open" : ""}`} aria-hidden="true">
            <AppIcon name="chevron" size={16} />
          </span>
        ) : meta.href ? (
          <Link
            className="notif-row-link"
            to={meta.href}
            onClick={() => onNavigate?.()}
            aria-label="פתיחה"
          >
            <AppIcon name="chevron" size={16} />
          </Link>
        ) : null}
        <button
          type="button"
          className="notif-row-dismiss"
          aria-label="הסרת התראה"
          title="הסרה"
          onClick={() => onDismiss(notification.id)}
        >
          <AppIcon name="close" size={14} />
        </button>
      </div>
      {expanded && meta.expandable ? (
        <InviteExpandPanel
          token={token}
          notification={notification}
          onAccepted={() => {
            onDismiss(notification.id);
            onNavigate?.();
          }}
          onRejected={() => onDismiss(notification.id)}
          onStale={() => onDismiss(notification.id)}
        />
      ) : null}
    </li>
  );
}
