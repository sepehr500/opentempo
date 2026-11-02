import { describe, expect, it } from "vitest";
import { MAX_GAIN, MIN_GAIN, gainFor, releaseValue, smoothSpeed, type Sample } from "./knobDrag";

describe("knob gain", () => {
  it("is fine when slow, coarse when fast, 1 at an ordinary speed", () => {
    expect(gainFor(0)).toBe(MIN_GAIN);
    expect(gainFor(0.05)).toBe(MIN_GAIN);
    expect(gainFor(0.3)).toBeCloseTo(1);
    expect(gainFor(10)).toBe(MAX_GAIN);
    expect(smoothSpeed(0, 6, 16)).toBeCloseTo(0.1875);
    expect(smoothSpeed(0.2, 0, 0)).toBeCloseTo(0.1);
  });
});

describe("release", () => {
  // a slow drag to 128 that rests, then the fingertip shifts 6px as it lifts (value 130)
  const resting: Sample[] = [
    { t: 0, y: 400, v: 120 },
    { t: 300, y: 380, v: 124 },
    { t: 600, y: 360, v: 128 },
    { t: 700, y: 360, v: 128 },
    { t: 790, y: 354, v: 130 },
  ];

  it("discards the lift-off shift", () => {
    expect(releaseValue(resting, 800, 354)).toBe(128);
  });

  it("keeps a move that was meant: a sweep right up to release", () => {
    const sweep: Sample[] = [
      { t: 0, y: 400, v: 120 },
      { t: 700, y: 390, v: 122 },
      { t: 760, y: 360, v: 140 },
      { t: 790, y: 330, v: 160 },
    ];
    expect(releaseValue(sweep, 800, 330)).toBe(null);
  });

  it("a tap with a tiny wobble keeps the starting value", () => {
    expect(releaseValue([{ t: 0, y: 400, v: 120 }, { t: 40, y: 395, v: 122 }], 60, 395)).toBe(120);
    expect(releaseValue([], 60, 0)).toBe(null);
  });
});
