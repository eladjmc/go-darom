import { describe, expect, it } from "vitest";
import {
  distanceFromBottom,
  isNearBottom,
  planMessageScroll,
  restoreScrollAfterPrepend,
  scrollToBottom,
} from "./chatScroll";

describe("chatScroll helpers", () => {
  it("detects near-bottom vs reading older", () => {
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 900, clientHeight: 100 })).toBe(true);
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 100, clientHeight: 100 })).toBe(false);
    expect(distanceFromBottom({ scrollHeight: 500, scrollTop: 0, clientHeight: 200 })).toBe(300);
  });

  it("scrollToBottom pins to end", () => {
    const el = { scrollHeight: 800, scrollTop: 10 };
    scrollToBottom(el);
    expect(el.scrollTop).toBe(800);
  });

  it("restoreScrollAfterPrepend preserves reading position", () => {
    const el = { scrollHeight: 1200, scrollTop: 200 };
    restoreScrollAfterPrepend(el, 800);
    expect(el.scrollTop).toBe(600);
  });

  it("plans bottom scroll on initial load", () => {
    expect(
      planMessageScroll({
        prevLength: 0,
        nextLength: 5,
        prevFirstId: null,
        nextFirstId: "a",
        stickBottom: true,
        loadingOlder: false,
        previousScrollHeight: 0,
      }),
    ).toEqual({ action: "bottom" });
  });

  it("plans bottom scroll for append when stuck to bottom", () => {
    expect(
      planMessageScroll({
        prevLength: 5,
        nextLength: 6,
        prevFirstId: "a",
        nextFirstId: "a",
        stickBottom: true,
        loadingOlder: false,
        previousScrollHeight: 400,
      }),
    ).toEqual({ action: "bottom" });
  });

  it("does not auto-follow when user scrolled up", () => {
    expect(
      planMessageScroll({
        prevLength: 5,
        nextLength: 6,
        prevFirstId: "a",
        nextFirstId: "a",
        stickBottom: false,
        loadingOlder: false,
        previousScrollHeight: 400,
      }),
    ).toEqual({ action: "none" });
  });

  it("plans prepend restore when older page loads", () => {
    expect(
      planMessageScroll({
        prevLength: 50,
        nextLength: 100,
        prevFirstId: "m50",
        nextFirstId: "m1",
        stickBottom: false,
        loadingOlder: true,
        previousScrollHeight: 2000,
      }),
    ).toEqual({ action: "restore-prepend", previousScrollHeight: 2000 });
  });

  it("handles 0 / 5 / 50 / 200 length transitions without jumping when reading up", () => {
    for (const n of [5, 50, 200] as const) {
      const plan = planMessageScroll({
        prevLength: n,
        nextLength: n + 1,
        prevFirstId: "first",
        nextFirstId: "first",
        stickBottom: false,
        loadingOlder: false,
        previousScrollHeight: n * 40,
      });
      expect(plan).toEqual({ action: "none" });
    }
  });
});
