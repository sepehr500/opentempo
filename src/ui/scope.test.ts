import { describe, expect, it } from "vitest";
import { VOICES, type VoiceId } from "../audio/voices";
import { COLS, PRE, RADIUS, ROWS, SWEEP_MS, HOLD_MS, GLOW_MS, cycleCols, lookAt, scopeDots, strokeOf, tailOf, traceOf } from "./scope";

const ids = Object.keys(VOICES) as VoiceId[];
const peak = (y: readonly number[]) => Math.max(...y.map(Math.abs));

describe("scope axes", () => {
  it("gives longer decays a longer tail, the longest filling the width", () => {
    const sorted = [...ids].sort((a, b) => VOICES[a].decay - VOICES[b].decay);
    const tails = sorted.map((id) => tailOf(VOICES[id].decay));
    expect(tails).toEqual([...tails].sort((a, b) => a - b));
    expect(tailOf(VOICES.bell.decay)).toBe(1);
    expect(tailOf(VOICES.click.decay)).toBeLessThan(0.4);
  });

  it("tightens cycles by octave and never below a readable minimum", () => {
    expect(cycleCols(440)).toBe(14);
    expect(cycleCols(880)).toBe(10);
    expect(cycleCols(880)).toBeLessThan(cycleCols(660));
    expect(cycleCols(20000)).toBe(3);
  });
});

describe("traceOf", () => {
  it("is silent before the trigger and peaks at full height for an accent", () => {
    for (const id of ids) {
      const tr = traceOf(VOICES[id], "accent");
      expect(tr.y.slice(0, PRE)).toEqual([0, 0]);
      expect(tr.env[PRE]).toBe(RADIUS);
      expect(tr.y).toHaveLength(COLS);
      expect(peak(tr.y)).toBeLessThanOrEqual(RADIUS);
    }
  });

  it("draws accents taller than beats, beats taller than subdivisions", () => {
    for (const id of ids) {
      const [a, b, s] = (["accent", "beat", "sub"] as const).map((k) => traceOf(VOICES[id], k).env[PRE]);
      expect(a).toBeGreaterThan(b);
      expect(b).toBeGreaterThan(s);
      expect(s).toBeGreaterThan(0);
    }
  });

  it("ends later for longer voices", () => {
    expect(traceOf(VOICES.click, "accent").end).toBeLessThan(traceOf(VOICES.wood, "accent").end);
    expect(traceOf(VOICES.wood, "accent").end).toBeLessThan(traceOf(VOICES.bell, "accent").end);
    expect(traceOf(VOICES.bell, "accent").end).toBeLessThanOrEqual(COLS);
  });

  it("keeps square waves on the envelope", () => {
    const tr = traceOf(VOICES.click, "accent");
    tr.y.forEach((y, c) => expect(Math.abs(y)).toBe(tr.env[c]));
  });

  it("varies noise with the seed but not tones", () => {
    expect(traceOf(VOICES.hat, "accent", 1)).toEqual(traceOf(VOICES.hat, "accent", 1));
    expect(traceOf(VOICES.hat, "accent", 1).y).not.toEqual(traceOf(VOICES.hat, "accent", 2).y);
    expect(traceOf(VOICES.bell, "accent", 1)).toEqual(traceOf(VOICES.bell, "accent", 2));
  });

  it("gives every voice its own picture", () => {
    const shapes = new Set(ids.map((id) => traceOf(VOICES[id], "accent").y.join()));
    expect(shapes.size).toBe(ids.length);
  });
});

describe("strokeOf", () => {
  it("joins a jump halfway from each side", () => {
    expect(strokeOf([0, 6], 0)).toEqual([0, 3]);
    expect(strokeOf([0, 6], 1)).toEqual([3, 6]);
    expect(strokeOf([2, 2, 2], 1)).toEqual([2, 2]);
    expect(strokeOf([4, -4, 4], 1)).toEqual([-4, 0]);
  });
});

describe("scopeDots", () => {
  const tr = traceOf(VOICES.bell, "accent");
  const key = ([c, r]: readonly [number, number]) => `${c},${r}`;

  it("shows only a dim centre line when flat", () => {
    const { on, dim } = scopeDots(tr, { head: COLS, level: "flat" });
    expect(on).toEqual([]);
    expect(dim).toHaveLength(COLS);
    expect(new Set(dim.map(([, r]) => r))).toEqual(new Set([RADIUS]));
  });

  it("stays on the grid and never lights a dot twice", () => {
    for (const look of [{ head: COLS, level: "on" }, { head: 20, level: "on" }, { head: COLS, level: "dim" }] as const) {
      const { on, dim } = scopeDots(tr, look);
      const all = [...on, ...dim];
      all.forEach(([c, r]) => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(COLS);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(ROWS);
      });
      expect(new Set(all.map(key)).size).toBe(all.length);
    }
  });

  it("draws a full-height cursor at the sweep head and nothing lit past it", () => {
    const { on, dim } = scopeDots(tr, { head: 20, level: "on" });
    expect(dim.filter(([c]) => c === 20)).toHaveLength(ROWS);
    expect(on.every(([c]) => c < 20)).toBe(true);
  });

  it("turns the trace dim for the afterglow", () => {
    const { on, dim } = scopeDots(tr, { head: COLS, level: "dim" });
    expect(on).toEqual([]);
    expect(dim.length).toBeGreaterThan(COLS);
  });
});

describe("lookAt", () => {
  const live = { hold: false, still: false };

  it("sweeps from the trigger across the width", () => {
    expect(lookAt(0, live)).toEqual({ head: PRE, level: "on", done: false });
    expect(lookAt(SWEEP_MS / 2, live).head).toBe(PRE + COLS / 2);
    expect(lookAt(SWEEP_MS, live).head).toBe(COLS);
  });

  it("glows dim then goes flat while playing", () => {
    expect(lookAt(SWEEP_MS + HOLD_MS - 1, live).level).toBe("on");
    expect(lookAt(SWEEP_MS + HOLD_MS + 1, live).level).toBe("dim");
    expect(lookAt(SWEEP_MS + HOLD_MS + GLOW_MS, live)).toEqual({ head: COLS, level: "flat", done: true });
  });

  it("holds a preview once drawn", () => {
    expect(lookAt(SWEEP_MS, { hold: true, still: false })).toEqual({ head: COLS, level: "on", done: true });
    expect(lookAt(10_000, { hold: true, still: false }).level).toBe("on");
  });

  it("shows the whole trace at once with reduced motion", () => {
    expect(lookAt(0, { hold: false, still: true })).toEqual({ head: COLS, level: "on", done: true });
  });
});
