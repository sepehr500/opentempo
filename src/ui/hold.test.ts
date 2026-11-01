import { describe, expect, it } from "vitest";
import { HOLD_MS, holdDelay } from "./hold";

describe("hold to repeat", () => {
  it("waits before repeating, so a tap is one step", () => {
    expect(holdDelay(0)).toBe(HOLD_MS);
  });

  it("speeds up the longer the key is held, down to a floor", () => {
    const d = Array.from({ length: 40 }, (_, i) => holdDelay(i + 1));
    expect(d.every((x, i) => i === 0 || x <= d[i - 1])).toBe(true);
    expect([d[0], d[d.length - 1]]).toEqual([120, 30]);
  });

  it("repeats a few dozen times in two seconds of holding", () => {
    let t = 0;
    let n = 0;
    while (t < 2000) t += holdDelay(n++);
    expect(n).toBeGreaterThanOrEqual(30);
    expect(n).toBeLessThanOrEqual(60);
  });
});
