import { describe, expect, it } from "vitest";
import { createGobanEngineAdapter } from "@go-darom/go-engine";
import { hoverPreviewClass } from "./hover-preview";

describe("hoverPreviewClass", () => {
  it("is black when black to move and white when white to move", () => {
    expect(hoverPreviewClass("black")).toBe("poc-preview-black");
    expect(hoverPreviewClass("white")).toBe("poc-preview-white");
  });

  it("tracks side-to-move after play, pass, and undo", () => {
    const adapter = createGobanEngineAdapter();
    const game = adapter.createGame({ size: 9, komi: 6.5 });

    expect(hoverPreviewClass(adapter.snapshot(game).toMove)).toBe("poc-preview-black");

    expect(adapter.play(game, { x: 2, y: 2 }).ok).toBe(true);
    expect(hoverPreviewClass(adapter.snapshot(game).toMove)).toBe("poc-preview-white");

    expect(adapter.pass(game).ok).toBe(true);
    expect(hoverPreviewClass(adapter.snapshot(game).toMove)).toBe("poc-preview-black");

    expect(adapter.undo(game).ok).toBe(true);
    expect(hoverPreviewClass(adapter.snapshot(game).toMove)).toBe("poc-preview-white");

    expect(adapter.undo(game).ok).toBe(true);
    expect(hoverPreviewClass(adapter.snapshot(game).toMove)).toBe("poc-preview-black");
  });
});
