import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "global.css");
const css = readFileSync(cssPath, "utf8");

describe("button hover contrast safeguards", () => {
  it("keeps primary button label light on brand backgrounds including hover", () => {
    expect(css).toMatch(/a\.btn-primary:hover[\s\S]*?color:\s*var\(--surface\)/);
    expect(css).toMatch(/\.btn-primary:hover[\s\S]*?color:\s*var\(--surface\)/);
  });

  it("keeps secondary button label on brand color including hover", () => {
    expect(css).toMatch(/a\.btn-secondary:hover[\s\S]*?color:\s*var\(--brand\)/);
    expect(css).toMatch(/\.btn-secondary:hover[\s\S]*?color:\s*var\(--brand\)/);
  });
});
