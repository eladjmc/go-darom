export const OPEN_NOTIFICATIONS_EVENT = "go-darom:open-notifications";

export type OpenNotificationsDetail = {
  inviteId?: string;
};

export function openNotificationCenter(detail: OpenNotificationsDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenNotificationsDetail>(OPEN_NOTIFICATIONS_EVENT, { detail }),
  );
}
