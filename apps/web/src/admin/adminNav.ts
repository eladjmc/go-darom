/**
 * Admin Control Center navigation registry.
 * Only M3-ready sections are `enabled`. Future domains stay documented, not linked.
 */
export type AdminNavId = "overview" | "members" | "reports" | "audit";

export interface AdminNavItem {
  id: AdminNavId;
  to: string;
  label: string;
  description: string;
  /** When false, omit from live nav (future milestone). */
  enabled: boolean;
  end?: boolean;
}

/** Live M3 navigation only — do not add dead/future links here. */
export const ADMIN_NAV: AdminNavItem[] = [
  {
    id: "overview",
    to: "/admin",
    label: "סקירה כללית",
    description: "מדדים זמינים כעת מהמערכת",
    enabled: true,
    end: true,
  },
  {
    id: "members",
    to: "/admin/members",
    label: "משתמשים",
    description: "חברי קהילה, חיפוש והשעיה",
    enabled: true,
  },
  {
    id: "reports",
    to: "/admin/reports",
    label: "דיווחים ומודרציה",
    description: "תור דיווחים וטיפול",
    enabled: true,
  },
  {
    id: "audit",
    to: "/admin/audit",
    label: "יומן ניהול",
    description: "פעולות מודרציה אחרונות",
    enabled: true,
  },
];

/** Documented future routes — registration points for later milestones (not in UI). */
export const ADMIN_FUTURE_ROUTES = [
  "/admin/puzzles",
  "/admin/events",
  "/admin/content",
  "/admin/analytics",
] as const;

export function enabledAdminNav(): AdminNavItem[] {
  return ADMIN_NAV.filter((i) => i.enabled);
}
