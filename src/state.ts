// Persisted user preferences → derived timeline Settings. Pure functions plus one store.
import type { Settings, Subdivision } from "./core/types";
import type { VoiceId } from "./audio/voices";

export type Prefs = {
  bpm: number;
  beatsPerBar: number;
  subdivision: Subdivision;
  level: number; // 0..100
  voice: VoiceId;
  random: { on: boolean; min: number; max: number; everyBars: number };
  gap: { on: boolean; play: number; mute: number };
  timer: { on: boolean; minutes: number; atEnd: "stop" | "buzz" };
  countIn: { on: boolean; bars: 1 | 2 };
};

export const DEFAULT_PREFS: Prefs = {
  bpm: 120,
  beatsPerBar: 4,
  subdivision: 1,
  level: 80,
  voice: "wood",
  random: { on: false, min: 90, max: 140, everyBars: 4 },
  gap: { on: false, play: 3, mute: 1 },
  timer: { on: false, minutes: 10, atEnd: "stop" },
  countIn: { on: false, bars: 1 },
};

/** Merge stored prefs over defaults so new fields get sane values after upgrades. */
export const hydrate = (stored: Partial<Prefs> | undefined): Prefs => ({
  ...DEFAULT_PREFS,
  ...stored,
  random: { ...DEFAULT_PREFS.random, ...stored?.random },
  gap: { ...DEFAULT_PREFS.gap, ...stored?.gap },
  timer: { ...DEFAULT_PREFS.timer, ...stored?.timer },
  countIn: { ...DEFAULT_PREFS.countIn, ...stored?.countIn },
});

export const toSettings = (p: Prefs, seed: number): Settings => ({
  bpm: p.bpm,
  beatsPerBar: p.beatsPerBar,
  subdivision: p.subdivision,
  accentFirst: true,
  countInBars: p.countIn.on ? p.countIn.bars : 0,
  random: p.random.on ? { min: p.random.min, max: p.random.max, everyBars: p.random.everyBars } : null,
  gap: p.gap.on ? { play: p.gap.play, mute: p.gap.mute } : null,
  seed,
});

export const SPLIT_GLYPH: Record<Subdivision, string> = { 1: "♩", 2: "♪", 3: "3", 4: "♬" };

export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
