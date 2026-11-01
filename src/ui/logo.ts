// Pure geometry of the tempo mark: four beat columns of 3×5 dots, one empty column between them
// (the same grid as the app icon). Coordinates are in dot units; one dot per unit cell.
export const GROUPS = 4;
const COLS = 3;
const ROWS = 5;
export const WIDTH = GROUPS * (COLS + 1) - 1; // 15
export const HEIGHT = ROWS;

export type Dot = readonly [x: number, y: number];

/** Dots of each beat column, left to right. */
export const columns: readonly (readonly Dot[])[] = Array.from({ length: GROUPS }, (_, g) =>
  Array.from({ length: COLS * ROWS }, (_, i): Dot => [g * (COLS + 1) + (i % COLS), Math.floor(i / COLS)]),
);

/** Which column is lit: the current beat while playing (wrapping past four), else the first. */
export const litColumn = (beat: number | null): number => (beat === null ? 0 : ((beat % GROUPS) + GROUPS) % GROUPS);

/** Dots as an SVG path of zero-length segments, drawn round by stroke-linecap. */
export const dotPath = (dots: readonly Dot[]): string => dots.map(([x, y]) => `M${x + 0.5} ${y + 0.5}h0`).join("");
