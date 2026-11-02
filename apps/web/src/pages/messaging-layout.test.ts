import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "messaging.css"),
  "utf8",
);

describe("messaging layout CSS contract", () => {
  it("centers the chat frame with max-width (not the full-bleed section)", () => {
    expect(css).toMatch(/\.chat-frame\s*\{[^}]*margin-inline:\s*auto/s);
    expect(css).toMatch(/\.chat-frame\s*\{[^}]*--chat-shell-max|var\(--chat-shell-max\)/s);
    expect(css).not.toMatch(/^\.messaging-page\s*\{[^}]*max-width/m);
  });

  it("gives chat shells a 3-row grid with a scrollable thread", () => {
    expect(css).toMatch(/\.msg-shell\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto/s);
    expect(css).toMatch(/\.msg-thread\s*\{[^}]*min-height:\s*0/s);
    expect(css).toMatch(/\.msg-thread\s*\{[^}]*overflow-y:\s*auto/s);
  });

  it("keeps DM list and chat panes independently scrollable", () => {
    expect(css).toMatch(/\.dm-thread-list\s*\{[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.dm-thread-list\s*\{[^}]*min-height:\s*0/s);
    expect(css).toMatch(/\.dm-chat-pane\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto/s);
  });

  it("styles slim sage scrollbars with Firefox and WebKit fallbacks", () => {
    expect(css).toMatch(/scrollbar-width:\s*thin/);
    expect(css).toMatch(/::-webkit-scrollbar/);
    expect(css).toMatch(/--chat-scrollbar-thumb/);
  });

  it("uses mobile breakpoint strategy for narrow viewports", () => {
    expect(css).toMatch(/@media \(max-width: 860px\)/);
    expect(css).toMatch(/@media \(max-width: 430px\)/);
    expect(css).toMatch(/\.dm-layout\.is-thread \.dm-list-pane/);
  });
});
