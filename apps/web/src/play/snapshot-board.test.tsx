import { describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import type { BoardSnapshot } from "@go-darom/go-engine";
import { SnapshotBoard } from "./SnapshotBoard";

function snap(size: 9 | 13 | 19): BoardSnapshot {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  grid[1]![1] = 1;
  grid[2]![2] = 2;
  return {
    size,
    grid,
    toMove: "black",
    phase: "play",
    moveNumber: 2,
    blackPrisoners: 0,
    whitePrisoners: 0,
    komi: 6.5,
    handicap: 0,
    positionId: `t-${size}`,
  };
}

describe("SnapshotBoard production renderer", () => {
  it("renders square SVG with grid lines and stones for 9/13/19", async () => {
    for (const size of [9, 13, 19] as const) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      await act(async () => {
        root.render(
          <SnapshotBoard snapshot={snap(size)} interactive lastMove={{ x: 2, y: 2 }} hoverColor="black" />,
        );
      });
      const svg = host.querySelector('[data-testid="snapshot-board"]') as SVGSVGElement;
      expect(svg).toBeTruthy();
      expect(svg.getAttribute("viewBox")).toMatch(/^0 0 (\d+) \1$/);
      expect(host.querySelectorAll("line").length).toBe(size * 2);
      expect(host.querySelector('[data-testid="stone-1-1"]')).toBeTruthy();
      expect(host.querySelector('[data-testid="stone-2-2"]')).toBeTruthy();
      root.unmount();
      host.remove();
    }
  });

  it("fires onPlay from empty intersection without committing preview alone", async () => {
    const onPlay = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<SnapshotBoard snapshot={snap(9)} interactive hoverColor="black" onPlay={onPlay} />);
    });
    const cell = host.querySelector('[data-testid="intersection-0-0"]') as SVGCircleElement;
    expect(cell).toBeTruthy();
    await act(async () => {
      cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onPlay).toHaveBeenCalledWith(0, 0);
    root.unmount();
    host.remove();
  });

  it("renders Go coordinates skipping I with bottom-up row numbers", async () => {
    for (const size of [9, 13, 19] as const) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      await act(async () => {
        root.render(<SnapshotBoard snapshot={snap(size)} interactive={false} />);
      });
      expect(host.querySelector('[data-testid="board-coords"]')).toBeTruthy();
      expect(host.querySelector('[data-testid="coord-col-bottom-A"]')).toBeTruthy();
      expect(host.querySelector('[data-testid="coord-col-bottom-I"]')).toBeNull();
      if (size >= 9) expect(host.querySelector('[data-testid="coord-col-bottom-J"]')).toBeTruthy();
      expect(host.querySelector(`[data-testid="coord-row-left-${size}"]`)).toBeTruthy();
      expect(host.querySelector('[data-testid="coord-row-left-1"]')).toBeTruthy();
      const topA = host.querySelector('[data-testid="coord-col-top-A"]') as SVGTextElement;
      const leftMax = host.querySelector(`[data-testid="coord-row-left-${size}"]`) as SVGTextElement;
      const gutter = Number(topA?.getAttribute("data-coord-gutter") ?? 0);
      // Gap from label centerline to first grid line must stay breathable on all sizes.
      expect(gutter).toBeGreaterThanOrEqual(20);
      const labelY = Number(topA.getAttribute("y"));
      const labelX = Number(leftMax.getAttribute("x"));
      expect(labelY).toBeGreaterThanOrEqual(8);
      expect(labelX).toBe(labelY);
      expect(labelY).toBeLessThan(gutter); // still outside the grid
      const viewBox = (host.querySelector('[data-testid="snapshot-board"]') as SVGSVGElement).getAttribute(
        "viewBox",
      )!;
      const parts = viewBox.split(/\s+/).map(Number);
      expect(parts[2]).toBe(parts[3]);
      root.unmount();
      host.remove();
    }
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<SnapshotBoard snapshot={snap(9)} interactive hoverColor="black" />);
    });
    expect(host.querySelector('[data-testid="intersection-0-0"]')?.getAttribute("data-coord")).toBe("A9");
    expect(host.querySelector('[data-testid="stone-1-1"]')?.closest("g")?.getAttribute("data-coord")).toBe("B8");
    root.unmount();
    host.remove();
  });

  it("draws territory markers only on empty intersections from ownership", async () => {
    const ownership = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
    ownership[0]![0] = 1;
    ownership[1]![1] = 2; // occupied by black stone — must not mark
    ownership[8]![8] = 2;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <SnapshotBoard
          snapshot={snap(9)}
          interactive={false}
          ownership={ownership}
          deadMarks={new Set(["1,1"])}
        />,
      );
    });
    expect(host.querySelector('[data-testid="territory-0-0"]')?.getAttribute("data-owner")).toBe("black");
    expect(host.querySelector('[data-testid="territory-1-1"]')).toBeNull();
    expect(host.querySelector('[data-testid="territory-8-8"]')?.getAttribute("data-owner")).toBe("white");
    expect(host.querySelector('[data-testid="stone-1-1"]')).toBeTruthy();
    root.unmount();
    host.remove();
  });

  it("shows preview stone without treating it as committed", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <SnapshotBoard
          snapshot={snap(19)}
          interactive
          preview={{ x: 4, y: 4 }}
          hoverColor="black"
        />,
      );
    });
    expect(host.querySelector('[data-testid="stone-4-4"]')).toBeNull();
    expect(host.querySelectorAll("circle[opacity]").length).toBeGreaterThan(0);
    root.unmount();
    host.remove();
  });
});
