import { describe, expect, it } from "vitest";
import { GO_COLUMN_LETTERS, goColumnLetter, goRowNumber, parseGoCoordinate } from "./boardCoordinates";

describe("Go board coordinates", () => {
  it("skips the letter I", () => {
    expect(GO_COLUMN_LETTERS.includes("I")).toBe(false);
    expect(goColumnLetter(0)).toBe("A");
    expect(goColumnLetter(7)).toBe("H");
    expect(goColumnLetter(8)).toBe("J");
    expect(goColumnLetter(18)).toBe("T");
  });

  it("numbers rows from bottom to top for all board sizes", () => {
    for (const size of [9, 13, 19] as const) {
      expect(goRowNumber(0, size)).toBe(size);
      expect(goRowNumber(size - 1, size)).toBe(1);
      expect(goRowNumber(Math.floor(size / 2), size)).toBe(size - Math.floor(size / 2));
    }
  });

  it("round-trips labels to engine indices", () => {
    expect(parseGoCoordinate("A1", 9)).toEqual({ x: 0, y: 8 });
    expect(parseGoCoordinate("J10", 19)).toEqual({ x: 8, y: 9 });
    expect(parseGoCoordinate("D4", 13)).toEqual({ x: 3, y: 9 });
    expect(parseGoCoordinate("I4", 9)).toBeNull();
  });
});
