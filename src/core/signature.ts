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
