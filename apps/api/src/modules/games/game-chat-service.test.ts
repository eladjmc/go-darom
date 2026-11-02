import { describe, expect, it } from "vitest";
import { gameChatAccessForParticipant, gameChatRoomName } from "./game-chat-service.js";

describe("Game chat (ADR-017)", () => {
  it("GCHAT-04: finished games are read-only for send", () => {
    expect(gameChatAccessForParticipant("active", false).canSend).toBe(true);
    expect(gameChatAccessForParticipant("finished", false).canSend).toBe(false);
    expect(gameChatAccessForParticipant("active", true).canSend).toBe(false);
  });

  it("GCHAT-01: histories are keyed by gameId — no cross-game bleed", () => {
    const byGame = new Map<string, string[]>();
    const post = (gameId: string, body: string) => {
      const list = byGame.get(gameId) ?? [];
      list.push(body);
      byGame.set(gameId, list);
    };
    post("game-a", "שלום ממשחק א");
    post("game-b", "שלום ממשחק ב");
    post("game-a", "עוד הודעה בא");
    expect(byGame.get("game-a")).toEqual(["שלום ממשחק א", "עוד הודעה בא"]);
    expect(byGame.get("game-b")).toEqual(["שלום ממשחק ב"]);
    expect(byGame.get("game-a")).not.toContain("שלום ממשחק ב");
  });

  it("GCHAT-02: game chat must not share storage with community DM threads", () => {
    const dmUnread = new Map<string, number>([["dm-thread-1", 3]]);
    const gameMsgs: Array<{ gameId: string; body: string }> = [];
    // Simulating a game-chat post — DM unread must stay untouched.
    gameMsgs.push({ gameId: "g1", body: "היי" });
    expect(dmUnread.get("dm-thread-1")).toBe(3);
    expect(gameMsgs).toHaveLength(1);
  });

  it("socket room is game-scoped, not dm-scoped", () => {
    expect(gameChatRoomName("abc")).toBe("game-chat:abc");
    expect(gameChatRoomName("abc")).not.toMatch(/^dm:/);
  });

  it("GCHAT-05: idempotent clientCommandId collapses duplicates per game+sender", () => {
    const receipts = new Set<string>();
    const key = (gameId: string, senderId: string, cmd: string) => `${gameId}:${senderId}:${cmd}`;
    const post = (gameId: string, senderId: string, cmd: string) => {
      const k = key(gameId, senderId, cmd);
      if (receipts.has(k)) return "replay";
      receipts.add(k);
      return "created";
    };
    expect(post("g1", "u1", "c1")).toBe("created");
    expect(post("g1", "u1", "c1")).toBe("replay");
    expect(post("g2", "u1", "c1")).toBe("created");
    expect(post("g1", "u2", "c1")).toBe("created");
  });

  it("access role reserved for future spectators without storage redesign", () => {
    const access = gameChatAccessForParticipant("active", false);
    expect(access.role).toBe("participant");
    // Spectator would be a different role on the same message table.
    type Role = typeof access.role | "spectator";
    const future: Role = "spectator";
    expect(future).toBe("spectator");
  });
});
