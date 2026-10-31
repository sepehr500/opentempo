import { clampBpm } from "./timeline";

/** Taps older than this gap (ms) start a new measurement. */
export const TAP_RESET_MS = 2000;
const MAX_TAPS = 8;

/** Append a tap timestamp (ms), dropping stale history. Pure. */
export const addTap = (taps: readonly number[], now: number): number[] => {
  const last = taps[taps.length - 1];
  const kept = last !== undefined && now - last <= TAP_RESET_MS ? [...taps, now] : [now];
  return kept.slice(-MAX_TAPS);
};

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** BPM from tap timestamps (ms), or null until there are two taps. Median resists a sloppy tap. */
export const tapBpm = (taps: readonly number[]): number | null => {
  if (taps.length < 2) return null;
  const intervals = taps.slice(1).map((t, i) => t - taps[i]);
  return clampBpm(60000 / median(intervals));
};
