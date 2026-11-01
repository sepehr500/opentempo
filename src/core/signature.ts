// The time signature is a readout, not a setting: beats (lines) × split (pieces per line).
// A split of 3 is compound time, so 2 × 3 reads 6/8 and the tempo counts the dotted quarter.

/** "4/4", or "6/8" when each beat splits in three. */
export const timeSignature = (beats: number, split: number): string => (split === 3 ? `${beats * 3}/8` : `${beats}/4`);

/** Split as a word for preset rows; a split of 3 already shows as /8. */
export const splitWord = (split: number): string => ({ 2: "8ths", 4: "16ths" } as Record<number, string>)[split] ?? "";

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
