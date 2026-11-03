// tempo has no time signatures: the tempo counts beats (the lines on the display) and split adds
// clicks inside each one. A signature would also claim which note is the beat, which is exactly
// what the tempo number decides, so the two would contradict each other (1 × 3 "3/8" at 120).

/** How a setting reads in a preset row: "4 beats", "2 beats · split 3". */
export const shapeLabel = (beats: number, split: number): string =>
  [`${beats} ${beats === 1 ? "beat" : "beats"}`, split > 1 ? `split ${split}` : ""].filter(Boolean).join(" · ");

/**
 * For one release prefs stored a time signature ("6/8", "7/8 2+2+3"). Back to beats × split:
 * compound /8 → beats of three; odd /8 → one line per eighth; /4 → as written.
 */
export const fromSignature = (id: string): { beatsPerBar: number; subdivision: 1 | 3 } | null => {
  const m = /^(\d+)\/(4|8)/.exec(id.trim());
  if (!m) return null;
  const n = Math.min(12 * 3, Math.max(1, +m[1]));
  if (m[2] === "8" && n % 3 === 0 && n / 3 <= 12) return { beatsPerBar: n / 3, subdivision: 3 };
  return { beatsPerBar: Math.min(12, n), subdivision: 1 };
};

// ── quick picks ─────────────────────────────────────────────────────────────────────────────
// A time signature is a shortcut that sets beats and split. /8 signatures are felt in big beats
// of three (6/8 = 2 beats, split 3), so the tempo counts the felt beat and the label never
// contradicts it.

export type Signature = { readonly id: string; readonly beats: number; readonly compound: boolean; readonly hint: string };

export const SIGNATURES: readonly Signature[] = [
  { id: "2/4", beats: 2, compound: false, hint: "march" },
  { id: "3/4", beats: 3, compound: false, hint: "waltz" },
  { id: "4/4", beats: 4, compound: false, hint: "most songs" },
  { id: "5/4", beats: 5, compound: false, hint: "odd five" },
  { id: "6/8", beats: 2, compound: true, hint: "felt in two" },
  { id: "9/8", beats: 3, compound: true, hint: "felt in three" },
  { id: "12/8", beats: 4, compound: true, hint: "shuffle" },
  { id: "7/4", beats: 7, compound: false, hint: "odd seven" },
];

/** Beats and split after picking a signature: exactly what its tile shows (/4 unsplit, /8 in threes). */
export const applySignature = (sig: Signature): { beatsPerBar: number; subdivision: 1 | 3 } => ({
  beatsPerBar: sig.beats,
  subdivision: sig.compound ? 3 : 1,
});

/** The signature the current beats and split amount to, or null ("custom"). */
export const signatureOf = (beats: number, split: number): Signature | null =>
  SIGNATURES.find((s) => s.beats === beats && (s.compound ? split === 3 : split !== 3)) ?? null;

/** How you'd count it out loud, one word per click: 1 & 2 &, 1 & a 2 & a, 1 e & a. */
export const countWords = (beats: number, split: number): string[] =>
  Array.from({ length: beats }, (_, i) => [String(i + 1), ...({ 1: [], 2: ["&"], 3: ["&", "a"], 4: ["e", "&", "a"] } as Record<number, string[]>)[split]]).flat();
