// Functional core: settings in, timeline out. No audio, no DOM, no clock.
import { intBetween } from "./rng";
import type { Bar, Click, ClickKind, Settings } from "./types";

export const MIN_BPM = 20;
export const MAX_BPM = 300;

export const clampBpm = (bpm: number): number =>
  Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));

export const barDuration = (bpm: number, beatsPerBar: number): number =>
  (60 / bpm) * beatsPerBar;

/** Tempo of a musical bar (index >= 0), honouring random-tempo blocks. */
export const bpmOfBar = (s: Settings, index: number): number =>
  s.random && index >= 0
    ? clampBpm(intBetween(s.seed, Math.floor(index / Math.max(1, s.random.everyBars)), s.random.min, s.random.max))
    : clampBpm(s.bpm);

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
    start += barDuration(bar.bpm, s.beatsPerBar);
    index += 1;
  }
}

const kindOf = (s: Settings, beat: number, sub: number): ClickKind =>
  sub > 0 ? "sub" : beat === 0 && s.accentFirst ? "accent" : "beat";

/** Every click in a bar, in time order. Count-in bars click quarter notes only. */
export const clicksOfBar = (s: Settings, bar: Bar): Click[] => {
  const beatLen = 60 / bar.bpm;
  const subs = bar.countIn ? 1 : s.subdivision;
  return Array.from({ length: s.beatsPerBar * subs }, (_, i) => {
    const beat = Math.floor(i / subs);
    const sub = i % subs;
    const phase = beat + sub / subs;
    return {
      time: bar.start + phase * beatLen,
      bar: bar.index,
      beat,
      sub,
      phase,
      kind: kindOf(s, beat, sub),
      countIn: bar.countIn,
      muted: bar.muted,
      bpm: bar.bpm,
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
  start: bar.start + barDuration(bar.bpm, s.beatsPerBar),
});

/**
 * Where to resume after settings change mid-play, so the click that was due next
 * keeps its time and its place in the bar. If that place no longer exists
 * (fewer beats per bar), the next bar starts at that time instead.
 */
export const resumeCursor = (s: Settings, due: Click): Cursor => {
  if (due.phase >= s.beatsPerBar) return { index: due.bar + 1, start: due.time };
  const bpm = due.bar < 0 ? clampBpm(s.bpm) : bpmOfBar(s, due.bar);
  return { index: due.bar, start: due.time - (due.phase * 60) / bpm };
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
