import { describe, expect, it } from "vitest";
import { claims, offsetFor, shouldDismiss, velocityOf } from "./sheetDrag";

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
    expect(shouldDismiss(40, 0.9, 400)).toBe(true); // flick
    expect(shouldDismiss(10, 2, 400)).toBe(false); // too short to be deliberate
    expect(shouldDismiss(-30, -1, 400)).toBe(false); // upward
  });

  it("measures velocity from the last two samples", () => {
    expect(velocityOf({ y: 0, t: 0 }, { y: 30, t: 20 })).toBe(1.5);
    expect(velocityOf({ y: 0, t: 5 }, { y: 30, t: 5 })).toBe(0);
  });
});
