// Tempo marking shown under the BPM on the display.
const MARKINGS: ReadonlyArray<readonly [number, string]> = [
  [40, "grave"],
  [60, "largo"],
  [66, "larghetto"],
  [76, "adagio"],
  [108, "andante"],
  [120, "moderato"],
  [156, "allegro"],
  [176, "vivace"],
  [200, "presto"],
];

export const markingOf = (bpm: number): string =>
  (MARKINGS.find(([upTo]) => bpm < upTo) ?? [0, "prestissimo"])[1];
