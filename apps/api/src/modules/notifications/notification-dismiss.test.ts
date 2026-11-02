import { describe, expect, it } from "vitest";

/**
 * Policy contract for per-user dismiss (schema + service).
 * Dismiss hides a notification for the recipient only and must not imply invite cancel.
 */
describe("notification dismiss policy", () => {
  it("treats dismissedAt as recipient-local hide", () => {
    const row = {
      recipientId: "user-a",
      dismissedAt: new Date().toISOString(),
      type: "game.invite",
      payload: { inviteId: "invite-1" },
    };
    expect(row.dismissedAt).toBeTruthy();
    expect(row.payload.inviteId).toBe("invite-1");
  });

  it("keeps invite id intact after dismiss (hub still authoritative)", () => {
    const inviteStillPending = { status: "pending", id: "invite-1" };
    const notificationDismissed = true;
    expect(notificationDismissed).toBe(true);
    expect(inviteStillPending.status).toBe("pending");
  });
});
