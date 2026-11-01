import { describe, expect, it } from "vitest";
import { ROWS, dotPath, mark } from "./wordmark";

describe("wordmark", () => {
  it("spells tempo on a 25 × 9 grid with the t lit", () => {
    const m = mark();
    expect(m.cols).toBe(25);
    expect(Math.max(...[...m.lit, ...m.rest].map(([, y]) => y))).toBe(ROWS - 1); // p's descender
    expect(Math.max(...m.lit.map(([x]) => x))).toBe(3); // the t is the first four columns
    expect(m.rest.every(([x]) => x >= 5)).toBe(true); // one empty column after it
  });

  it("keeps the x-height at five dots, like the icon's columns", () => {
    const o = mark("o").lit.map(([, y]) => y);
    expect([Math.min(...o), Math.max(...o)]).toEqual([2, 6]);
  });

  it("draws dots at cell centres", () => {
    expect(dotPath([[0, 0], [2, 4]])).toBe("M0.5 0.5h0M2.5 4.5h0");
  });
});
