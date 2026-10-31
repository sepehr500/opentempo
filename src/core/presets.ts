// Presets: saved snapshots of the Unit settings. Plain data + pure operations.
import type { Subdivision } from "./types";

export type PresetValues = {
  readonly bpm: number;
  readonly beatsPerBar: number;
  readonly subdivision: Subdivision;
  readonly voice: string;
};

export type Preset = PresetValues & {
  readonly id: string;
  readonly name: string;
};

export const newId = (): string => Math.random().toString(36).slice(2, 10);

export const valuesOf = (p: PresetValues): PresetValues => ({
  bpm: p.bpm,
  beatsPerBar: p.beatsPerBar,
  subdivision: p.subdivision,
  voice: p.voice,
});

/** True when the current settings are exactly this preset (drives the highlight). */
export const matches = (preset: PresetValues, current: PresetValues): boolean =>
  preset.bpm === current.bpm &&
  preset.beatsPerBar === current.beatsPerBar &&
  preset.subdivision === current.subdivision &&
  preset.voice === current.voice;

/** Next free default name: "120 bpm", then "120 bpm 2", … */
export const defaultName = (presets: readonly Preset[], bpm: number): string => {
  const base = `${bpm} bpm`;
  const taken = new Set(presets.map((p) => p.name));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
};

export const addPreset = (list: readonly Preset[], values: PresetValues, name = defaultName(list, values.bpm)): Preset[] => [
  ...list,
  { id: newId(), name, ...valuesOf(values) },
];

export const updatePreset = (list: readonly Preset[], id: string, patch: Partial<Omit<Preset, "id">>): Preset[] =>
  list.map((p) => (p.id === id ? { ...p, ...patch } : p));

export const removePreset = (list: readonly Preset[], id: string): Preset[] => list.filter((p) => p.id !== id);
