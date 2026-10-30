import { describe, expect, it } from "vitest";
import { APP_ICONS, NAV_ROUTE_ICONS } from "./productIcons";

describe("product icon mapping", () => {
  it("maps Games / Learning / Puzzles to brand pack SVG assets", () => {
    expect(APP_ICONS.play).toMatchObject({
      kind: "brand",
      manifestId: "IC-PLAY-GO",
      src: "/icons/play-go.svg",
    });
    expect(APP_ICONS.learn).toMatchObject({
      kind: "brand",
      manifestId: "IC-STUDY-BOARD",
      src: "/icons/study-board.svg",
    });
    expect(APP_ICONS.puzzles).toMatchObject({
      kind: "brand",
      manifestId: "IC-PUZZLE",
      src: "/icons/puzzle.svg",
    });
  });

  it("keeps generic chrome on Lucide", () => {
    for (const name of ["home", "community", "shop", "menu", "close", "messages", "bell"] as const) {
      expect(APP_ICONS[name].kind).toBe("lucide");
    }
  });

  it("wires primary routes to the canonical icon names", () => {
    expect(NAV_ROUTE_ICONS["/play"]).toBe("play");
    expect(NAV_ROUTE_ICONS["/learn"]).toBe("learn");
    expect(NAV_ROUTE_ICONS["/puzzles"]).toBe("puzzles");
    expect(NAV_ROUTE_ICONS["/"]).toBe("home");
    expect(NAV_ROUTE_ICONS["/shop"]).toBe("shop");
  });
});
