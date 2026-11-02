// Functional core: settings in, timeline out. No audio, no DOM, no clock.
import { intBetween } from "./rng";
import type { Bar, Click, ClickKind, Settings } from "./types";

export const MIN_BPM = 20;
export const MAX_BPM = 300;

export const clampBpm = (bpm: number): number =>
  Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));

/** Target tempo of a musical bar (index >= 0): the tempo random picked for its block, once the glide is over. */
export const bpmOfBar = (s: Settings, index: number): number =>
  s.random && index >= 0
    ? clampBpm(intBetween(s.seed, Math.floor(index / Math.max(1, s.random.everyBars)), s.random.min, s.random.max))
    : clampBpm(s.bpm);

/**
 * Random tempo glides instead of jumping: each new pick is reached beat by beat over the first
 * bar of its block (at least 4 beats, never longer than the block), then held. The first glide
 * starts from the set tempo. With a new pick every bar, the tempo is always gliding.
 */
export const glideBeats = (beatsPerBar: number, everyBars: number): number =>
  Math.min(Math.max(1, everyBars) * beatsPerBar, Math.max(beatsPerBar, 4));

/** Tempo of one beat (fractional while gliding). Count-in and plain playback: the set tempo. */
export const beatBpm = (s: Settings, bar: number, beat: number): number => {
  if (!s.random || bar < 0) return clampBpm(s.bpm);
  const every = Math.max(1, s.random.everyBars);
  const block = Math.floor(bar / every);
  const to = bpmOfBar(s, bar);
  const from = block === 0 ? clampBpm(s.bpm) : bpmOfBar(s, (block - 1) * every);
  const pos = (bar - block * every) * s.beatsPerBar + beat;
  return from + (to - from) * Math.min(1, (pos + 1) / glideBeats(s.beatsPerBar, every));
};

/** Seconds each beat of a bar lasts. */
export const beatLengths = (s: Settings, bar: number): number[] =>
  Array.from({ length: s.beatsPerBar }, (_, j) => 60 / beatBpm(s, bar, j));

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** Seconds a bar lasts. */
export const barDuration = (s: Settings, bar: number): number => sum(beatLengths(s, bar));

/** Seconds from the start of a bar to a position in beats (beat + fraction). */
const offsetOf = (lens: readonly number[], phase: number): number => {
  const whole = Math.min(lens.length, Math.floor(phase + 1e-9));
  return sum(lens.slice(0, whole)) + (whole < lens.length ? (phase - whole) * lens[whole] : 0);
};

/** Whether a musical bar (index >= 0) falls in the silent part of the gap cycle. */
export const isMutedBar = (s: Settings, index: number): boolean => {
  if (!s.gap || index < 0) return false;
  const cycle = s.gap.play + s.gap.mute;
  return cycle > 0 && s.gap.mute > 0 && index % cycle >= s.gap.play;
};

const makeBar = (s: Settings, index: number, start: number): Bar => {
  const countIn = index < 0;
  return {
    index,
    countIn,
    start,
    bpm: countIn ? clampBpm(s.bpm) : bpmOfBar(s, index),
    muted: isMutedBar(s, index),
  };
};

export type Cursor = { readonly index: number; readonly start: number };

/** Where a fresh playback begins: at the first count-in bar, or bar 0. */
export const origin = (s: Settings): Cursor => ({ index: s.countInBars > 0 ? -s.countInBars : 0, start: 0 });

/** Lazily yields bars from a cursor. Infinite; consumers take what they need. */
export function* bars(s: Settings, from: Cursor = origin(s)): Generator<Bar> {
  let { index, start } = from;
  for (;;) {
    const bar = makeBar(s, index, start);
    yield bar;
    start += barDuration(s, bar.index);
    index += 1;
  }
}

const kindOf = (s: Settings, beat: number, sub: number): ClickKind =>
  sub > 0 ? "sub" : beat === 0 && s.accentFirst ? "accent" : "beat";

/** Every click in a bar, in time order. Count-in bars click quarter notes only. */
export const clicksOfBar = (s: Settings, bar: Bar): Click[] => {
  const lens = beatLengths(s, bar.index);
  const subs = bar.countIn ? 1 : s.subdivision;
  return Array.from({ length: s.beatsPerBar * subs }, (_, i) => {
    const beat = Math.floor(i / subs);
    const sub = i % subs;
    const phase = beat + sub / subs;
    return {
      time: bar.start + offsetOf(lens, phase),
      bar: bar.index,
      beat,
      sub,
      phase,
      kind: kindOf(s, beat, sub),
      countIn: bar.countIn,
      muted: bar.muted,
      bpm: Math.round(60 / lens[beat]), // the tempo heard on this beat, gliding included
    };
  });
};

/** Lazily yields clicks from a cursor. */
export function* clicks(s: Settings, from: Cursor = origin(s)): Generator<Click> {
  for (const bar of bars(s, from)) yield* clicksOfBar(s, bar);
}

/** Cursor for the bar that follows `bar` (used to re-plan when settings change mid-play). */
export const nextCursor = (s: Settings, bar: Bar): Cursor => ({
  index: bar.index + 1,
  start: bar.start + barDuration(s, bar.index),
});

/**
 * Where to resume after settings change mid-play, so the click that was due next
 * keeps its time and its place in the bar. If that place no longer exists
 * (fewer beats per bar), the next bar starts at that time instead.
 */
export const resumeCursor = (s: Settings, due: Click): Cursor => {
  if (due.phase >= s.beatsPerBar) return { index: due.bar + 1, start: due.time };
  return { index: due.bar, start: due.time - offsetOf(beatLengths(s, due.bar), due.phase) };
};

/** Clicks from a resume cursor, skipping any that fall before the due time. */
export function* resumeClicks(s: Settings, due: Click): Generator<Click> {
  for (const c of clicks(s, resumeCursor(s, due))) if (c.time >= due.time - 1e-9) yield c;
}

/** Takes clicks with time < until. Pure helper for tests and previews. */
export const clicksUntil = (s: Settings, until: number, from?: Cursor): Click[] => {
  const out: Click[] = [];
  for (const c of clicks(s, from)) {
    if (c.time >= until) break;
    out.push(c);
  }
  return out;
};

/** True when a click at `time` (seconds from the timeline origin) falls at or after the practice-timer end. */
export const pastEnd = (time: number, endAt: number | null): boolean => endAt !== null && time >= endAt - 1e-9;

/**
 * Display pick: of the queued clicks (in time order) that are due by `heard`, show only the latest.
 * Older due clicks are skipped, so nothing replays after the screen was locked, but the display
 * never goes blank just because the clock ran ahead of the frames.
 */
export const latestDue = <C extends { readonly time: number }>(queue: readonly C[], heard: number, t0: number): { show: C | null; rest: C[] } => {
  let i = 0;
  while (i < queue.length && t0 + queue[i].time <= heard) i++;
  return { show: i ? queue[i - 1] : null, rest: queue.slice(i) };
};
