import { describe, expect, it } from "vitest";
import { layout } from "./dotLayout";

describe("dot layout", () => {
  it("lays digits left to right with one column of tracking", () => {
    const one = layout("1", "big");
    const two = layout("11", "big");
    expect(two.cols).toBe(one.cols * 2 + 1);
    expect(two.dots.length).toBe(one.dots.length * 2);
    expect(one.rows).toBe(17);
  });

  it("supports lowercase names in the small set, case-insensitively", () => {
    const a = layout("wood", "small");
    expect(a.rows).toBe(11);
    expect(a.dots.length).toBeGreaterThan(0);
    expect(layout("WOOD", "small")).toEqual(a);
  });

  it("skips unknown glyphs and widens for spaces", () => {
    expect(layout("?", "big").dots).toEqual([]);
    expect(layout("1 1", "small").cols).toBeGreaterThan(layout("11", "small").cols);
  });
});
