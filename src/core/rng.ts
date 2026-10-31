// Deterministic, stateless randomness: the same (seed, key) always yields the same value.
// Keeps random-tempo behaviour pure and testable.

const mix = (seed: number, key: number): number => {
  let h = (seed ^ Math.imul(key + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
};

/** Uniform float in [0, 1) for a given seed and key. */
export const unit = (seed: number, key: number): number => mix(seed, key) / 2 ** 32;

/** Uniform integer in [min, max] (inclusive) for a given seed and key. */
export const intBetween = (seed: number, key: number, min: number, max: number): number => {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(unit(seed, key) * (hi - lo + 1));
};
