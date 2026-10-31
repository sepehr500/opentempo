import { describe, expect, it } from "vitest";
import type { Capabilities } from "./platform/capabilities";
import { DEFAULT_PREFS, detentDue, displayBpm, effectiveFeel, feelAvailable, formatClock, hydrate, toSettings } from "./state";

const all: Capabilities = { vibration: true, wakeLock: true, mediaSession: true, lockedPlayback: true };
const ios: Capabilities = { ...all, vibration: false, lockedPlayback: false };

describe("feel settings", () => {
  it("are all available on a capable device", () => {
    expect(feelAvailable("buzz", all) && feelAvailable("stayAwake", all) && feelAvailable("flash", all)).toBe(true);
  });

  it("disable buzz without vibration, but keep the user's choice", () => {
    expect(feelAvailable("buzz", ios)).toBe(false);
    expect(effectiveFeel({ buzz: true, flash: true, stayAwake: true }, ios)).toEqual({ buzz: false, flash: true, stayAwake: true });
  });

  it("never turn on something the user turned off", () => {
    expect(effectiveFeel({ buzz: false, flash: false, stayAwake: false }, all)).toEqual({ buzz: false, flash: false, stayAwake: false });
  });
});

describe("prefs", () => {
  it("hydrate fills new fields from defaults", () => {
    const p = hydrate({ bpm: 90, feel: { buzz: false } as never });
    expect([p.bpm, p.feel.buzz, p.feel.stayAwake, p.gap.play]).toEqual([90, false, true, 3]);
  });

  it("toSettings only passes features that are on", () => {
    const s = toSettings({ ...DEFAULT_PREFS, gap: { on: true, play: 2, mute: 2 } }, 5);
    expect([s.gap, s.random, s.countInBars, s.seed]).toEqual([{ play: 2, mute: 2 }, null, 0, 5]);
  });

  it("formats the timer", () => {
    expect([formatClock(600), formatClock(456.2), formatClock(-1)]).toEqual(["10:00", "07:37", "00:00"]);
  });

  it("displays the knob tempo immediately, the heard tempo only in random mode", () => {
    const heard = { bpm: 131, countIn: false };
    const fixed = { bpm: 140, random: { ...DEFAULT_PREFS.random, on: false } };
    const random = { bpm: 140, random: { ...DEFAULT_PREFS.random, on: true } };
    expect(displayBpm(fixed, heard)).toBe(140);
    expect(displayBpm(random, heard)).toBe(131);
    expect(displayBpm(random, { bpm: 131, countIn: true })).toBe(140);
    expect(displayBpm(random, null)).toBe(140);
  });

  it("spaces haptic detents", () => {
    expect([detentDue(100, 0), detentDue(130, 100), detentDue(140, 100)]).toEqual([true, false, true]);
  });
});
