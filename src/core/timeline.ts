// Functional core: settings in, timeline out. No audio, no DOM, no clock.
import { intBetween } from "./rng";
import { beatsOf, groupStarts, ticksOfGroup } from "./meter";
import type { Bar, Click, Settings } from "./types";

export const MIN_BPM = 20;
export const MAX_BPM = 300;

export const clampBpm = (bpm: number): number =>
  Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));

/** Bar length in seconds: counted beats per bar × beat length. */
export const barDuration = (bpm: number, s: Pick<Settings, "meter">): number => (60 / bpm) * beatsOf(s.meter);

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
    start += barDuration(bar.bpm, s);
    index += 1;
  }
}

/**
 * Every click in a bar, in time order. The first click of the bar is the accent, the first of
 * each group is a beat, the rest are subs (in 6/8: accent sub sub beat sub sub).
 * Count-in bars click group starts only.
 */
export const clicksOfBar = (s: Settings, bar: Bar): Click[] => {
  const m = s.meter;
  const stepLen = 60 / bar.bpm / m.stepsPerBeat;
  const split = bar.countIn ? 1 : s.subdivision;
  const starts = groupStarts(m);
  return m.groups.flatMap((len, beat) =>
    ticksOfGroup(m, len, split).map((pos, sub): Click => {
      const step = starts[beat] + pos;
      return {
        time: bar.start + step * stepLen,
        bar: bar.index,
        beat,
        sub,
        phase: step / m.stepsPerBeat,
        kind: sub > 0 ? "sub" : beat === 0 && s.accentFirst ? "accent" : "beat",
        countIn: bar.countIn,
        muted: bar.muted,
        bpm: bar.bpm,
      };
    }),
  );
};

/** Lazily yields clicks from a cursor. */
export function* clicks(s: Settings, from: Cursor = origin(s)): Generator<Click> {
  for (const bar of bars(s, from)) yield* clicksOfBar(s, bar);
}

/** Cursor for the bar that follows `bar` (used to re-plan when settings change mid-play). */
export const nextCursor = (s: Settings, bar: Bar): Cursor => ({
  index: bar.index + 1,
  start: bar.start + barDuration(bar.bpm, s),
});

/**
 * Where to resume after settings change mid-play, so the click that was due next
 * keeps its time and its place in the bar. If that place no longer exists
 * (fewer beats per bar), the next bar starts at that time instead.
 */
export const resumeCursor = (s: Settings, due: Click): Cursor => {
  if (due.phase >= beatsOf(s.meter) - 1e-9) return { index: due.bar + 1, start: due.time };
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
