import { describe, expect, it } from "vitest";
import { hydrate } from "../state";
import { fromSignature, splitWord, timeSignature } from "./signature";

describe("time signature readout", () => {
  it("is beats over 4, or eighths over 8 when each beat splits in three", () => {
    expect(timeSignature(4, 1)).toBe("4/4");
    expect(timeSignature(4, 2)).toBe("4/4");
    expect(timeSignature(2, 3)).toBe("6/8");
    expect(timeSignature(3, 3)).toBe("9/8");
    expect(timeSignature(4, 3)).toBe("12/8");
    expect(timeSignature(1, 3)).toBe("3/8");
    expect(splitWord(3)).toBe("");
    expect(splitWord(4)).toBe("16ths");
  });

  it("converts the short-lived stored time signatures", () => {
    expect(fromSignature("6/8")).toEqual({ beatsPerBar: 2, subdivision: 3 });
    expect(fromSignature("12/8")).toEqual({ beatsPerBar: 4, subdivision: 3 });
    expect(fromSignature("7/8 2+2+3")).toEqual({ beatsPerBar: 7, subdivision: 1 });
    expect(fromSignature("5/4")).toEqual({ beatsPerBar: 5, subdivision: 1 });
    expect(fromSignature("banana")).toBe(null);
  });

  it("hydrates prefs and presets saved with a time signature", () => {
    const p = hydrate({ meter: "9/8", subdivision: 2, presets: [{ id: "a", name: "x", bpm: 90, meter: "6/8", subdivision: 1, voice: "wood" }] } as never);
    expect([p.beatsPerBar, p.subdivision]).toEqual([3, 3]);
    expect([p.presets[0].beatsPerBar, p.presets[0].subdivision]).toEqual([2, 3]);
    expect("meter" in p || "meter" in p.presets[0]).toBe(false);
    const plain = hydrate({ beatsPerBar: 5, subdivision: 2 });
    expect([plain.beatsPerBar, plain.subdivision]).toEqual([5, 2]);
  });
});
