// Synthesised click voices: pure data, no samples.
import type { ClickKind } from "../core/types";

export type VoiceId = "click" | "wood" | "bell" | "rim" | "beep" | "clave" | "count" | "hat";

export type Voice = {
  readonly wave: OscillatorType | "noise";
  /** Base frequency in Hz per click kind. */
  readonly freq: Readonly<Record<ClickKind, number>>;
  readonly decay: number; // seconds to near-silence
  readonly gain: Readonly<Record<ClickKind, number>>;
};

const gains = { accent: 1, beat: 0.7, sub: 0.4 } as const;

export const VOICES: Readonly<Record<VoiceId, Voice>> = {
  click: { wave: "square", freq: { accent: 2400, beat: 1800, sub: 1800 }, decay: 0.012, gain: gains },
  wood: { wave: "sine", freq: { accent: 1250, beat: 880, sub: 880 }, decay: 0.04, gain: gains },
  bell: { wave: "triangle", freq: { accent: 1760, beat: 1320, sub: 1320 }, decay: 0.25, gain: gains },
  rim: { wave: "square", freq: { accent: 1100, beat: 820, sub: 820 }, decay: 0.02, gain: gains },
  beep: { wave: "sine", freq: { accent: 1000, beat: 800, sub: 800 }, decay: 0.08, gain: gains },
  clave: { wave: "triangle", freq: { accent: 2500, beat: 2000, sub: 2000 }, decay: 0.03, gain: gains },
  count: { wave: "sine", freq: { accent: 660, beat: 440, sub: 440 }, decay: 0.1, gain: gains },
  hat: { wave: "noise", freq: { accent: 9000, beat: 7000, sub: 7000 }, decay: 0.03, gain: gains },
};
