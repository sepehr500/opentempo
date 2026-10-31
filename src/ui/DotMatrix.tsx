import { createMemo } from "solid-js";
import data from "./glyphs.json";

const GLYPHS = data.glyphs as Record<string, string[]>;
const ROWS = data.rows;
const TRACK = 1; // empty columns between glyphs

/** Pure: text → list of lit dot coordinates (col, row) plus total width in columns. */
export const layout = (text: string) => {
  const glyphs = [...text].map((ch) => GLYPHS[ch]).filter(Boolean);
  let x = 0;
  const dots: Array<readonly [number, number]> = [];
  glyphs.forEach((g, i) => {
    g.forEach((row, r) => [...row].forEach((cell, c) => cell === "#" && dots.push([x + c, r])));
    x += g[0].length + (i < glyphs.length - 1 ? TRACK : 0);
  });
  return { dots, cols: x };
};

/** Renders digits as one SVG path of round dots: cheap to update on every beat. */
export const DotMatrix = (props: { text: string; pitch?: number; dot?: number }) => {
  const pitch = () => props.pitch ?? 6;
  const geo = createMemo(() => {
    const { dots, cols } = layout(props.text);
    const p = pitch();
    const d = dots.map(([c, r]) => `M${c * p + p / 2} ${r * p + p / 2}h0`).join("");
    return { d, w: cols * p, h: ROWS * p };
  });
  return (
    <svg class="dot-matrix" width={geo().w} height={geo().h} viewBox={`0 0 ${geo().w} ${geo().h}`} role="img" aria-label={props.text}>
      <path d={geo().d} fill="none" stroke="var(--color-dot-on)" stroke-width={props.dot ?? 4.4} stroke-linecap="round" />
    </svg>
  );
};
