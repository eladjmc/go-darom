import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "messaging.css"),
  "utf8",
);

describe("messaging layout CSS contract", () => {
  it("gives the chat shell a definite height and 3-row grid", () => {
    expect(css).toMatch(/\.msg-shell\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto/s);
    expect(css).toMatch(/\.msg-shell\s*\{[^}]*height:\s*var\(--chat-shell-h\)/s);
    expect(css).toMatch(/\.msg-thread\s*\{[^}]*min-height:\s*0/s);
    expect(css).toMatch(/\.msg-thread\s*\{[^}]*overflow-y:\s*auto/s);
  });

  it("keeps DM list and chat panes independently scrollable within a bounded shell", () => {
    expect(css).toMatch(/\.dm-layout\s*\{[^}]*height:\s*var\(--dm-shell-h\)/s);
    expect(css).toMatch(/\.dm-thread-list\s*\{[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.dm-thread-list\s*\{[^}]*min-height:\s*0/s);
    expect(css).toMatch(/\.dm-chat-pane\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto/s);
  });

  it("uses dvh-aware mobile viewport strategy", () => {
    expect(css).toMatch(/100dvh/);
    expect(css).toMatch(/@media \(max-width: 860px\)/);
    expect(css).toMatch(/@media \(max-width: 430px\)/);
  });

  it("fills remaining viewport on mobile via flex column (not unbounded page growth)", () => {
    const mobileBlock = css.split("@media (max-width: 860px)")[1] ?? "";
    expect(mobileBlock).toMatch(/\.section\.messaging-page\s*\{[^}]*max-height:\s*calc\(100dvh - var\(--header-h\)\)/s);
    expect(mobileBlock).toMatch(/\.msg-shell[\s\S]*?flex:\s*1 1 auto/);
    expect(mobileBlock).toMatch(/overflow-y:\s*auto/);
  });
});
