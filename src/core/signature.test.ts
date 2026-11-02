import { describe, expect, it } from "vitest";
import { hydrate } from "../state";
import { fromSignature, shapeLabel } from "./signature";

describe("beats and split", () => {
  it("reads as beats and split, never as a time signature", () => {
    expect(shapeLabel(4, 1)).toBe("4 beats");
    expect(shapeLabel(1, 3)).toBe("1 beat · split 3");
    expect(shapeLabel(2, 3)).toBe("2 beats · split 3");
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
