import { describe, expect, it } from "vitest";
import { addTap, tapBpm } from "./tap";
import { markingOf } from "./italian";

const tapsAt = (ms: number[]) => ms.reduce<number[]>((acc, t) => addTap(acc, t), []);

describe("tap tempo", () => {
  it("needs two taps", () => {
    expect(tapBpm(tapsAt([0]))).toBeNull();
  });

  it("measures steady taps", () => {
    expect(tapBpm(tapsAt([0, 500, 1000, 1500]))).toBe(120);
  });

  it("ignores one sloppy tap", () => {
    expect(tapBpm(tapsAt([0, 500, 1000, 1700, 2200, 2700]))).toBe(120);
  });

  it("resets after a long pause", () => {
    expect(tapsAt([0, 500, 5000])).toEqual([5000]);
  });
});

describe("tempo markings", () => {
  it.each([
    [50, "largo"],
    [96, "andante"],
    [120, "allegro"],
    [210, "prestissimo"],
  ])("%i bpm is %s", (bpm, name) => expect(markingOf(bpm)).toBe(name));
});
