import { describe, expect, it } from "vitest";
import { addPreset, defaultName, matches, removePreset, updatePreset, type Preset } from "./presets";

const v = { bpm: 120, beatsPerBar: 4, subdivision: 1 as const, voice: "wood" };

describe("presets", () => {
  it("adds with a default name from the tempo, avoiding duplicates", () => {
    const a = addPreset([], v);
    const b = addPreset(a, v);
    const c = addPreset(b, { ...v, bpm: 96 });
    expect(c.map((p) => p.name)).toEqual(["120 bpm", "120 bpm 2", "96 bpm"]);
  });

  it("keeps only the preset values", () => {
    const [p] = addPreset([], { ...v, extra: 1 } as never);
    expect(Object.keys(p).sort()).toEqual(["beatsPerBar", "bpm", "id", "name", "subdivision", "voice"]);
  });

  it("updates and removes by id without touching others", () => {
    const list = addPreset(addPreset([], v), { ...v, bpm: 90 });
    const [a, b] = list;
    expect(updatePreset(list, a.id, { name: "warm-up" }).map((p) => p.name)).toEqual(["warm-up", "90 bpm"]);
    expect(removePreset(list, a.id)).toEqual([b]);
  });

  it("matches only identical settings", () => {
    const [p] = addPreset([], v) as Preset[];
    expect(matches(p, v)).toBe(true);
    expect(matches(p, { ...v, bpm: 121 })).toBe(false);
    expect(matches(p, { ...v, voice: "bell" })).toBe(false);
  });

  it("numbers past existing duplicates", () => {
    expect(defaultName([{ name: "120 bpm" }, { name: "120 bpm 2" }] as Preset[], 120)).toBe("120 bpm 3");
  });
});
