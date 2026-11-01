import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, hydrate, toSettings } from "../state";
import { FAMILIES, beatsOf, familyIndex, meterAt, meterFromBeats, meterOf, nextGrouping, splitGlyph } from "./meter";
import { clicksOfBar, clicksUntil, resumeClicks } from "./timeline";
import type { Settings } from "./types";

const settings = (meter: string, subdivision: 1 | 2 | 3 | 4 = 1, bpm = 60): Settings => ({
  bpm,
  meter: meterOf(meter),
  subdivision,
  accentFirst: true,
  countInBars: 0,
  random: null,
  gap: null,
  seed: 1,
});
const bar0 = (s: Settings) => clicksOfBar(s, { index: 0, countIn: false, start: 0, bpm: s.bpm, muted: false });
const kinds = (s: Settings) => bar0(s).map((c) => c.kind[0]).join("");
const times = (s: Settings) => bar0(s).map((c) => +c.time.toFixed(4));

describe("meters", () => {
  it("round-trips ids and falls back to 4/4", () => {
    for (const f of FAMILIES) for (const g of f.groupings) {
      const id = meterAt(FAMILIES.indexOf(f));
      expect(meterOf(id).label).toBe(f.label);
      expect(g.length).toBeGreaterThan(0);
    }
    expect(meterOf("7/8 3+2+2").groups).toEqual([3, 2, 2]);
    expect(meterOf("7/8 9+9").groups).toEqual([2, 2, 3]);
    expect(meterOf("banana").id).toBe("4/4");
    expect(meterFromBeats(6)).toBe("6/4");
  });

  it("knob positions and groupings", () => {
    expect(meterAt(familyIndex("6/8"))).toBe("6/8");
    expect(familyIndex("7/8 2+3+2")).toBe(familyIndex("7/8"));
    expect(nextGrouping("7/8 2+2+3")).toBe("7/8 3+2+2");
    expect(nextGrouping("7/8 2+3+2")).toBe("7/8 2+2+3");
    expect(nextGrouping("5/8 3+2")).toBe("5/8 2+3");
    expect(nextGrouping("4/4")).toBe("4/4");
  });

  it("counts the felt beat: dotted quarters in 6/8, eighths in 7/8", () => {
    expect(beatsOf(meterOf("4/4"))).toBe(4);
    expect(beatsOf(meterOf("6/8"))).toBe(2);
    expect(beatsOf(meterOf("12/8"))).toBe(4);
    expect(beatsOf(meterOf("7/8"))).toBe(7);
  });
});

describe("clicks in a bar", () => {
  it("4/4 is unchanged", () => {
    expect(kinds(settings("4/4"))).toBe("abbb");
    expect(kinds(settings("4/4", 2))).toBe("asbsbsbs");
  });

  it("6/8: the pulse is two dotted quarters; eighths are accent sub sub beat sub sub", () => {
    expect(times(settings("6/8"))).toEqual([0, 1]);
    expect(kinds(settings("6/8"))).toBe("ab");
    expect(kinds(settings("6/8", 2))).toBe("assbss");
    expect(times(settings("6/8", 2))).toEqual([0, 0.3333, 0.6667, 1, 1.3333, 1.6667]);
    expect(bar0(settings("6/8", 3))).toHaveLength(12);
    expect(bar0(settings("6/8", 4))).toHaveLength(12); // a /4 split of 4 is sixteenths here too
  });

  it("7/8 2+2+3 at 60 bpm counts eighths: group starts at 0, 2 and 4 seconds", () => {
    expect(times(settings("7/8 2+2+3"))).toEqual([0, 2, 4]);
    expect(bar0(settings("7/8 2+2+3")).map((c) => c.beat)).toEqual([0, 1, 2]);
    expect(kinds(settings("7/8 3+2+2", 2))).toBe("assbsbs");
    expect(times(settings("5/8 3+2", 2))).toEqual([0, 1, 2, 3, 4]);
  });

  it("bars follow each other with the right length", () => {
    const c = clicksUntil(settings("7/8 2+2+3", 1, 210), 2 * (60 / 210) * 7 + 1e-6);
    const bar = (60 / 210) * 7;
    expect(c.filter((x) => x.kind === "accent").map((x) => x.time)).toEqual([0, bar, 2 * bar].map((x) => expect.closeTo(x, 9)));
  });

  it("count-in clicks group starts only", () => {
    const s = { ...settings("6/8", 2), countInBars: 1 };
    const first = clicksUntil(s, 2 - 1e-6);
    expect(first.every((c) => c.countIn)).toBe(true);
    expect(first).toHaveLength(2);
  });

  it("switching meter mid-play keeps the next click's time", () => {
    const s44 = settings("4/4", 1, 120);
    const due = clicksUntil(s44, 1.6).at(-1)!; // beat 4 of bar 0, at 1.5s
    const [next] = resumeClicks(settings("6/8", 1, 120), due);
    expect(next.time).toBeCloseTo(1.5);
    expect(next.bar).toBe(1); // 6/8 has only 2 counted beats, so a new bar starts there
    expect(next.kind).toBe("accent");
  });
});

describe("prefs and presets from before time signatures", () => {
  it("migrates beats per bar to /4 meters", () => {
    const p = hydrate({ beatsPerBar: 6, presets: [{ id: "a", name: "x", bpm: 90, beatsPerBar: 3, subdivision: 1, voice: "wood" }] } as never);
    expect(p.meter).toBe("6/4");
    expect(p.presets[0].meter).toBe("3/4");
    expect("beatsPerBar" in p).toBe(false);
    expect("beatsPerBar" in p.presets[0]).toBe(false);
    expect(hydrate(undefined).meter).toBe("4/4");
    expect(toSettings({ ...DEFAULT_PREFS, meter: "9/8" }, 1).meter.groups).toEqual([3, 3, 3]);
  });

  it("split glyphs", () => {
    expect(splitGlyph(meterOf("6/8"), 1)).toBe("♩.");
    expect(splitGlyph(meterOf("7/8"), 1)).toBe("♩");
    expect(splitGlyph(meterOf("7/8"), 2)).toBe("♪");
    expect(splitGlyph(meterOf("6/8"), 4)).toBe("♬");
  });
});
