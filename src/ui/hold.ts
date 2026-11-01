// Pure: press-and-hold repeat timing for nudge keys.

/** Before the first repeat: long enough that a tap stays a single step. */
export const HOLD_MS = 400;
const FIRST_REPEAT_MS = 120;
const FASTEST_MS = 30;

/** Delay (ms) before repeat `n` (0 = the first, after the initial press): speeds up the longer the key is held. */
export const holdDelay = (n: number): number => (n <= 0 ? HOLD_MS : Math.max(FASTEST_MS, Math.round(FIRST_REPEAT_MS * 0.88 ** (n - 1))));
