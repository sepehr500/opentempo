// Functional core: measure headphone delay from taps along to a click. No audio, no DOM, no clock.
//
// The user taps when they *hear* each click. Clicks and taps are on the same clock (ms), with the
// latency the browser already reports taken out of the taps, so a tap's offset from its click is
// exactly the extra delay the visuals and haptics need.
import { median } from "./tap";

export const LATENCY_MAX_MS = 500;

export const clampLatency = (ms: number): number =>
  Number.isFinite(ms) ? Math.min(LATENCY_MAX_MS, Math.max(0, Math.round(ms))) : 0;

export type Calibration = {
  /** Extra delay to apply, ms: the mean offset of the steady taps, clamped to the usable range. */
  readonly ms: number;
  /** Median absolute deviation of the steady taps, ms: how tightly they agree. */
  readonly spread: number;
  /** Taps counted after dropping the lead-in and the outliers. */
  readonly used: number;
  /** Enough taps, tightly enough together, to trust. */
  readonly ok: boolean;
};

export type CalibrateOptions = {
  /** Leading taps ignored while the user finds the beat. */
  readonly settle?: number;
  /** A tap may land this far before its click (people anticipate a steady beat), ms. */
  readonly early?: number;
  /** Fewest steady taps for a trusted result. */
  readonly minTaps?: number;
  /** Largest spread (ms) for a trusted result. */
  readonly maxSpread?: number;
};

/** Click times (ms) of a steady pulse, enough to cover every tap. */
export const pulse = (periodMs: number, untilMs: number): number[] =>
  Array.from({ length: Math.max(0, Math.ceil(untilMs / periodMs)) + 2 }, (_, i) => i * periodMs);

/**
 * Each tap's offset from the click it answers: the latest click no later than `early` after the tap.
 * Taps before the first click are dropped. Clicks must be ascending.
 */
export const tapOffsets = (clicks: readonly number[], taps: readonly number[], early: number): number[] =>
  taps.flatMap((tap) => {
    const answered = clicks.filter((c) => c <= tap + early);
    return answered.length ? [tap - answered[answered.length - 1]] : [];
  });

/** Typical interval between clicks; the pairing window scales with it. */
const periodOf = (clicks: readonly number[]): number =>
  clicks.length > 1 ? median(clicks.slice(1).map((c, i) => c - clicks[i])) : Infinity;

/** Outliers: further from the median than 3 robust standard deviations, never closer than 15ms. */
const OUTLIER_FLOOR_MS = 15;
const MAD_TO_SD = 1.4826;

/**
 * The headphone delay measured from taps along to clicks (both ms, same clock), or null with too
 * few taps to say anything. Robust: the lead-in is ignored and outliers (a missed or doubled tap)
 * are discarded around the median. What remains is steady tapping, where the mean is the sharper
 * estimate (about 20% less error than the median for the same taps).
 */
export const calibrate = (clicks: readonly number[], taps: readonly number[], o: CalibrateOptions = {}): Calibration | null => {
  const period = periodOf(clicks);
  const early = o.early ?? Math.min(150, period / 5);
  const offsets = tapOffsets(clicks, taps, early).slice(o.settle ?? 2);
  if (offsets.length < 3) return null;
  const m = median(offsets);
  const mad = median(offsets.map((x) => Math.abs(x - m)));
  const limit = Math.max(OUTLIER_FLOOR_MS, 3 * MAD_TO_SD * mad);
  const kept = offsets.filter((x) => Math.abs(x - m) <= limit);
  const centre = kept.reduce((a, b) => a + b, 0) / kept.length;
  const spread = Math.round(median(kept.map((x) => Math.abs(x - centre))));
  return {
    ms: clampLatency(centre),
    spread,
    used: kept.length,
    ok: kept.length >= (o.minTaps ?? 8) && kept.length >= offsets.length * 0.6 && spread <= (o.maxSpread ?? 25),
  };
};
