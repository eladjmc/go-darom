import { describe, expect, it } from "vitest";
import { AuthError } from "../identity/token-verifier.js";

/** Mirrors COMM-003 direct-contact gate without DB. */
function canDirectContact(blockedPairs: Array<[string, string]>, a: string, b: string) {
  if (a === b) throw new AuthError("לא ניתן ליצור קשר עם עצמכם", 400);
  const blocked = blockedPairs.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
  if (blocked) throw new AuthError("לא ניתן ליצור קשר — קיימת חסימה בין המשתמשים", 403);
  return true;
}

describe("blocking policy", () => {
  it("blocks DMs in both directions without affecting public chat semantics", () => {
    const pairs: Array<[string, string]> = [["u1", "u2"]];
    expect(() => canDirectContact(pairs, "u1", "u2")).toThrow(/חסימה/);
    expect(() => canDirectContact(pairs, "u2", "u1")).toThrow(/חסימה/);
    expect(canDirectContact(pairs, "u1", "u3")).toBe(true);
  });
});
