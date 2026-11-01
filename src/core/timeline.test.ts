import { meterOf } from "./meter";
import { describe, expect, it } from "vitest";
import { bars, bpmOfBar, clicks, clicksUntil, isMutedBar, nextCursor, origin, resumeClicks } from "./timeline";
import type { Settings } from "./types";

const base: Settings = {
  bpm: 120,
  meter: meterOf("4/4"),
  subdivision: 1,
  accentFirst: true,
  countInBars: 0,
  random: null,
  gap: null,
  seed: 42,
};

const take = <T>(it: Iterable<T>, n: number): T[] => {
  const out: T[] = [];
  for (const x of it) {
    if (out.length === n) break;
    out.push(x);
  }
  return out;
};

describe("timing", () => {
  it("spaces quarter notes by 60/bpm", () => {
    const times = clicksUntil(base, 2).map((c) => c.time);
    expect(times).toEqual([0, 0.5, 1, 1.5]);
  });

  it("accents beat 1 only", () => {
    expect(clicksUntil(base, 2).map((c) => c.kind)).toEqual(["accent", "beat", "beat", "beat"]);
  });

  it("can disable the accent", () => {
    expect(clicksUntil({ ...base, accentFirst: false }, 2).every((c) => c.kind === "beat")).toBe(true);
  });

  it("splits beats into subdivisions", () => {
    const cs = clicksUntil({ ...base, subdivision: 2 }, 1);
    expect(cs.map((c) => [c.time, c.kind])).toEqual([
      [0, "accent"],
      [0.25, "sub"],
      [0.5, "beat"],
      [0.75, "sub"],
    ]);
  });

  it("chains bar start times", () => {
    expect(take(bars(base), 3).map((b) => b.start)).toEqual([0, 2, 4]);
  });
});

describe("count-in", () => {
  const s = { ...base, countInBars: 2, subdivision: 2 as const };

  it("starts at negative bar indices and plays quarters only", () => {
    const first = take(bars(s), 3);
    expect(first.map((b) => [b.index, b.countIn])).toEqual([
      [-2, true],
      [-1, true],
      [0, false],
    ]);
    const countInClicks = clicksUntil(s, 4);
    expect(countInClicks).toHaveLength(8);
    expect(countInClicks.every((c) => c.countIn && c.sub === 0)).toBe(true);
  });

  it("is never muted or randomised", () => {
    const r = { ...s, random: { min: 60, max: 200, everyBars: 1 }, gap: { play: 0, mute: 1 } };
    const [a, b] = take(bars(r), 2);
    expect([a.bpm, b.bpm, a.muted, b.muted]).toEqual([120, 120, false, false]);
  });
});

describe("gap trainer", () => {
  const s = { ...base, gap: { play: 3, mute: 1 } };

  it("mutes the last bar of each cycle", () => {
    expect(Array.from({ length: 8 }, (_, i) => isMutedBar(s, i))).toEqual([
      false, false, false, true, false, false, false, true,
    ]);
  });

  it("marks clicks in muted bars", () => {
    const muted = clicksUntil(s, 8).filter((c) => c.muted);
    expect(muted.map((c) => c.bar)).toEqual([3, 3, 3, 3]);
  });

  it("does nothing with mute = 0", () => {
    expect(isMutedBar({ ...base, gap: { play: 3, mute: 0 } }, 3)).toBe(false);
  });
});

describe("random tempo", () => {
  const s = { ...base, random: { min: 90, max: 140, everyBars: 4 } };

  it("stays inside the range", () => {
    for (let i = 0; i < 500; i++) {
      const bpm = bpmOfBar(s, i);
      expect(bpm).toBeGreaterThanOrEqual(90);
      expect(bpm).toBeLessThanOrEqual(140);
    }
  });

  it("holds a tempo for everyBars bars", () => {
    const first = [0, 1, 2, 3].map((i) => bpmOfBar(s, i));
    expect(new Set(first).size).toBe(1);
  });

  it("is deterministic per seed and varies across blocks", () => {
    const run = (seed: number) => Array.from({ length: 20 }, (_, i) => bpmOfBar({ ...s, seed }, i * 4));
    expect(run(7)).toEqual(run(7));
    expect(new Set(run(7)).size).toBeGreaterThan(1);
  });

  it("lengthens bars when the tempo drops", () => {
    const [b0, b1] = take(bars(s), 2);
    expect(b1.start).toBeCloseTo((60 / b0.bpm) * 4);
  });
});

describe("re-planning", () => {
  it("continues from the next bar without a time jump", () => {
    const [b0] = take(bars(base), 1);
    const faster = { ...base, bpm: 150 };
    const [b1] = take(bars(faster, nextCursor(base, b0)), 1);
    expect([b1.index, b1.start, b1.bpm]).toEqual([1, 2, 150]);
  });

  it("keeps the due click in place when the tempo changes mid-bar", () => {
    const due = take(clicks(base), 3)[2]; // bar 0, beat 2 at t = 1.0
    const resumed = take(resumeClicks({ ...base, bpm: 60 }, due), 3);
    expect(resumed.map((c) => [c.bar, c.beat, c.time])).toEqual([
      [0, 2, 1],
      [0, 3, 2],
      [1, 0, 3],
    ]);
  });

  it("drops to the next bar when beats per bar shrink below the due beat", () => {
    const due = take(clicks(base), 4)[3]; // beat 3
    const [first] = take(resumeClicks({ ...base, meter: meterOf("3/4") }, due), 1);
    expect([first.bar, first.beat, first.time]).toEqual([1, 0, 1.5]);
  });

  it("skips to the next on-grid click when the subdivision changes", () => {
    const due = take(clicks({ ...base, subdivision: 2 }), 2)[1]; // the 'and' of beat 1 at 0.25
    const [first] = take(resumeClicks(base, due), 1);
    expect([first.beat, first.time]).toEqual([1, 0.5]);
  });

  it("origin skips to bar 0 without count-in", () => {
    expect(origin(base)).toEqual({ index: 0, start: 0 });
  });
});

describe("practice timer end", () => {
  it("cuts clicks at or after the end, never before", async () => {
    const { pastEnd } = await import("./timeline");
    expect([pastEnd(299.5, 300), pastEnd(300, 300), pastEnd(300.5, 300), pastEnd(1e6, null)]).toEqual([false, true, true, false]);
  });
});

describe("display pick", () => {
  it("shows the latest due click and drops older ones", async () => {
    const { latestDue } = await import("./timeline");
    const q = [{ time: 0 }, { time: 0.5 }, { time: 1 }, { time: 1.5 }];
    expect(latestDue(q, 10.6, 10)).toEqual({ show: { time: 0.5 }, rest: [{ time: 1 }, { time: 1.5 }] });
    expect(latestDue(q, 9, 10)).toEqual({ show: null, rest: q }); // nothing due yet
    expect(latestDue(q, 99, 10).show).toEqual({ time: 1.5 }); // far behind: still shows the newest
  });
});
