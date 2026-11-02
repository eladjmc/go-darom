import { describe, expect, it } from "vitest";
import { createGobanEngineAdapter } from "./goban-engine-adapter.js";
import { reconstructReplayPositions } from "./replay-reconstruct.js";

describe("reconstructReplayPositions", () => {
  const port = createGobanEngineAdapter();

  it("replays ordinary moves and matches authoritative final grid", () => {
    const game = port.createGame({ size: 9, komi: 6.5 });
    expect(port.play(game, { x: 2, y: 2 }).ok).toBe(true);
    expect(port.play(game, { x: 3, y: 3 }).ok).toBe(true);
    expect(port.play(game, { x: 2, y: 3 }).ok).toBe(true);
    const final = port.snapshot(game);
    const history = [
      { type: "play", actorUserId: "b", payload: { x: 2, y: 2 } },
      { type: "play", actorUserId: "w", payload: { x: 3, y: 3 } },
      { type: "play", actorUserId: "b", payload: { x: 2, y: 3 } },
      { type: "resign", actorUserId: "w" },
    ];
    const recon = reconstructReplayPositions(
      {
        boardSize: 9,
        komi: 6.5,
        handicap: 0,
        moveHistory: history,
        authoritativeBoard: final,
      },
      port,
    );
    expect(recon.plyCount).toBe(3);
    expect(recon.positions).toHaveLength(4);
    expect(recon.matchesAuthoritativeFinal).toBe(true);
  });

  it("does not reintroduce undone moves after history truncation", () => {
    // Simulate server accept-undo: truncate through retracted index, append respond_undo.
    const history = [
      { type: "play", actorUserId: "b", payload: { x: 2, y: 2 } },
      { type: "play", actorUserId: "w", payload: { x: 5, y: 5 } }, // undone — removed by truncate
      { type: "propose_undo", actorUserId: "w", payload: { historyIndex: 1 } },
    ];
    const truncated = history.slice(0, 1);
    truncated.push({
      type: "respond_undo",
      actorUserId: "b",
      payload: { accept: true, retractedIndex: 1 },
    } as never);
    // After undo, white plays elsewhere
    truncated.push({ type: "play", actorUserId: "w", payload: { x: 6, y: 6 } });

    const live = port.createGame({ size: 9, komi: 6.5 });
    expect(port.play(live, { x: 2, y: 2 }).ok).toBe(true);
    expect(port.play(live, { x: 6, y: 6 }).ok).toBe(true);
    const final = port.snapshot(live);

    const recon = reconstructReplayPositions(
      {
        boardSize: 9,
        komi: 6.5,
        handicap: 0,
        moveHistory: truncated,
        authoritativeBoard: final,
      },
      port,
    );
    expect(recon.plyCount).toBe(2);
    expect(recon.matchesAuthoritativeFinal).toBe(true);
    // Undone stone at 5,5 must not appear
    expect(recon.positions[recon.positions.length - 1]!.grid[5]![5]).toBe(0);
    expect(recon.positions[recon.positions.length - 1]!.grid[6]![6]).toBe(2);
  });

  it("applies handicap setup before plies", () => {
    const live = port.createGame({ size: 9, komi: 0.5, handicap: 2 });
    expect(port.play(live, { x: 2, y: 2 }).ok).toBe(true); // white to move after handicap
    const final = port.snapshot(live);
    expect(final.handicap).toBe(2);

    const recon = reconstructReplayPositions(
      {
        boardSize: 9,
        komi: 0.5,
        handicap: 2,
        moveHistory: [{ type: "play", actorUserId: "w", payload: { x: 2, y: 2 } }],
        authoritativeBoard: final,
      },
      port,
    );
    expect(recon.positions[0]!.handicap).toBe(2);
    expect(recon.matchesAuthoritativeFinal).toBe(true);
  });

  it("replays passes and captures", () => {
    const live = port.createGame({ size: 9, komi: 6.5 });
    // Capture a white stone
    expect(port.play(live, { x: 1, y: 0 }).ok).toBe(true); // B
    expect(port.play(live, { x: 0, y: 0 }).ok).toBe(true); // W
    expect(port.play(live, { x: 0, y: 1 }).ok).toBe(true); // B captures
    expect(port.pass(live).ok).toBe(true);
    expect(port.pass(live).ok).toBe(true);
    const final = port.snapshot(live);

    const history = [
      { type: "play", actorUserId: "b", payload: { x: 1, y: 0 } },
      { type: "play", actorUserId: "w", payload: { x: 0, y: 0 } },
      { type: "play", actorUserId: "b", payload: { x: 0, y: 1 } },
      { type: "pass", actorUserId: "w" },
      { type: "pass", actorUserId: "b" },
      { type: "confirm_score", actorUserId: "b" },
    ];
    const recon = reconstructReplayPositions(
      {
        boardSize: 9,
        komi: 6.5,
        handicap: 0,
        moveHistory: history,
        authoritativeBoard: final,
      },
      port,
    );
    expect(recon.plyCount).toBe(5);
    expect(recon.matchesAuthoritativeFinal).toBe(true);
    expect(final.grid[0]![0]).toBe(0); // captured
    expect(recon.positions.at(-1)!.blackPrisoners).toBeGreaterThanOrEqual(1);
  });

  it("exposes start position at index 0 and final at last index", () => {
    const history = [
      { type: "play", actorUserId: "b", payload: { x: 4, y: 4 } },
      { type: "pass", actorUserId: "w" },
    ];
    const recon = reconstructReplayPositions({
      boardSize: 9,
      komi: 6.5,
      handicap: 0,
      moveHistory: history,
    });
    expect(recon.positions[0]!.moveNumber).toBe(0);
    expect(recon.positions[0]!.grid[4]![4]).toBe(0);
    expect(recon.positions[1]!.grid[4]![4]).toBe(1);
    expect(recon.positions).toHaveLength(3);
  });
});
