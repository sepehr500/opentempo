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
  readonly beatsPerBar: number;
  readonly subdivision: Subdivision;
  /** Off: every click sounds the same. On: the one is strongest, splits are softest. */
  readonly accents: boolean;
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
  readonly beat: number; // 0-based beat within the bar
  readonly sub: number; // 0-based subdivision within the beat
  /** Position in beats from the start of the bar (beat + sub/subdivision). */
  readonly phase: number;
  readonly kind: ClickKind;
  readonly countIn: boolean;
  readonly muted: boolean;
  readonly bpm: number;
};
