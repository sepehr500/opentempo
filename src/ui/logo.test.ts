import { describe, expect, it } from "vitest";
import { HEIGHT, WIDTH, columns, dotPath, litColumn } from "./logo";

describe("tempo mark", () => {
  it("matches the icon grid: four 3×5 columns with a one-dot gap", () => {
    expect([WIDTH, HEIGHT]).toEqual([15, 5]);
    expect(columns.map((c) => c.length)).toEqual([15, 15, 15, 15]);
    expect(columns.map((c) => Math.min(...c.map(([x]) => x)))).toEqual([0, 4, 8, 12]);
    expect(Math.max(...columns[3].map(([x]) => x))).toBe(14);
  });

  it("lights the first column at rest and follows the beat, wrapping past four", () => {
    expect([null, 0, 1, 3, 4, 6].map(litColumn)).toEqual([0, 0, 1, 3, 0, 2]);
  });

  it("draws dots at cell centres", () => {
    expect(dotPath([[0, 0], [2, 4]])).toBe("M0.5 0.5h0M2.5 4.5h0");
  });
});
