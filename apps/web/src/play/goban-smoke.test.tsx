import { describe, expect, it } from "vitest";

/**
 * D5 early Goban smoke.
 * Import must succeed. Full mount requires a real browser canvas stack;
 * happy-dom lacks Goban's canvas parent assumptions (see M4_GOBAN_SMOKE.md).
 */
describe("UI-GOBAN-01 Goban React smoke", () => {
  it("imports createGoban from goban package", async () => {
    const mod = await import("goban");
    expect(typeof mod.createGoban).toBe("function");
    expect(typeof mod.setGobanRenderer).toBe("function");
  });

  it("documents happy-dom mount gap without claiming browser failure", async () => {
    const mod = await import("goban");
    const host = document.createElement("div");
    host.style.width = "320px";
    host.style.height = "320px";
    document.body.appendChild(host);
    let mountError: unknown = null;
    try {
      mod.createGoban({
        board_div: host,
        interactive: false,
        mode: "puzzle",
        width: 9,
        height: 9,
      });
    } catch (err) {
      mountError = err;
    }
    // Expected under happy-dom: CanvasRenderer touches null parent attributes.
    // Real Chromium mount is still preferred; SnapshotBoard is the approved interim.
    expect(mountError).toBeTruthy();
    expect(String(mountError)).toMatch(/setAttribute|null/i);
  });
});
