// Pure: text → lit dot coordinates for a glyph set. Shared by the SVG display and the canvas artwork.
import data from "./glyphs.json";

export type GlyphSet = "big" | "small";

const SETS = data as Record<GlyphSet, { rows: number; glyphs: Record<string, string[]> }>;
const TRACK = 1; // empty columns between glyphs
const SPACE = 3; // columns for a space

export const layout = (text: string, set: GlyphSet) => {
  const { rows, glyphs } = SETS[set];
  const dots: Array<readonly [number, number]> = [];
  let x = 0;
  [...text.toLowerCase()].forEach((ch, i, all) => {
    const g = glyphs[ch];
    const gap = i < all.length - 1 ? TRACK : 0;
    if (!g) {
      if (ch === " ") x += SPACE;
      return;
    }
    g.forEach((row, r) => [...row].forEach((cell, c) => cell === "#" && dots.push([x + c, r])));
    x += g[0].length + gap;
  });
  return { dots, cols: Math.max(1, x), rows };
};
