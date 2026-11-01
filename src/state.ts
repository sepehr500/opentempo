// Persisted user preferences → derived timeline Settings. Pure functions plus one store.
import type { Preset } from "./core/presets";
import type { Settings, Subdivision } from "./core/types";
import type { VoiceId } from "./audio/voices";
import type { Capabilities } from "./platform/capabilities";
import { clampLatency } from "./core/latency";
import { fromSignature } from "./core/signature";

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
  feel: Feel;
  /** Headphone (Bluetooth) delay in ms on top of what the browser reports, applied to visuals and buzz. */
  latencyMs: number;
  presets: Preset[];
};

/** Voice → feel settings. Each depends on a device capability. */
export type Feel = { buzz: boolean; flash: boolean; stayAwake: boolean };

export const FEEL_REQUIRES: Record<keyof Feel, keyof Capabilities | null> = {
  buzz: "vibration",
  flash: null,
  stayAwake: "wakeLock",
};

/** Whether a feel setting can be used on this device (drives the disabled state). */
export const feelAvailable = (key: keyof Feel, caps: Capabilities): boolean => {
  const need = FEEL_REQUIRES[key];
  return need === null || caps[need];
};

/** What actually applies: the user's choice, but only where the device supports it. */
export const effectiveFeel = (feel: Feel, caps: Capabilities): Feel => ({
  buzz: feel.buzz && feelAvailable("buzz", caps),
  flash: feel.flash && feelAvailable("flash", caps),
  stayAwake: feel.stayAwake && feelAvailable("stayAwake", caps),
});

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
  feel: { buzz: true, flash: false, stayAwake: true },
  latencyMs: 0,
  presets: [],
};

/** One release stored a time signature instead of beats × split; convert it back. */
const fromLegacy = <T extends object>(x: T): T => {
  const { meter, ...rest } = x as T & { meter?: unknown };
  const sig = typeof meter === "string" ? fromSignature(meter) : null;
  return (sig ? { ...rest, ...sig } : rest) as T;
};

/** Merge stored prefs over defaults so new fields get sane values after upgrades. */
export const hydrate = (raw: Partial<Prefs> | undefined): Prefs => {
  const stored = raw ? fromLegacy(raw) : undefined;
  return {
  ...DEFAULT_PREFS,
  ...stored,
  random: { ...DEFAULT_PREFS.random, ...stored?.random },
  gap: { ...DEFAULT_PREFS.gap, ...stored?.gap },
  timer: { ...DEFAULT_PREFS.timer, ...stored?.timer },
  countIn: { ...DEFAULT_PREFS.countIn, ...stored?.countIn },
  feel: { ...DEFAULT_PREFS.feel, ...stored?.feel },
  latencyMs: clampLatency(stored?.latencyMs ?? DEFAULT_PREFS.latencyMs),
  presets: Array.isArray(stored?.presets) ? stored.presets.map(fromLegacy) : [],
  };
};

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

/** The headphone check: a plain steady pulse, slow enough that even a long delay can't be mistaken for the next click. */
export const CHECK_BPM = 80;
export const CHECK_PERIOD_MS = 60000 / CHECK_BPM;
export const CHECK_SETTINGS: Settings = {
  bpm: CHECK_BPM,
  beatsPerBar: 4,
  subdivision: 1,
  accentFirst: true,
  countInBars: 0,
  random: null,
  gap: null,
  seed: 1,
};

/**
 * The tempo on the display. It follows the knob immediately; only random tempo shows the tempo
 * actually being heard, because there the two genuinely differ.
 */
export const displayBpm = (p: Pick<Prefs, "bpm" | "random">, heard: { bpm: number; countIn: boolean } | null): number =>
  p.random.on && heard && !heard.countIn ? heard.bpm : p.bpm;

/** Haptic detents no closer than this: faster than a phone's vibrator can render as distinct ticks. */
export const DETENT_GAP_MS = 40;
export const detentDue = (now: number, last: number): boolean => now - last >= DETENT_GAP_MS;

/** Split knob value: how many pieces each beat line is cut into. */
export const splitLabel = (s: Subdivision): string => String(s);

export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
