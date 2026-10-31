import { createMemo } from "solid-js";
import { layout, type GlyphSet } from "./dotLayout";

/** Text as one SVG path of round dots: cheap to update on every beat. */
export const DotMatrix = (props: { text: string; set?: GlyphSet; pitch?: number; dot?: number; class?: string }) => {
  const geo = createMemo(() => {
    const p = props.pitch ?? 6;
    const { dots, cols, rows } = layout(props.text, props.set ?? "big");
    const d = dots.map(([c, r]) => `M${c * p + p / 2} ${r * p + p / 2}h0`).join("");
    return { d, w: cols * p, h: rows * p };
  });
  return (
    <svg class={`dot-matrix ${props.class ?? ""}`} width={geo().w} height={geo().h} viewBox={`0 0 ${geo().w} ${geo().h}`} role="img" aria-label={props.text}>
      <path d={geo().d} fill="none" stroke="var(--color-dot-on)" stroke-width={props.dot ?? (props.pitch ?? 6) * 0.73} stroke-linecap="round" />
    </svg>
  );
};
