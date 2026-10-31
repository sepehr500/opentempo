// Pure rules for drag-to-dismiss on bottom sheets.

/** Movement before a press becomes a drag, so taps on keys still work. */
export const SLOP_PX = 8;
/** Released past this fraction of the sheet's height: dismiss. */
export const DISTANCE_FRACTION = 0.25;
/** Released while moving down faster than this (px/ms): dismiss, even after a short flick. */
export const FLICK_PX_PER_MS = 0.3;
const UP_LIMIT_PX = 16;

/** A press becomes a sheet drag once it moves mostly vertically past the slop. */
export const claims = (dx: number, dy: number): boolean => Math.abs(dy) > SLOP_PX && Math.abs(dy) > Math.abs(dx);

/** Where the sheet sits for a finger offset: follows down 1:1, resists going up. */
export const offsetFor = (dy: number): number => (dy >= 0 ? dy : -Math.min(UP_LIMIT_PX, Math.sqrt(-dy) * 2));

export const shouldDismiss = (dy: number, velocity: number, height: number): boolean =>
  dy > height * DISTANCE_FRACTION || (velocity > FLICK_PX_PER_MS && dy > SLOP_PX * 2);

export type Sample = { readonly y: number; readonly t: number };

/** Velocity is measured over this much of the most recent movement. */
const WINDOW_MS = 100;
/** A finger that rested this long before lifting is not flicking. */
const REST_MS = 80;

/** Release velocity in px/ms (positive = downward), from recent move samples (oldest first). */
export const releaseVelocity = (samples: readonly Sample[], upT: number): number => {
  const last = samples[samples.length - 1];
  if (!last || upT - last.t > REST_MS) return 0;
  const first = samples.find((s) => last.t - s.t <= WINDOW_MS) ?? last;
  return last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
};

/** Keep only what releaseVelocity can use. */
export const pushSample = (samples: readonly Sample[], s: Sample): Sample[] =>
  [...samples, s].filter((x) => s.t - x.t <= WINDOW_MS * 2);
