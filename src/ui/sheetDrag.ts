// Pure rules for drag-to-dismiss on bottom sheets.

/** Movement before a press becomes a drag, so taps on keys still work. */
export const SLOP_PX = 8;
/** Released past this fraction of the sheet's height: dismiss. */
export const DISTANCE_FRACTION = 0.25;
/** Released while moving down faster than this (px/ms): dismiss, even after a short flick. */
export const FLICK_PX_PER_MS = 0.5;
const UP_LIMIT_PX = 16;

/** A press becomes a sheet drag once it moves mostly vertically past the slop. */
export const claims = (dx: number, dy: number): boolean => Math.abs(dy) > SLOP_PX && Math.abs(dy) > Math.abs(dx);

/** Where the sheet sits for a finger offset: follows down 1:1, resists going up. */
export const offsetFor = (dy: number): number => (dy >= 0 ? dy : -Math.min(UP_LIMIT_PX, Math.sqrt(-dy) * 2));

export const shouldDismiss = (dy: number, velocity: number, height: number): boolean =>
  dy > height * DISTANCE_FRACTION || (velocity > FLICK_PX_PER_MS && dy > SLOP_PX * 2);

/** Velocity from the last two samples, px/ms (positive = downward). */
export const velocityOf = (a: { y: number; t: number }, b: { y: number; t: number }): number =>
  b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;
