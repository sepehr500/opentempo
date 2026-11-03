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

  it("set exactly what the tile shows, whatever the split was", () => {
    expect(applySignature(sig("6/8"))).toEqual({ beatsPerBar: 2, subdivision: 3 });
    expect(applySignature(sig("12/8"))).toEqual({ beatsPerBar: 4, subdivision: 3 });
    expect(applySignature(sig("3/4"))).toEqual({ beatsPerBar: 3, subdivision: 1 });
  });

  it("every pick reads back as itself, and other settings read as custom", () => {
    for (const s of SIGNATURES) {
      const a = applySignature(s);
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

describe("accent off", () => {
  it("makes every click the same, splits included, and old presets keep their accents", async () => {
    const { clicksUntil } = await import("./timeline");
    const { DEFAULT_PREFS, toSettings } = await import("../state");
    const kinds = (accent: boolean, split: 1 | 2) =>
      clicksUntil(toSettings({ ...DEFAULT_PREFS, accent, subdivision: split, bpm: 60 }, 1), 4 - 1e-6).map((c) => c.kind[0]).join("");
    expect(kinds(true, 1)).toBe("abbb");
    expect(kinds(false, 1)).toBe("bbbb");
    expect(kinds(true, 2)).toBe("asbsbsbs");
    expect(kinds(false, 2)).toBe("bbbbbbbb");
    const p = hydrate({ presets: [{ id: "a", name: "x", bpm: 90, beatsPerBar: 4, subdivision: 1, voice: "wood" }, { id: "b", name: "y", bpm: 90, beatsPerBar: 5, subdivision: 1, accent: false, voice: "wood" }] } as never);
    expect(p.presets.map((x) => x.accent)).toEqual([true, false]);
    expect(hydrate(undefined).accent).toBe(true);
  });
});
