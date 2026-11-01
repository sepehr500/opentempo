// Time signatures as plain data. A bar is a list of groups measured in steps (quarters in /4,
// eighths in /8). The tempo counts the felt beat: quarters in /4, dotted quarters in 6/8, 9/8
// and 12/8 (3 steps per beat), and eighths in 5/8 and 7/8, whose groups are unequal.

export type Meter = {
  /** Stable id stored in prefs and presets: "4/4", "6/8", "7/8 2+2+3". */
  readonly id: string;
  /** "7/8" */
  readonly label: string;
  readonly unit: 4 | 8;
  /** Group lengths in steps. Each group starts with a stronger click. */
  readonly groups: readonly number[];
  /** Steps per counted beat: 1, or 3 when the tempo counts dotted quarters. */
  readonly stepsPerBeat: 1 | 3;
};

type Family = { readonly label: string; readonly unit: 4 | 8; readonly stepsPerBeat: 1 | 3; readonly groupings: readonly (readonly number[])[] };

const simple = (n: number): Family => ({ label: `${n}/4`, unit: 4, stepsPerBeat: 1, groupings: [Array.from({ length: n }, () => 1)] });
const compound = (n: number): Family => ({ label: `${n * 3}/8`, unit: 8, stepsPerBeat: 3, groupings: [Array.from({ length: n }, () => 3)] });
const odd = (n: number, groupings: number[][]): Family => ({ label: `${n}/8`, unit: 8, stepsPerBeat: 1, groupings });

/** Knob order: every /4 up to 12, then the compound meters, then the odd ones. */
export const FAMILIES: readonly Family[] = [
  ...Array.from({ length: 12 }, (_, i) => simple(i + 1)),
  compound(2),
  compound(3),
  compound(4),
  odd(5, [[2, 3], [3, 2]]),
  odd(7, [[2, 2, 3], [3, 2, 2], [2, 3, 2]]),
];

const grouping = (g: readonly number[]) => g.join("+");

const make = (f: Family, g: readonly number[]): Meter => ({
  id: f.groupings.length > 1 ? `${f.label} ${grouping(g)}` : f.label,
  label: f.label,
  unit: f.unit,
  groups: g,
  stepsPerBeat: f.stepsPerBeat,
});

const familyOf = (label: string) => FAMILIES.findIndex((f) => f.label === label);

export const DEFAULT_METER = "4/4";

/** Pure: id → meter. Unknown ids fall back to 4/4, so old or hand-edited data never breaks playback. */
export const meterOf = (id: string): Meter => {
  const [label, g] = id.trim().split(/\s+/);
  const f = FAMILIES[familyOf(label)];
  if (!f) return meterOf(DEFAULT_METER);
  return make(f, f.groupings.find((x) => grouping(x) === g) ?? f.groupings[0]);
};

/** Old data stored beats per bar; those were all /4. */
export const meterFromBeats = (beats: number): string => `${Math.min(12, Math.max(1, Math.round(beats) || 4))}/4`;

/** Knob position of a meter. */
export const familyIndex = (id: string): number => Math.max(0, familyOf(meterOf(id).label));

/** The meter at a knob position, with that family's first grouping. */
export const meterAt = (index: number): string => {
  const f = FAMILIES[Math.min(FAMILIES.length - 1, Math.max(0, Math.round(index)))];
  return make(f, f.groupings[0]).id;
};

/** Whether this meter has more than one grouping to cycle through. */
export const hasGroupings = (id: string): boolean => FAMILIES[familyIndex(id)].groupings.length > 1;

/** The next grouping of the same meter: 2+2+3 → 3+2+2 → 2+3+2 → 2+2+3. */
export const nextGrouping = (id: string): string => {
  const m = meterOf(id);
  const f = FAMILIES[familyIndex(id)];
  const i = f.groupings.findIndex((g) => grouping(g) === grouping(m.groups));
  return make(f, f.groupings[(i + 1) % f.groupings.length]).id;
};

export const stepsOf = (m: Meter): number => m.groups.reduce((a, b) => a + b, 0);

/** Counted beats per bar: what one bar lasts, in units of 60/bpm seconds. */
export const beatsOf = (m: Meter): number => stepsOf(m) / m.stepsPerBeat;

/** Step offset where each group starts: 2+2+3 → [0, 2, 4]. */
export const groupStarts = (m: Meter): number[] => m.groups.map((_, i) => m.groups.slice(0, i).reduce((a, b) => a + b, 0));

/** "2+2+3" for meters that have a choice, else "". */
export const groupingLabel = (m: Meter): string => (hasGroupings(m.id) ? grouping(m.groups) : "");

/** Most split levels a meter offers: /4 splits each quarter 1-4 ways; /8 has pulse, eighths, sixteenths. */
export const maxSplit = (m: Meter): 3 | 4 => (m.unit === 8 ? 3 : 4);

/**
 * Click positions inside one group, in steps from the group start.
 * /4: the quarter split `split` ways. /8: 1 = the group start only (the felt pulse),
 * 2 = every eighth, 3 = every sixteenth.
 */
export const ticksOfGroup = (m: Meter, len: number, split: number): number[] => {
  if (m.unit === 4) return Array.from({ length: split }, (_, j) => j / split);
  const level = Math.min(3, split);
  if (level === 1) return [0];
  const per = level === 3 ? 2 : 1;
  return Array.from({ length: len * per }, (_, j) => j / per);
};

/** Which note the tempo number counts. */
export const pulseGlyph = (m: Meter): string => (m.unit === 4 ? "♩" : m.stepsPerBeat === 3 ? "♩." : "♪");

/** Split knob glyph. In /8, level 1 plays group starts only, so it shows a quarter (♩, or ♩. in 6/8). */
export const splitGlyph = (m: Meter, split: number): string =>
  m.unit === 4 ? ({ 1: "♩", 2: "♪", 3: "3", 4: "♬" } as Record<number, string>)[split] : ({ 1: m.stepsPerBeat === 3 ? "♩." : "♩", 2: "♪", 3: "♬" } as Record<number, string>)[Math.min(3, split)];

/** Split as a word for preset rows ("" when the beat isn't split). */
export const splitWord = (m: Meter, split: number): string =>
  m.unit === 4 ? ({ 2: "8ths", 3: "triplets", 4: "16ths" } as Record<number, string>)[split] ?? "" : ({ 2: "8ths", 3: "16ths" } as Record<number, string>)[Math.min(3, split)] ?? "";

/** The tempo as a quarter-note tempo, for the Italian marking. */
export const quarterBpm = (m: Meter, bpm: number): number => (m.unit === 8 && m.stepsPerBeat === 1 ? bpm / 2 : bpm);
