import { For, createEffect, createSignal, on } from "solid-js";
import { VOICES, type VoiceId } from "../audio/voices";
import { useTempo } from "../app/tempo";
import { capabilities } from "../platform/capabilities";
import { feelAvailable, type Feel } from "../state";
import { Stepper, Toggle } from "../ui/controls";
import { DotMatrix } from "../ui/DotMatrix";
import { VoiceIcon } from "../ui/icons";
import { Scope, type Strike } from "../ui/Scope";
import type { ClickKind } from "../core/types";

const ORDER = Object.keys(VOICES) as VoiceId[];

const FEEL: ReadonlyArray<readonly [keyof Feel, string]> = [
  ["buzz", "buzz on the one"],
  ["flash", "flash on the beat"],
  ["stayAwake", "stay awake"],
];

const WAVE_NAME = { sine: "sine", square: "square", triangle: "tri", sawtooth: "saw", custom: "wave", noise: "noise" } as const;

export const Voice = () => {
  const t = useTempo();
  const [strike, setStrike] = createSignal<Strike | null>(null);
  const hit = (voice: VoiceId, kind: ClickKind) => setStrike({ voice, kind, at: performance.now(), seed: (Math.random() * 2 ** 31) | 0 });
  // Every audible click strikes the scope; starting or stopping clears it.
  createEffect(on(t.now, (c) => c && !c.muted && hit(t.prefs.voice, c.kind), { defer: true }));
  createEffect(on(t.playing, () => setStrike(null), { defer: true }));

  const shown = () => {
    const s = strike();
    return s ? { v: VOICES[s.voice], kind: s.kind } : { v: VOICES[t.prefs.voice], kind: "accent" as const };
  };
  return (
    <>
      <section class="display voice-display">
        <div class="voice-head">
          <DotMatrix text={t.prefs.voice} set="small" pitch={5} />
          <div class="display-side voice-spec">
            <span>{WAVE_NAME[shown().v.wave]}</span>
            <span>{shown().v.freq[shown().kind]}hz</span>
            <span>{Math.round(shown().v.decay * 1000)}ms</span>
          </div>
        </div>
        <Scope voice={t.prefs.voice} strike={strike()} hold={!t.playing()} />
      </section>

      <section class="grid voices" role="radiogroup" aria-label="sound">
        <For each={ORDER}>
          {(id) => (
            <button
              class="key voice-key"
              classList={{ accent: t.prefs.voice === id }}
              role="radio"
              aria-checked={t.prefs.voice === id}
              onClick={() => {
                t.setPrefs("voice", id);
                t.preview(id);
                hit(id, "accent");
              }}
            >
              <VoiceIcon id={id} />
              <span>{id}</span>
            </button>
          )}
        </For>
      </section>

      <section class="feel">
        <h2 class="section-label">feel</h2>
        <For each={FEEL}>
          {([key, label]) => (
            <div class="row" classList={{ unavailable: !feelAvailable(key, capabilities) }}>
              <span>{label}</span>
              <Toggle label={label} on={t.prefs.feel[key]} disabled={!feelAvailable(key, capabilities)} onChange={(v) => t.setPrefs("feel", key, v)} />
            </div>
          )}
        </For>
        <div class="row">
          <span>headphone delay</span>
          <Stepper label="headphone delay" value={t.prefs.latencyMs / 10} min={0} max={40} format={(v) => `${v * 10}ms`} onChange={(v) => t.setPrefs("latencyMs", v * 10)} />
        </div>
      </section>
    </>
  );
};
