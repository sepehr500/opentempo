// Pure: a voice as a slow-motion oscilloscope on the dot grid. Same synthesis data the engine plays
// (wave, pitch, decay, gain per click kind), stretched so a 12 ms click and a 250 ms bell both read.
//   x: log time. Each voice's tail ends where log(decay) puts it, so short and long voices differ.
//   pitch: octaves set the cycle length (higher voice, tighter cycles), so pitch compares directly.
//   y: rows of loudness (dB above a floor, as the ear hears an exponential decay), scaled by the
//      voice's gain per click kind (accent 1, beat 0.7, sub 0.4).
import type { ClickKind } from "../core/types";
import { unit } from "../core/rng";
import type { Voice } from "../audio/voices";

export type Dot = readonly [col: number, row: number];
export type Lit = { readonly on: readonly Dot[]; readonly dim: readonly Dot[] };

export const COLS = 64;
export const ROWS = 13; // odd: a centre line with RADIUS rows either side
export const RADIUS = (ROWS - 1) / 2;
export const PRE = 2; // pre-trigger columns of silence, as a scope shows
const REF_HZ = 440; // a cycle spans REF_COLS columns at REF_HZ…
const REF_COLS = 14;
const COLS_PER_OCTAVE = 4; // …and COLS_PER_OCTAVE fewer per octave up
const MIN_COLS = 3; // never tighter than this, or the shape is lost
const DECAY_MIN = 0.004; // log time axis: DECAY_MIN … DECAY_MAX seconds spans the width
const DECAY_MAX = 0.25; // the longest voice (bell) fills the width
const CURVE = 1.4; // slight sag in the taper, so the attack reads as a hit

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Fraction of the width a voice's decay occupies (log scale). */
export const tailOf = (decay: number): number =>
  clamp(Math.log(decay / DECAY_MIN) / Math.log(DECAY_MAX / DECAY_MIN), 0.08, 1);

/** Columns one cycle spans at a frequency (log pitch). */
export const cycleCols = (hz: number): number =>
  Math.max(MIN_COLS, REF_COLS - COLS_PER_OCTAVE * Math.log2(hz / REF_HZ));

/**
 * Waveform value in [-1, 1] at `cyc` cycles in. Noise is a stable hash of (seed, column) that flips
 * sign every column: high-passed noise has almost no low end, so neighbours swing apart.
 */
const osc = (wave: Voice["wave"], cyc: number, seed: number, col: number): number => {
  const s = Math.sin(2 * Math.PI * cyc);
  if (wave === "square") return s >= 0 ? 1 : -1;
  if (wave === "triangle") return (2 / Math.PI) * Math.asin(s);
  if (wave === "sawtooth") return 2 * (cyc - Math.floor(cyc + 0.5));
  if (wave === "noise") return (col % 2 ? 1 : -1) * (0.25 + 0.75 * unit(seed, col));
  return s;
};

export type Trace = {
  /** Trace row per column, -RADIUS … RADIUS (0 = centre). */
  readonly y: readonly number[];
  /** Envelope height per column in rows, 0 … RADIUS. */
  readonly env: readonly number[];
  /** First column after the sound has died away. */
  readonly end: number;
};

/** The voice's waveform for one click kind, quantised to the grid. */
export const traceOf = (v: Voice, kind: ClickKind, seed = 1): Trace => {
  const width = COLS - PRE;
  const tail = tailOf(v.decay);
  const period = cycleCols(v.freq[kind]);
  const cols = Array.from({ length: COLS }, (_, c) => {
    const u = (c - PRE) / width; // 0 at the trigger
    if (u < 0) return { y: 0, env: 0 };
    const amp = v.gain[kind] * Math.max(0, 1 - u / tail) ** CURVE * RADIUS;
    return { y: Math.round(amp * osc(v.wave, (c - PRE) / period, seed, c)), env: Math.round(amp) };
  });
  const env = cols.map((c) => c.env);
  const last = env.reduce((at, e, c) => (e > 0 ? c : at), PRE - 1);
  return { y: cols.map((c) => c.y), env, end: last + 1 };
};

/** Rows a column's stroke covers: its sample joined halfway to each neighbour, so edges stay connected. */
export const strokeOf = (y: readonly number[], c: number): readonly [lo: number, hi: number] => {
  const here = y[c];
  const mids = [c > 0 ? (here + y[c - 1]) / 2 : here, c < y.length - 1 ? (here + y[c + 1]) / 2 : here];
  const lo = Math.min(here, ...mids.map((m) => (m < here ? Math.ceil(m) : here)));
  const hi = Math.max(here, ...mids.map((m) => (m > here ? Math.floor(m) : here)));
  return [lo, hi];
};

export type Look = {
  /** Columns revealed so far (the sweep); COLS when fully drawn. */
  readonly head: number;
  /** "on": live trace with envelope outline, "dim": afterglow, "flat": silence. */
  readonly level: "on" | "dim" | "flat";
};

const toRow = (y: number) => RADIUS - y; // grid row 0 is the top

/** Lit dots for a trace as seen at a moment: trace, envelope outline, sweep cursor, centre line. */
export const scopeDots = (tr: Trace, look: Look): Lit => {
  const on: Dot[] = [];
  const dim: Dot[] = [];
  const sweeping = look.head < COLS;
  for (let c = 0; c < COLS; c++) {
    const shown = look.level !== "flat" && c < look.head && c < tr.end;
    if (sweeping && c === Math.floor(look.head)) {
      for (let r = 0; r < ROWS; r++) dim.push([c, r]);
      continue;
    }
    if (!shown) {
      dim.push([c, toRow(0)]);
      continue;
    }
    const [lo, hi] = strokeOf(tr.y, c);
    const into = look.level === "on" ? on : dim;
    for (let y = lo; y <= hi; y++) into.push([c, toRow(y)]);
    if (look.level === "on" && tr.env[c] > 0)
      for (const y of [tr.env[c], -tr.env[c]]) if (y < lo || y > hi) dim.push([c, toRow(y)]);
  }
  return { on, dim };
};

/** Every grid position, for the unlit background. */
export const gridDots = (): Dot[] => Array.from({ length: COLS * ROWS }, (_, i) => [i % COLS, Math.floor(i / COLS)] as const);

// ── timing of one strike, in ms since the click was heard ────────────────
export const SWEEP_MS = 150; // cursor crosses the full width
export const HOLD_MS = 90; // trace stays lit after the sweep
export const GLOW_MS = 220; // then lingers dim before going flat

/**
 * How a strike looks `ms` after it was heard. `hold` (stopped: a preview leaves the capture on screen)
 * skips the afterglow; `still` (reduced motion) skips the sweep and the afterglow.
 */
export const lookAt = (ms: number, opts: { hold: boolean; still: boolean }): Look & { done: boolean } => {
  if (opts.still) return { head: COLS, level: "on", done: true };
  const head = Math.min(COLS, Math.floor(PRE + (Math.max(0, ms) / SWEEP_MS) * COLS));
  if (head < COLS) return { head, level: "on", done: false };
  if (opts.hold || ms < SWEEP_MS + HOLD_MS) return { head, level: "on", done: opts.hold };
  if (ms < SWEEP_MS + HOLD_MS + GLOW_MS) return { head, level: "dim", done: false };
  return { head, level: "flat", done: true };
};

/** Dots as one SVG path of zero-length round-capped segments. */
export const dotPath = (dots: readonly Dot[], pitch: number): string =>
  dots.map(([c, r]) => `M${c * pitch + pitch / 2} ${r * pitch + pitch / 2}h0`).join("");
