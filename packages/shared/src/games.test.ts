import { describe, expect, it } from "vitest";
import {
  assignColors,
  decodeFinishedGamesCursor,
  encodeFinishedGamesCursor,
  extractReplayPlies,
  maxHandicapForSize,
  parseLiveInviteSettings,
  resolveCommandIdempotency,
} from "./games.js";

describe("parseLiveInviteSettings", () => {
  it("defaults to 9×9, no clock, random, komi 6.5", () => {
    const r = parseLiveInviteSettings({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.settings).toEqual({
      boardSize: 9,
      clockMode: "none",
      komi: 6.5,
      handicap: 0,
      colorMode: "random",
    });
  });

  it("defaults handicap komi to 0.5", () => {
    const r = parseLiveInviteSettings({ handicap: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.settings.komi).toBe(0.5);
  });

  it("rejects handicap above board limit", () => {
    expect(parseLiveInviteSettings({ boardSize: 9, handicap: 5 }).ok).toBe(false);
    expect(maxHandicapForSize(19)).toBe(9);
  });
});

describe("assignColors D2", () => {
  it("honors inviter black/white and random bit", () => {
    expect(assignColors("A", "B", "inviter_black", 0)).toEqual({
      blackUserId: "A",
      whiteUserId: "B",
    });
    expect(assignColors("A", "B", "inviter_white", 0)).toEqual({
      blackUserId: "B",
      whiteUserId: "A",
    });
    expect(assignColors("A", "B", "random", 1).blackUserId).toBe("B");
  });
});

describe("resolveCommandIdempotency", () => {
  it("replays durable receipt and never re-applies", () => {
    expect(resolveCommandIdempotency({ commandId: "c1", durableReceiptVersion: 3 })).toBe(
      "replay_receipt",
    );
    expect(resolveCommandIdempotency({ commandId: "c2", durableReceiptVersion: null })).toBe(
      "apply_new",
    );
  });
});

describe("extractReplayPlies + finished history cursor", () => {
  it("skips meta commands and keeps truncated post-undo plies only", () => {
    const plies = extractReplayPlies([
      { type: "play", actorUserId: "b", payload: { x: 1, y: 1 } },
      { type: "respond_undo", actorUserId: "w", payload: { accept: true } },
      { type: "play", actorUserId: "w", payload: { x: 2, y: 2 } },
      { type: "resign", actorUserId: "b" },
    ]);
    expect(plies.map((p) => p.payload)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it("round-trips finished-games cursor", () => {
    const c = { finishedAt: "2026-11-02T10:00:00.000Z", id: "11111111-1111-1111-1111-111111111111" };
    const encoded = encodeFinishedGamesCursor(c);
    expect(decodeFinishedGamesCursor(encoded)).toEqual(c);
    expect(decodeFinishedGamesCursor("bad")).toBeNull();
  });
});
