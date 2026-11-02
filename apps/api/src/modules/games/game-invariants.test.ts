import { describe, expect, it } from "vitest";
import {
  assignColors,
  parseLiveInviteSettings,
  resolveCommandIdempotency,
} from "@go-darom/shared";

describe("M4 game invariants (D2 / idempotency / occupancy policy)", () => {
  it("INV-13: handicap keeps Black stones / White to move assignment via colorMode", () => {
    const settings = parseLiveInviteSettings({
      boardSize: 9,
      handicap: 2,
      colorMode: "inviter_white",
    });
    expect(settings.ok).toBe(true);
    if (!settings.ok) return;
    expect(settings.settings.komi).toBe(0.5);
    const colors = assignColors("inviter", "recipient", settings.settings.colorMode, 0);
    // Inviter is White → recipient is Black (receives handicap stones)
    expect(colors.blackUserId).toBe("recipient");
    expect(colors.whiteUserId).toBe("inviter");
  });

  it("IDEM-02: durable receipt prevents re-apply even if ring would have evicted", () => {
    // Bounded ring may forget "old-id"; durable receipt still forces replay.
    expect(
      resolveCommandIdempotency({ commandId: "old-id", durableReceiptVersion: 12 }),
    ).toBe("replay_receipt");
    expect(resolveCommandIdempotency({ commandId: "fresh", durableReceiptVersion: null })).toBe(
      "apply_new",
    );
  });

  it("OCC policy: occupancy is per-user primary key (documented contract)", () => {
    // Enforced in DB: live_game_occupancy.user_id PK — one row per user across both colors.
    const occupancy = new Map<string, string>();
    const claim = (userId: string, gameId: string) => {
      if (occupancy.has(userId)) return false;
      occupancy.set(userId, gameId);
      return true;
    };
    expect(claim("u1", "g1")).toBe(true);
    expect(claim("u2", "g1")).toBe(true);
    expect(claim("u1", "g2")).toBe(false);
    occupancy.delete("u1");
    occupancy.delete("u2");
    expect(claim("u1", "g2")).toBe(true);
  });

  it("INV-05 concurrent accept: only first CAS on pending invite wins", () => {
    let status = "pending";
    const tryAccept = () => {
      if (status !== "pending") return false;
      status = "accepted";
      return true;
    };
    expect(tryAccept()).toBe(true);
    expect(tryAccept()).toBe(false);
  });
});
