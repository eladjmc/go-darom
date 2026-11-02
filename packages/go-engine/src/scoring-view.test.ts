import { describe, expect, it } from "vitest";
import { createGobanEngineAdapter, decodeScoringPositions } from "./goban-engine-adapter.js";

describe("Japanese scoring view + removal persistence", () => {
  it("decodes engine scoring_positions pairs", () => {
    expect(decodeScoringPositions("aabb")).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  it("exposes ownership and provisional score from the engine", () => {
    const adapter = createGobanEngineAdapter();
    const game = adapter.createGame({ size: 9, komi: 6.5 });
    expect(adapter.play(game, { x: 2, y: 2 }).ok).toBe(true);
    expect(adapter.pass(game).ok).toBe(true);
    expect(adapter.pass(game).ok).toBe(true);
    adapter.beginScoring(game);
    const view = adapter.getScoringView(game);
    expect(view.score.white.komi).toBe(6.5);
    expect(view.ownership.length).toBe(9);
    expect(view.ownership.some((row) => row.some((v) => v === 1 || v === 2))).toBe(true);
  });

  it("persists removal marks across serialize/deserialize", () => {
    const adapter = createGobanEngineAdapter();
    const game = adapter.createGame({ size: 9, komi: 6.5 });
    adapter.play(game, { x: 2, y: 2 });
    adapter.pass(game);
    adapter.pass(game);
    adapter.beginScoring(game);
    adapter.toggleRemoved(game, { x: 2, y: 2 });
    expect(adapter.listRemoved(game).some((c) => c.x === 2 && c.y === 2)).toBe(true);
    const blob = adapter.serialize(game);
    const restored = adapter.deserialize(blob);
    expect(adapter.listRemoved(restored).some((c) => c.x === 2 && c.y === 2)).toBe(true);
    const view = adapter.getScoringView(restored);
    expect(view.removed.some((c) => c.x === 2 && c.y === 2)).toBe(true);
  });

  it("agreement path yields deterministic totals", () => {
    const adapter = createGobanEngineAdapter();
    const game = adapter.createGame({ size: 9, komi: 6.5 });
    adapter.pass(game);
    adapter.pass(game);
    adapter.beginScoring(game);
    const a = adapter.computeJapaneseScore(game);
    const b = adapter.getScoringView(game).score;
    expect(a.black.total).toBe(b.black.total);
    expect(a.white.total).toBe(b.white.total);
  });

  it("updates ownership after dead-stone toggles", () => {
    const adapter = createGobanEngineAdapter();
    const game = adapter.createGame({ size: 9, komi: 6.5 });
    adapter.play(game, { x: 2, y: 2 });
    adapter.play(game, { x: 6, y: 6 });
    adapter.pass(game);
    adapter.pass(game);
    adapter.beginScoring(game);
    const before = adapter.getScoringView(game);
    const beforeJson = JSON.stringify(before.ownership);
    adapter.toggleRemoved(game, { x: 2, y: 2 });
    const after = adapter.getScoringView(game);
    expect(after.removed.some((c) => c.x === 2 && c.y === 2)).toBe(true);
    expect(JSON.stringify(after.ownership) !== beforeJson || after.score.black.total !== before.score.black.total).toBe(
      true,
    );
  });

  it("clears removal marks on resume so scoring overlays can drop", () => {
    const adapter = createGobanEngineAdapter();
    const game = adapter.createGame({ size: 9, komi: 6.5 });
    adapter.play(game, { x: 2, y: 2 });
    adapter.pass(game);
    adapter.pass(game);
    adapter.beginScoring(game);
    adapter.toggleRemoved(game, { x: 2, y: 2 });
    adapter.resumePlay(game);
    expect(adapter.listRemoved(game)).toEqual([]);
    expect(adapter.snapshot(game).phase).toBe("play");
  });
});
