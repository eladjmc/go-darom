import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "play.css"), "utf8");

describe("play hub layout CSS contract", () => {
  it("centers a compact hub shell (~1100–1150px)", () => {
    expect(css).toMatch(/\.play-hub-inner\s*\{[^}]*max-width:\s*1120px/s);
    expect(css).toMatch(/\.play-hub-inner\s*\{[^}]*margin-inline:\s*auto/s);
  });

  it("balances the active-game and invites columns", () => {
    expect(css).toMatch(
      /\.play-hub-dashboard\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.05fr\) minmax\(0,\s*1fr\)/s,
    );
    expect(css).toMatch(/\.play-hub-panel-primary\s*\{/);
    expect(css).toMatch(/@media \(max-width: 960px\)[\s\S]*?\.play-hub-dashboard\s*\{[^}]*grid-template-columns:\s*1fr/s);
  });

  it("keeps invite tabs and compact invite rows", () => {
    expect(css).toMatch(/\.play-hub-tabs\s*\{/);
    expect(css).toMatch(/\.play-hub-invite\s*\{/);
    expect(css).toMatch(/\.play-hub-invite-actions\s*\{/);
  });

  it("keeps invitation modal inside the viewport with sticky chrome", () => {
    expect(css).toMatch(/\.play-modal-root\s*\{[^}]*position:\s*fixed/s);
    expect(css).toMatch(/\.play-modal-card\s*\{[^}]*max-height:\s*calc\(100dvh - 32px\)/s);
    expect(css).toMatch(/\.play-modal-header\s*\{[^}]*flex:\s*0 0 auto/s);
    expect(css).toMatch(/\.play-modal-footer\s*\{[^}]*flex:\s*0 0 auto/s);
    expect(css).toMatch(/\.play-modal-body\s*\{[^}]*overflow:\s*auto/s);
  });

  it("covers mobile hub breakpoints used in visual QA", () => {
    expect(css).toMatch(/@media \(max-width: 800px\)/);
    expect(css).toMatch(/@media \(max-width: 430px\)/);
  });

  it("includes full-width previous-games history panel styles", () => {
    expect(css).toMatch(/\.play-hub-panel-history\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
    expect(css).toMatch(/\.play-hub-history-list\s*\{/);
    expect(css).toMatch(/\.game-replay-controls\s*\{/);
  });

  it("keeps replay scrubber as compact equal icon buttons without RTL double-mirror", () => {
    expect(css).toMatch(/\.game-replay-btn\s*\{[^}]*width:\s*2\.4rem/s);
    expect(css).toMatch(/\.game-replay-icon\s*\{[^}]*transform:\s*none\s*!important/s);
  });
});
