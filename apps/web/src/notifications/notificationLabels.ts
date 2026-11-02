import type { NotificationDto } from "@go-darom/shared";
import type { AppIconName } from "../components/icons/productIcons";
import { inviteTitle } from "../play/invite-notification-helpers";

export function notificationIcon(type: string): AppIconName {
  if (
    type === "game.invite" ||
    type === "game.invite_accepted" ||
    type === "game.invite_rejected" ||
    type === "game.invite_cancelled" ||
    type === "game.live_turn" ||
    type === "game.turn"
  ) {
    return "play";
  }
  if (type === "study.invite") return "learn";
  return "bell";
}

export function labelForNotification(n: NotificationDto): {
  title: string;
  body: string;
  /** Single compact list line */
  primary: string;
  href?: string;
  expandable: boolean;
} {
  if (n.type === "dm.message") {
    const body = typeof n.payload.preview === "string" ? n.payload.preview : "הודעה חדשה";
    return {
      title: "הודעה פרטית",
      body,
      primary: body,
      href:
        typeof n.payload.threadId === "string" ? `/messages/${n.payload.threadId}` : "/messages",
      expandable: false,
    };
  }
  if (n.type === "game.invite") {
    const nick =
      typeof n.payload.inviterNickname === "string" ? n.payload.inviterNickname : "חבר/ה";
    const primary = inviteTitle(nick);
    return {
      title: "הזמנה למשחק",
      body: primary,
      primary,
      expandable: true,
    };
  }
  if (n.type === "game.invite_accepted") {
    return {
      title: "ההזמנה התקבלה",
      body: "המשחק החי נפתח.",
      primary: "ההזמנה למשחק התקבלה",
      href: typeof n.payload.gameId === "string" ? `/play/${n.payload.gameId}` : "/play",
      expandable: false,
    };
  }
  if (n.type === "game.invite_rejected") {
    const who =
      typeof n.payload.recipientNickname === "string" ? n.payload.recipientNickname : "היריב/ה";
    const primary = `${who} דחה/תה את ההזמנה`;
    return { title: "ההזמנה נדחתה", body: primary, primary, expandable: false };
  }
  if (n.type === "game.invite_cancelled") {
    const who =
      typeof n.payload.inviterNickname === "string" ? n.payload.inviterNickname : "המזמין/ה";
    const primary = `${who} ביטל/ה את ההזמנה`;
    return { title: "ההזמנה בוטלה", body: primary, primary, expandable: false };
  }
  if (n.type === "game.live_turn") {
    return {
      title: "התור שלכם",
      body: "מגיע תורכם במשחק החי.",
      primary: "מגיע תורכם במשחק החי",
      href: typeof n.payload.gameId === "string" ? `/play/${n.payload.gameId}` : "/play",
      expandable: false,
    };
  }
  if (n.type === "game.turn") {
    return {
      title: "תורך לשחק",
      body: "מגיע תורך במשחק.",
      primary: "מגיע תורך במשחק",
      expandable: false,
    };
  }
  if (n.type === "study.invite") {
    return {
      title: "הזמנה ללימוד",
      body: "הוזמנתם לסשן לימוד.",
      primary: "הוזמנתם לסשן לימוד",
      expandable: false,
    };
  }
  return { title: "התראה", body: "יש עדכון חדש.", primary: "יש עדכון חדש", expandable: false };
}
