import { describe, expect, it } from "vitest";
import { ADMIN_FUTURE_ROUTES, ADMIN_NAV, enabledAdminNav } from "./adminNav";

describe("admin nav registry", () => {
  it("exposes only M3-ready sections as live navigation", () => {
    const live = enabledAdminNav().map((i) => i.to);
    expect(live).toEqual(["/admin", "/admin/members", "/admin/reports", "/admin/audit"]);
    expect(ADMIN_NAV.every((i) => i.enabled)).toBe(true);
  });

  it("documents future domains without registering them as live nav", () => {
    const live = new Set(enabledAdminNav().map((i) => i.to));
    for (const route of ADMIN_FUTURE_ROUTES) {
      expect(live.has(route)).toBe(false);
    }
  });
});
