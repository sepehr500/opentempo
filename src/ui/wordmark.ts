// The tempo wordmark as dots: hand-drawn on the app icon's grid. The x-height is five dots (the
// icon's 3×5 beat columns), the t rises two above it and the p drops two below; one-dot strokes,
// one empty column between letters. The first letter is the lit beat.
const GLYPHS: Record<string, readonly string[]> = {
  t: [".#..", ".#..", "####", ".#..", ".#..", ".#..", "..##", "....", "...."],
  e: ["....", "....", ".##.", "#..#", "####", "#...", ".###", "....", "...."],
  m: [".....", ".....", "####.", "#.#.#", "#.#.#", "#.#.#", "#.#.#", ".....", "....."],
  p: ["....", "....", "###.", "#..#", "#..#", "#..#", "###.", "#...", "#..."],
  o: ["....", "....", ".##.", "#..#", "#..#", "#..#", ".##.", "....", "...."],
};
export const ROWS = 9;

export type Dot = readonly [x: number, y: number];
export type Mark = { readonly lit: readonly Dot[]; readonly rest: readonly Dot[]; readonly cols: number };

/** Lays out a word from the glyphs above; the first letter's dots are `lit`. */
export const mark = (word = "tempo"): Mark => {
  const letters = [...word].map((ch) => GLYPHS[ch]).filter(Boolean);
  const placed = letters.map((g, i) => {
    const x0 = letters.slice(0, i).reduce((w, h) => w + h[0].length + 1, 0);
    return g.flatMap((row, y) => [...row].flatMap((c, k): Dot[] => (c === "#" ? [[x0 + k, y]] : [])));
  });
  const cols = letters.reduce((w, g) => w + g[0].length + 1, 0) - 1;
  return { lit: placed[0] ?? [], rest: placed.slice(1).flat(), cols: Math.max(0, cols) };
};

/** Dots as zero-length path segments, drawn round by stroke-linecap. */
export const dotPath = (dots: readonly Dot[]): string => dots.map(([x, y]) => `M${x + 0.5} ${y + 0.5}h0`).join("");
