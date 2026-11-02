import type { ReportStatus, ReportTargetType } from "@go-darom/shared";

export function reportTypeLabel(t: ReportTargetType): string {
  return t === "dm_message" ? "הודעה פרטית" : "הודעת קהילה";
}

export function reportStatusLabel(s: ReportStatus): string {
  switch (s) {
    case "open":
      return "פתוח";
    case "resolved":
      return "טופל";
    case "dismissed":
      return "נדחה";
    default:
      return s;
  }
}

export function auditActionLabel(action: string): string {
  switch (action) {
    case "dm_report_context_read":
      return "צפייה בהקשר דיווח פרטי";
    case "report_resolved":
      return "סיום טיפול בדיווח";
    case "report_dismissed":
      return "דחיית דיווח";
    case "user_suspend":
      return "השעיית משתמש";
    case "user_unsuspend":
      return "ביטול השעיה";
    case "admin_bootstrap":
      return "הקצאת מנהל (bootstrap)";
    default:
      return action;
  }
}

export function formatAdminTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
