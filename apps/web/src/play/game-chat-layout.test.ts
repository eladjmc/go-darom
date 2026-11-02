import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "play.css"), "utf8");

describe("always-visible game chat layout contract", () => {
  it("uses a two-column room layout with chat dock in the sidebar", () => {
    const layout = css.match(/\.game-room-layout\s*\{[^}]+\}/)?.[0] ?? "";
    expect(layout).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(/);
    expect(css).toMatch(/\.game-chat-dock\s*\{/);
    expect(css).not.toMatch(/\.game-dm-overlay\s*\{/);
    expect(css).not.toMatch(/\.game-dm-backdrop/);
  });

  it("keeps chat always flexed open (no collapse/toggle CSS)", () => {
    expect(css).not.toMatch(/\.game-chat-toggle/);
    expect(css).not.toMatch(/\.is-chat-open/);
    expect(css).not.toMatch(/\.game-chat-dock\.is-collapsed/);
    expect(css).not.toMatch(/game-chat-unread-dot/);
    const dock = css.match(/\.game-chat-dock\s*\{[^}]+\}/)?.[0] ?? "";
    expect(dock).toMatch(/flex:\s*1\s+1\s+auto/);
  });

  it("uses compact log lines without bubbles", () => {
    expect(css).toMatch(/\.game-chat-line\s*\{/);
    expect(css).toMatch(/\.game-chat-composer\s*\{/);
    expect(css).not.toMatch(/\.game-chat-bubble\s*\{/);
  });
});
