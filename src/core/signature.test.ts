import { describe, expect, it } from "vitest";
import { hydrate } from "../state";
import { SIGNATURES, applySignature, countWords, fromSignature, shapeLabel, signatureOf } from "./signature";

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

describe("time signature quick picks", () => {
  const sig = (id: string) => SIGNATURES.find((s) => s.id === id)!;

  it("set beats and split", () => {
    expect(applySignature(sig("6/8"), 1)).toEqual({ beatsPerBar: 2, subdivision: 3 });
    expect(applySignature(sig("12/8"), 2)).toEqual({ beatsPerBar: 4, subdivision: 3 });
    expect(applySignature(sig("3/4"), 2)).toEqual({ beatsPerBar: 3, subdivision: 2 }); // keeps eighths
    expect(applySignature(sig("4/4"), 3)).toEqual({ beatsPerBar: 4, subdivision: 1 }); // leaves 12/8's three
  });

  it("every pick reads back as itself, and other settings read as custom", () => {
    for (const s of SIGNATURES) for (const split of [1, 2, 3, 4]) {
      const a = applySignature(s, split);
      expect(signatureOf(a.beatsPerBar, a.subdivision)?.id).toBe(s.id);
    }
    expect(signatureOf(4, 2)?.id).toBe("4/4");
    expect(signatureOf(1, 3)).toBe(null); // the old "3/8 at 120" trap
    expect(signatureOf(5, 3)).toBe(null);
    expect(signatureOf(11, 1)).toBe(null);
  });

  it("counts out loud", () => {
    expect(countWords(4, 1).join(" ")).toBe("1 2 3 4");
    expect(countWords(2, 3).join(" ")).toBe("1 & a 2 & a");
    expect(countWords(2, 4).join(" ")).toBe("1 e & a 2 e & a");
  });
});
