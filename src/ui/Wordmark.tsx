import { ROWS, dotPath, mark } from "./wordmark";

const M = mark();

/** tempo in dots, the t lit like the first beat. */
export const Wordmark = (p: { pitch?: number }) => {
  const pitch = p.pitch ?? 3.6;
  return (
    <svg class="wordmark" width={M.cols * pitch} height={ROWS * pitch} viewBox={`0 0 ${M.cols} ${ROWS}`} role="img" aria-label="tempo">
      <path d={dotPath(M.rest)} stroke="var(--color-ink)" stroke-width="0.8" stroke-linecap="round" />
      <path d={dotPath(M.lit)} stroke="var(--color-accent)" stroke-width="0.8" stroke-linecap="round" />
    </svg>
  );
};
