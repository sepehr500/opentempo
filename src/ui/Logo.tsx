import { HEIGHT, WIDTH, columns, dotPath, litColumn } from "./logo";

/** The tempo mark, inline: the lit column keeps time with the beat while playing. */
export const Logo = (p: { beat: number | null; pitch?: number }) => {
  const pitch = () => p.pitch ?? 3.4;
  const lit = () => litColumn(p.beat);
  return (
    <svg class="logo" width={WIDTH * pitch()} height={HEIGHT * pitch()} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
      <path d={dotPath(columns.filter((_, i) => i !== lit()).flat())} stroke="var(--color-seam-strong)" stroke-width="0.8" stroke-linecap="round" />
      <path d={dotPath(columns[lit()])} stroke="var(--color-accent)" stroke-width="0.8" stroke-linecap="round" />
    </svg>
  );
};
