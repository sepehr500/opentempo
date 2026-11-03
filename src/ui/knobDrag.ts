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

// ── feel: every knob covers its range in about the same thumb travel ───────────────────────────

/** Thumb travel (px) for a knob's whole range. */
export const TRAVEL_PX = 220;
/** Bounds per step: few-position knobs don't feel sluggish, many-position ones don't get twitchy. */
export const MAX_STEP_PX = 40;
export const MIN_STEP_PX = 3;

/** Pixels of drag per step, from how many steps the knob has. */
export const pxPerStep = (steps: number): number => Math.min(MAX_STEP_PX, Math.max(MIN_STEP_PX, TRAVEL_PX / Math.max(1, steps)));

/** A step only happens once the drag is clearly past the halfway point: no flicker on an edge. */
export const HYSTERESIS = 0.25;

/**
 * The value for an unrounded drag position `acc` (in steps), given the value shown now.
 * Moves only when acc is more than half a step plus the dead zone away, then lands on the
 * nearest whole step.
 */
export const stepTo = (acc: number, value: number): number =>
  Math.abs(acc - value) > 0.5 + HYSTERESIS ? Math.round(acc) : value;

/** Drag in px toward "more": up or right. */
export const towardMore = (dx: number, dy: number): number => dx - dy;

/** Detent marks for knobs with few positions (one per value); null draws the fine ring. */
export const MAX_DETENTS = 24;
export const detents = (steps: number): number | null => (steps + 1 <= MAX_DETENTS ? steps + 1 : null);

// ── scroll wheel / trackpad ──────────────────────────────────────────────────────────────────
// A mouse wheel notch is ~100px of delta; a trackpad sends many small deltas. Accumulate, and
// step at most once per event, so a notch is one step and a trackpad flick can't whip the knob.

export const WHEEL_PX = 50;

/** Delta toward "more" in px: scrolling up or right. Line/page modes are scaled to pixels. */
export const wheelDelta = (dx: number, dy: number, mode: number): number => (dx - dy) * (mode === 1 ? 40 : mode === 2 ? 400 : 1);

/** New accumulator and the step to take (-1, 0, 1). */
export const wheelStep = (acc: number, delta: number): { acc: number; step: number } => {
  const next = acc + delta;
  return Math.abs(next) >= WHEEL_PX ? { acc: 0, step: Math.sign(next) } : { acc: next, step: 0 };
};
