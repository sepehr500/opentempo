import { For, Show } from "solid-js";
import { useTempo } from "../app/tempo";
import type { Preset } from "../core/presets";
import { DotMatrix } from "../ui/DotMatrix";
import * as Icon from "../ui/icons";

/** Tiny bar meter: one tick per beat, accent on beat 1. */
const Meter = (p: { beats: number }) => (
  <span class="meter" aria-hidden="true">
    <For each={Array.from({ length: Math.min(p.beats, 8) }, (_, i) => i)}>{(i) => <span class="meter-tick" classList={{ one: i === 0 }} />}</For>
  </span>
);

const SPLIT_WORD: Record<number, string> = { 2: "8ths", 3: "triplets", 4: "16ths" };

/** "4/4 · wood", or "4/4 · triplets · wood" when the beat is split. */
export const meta = (p: { beatsPerBar: number; subdivision: number; voice: string }) =>
  [`${p.beatsPerBar}/4`, SPLIT_WORD[p.subdivision], p.voice].filter(Boolean).join(" · ");

export const Presets = () => {
  const t = useTempo();
  const active = () => t.activePreset();

  const edit = (p: Preset) => {
    t.setEditing(p.id);
    t.setSheet("preset");
  };

  return (
    <>
      <section class="display preset-display">
        <div class="display-top">
          <span>{active() ? "preset" : "current"}</span>
          <span>{t.prefs.presets.length} saved</span>
        </div>
        <div class="preset-now">
          <div>
            <span class="set-name">{active()?.name ?? "not saved"}</span>
            <span class="set-label">{meta(t.prefs)}</span>
          </div>
          <DotMatrix text={String(t.prefs.bpm)} set="big" pitch={2.6} />
        </div>
      </section>

      <ol class="preset-list">
        <For each={t.prefs.presets} fallback={<li class="preset-empty">save the current tempo to keep it here</li>}>
          {(p, i) => (
            <li class="preset" classList={{ active: active()?.id === p.id }}>
              <button class="preset-load" aria-label={`load ${p.name}`} aria-pressed={active()?.id === p.id} onClick={() => t.applyPreset(p)}>
                <span class="slot">{String(i() + 1).padStart(2, "0")}</span>
                <span class="preset-main">
                  <span class="preset-name">{p.name}</span>
                  <span class="preset-meta">{meta(p)}</span>
                </span>
                <Meter beats={p.beatsPerBar} />
                <span class="preset-bpm">{p.bpm}</span>
              </button>
              <button class="key preset-edit" aria-label={`edit ${p.name}`} onClick={() => edit(p)}>
                <Icon.More />
              </button>
            </li>
          )}
        </For>
      </ol>

      <section class="grid preset-actions">
        <Show when={!active()} fallback={<div class="span-4 preset-saved"><Icon.Check /><span>saved as {active()!.name}</span></div>}>
          <button class="key wide span-4 accent" onClick={() => edit(t.savePreset())}>
            <Icon.Plus />
            <span>save current</span>
          </button>
        </Show>
      </section>
    </>
  );
};
