import { describe, expect, it } from "vitest";
import { gameErrorDedupeKey, hebrewGameError, looksLikeRawEngineError } from "./gameErrors";

describe("game error presentation", () => {
  it("maps occupied / wrong turn / illegal / version codes to Hebrew", () => {
    expect(hebrewGameError({ code: "OCCUPIED" })).toBe("המקום הזה כבר תפוס");
    expect(hebrewGameError({ code: "WRONG_TURN" })).toBe("עכשיו התור של היריב");
    expect(hebrewGameError({ code: "ILLEGAL_MOVE" })).toBe("אי אפשר להניח כאן אבן");
    expect(hebrewGameError({ code: "VERSION_CONFLICT" })).toBe("המשחק התעדכן. נסו שוב");
    expect(hebrewGameError({ code: "NETWORK" })).toBe("לא הצלחנו לשלוח את המהלך. נסו שוב");
  });

  it("never surfaces raw engine text", () => {
    const raw = "Move error in 0 on move number 3 at D7: stone_already_placed_here";
    expect(looksLikeRawEngineError(raw)).toBe(true);
    expect(hebrewGameError({ message: raw })).toBe("אי אפשר להניח כאן אבן");
  });

  it("dedupes repeated illegal clicks to the same key", () => {
    const a = gameErrorDedupeKey({ code: "OCCUPIED" });
    const b = gameErrorDedupeKey({ code: "OCCUPIED", message: "ignored" });
    expect(a).toBe(b);
  });
});
