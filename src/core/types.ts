import type { Meter } from "./meter";

export type Subdivision = 1 | 2 | 3 | 4;

export type RandomTempo = {
  readonly min: number;
  readonly max: number;
  /** A new tempo is picked every N bars. */
  readonly everyBars: number;
};

export type Gap = {
  /** Bars that click... */
  readonly play: number;
  /** ...followed by bars of silence. */
  readonly mute: number;
};

export type Settings = {
  readonly bpm: number;
  readonly meter: Meter;
  /** /4: each quarter split 1-4 ways. /8: 1 pulse, 2 eighths, 3 sixteenths. */
  readonly subdivision: Subdivision;
  readonly accentFirst: boolean;
  readonly countInBars: number; // 0 = off
  readonly random: RandomTempo | null;
  readonly gap: Gap | null;
  readonly seed: number;
};

export type Bar = {
  /** 0-based index of musical bars; count-in bars are negative (-n … -1). */
  readonly index: number;
  readonly countIn: boolean;
  /** Seconds from the start of playback. */
  readonly start: number;
  readonly bpm: number;
  readonly muted: boolean;
};

export type ClickKind = "accent" | "beat" | "sub";

export type Click = {
  readonly time: number;
  readonly bar: number;
  readonly beat: number; // 0-based group within the bar (a beat in /4)
  readonly sub: number; // 0-based click within the group
  /** Position in counted beats from the start of the bar. */
  readonly phase: number;
  readonly kind: ClickKind;
  readonly countIn: boolean;
  readonly muted: boolean;
  readonly bpm: number;
};
