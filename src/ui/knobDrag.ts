// Pure rules for dragging a knob. A fingertip's reported position shifts a few pixels as it lifts
// off the glass; at a few pixels per step that nudges the value on release. And at a fixed gain,
// precise slow moves and fast sweeps pull against each other.

/** Speed (px/ms) of an ordinary deliberate drag: the gain there is 1. */
export const NORMAL_SPEED = 0.3;
/** Gain range: slow fine-tuning moves less per pixel, a fast sweep more. */
export const MIN_GAIN = 0.35;
export const MAX_GAIN = 3;

/** Steps per pixel multiplier for a drag speed. */
export const gainFor = (speed: number): number => Math.min(MAX_GAIN, Math.max(MIN_GAIN, speed / NORMAL_SPEED));

/** Smoothed speed: pointer events are noisy, so blend each sample with the last. */
export const smoothSpeed = (prev: number, dy: number, dt: number): number => 0.5 * prev + 0.5 * (Math.abs(dy) / Math.max(1, dt));

export type Sample = { readonly t: number; readonly y: number; readonly v: number };

/** The last stretch before release that may be lift-off rather than intent. */
export const RELEASE_MS = 80;
/** Lift-off moves are small; anything bigger in that stretch was meant. */
export const RELEASE_PX = 10;

/**
 * The value to keep on release: if the finger barely moved in the last RELEASE_MS, the value it
 * had just before (the lift-off shift is discarded); otherwise null (keep the current value).
 */
export const releaseValue = (samples: readonly Sample[], upT: number, upY: number): number | null => {
  if (!samples.length) return null;
  const before = [...samples].reverse().find((s) => s.t <= upT - RELEASE_MS) ?? samples[0];
  return Math.abs(upY - before.y) <= RELEASE_PX ? before.v : null;
};
