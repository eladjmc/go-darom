/**
 * Canonical Go Darom product icon mapping (Brand Asset Pack / ASSET_MANIFEST).
 * Custom SVG only where the pack defines a product icon; Lucide for generic chrome.
 *
 * IC-PLAY-GO      → Games   (`/play`)
 * IC-STUDY-BOARD  → Learning (`/learn`)
 * IC-PUZZLE       → Puzzles  (`/puzzles`)
 *
 * IC-BLACK-STONE / IC-WHITE-STONE / IC-HANDICAP exist in the pack but are not
 * mapped to primary nav routes (no matching top-level destinations).
 */

export type BrandProductIconId = "IC-PLAY-GO" | "IC-STUDY-BOARD" | "IC-PUZZLE";

export type AppIconName =
  | "home"
  | "community"
  | "play"
  | "learn"
  | "puzzles"
  | "shop"
  | "menu"
  | "close"
  | "messages"
  | "bell";

export type BrandIconDef = {
  kind: "brand";
  manifestId: BrandProductIconId;
  /** Served from apps/web/public — identical to docs/03-design/assets/icons */
  src: string;
};

export type LucideIconDef = {
  kind: "lucide";
  name: "home" | "community" | "shop" | "menu" | "close" | "messages" | "bell";
};

export type AppIconDef = BrandIconDef | LucideIconDef;

export const APP_ICONS: Record<AppIconName, AppIconDef> = {
  home: { kind: "lucide", name: "home" },
  community: { kind: "lucide", name: "community" },
  play: {
    kind: "brand",
    manifestId: "IC-PLAY-GO",
    src: "/icons/play-go.svg",
  },
  learn: {
    kind: "brand",
    manifestId: "IC-STUDY-BOARD",
    src: "/icons/study-board.svg",
  },
  puzzles: {
    kind: "brand",
    manifestId: "IC-PUZZLE",
    src: "/icons/puzzle.svg",
  },
  shop: { kind: "lucide", name: "shop" },
  menu: { kind: "lucide", name: "menu" },
  close: { kind: "lucide", name: "close" },
  messages: { kind: "lucide", name: "messages" },
  bell: { kind: "lucide", name: "bell" },
};

/** Route → icon name for primary product navigation */
export const NAV_ROUTE_ICONS: Record<string, AppIconName> = {
  "/": "home",
  "/community": "community",
  "/play": "play",
  "/learn": "learn",
  "/puzzles": "puzzles",
  "/shop": "shop",
};
