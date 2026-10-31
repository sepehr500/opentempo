import { describe, expect, it } from "vitest";
import { claims, offsetFor, pushSample, releaseVelocity, shouldDismiss } from "./sheetDrag";

describe("sheet drag", () => {
  it("only claims mostly-vertical movement past the slop", () => {
    expect(claims(0, 5)).toBe(false); // a tap with a wobble
    expect(claims(2, 12)).toBe(true);
    expect(claims(20, 12)).toBe(false); // horizontal
    expect(claims(0, -12)).toBe(true); // upward still claims (and rubber-bands)
  });

  it("follows down 1:1 and resists up", () => {
    expect(offsetFor(120)).toBe(120);
    expect(offsetFor(-4)).toBe(-4);
    expect(offsetFor(-400)).toBe(-16);
  });

  it("dismisses on distance or a downward flick", () => {
    expect(shouldDismiss(110, 0, 400)).toBe(true); // past a quarter
    expect(shouldDismiss(60, 0.1, 400)).toBe(false); // slow, short: snap back
    expect(shouldDismiss(50, 0.35, 400)).toBe(true); // a gentle flick
    expect(shouldDismiss(40, 0.9, 400)).toBe(true); // flick
    expect(shouldDismiss(10, 2, 400)).toBe(false); // too short to be deliberate
    expect(shouldDismiss(-30, -1, 400)).toBe(false); // upward
  });

  it("measures release velocity over the recent movement", () => {
    const flick = [{ y: 0, t: 0 }, { y: 17, t: 1 }, { y: 33, t: 36 }, { y: 50, t: 69 }];
    expect(releaseVelocity(flick, 103)).toBeCloseTo(50 / 69); // up 34ms after the last move
    expect(releaseVelocity(flick, 69 + 200)).toBe(0); // rested before lifting
    expect(releaseVelocity([{ y: 0, t: 0 }, { y: 10, t: 300 }, { y: 30, t: 350 }], 360)).toBeCloseTo(20 / 50); // old samples ignored
    expect(releaseVelocity([], 10)).toBe(0);
  });

  it("keeps a bounded sample history", () => {
    const h = [0, 50, 100, 150, 250, 300].reduce((acc, t) => pushSample(acc, { y: t, t }), [] as { y: number; t: number }[]);
    expect(h.map((x) => x.t)).toEqual([100, 150, 250, 300]);
  });
});
