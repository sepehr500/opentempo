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

describe("knob feel", () => {
  it("covers each range in about the same travel, within bounds", async () => {
    const { pxPerStep } = await import("./knobDrag");
    expect(pxPerStep(11)).toBe(20); // beats 1-12
    expect(pxPerStep(3)).toBe(40); // split 1-4: capped
    expect(pxPerStep(20)).toBe(11); // level 0-100 by 5
    expect(pxPerStep(280)).toBe(3); // tempo: floor
  });

  it("does not flicker on an edge", async () => {
    const { stepTo } = await import("./knobDrag");
    expect(stepTo(4.55, 4)).toBe(4); // just past halfway: still 4
    expect(stepTo(4.8, 4)).toBe(5);
    expect(stepTo(4.45, 5)).toBe(5); // wobbling back across the edge: stays 5
    expect(stepTo(4.2, 5)).toBe(4);
    expect(stepTo(6.9, 4)).toBe(7); // a big move lands on the nearest step
  });

  it("up or right means more, and few-position knobs get one detent per value", async () => {
    const { towardMore, detents } = await import("./knobDrag");
    expect(towardMore(0, -10)).toBe(10);
    expect(towardMore(10, 0)).toBe(10);
    expect(towardMore(-4, 4)).toBe(-8);
    expect(detents(3)).toBe(4);
    expect(detents(11)).toBe(12);
    expect(detents(20)).toBe(21);
    expect(detents(280)).toBe(null);
  });
});

describe("scroll wheel", () => {
  it("a notch is one step; a trackpad needs a deliberate scroll per step", async () => {
    const { wheelDelta, wheelStep } = await import("./knobDrag");
    expect(wheelStep(0, wheelDelta(0, -100, 0))).toEqual({ acc: 0, step: 1 }); // notch up
    expect(wheelStep(0, wheelDelta(0, 120, 0))).toEqual({ acc: 0, step: -1 }); // Windows notch down
    expect(wheelStep(0, wheelDelta(0, -3, 1)).step).toBe(1); // line mode
    // trackpad: 40 small deltas of -4px = 160px -> 3 steps, not 40
    let acc = 0, steps = 0;
    for (let i = 0; i < 40; i++) { const r = wheelStep(acc, wheelDelta(0, -4, 0)); acc = r.acc; steps += r.step; }
    expect(steps).toBe(3);
    expect(wheelDelta(10, 0, 0)).toBe(10); // right means more
  });
});
