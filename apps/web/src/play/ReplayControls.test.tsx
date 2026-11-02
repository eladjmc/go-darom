/**
 * @vitest-environment happy-dom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReplayControls } from "./ReplayControls";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ReplayControls media-player scrubber", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("keeps LTR order « ‹ › » mapped to First/Prev/Next/Last", () => {
    const onFirst = vi.fn();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onLast = vi.fn();
    act(() => {
      root.render(
        <ReplayControls plyIndex={2} plyCount={5} onFirst={onFirst} onPrev={onPrev} onNext={onNext} onLast={onLast} />,
      );
    });
    const actions = host.querySelector(".game-replay-actions");
    expect(actions?.getAttribute("dir")).toBe("ltr");
    const buttons = [...host.querySelectorAll("button")];
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "להתחלה",
      "מהלך קודם",
      "מהלך הבא",
      "לסיום",
    ]);
    act(() => {
      buttons[0]?.click();
      buttons[1]?.click();
      buttons[2]?.click();
      buttons[3]?.click();
    });
    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onLast).toHaveBeenCalledTimes(1);
  });

  it("disables «/‹ at 0 and ›/» at the final move", () => {
    const noop = () => undefined;
    act(() => {
      root.render(<ReplayControls plyIndex={0} plyCount={4} onFirst={noop} onPrev={noop} onNext={noop} onLast={noop} />);
    });
    let buttons = [...host.querySelectorAll("button")];
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(true);
    expect(buttons[2]?.disabled).toBe(false);
    expect(buttons[3]?.disabled).toBe(false);

    act(() => {
      root.render(<ReplayControls plyIndex={4} plyCount={4} onFirst={noop} onPrev={noop} onNext={noop} onLast={noop} />);
    });
    buttons = [...host.querySelectorAll("button")];
    expect(buttons[0]?.disabled).toBe(false);
    expect(buttons[1]?.disabled).toBe(false);
    expect(buttons[2]?.disabled).toBe(true);
    expect(buttons[3]?.disabled).toBe(true);
  });
});
