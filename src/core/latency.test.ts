import { describe, expect, it } from "vitest";
import { LATENCY_MAX_MS, calibrate, clampLatency, pulse, tapOffsets } from "./latency";
import { unit } from "./rng";

const P = 750; // 80 bpm
const clicks = pulse(P, 20 * P);
/** One tap per click from click `from`, landing `offset` ms after it, plus per-tap jitter. */
const tapsAt = (offset: number, n: number, jitter: (i: number) => number = () => 0, from = 0) =>
  Array.from({ length: n }, (_, i) => (from + i) * P + offset + jitter(i));
/** Roughly normal jitter (sum of uniforms), sd ≈ `sd` ms, deterministic. */
const human = (sd: number, seed = 7) => (i: number) => ((unit(seed, i) + unit(seed, i + 1000) + unit(seed, i + 2000) - 1.5) / 0.5) * sd;

describe("tap offsets", () => {
  it("pairs each tap with the click it answers", () => {
    expect(tapOffsets([0, 750, 1500], [180, 930, 1680], 150)).toEqual([180, 180, 180]);
  });

  it("lets a tap land a little before its click", () => {
    expect(tapOffsets([0, 750, 1500], [720, 1490], 150)).toEqual([-30, -10]);
  });

  it("drops taps before the first click", () => {
    expect(tapOffsets([500, 1250], [100, 700], 150)).toEqual([200]);
  });

  it("covers a pulse long enough for every tap", () => {
    const c = pulse(750, 3000);
    expect(c[0]).toBe(0);
    expect(c[c.length - 1]).toBeGreaterThan(3000);
  });
});

describe("calibrate", () => {
  it("needs a few taps after the lead-in", () => {
    expect(calibrate(clicks, tapsAt(180, 4))).toBeNull();
    expect(calibrate(clicks, tapsAt(180, 5))).not.toBeNull();
  });

  it("measures exact taps exactly", () => {
    expect(calibrate(clicks, tapsAt(180, 16))).toEqual({ ms: 180, spread: 0, used: 14, ok: true });
  });

  it("lands within a few ms through human jitter", () => {
    // 50 players, each tapping 16 times with ~20ms of timing jitter (a steady amateur).
    const runs = Array.from({ length: 50 }, (_, seed) => calibrate(clicks, tapsAt(180, 16, human(20, seed)))!);
    const errors = runs.map((r) => Math.abs(r.ms - 180));
    expect(errors.reduce((a, b) => a + b) / errors.length).toBeLessThanOrEqual(5);
    expect(Math.max(...errors)).toBeLessThanOrEqual(20);
    expect(runs.filter((r) => r.ok).length).toBeGreaterThanOrEqual(48);
  });

  it("ignores a missed beat and a stray double tap", () => {
    const taps = [...tapsAt(230, 16, human(10))];
    taps[9] += 260; // late, almost on the next click
    taps.splice(12, 0, taps[12] - 90); // a nervous extra tap
    const r = calibrate(clicks, taps)!;
    expect(Math.abs(r.ms - 230)).toBeLessThanOrEqual(8);
    expect(r.used).toBe(13);
    expect(r.ok).toBe(true);
  });

  it("ignores a sloppy lead-in", () => {
    const taps = tapsAt(150, 16);
    taps[0] += 200;
    taps[1] -= 120;
    expect(calibrate(clicks, taps)?.ms).toBe(150);
  });

  it("handles long delays near the top of the range", () => {
    expect(calibrate(clicks, tapsAt(480, 16, human(15)))!.ms).toBeGreaterThan(470);
  });

  it("reads taps slightly ahead of the click as no extra delay", () => {
    const r = calibrate(clicks, tapsAt(-20, 16, human(8)))!;
    expect([r.ms, r.ok]).toEqual([0, true]);
  });

  it("does not trust taps that are all over the place", () => {
    const r = calibrate(clicks, tapsAt(200, 16, (i) => (unit(3, i) - 0.5) * 300))!;
    expect(r.ok).toBe(false);
  });

  it("does not trust too few steady taps", () => {
    expect(calibrate(clicks, tapsAt(200, 8))!.ok).toBe(false);
  });
});

describe("clampLatency", () => {
  it("rounds and keeps to the usable range", () => {
    expect([clampLatency(-5), clampLatency(181.6), clampLatency(9999), clampLatency(NaN)]).toEqual([0, 182, LATENCY_MAX_MS, 0]);
  });
});
